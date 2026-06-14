const http = require("http");
const fs = require("fs");
const net = require("net");
const path = require("path");
const tls = require("tls");

const PORT = Number(process.env.PORT || 18789);
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

function normalizeDeepSeekUrl(baseUrl) {
  const trimmed = String(baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  if (!/^https:\/\/api\.deepseek\.com(\/.*)?$/.test(trimmed) && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/.*)?$/.test(trimmed)) {
    throw new Error("Only DeepSeek official URL or local compatible endpoints are allowed in the local proxy.");
  }
  if (/\/chat\/completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

function getErrorDetail(error) {
  const cause = error && error.cause ? error.cause : null;
  const pieces = [error && error.message ? error.message : "DeepSeek proxy failed."];
  if (cause && cause.code) pieces.push(`cause.code=${cause.code}`);
  if (cause && cause.message) pieces.push(`cause.message=${cause.message}`);
  return pieces.join("; ");
}

function normalizeProxyUrl(proxyUrl) {
  const value = String(proxyUrl || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return `http://${value}`;
  return value;
}

function parseHttpResponse(raw) {
  const splitAt = raw.indexOf("\r\n\r\n");
  const head = splitAt >= 0 ? raw.slice(0, splitAt) : raw;
  const body = splitAt >= 0 ? raw.slice(splitAt + 4) : "";
  const lines = head.split("\r\n");
  const statusMatch = lines[0].match(/^HTTP\/\d(?:\.\d)?\s+(\d+)/);
  const status = statusMatch ? Number(statusMatch[1]) : 502;
  const headers = {};
  for (const line of lines.slice(1)) {
    const index = line.indexOf(":");
    if (index > 0) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
  }
  return { status, headers, body };
}

function decodeChunked(body) {
  let cursor = 0;
  let output = "";
  while (cursor < body.length) {
    const lineEnd = body.indexOf("\r\n", cursor);
    if (lineEnd < 0) break;
    const sizeText = body.slice(cursor, lineEnd).split(";")[0].trim();
    const size = parseInt(sizeText, 16);
    if (!Number.isFinite(size) || size <= 0) break;
    const start = lineEnd + 2;
    output += body.slice(start, start + size);
    cursor = start + size + 2;
  }
  return output || body;
}

function decodeChunkedBuffer(buffer) {
  let cursor = 0;
  const chunks = [];
  while (cursor < buffer.length) {
    const lineEnd = buffer.indexOf(Buffer.from("\r\n"), cursor);
    if (lineEnd < 0) break;
    const sizeText = buffer.slice(cursor, lineEnd).toString("ascii").split(";")[0].trim();
    const size = parseInt(sizeText, 16);
    if (!Number.isFinite(size)) break;
    cursor = lineEnd + 2;
    if (size === 0) break;
    if (cursor + size > buffer.length) break;
    chunks.push(buffer.slice(cursor, cursor + size));
    cursor += size + 2;
  }
  return chunks.length ? Buffer.concat(chunks) : buffer;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestViaHttpProxy(endpoint, proxyUrl, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const target = new URL(endpoint);
    const proxy = new URL(proxyUrl);
    if (target.protocol !== "https:") {
      reject(new Error("HTTP proxy mode currently supports HTTPS DeepSeek endpoints only."));
      return;
    }

    const proxyPort = Number(proxy.port || (proxy.protocol === "https:" ? 443 : 80));
    const socket = net.connect(proxyPort, proxy.hostname);
    const timeout = setTimeout(() => {
      socket.destroy(new Error("Proxy connection timed out."));
    }, 30000);

    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.once("connect", () => {
      const auth = proxy.username
        ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString("base64")}\r\n`
        : "";
      socket.write([
        `CONNECT ${target.hostname}:443 HTTP/1.1`,
        `Host: ${target.hostname}:443`,
        "Proxy-Connection: Keep-Alive",
        auth.trimEnd(),
        "",
        ""
      ].filter((line) => line !== "").join("\r\n") + "\r\n\r\n");
    });

    let connectBuffer = "";
    socket.on("data", function onConnectData(chunk) {
      connectBuffer += chunk.toString("latin1");
      if (!connectBuffer.includes("\r\n\r\n")) return;
      socket.off("data", onConnectData);
      if (!/^HTTP\/\d(?:\.\d)?\s+200/i.test(connectBuffer)) {
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${connectBuffer.split("\r\n")[0]}`));
        return;
      }

      const secure = tls.connect({ socket, servername: target.hostname });
      let headerBuffer = Buffer.alloc(0);
      let headersParsed = false;
      let status = 502;
      let headers = {};
      let bodyChunks = [];
      let expectedLength = null;
      secure.once("secureConnect", () => {
        const body = JSON.stringify(payload || {});
        secure.write([
          `POST ${target.pathname}${target.search} HTTP/1.1`,
          `Host: ${target.hostname}`,
          "Content-Type: application/json",
          `Authorization: Bearer ${apiKey}`,
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "",
          body
        ].join("\r\n"));
      });
      secure.on("data", (chunk) => {
        if (headersParsed) {
          bodyChunks.push(chunk);
          return;
        }
        headerBuffer = Buffer.concat([headerBuffer, chunk]);
        const splitAt = headerBuffer.indexOf(Buffer.from("\r\n\r\n"));
        if (splitAt < 0) return;
        const head = headerBuffer.slice(0, splitAt).toString("latin1");
        const rest = headerBuffer.slice(splitAt + 4);
        const parsed = parseHttpResponse(`${head}\r\n\r\n`);
        status = parsed.status;
        headers = parsed.headers;
        expectedLength = Number(headers["content-length"]);
        if (rest.length) bodyChunks.push(rest);
        headersParsed = true;
      });
      secure.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      secure.on("end", () => {
        clearTimeout(timeout);
        const body = Buffer.concat(bodyChunks);
        const transferEncoding = String(headers["transfer-encoding"] || "").toLowerCase();
        const decodedBody = transferEncoding.includes("chunked") ? decodeChunkedBuffer(body) : body;
        const finalBody = Number.isFinite(expectedLength) ? decodedBody.slice(0, expectedLength) : decodedBody;
        const text = finalBody.toString("utf8");
        resolve({
          status,
          text,
          contentType: headers["content-type"] || "application/json; charset=utf-8"
        });
      });
    });
  });
}

