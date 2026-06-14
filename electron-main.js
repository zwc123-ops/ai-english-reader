const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow = null;
let serverProcess = null;

// ========== 内联服务器（直接在主进程运行，避免子进程问题）==========
function startServerInline() {
  const PORT = 18789;
  const ROOT = __dirname;

  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
  };

  function send(res, status, body, headers = {}) {
    res.writeHead(status, headers);
    res.end(body);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) {
          reject(new Error("Request body too large"));
          req.destroy();
        }
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }

  // DeepSeek proxy
  async function handleDeepSeekProxy(req, res) {
    try {
      const raw = await readBody(req);
      const input = JSON.parse(raw || "{}");
      const apiKey = String(input.apiKey || process.env.DEEPSEEK_API_KEY || "").trim();
      if (!apiKey) {
        return send(res, 400, JSON.stringify({ error: "DEEPSEEK_API_KEY is missing." }), {
          "Content-Type": "application/json; charset=utf-8"
        });
      }
      let endpoint = String(input.baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
      if (!/\/chat\/completions$/.test(endpoint)) endpoint += "/chat/completions";

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      try {
        const upstream = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(input.payload || {})
        });
        const text = await upstream.text();
        return send(res, upstream.status, text, {
          "Content-Type": upstream.headers.get("content-type") || "application/json"
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      send(res, 500, JSON.stringify({ error: error.message }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    }
  }

  // Dictionary proxy
  async function handleDictionaryLookup(req, res) {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const word = String(url.searchParams.get("word") || "").trim().toLowerCase();
    if (!word) {
      return send(res, 400, JSON.stringify({ ok: false, error: "No word." }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    }
    const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(dictUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (response.status === 404) {
        return send(res, 200, JSON.stringify({ ok: false, source: "dictionaryapi.dev", word, meanings: [] }), {
          "Content-Type": "application/json; charset=utf-8"
        });
      }
      if (response.status < 200 || response.status >= 300) {
        return send(res, 502, JSON.stringify({ ok: false, error: `Dictionary failed: HTTP ${response.status}` }), {
          "Content-Type": "application/json; charset=utf-8"
        });
      }
      const text = await response.text();
      send(res, 200, text, { "Content-Type": response.headers.get("content-type") || "application/json" });
    } catch (error) {
      send(res, 500, JSON.stringify({ ok: false, error: error.message }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    }
  }

  // Static file serving
  function serveStatic(req, res) {
    let reqPath = new URL(req.url, `http://127.0.0.1:${PORT}`).pathname;
    if (reqPath === "/") reqPath = "/index.html";
    reqPath = decodeURIComponent(reqPath);
    const filePath = path.resolve(ROOT, "." + reqPath);

    if (!filePath.startsWith(ROOT)) {
      return send(res, 403, "Forbidden", { "Content-Type": "text/plain" });
    }

    fs.readFile(filePath, (err, data) => {
      if (err) return send(res, 404, "Not found", { "Content-Type": "text/plain" });
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    });
  }

  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/deepseek") return handleDeepSeekProxy(req, res);
    if (req.method === "GET" && req.url.startsWith("/api/dictionary")) return handleDictionaryLookup(req, res);
    if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
    send(res, 405, "Method not allowed", { "Content-Type": "text/plain" });
  });

  server.on("error", (err) => {
    console.error("Server error:", err);
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
  });

  return server;
}

// ========== 等待服务器就绪 ==========
function waitForServer() {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      http.get("http://127.0.0.1:18789/", (res) => {
        res.resume();
        resolve(true);
      }).on("error", () => {
        attempts++;
        if (attempts < 50) setTimeout(check, 300);
        else resolve(false);
      });
    };
    setTimeout(check, 500);
  });
}

// ========== 创建窗口 ==========
async function createWindow() {
  // 直接内联启动服务器
  startServerInline();

  const ready = await waitForServer();
  if (!ready) {
    console.error("Server failed to start after 15s!");
    // 即使超时也继续尝试加载页面
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: "AI 英语精读阅读器",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL("http://127.0.0.1:18789/");
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ========== App 生命周期 ==========
app.on("ready", createWindow);
app.on("window-all-closed", () => app.quit());
app.on("activate", () => { if (!mainWindow) createWindow(); });