function requestGetViaHttpProxy(endpoint, proxyUrl) {
  return new Promise((resolve, reject) => {
    const target = new URL(endpoint);
    const proxy = new URL(proxyUrl);
    if (target.protocol !== "https:") {
      reject(new Error("HTTP proxy mode currently supports HTTPS endpoints only."));
      return;
    }

    const proxyPort = Number(proxy.port || (proxy.protocol === "https:" ? 443 : 80));
    const socket = net.connect(proxyPort, proxy.hostname);
    const timeout = setTimeout(() => {
      socket.destroy(new Error("Proxy connection timed out."));
    }, 20000);

    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.once("connect", () => {
      const auth = proxy.username
        ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString("base64")}\r\n`
        : "";
      socket.write([
        `CONNECT ${target.hostname}:443 HTTP/1.1`,
        `Host: ${target.hostname}:443`,
        "Proxy-Connection: Keep-Alive",
        auth.trimEnd(),
        "",
        ""
      ].filter((line) => line !== "").join("\r\n") + "\r\n\r\n");
    });

    let connectBuffer = "";
    socket.on("data", function onConnectData(chunk) {
      connectBuffer += chunk.toString("latin1");
      if (!connectBuffer.includes("\r\n\r\n")) return;
      socket.off("data", onConnectData);
      if (!/^HTTP\/\d(?:\.\d)?\s+200/i.test(connectBuffer)) {
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${connectBuffer.split("\r\n")[0]}`));
        return;
      }

      const secure = tls.connect({ socket, servername: target.hostname });
      let headerBuffer = Buffer.alloc(0);
      let headersParsed = false;
      let status = 502;
      let headers = {};
      let bodyChunks = [];
      let expectedLength = null;

      secure.once("secureConnect", () => {
        secure.write([
          `GET ${target.pathname}${target.search} HTTP/1.1`,
          `Host: ${target.hostname}`,
          "Accept: application/json",
          "Connection: close",
          "",
          ""
        ].join("\r\n"));
      });
      secure.on("data", (chunk) => {
        if (headersParsed) {
          bodyChunks.push(chunk);
          return;
        }
        headerBuffer = Buffer.concat([headerBuffer, chunk]);
        const splitAt = headerBuffer.indexOf(Buffer.from("\r\n\r\n"));
        if (splitAt < 0) return;
        const head = headerBuffer.slice(0, splitAt).toString("latin1");
        const rest = headerBuffer.slice(splitAt + 4);
        const parsed = parseHttpResponse(`${head}\r\n\r\n`);
        status = parsed.status;
        headers = parsed.headers;
        expectedLength = Number(headers["content-length"]);
        if (rest.length) bodyChunks.push(rest);
        headersParsed = true;
      });
      secure.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      secure.on("end", () => {
        clearTimeout(timeout);
        const body = Buffer.concat(bodyChunks);
        const transferEncoding = String(headers["transfer-encoding"] || "").toLowerCase();
        const decodedBody = transferEncoding.includes("chunked") ? decodeChunkedBuffer(body) : body;
        const finalBody = Number.isFinite(expectedLength) ? decodedBody.slice(0, expectedLength) : decodedBody;
        resolve({
          status,
          text: finalBody.toString("utf8"),
          contentType: headers["content-type"] || "application/json; charset=utf-8"
        });
      });
    });
  });
}

async function requestViaHttpProxyWithRetry(endpoint, proxyUrl, payload, apiKey) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await requestViaHttpProxy(endpoint, proxyUrl, payload, apiKey);
    } catch (error) {
      lastError = error;
      if (!/ECONNREFUSED|ETIMEDOUT|timed out/i.test(getErrorDetail(error))) break;
      await sleep(350 * (attempt + 1));
    }
  }
  throw lastError || new Error(`Proxy request failed: ${proxyUrl}`);
}

async function requestGetViaHttpProxyWithRetry(endpoint, proxyUrl) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await requestGetViaHttpProxy(endpoint, proxyUrl);
    } catch (error) {
      lastError = error;
      if (!/ECONNREFUSED|ETIMEDOUT|timed out/i.test(getErrorDetail(error))) break;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastError || new Error(`Proxy GET failed: ${proxyUrl}`);
}

async function requestDirect(endpoint, payload, apiKey) {
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
      body: JSON.stringify(payload || {})
    });
    const text = await upstream.text();
    return {
      status: upstream.status,
      text,
      contentType: upstream.headers.get("content-type") || "application/json; charset=utf-8"
    };
  } finally {
    clearTimeout(timer);
  }
}

async function handleDeepSeekProxy(req, res) {
  try {
    const raw = await readBody(req);
    const input = JSON.parse(raw || "{}");
    const apiKey = String(input.apiKey || process.env.DEEPSEEK_API_KEY || "").trim();
    if (!apiKey) {
      send(res, 400, JSON.stringify({ error: "DEEPSEEK_API_KEY is missing." }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    const endpoint = normalizeDeepSeekUrl(input.baseUrl);
    const proxyUrl = normalizeProxyUrl(input.proxyUrl);
    const fallbackProxyUrl = proxyUrl || "http://127.0.0.1:7890";
    if (proxyUrl) {
      try {
        const upstream = await requestViaHttpProxyWithRetry(endpoint, proxyUrl, input.payload || {}, apiKey);
        send(res, upstream.status, upstream.text, {
          "Content-Type": upstream.contentType
        });
      } catch (proxyError) {
        try {
          const upstream = await requestDirect(endpoint, input.payload || {}, apiKey);
          send(res, upstream.status, upstream.text, {
            "Content-Type": upstream.contentType,
            "X-DeepSeek-Proxy-Error": getErrorDetail(proxyError).slice(0, 300)
          });
        } catch (directError) {
          throw new Error(`Proxy failed (${getErrorDetail(proxyError)}). Direct failed (${getErrorDetail(directError)}). Check whether FlClash HTTP proxy is running on ${proxyUrl}.`);
        }
      }
      return;
    }

    try {
      const upstream = await requestDirect(endpoint, input.payload || {}, apiKey);
      send(res, upstream.status, upstream.text, {
        "Content-Type": upstream.contentType
      });
    } catch (directError) {
      const upstream = await requestViaHttpProxyWithRetry(endpoint, fallbackProxyUrl, input.payload || {}, apiKey);
      send(res, upstream.status, upstream.text, {
        "Content-Type": upstream.contentType,
        "X-DeepSeek-Fallback-Proxy": fallbackProxyUrl,
        "X-DeepSeek-Direct-Error": getErrorDetail(directError).slice(0, 300)
      });
    }
  } catch (error) {
    send(res, 500, JSON.stringify({ error: getErrorDetail(error) }), {
      "Content-Type": "application/json; charset=utf-8"
    });
  }
}

function normalizeDictionaryPayload(data, requestedWord) {
  const entries = Array.isArray(data) ? data : [];
  const entry = entries[0] || {};
  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const phonetic = entry.phonetic || phonetics.find((item) => item.text)?.text || "";
  const audioRaw = phonetics.find((item) => item.audio)?.audio || "";
  const audio = audioRaw.startsWith("//") ? `https:${audioRaw}` : audioRaw;
  const meanings = [];

  for (const meaning of entry.meanings || []) {
    for (const definition of meaning.definitions || []) {
      if (!definition.definition) continue;
      meanings.push({
        partOfSpeech: meaning.partOfSpeech || "",
        definition: definition.definition,
        example: definition.example || "",
        synonyms: Array.isArray(definition.synonyms) ? definition.synonyms.slice(0, 5) : []
      });
      if (meanings.length >= 8) break;
    }
    if (meanings.length >= 8) break;
  }

  return {
    ok: Boolean(entry.word && meanings.length),
    source: "dictionaryapi.dev",
    word: entry.word || requestedWord,
    phonetic,
    audio,
    meanings
  };
}

async function handleDictionaryLookup(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const word = String(url.searchParams.get("word") || "").trim().toLowerCase();
  const proxyUrl = normalizeProxyUrl(url.searchParams.get("proxyUrl") || "") || "http://127.0.0.1:7890";

  if (!/^[a-z]+(?:['-][a-z]+)?$/.test(word)) {
    send(res, 400, JSON.stringify({ ok: false, error: "Invalid word." }), {
      "Content-Type": "application/json; charset=utf-8"
    });
    return;
  }

  const endpoint = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  try {
    let upstream;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: "application/json" } });
      clearTimeout(timer);
      upstream = {
        status: response.status,
        text: await response.text(),
        contentType: response.headers.get("content-type") || "application/json; charset=utf-8"
      };
    } catch (_) {
      upstream = await requestGetViaHttpProxyWithRetry(endpoint, proxyUrl);
    }

    if (upstream.status === 404) {
      send(res, 200, JSON.stringify({ ok: false, source: "dictionaryapi.dev", word, meanings: [] }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }
    if (upstream.status < 200 || upstream.status >= 300) {
      send(res, 502, JSON.stringify({ ok: false, error: `Dictionary lookup failed: HTTP ${upstream.status}` }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    const parsed = JSON.parse(upstream.text);
    send(res, 200, JSON.stringify(normalizeDictionaryPayload(parsed, word)), {
      "Content-Type": "application/json; charset=utf-8"
    });
  } catch (error) {
    send(res, 500, JSON.stringify({ ok: false, error: getErrorDetail(error) }), {
      "Content-Type": "application/json; charset=utf-8"
    });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(ROOT, `.${requested}`);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    send(res, 200, data, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/deepseek") {
    handleDeepSeekProxy(req, res);
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/dictionary")) {
    handleDictionaryLookup(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use, assuming server is running.`);
  } else {
    console.error("Server error:", err);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`AI English Reader is running at http://0.0.0.0:${PORT}/`);
});
