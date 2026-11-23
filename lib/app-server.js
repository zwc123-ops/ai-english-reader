const http = require("http");
const fs = require("fs");
const net = require("net");
const path = require("path");
const tls = require("tls");

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, payload, extraHeaders = {}) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
}

function readBody(req, maxBytes = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isLoopbackRequest(req) {
  const addr = req.socket?.remoteAddress || "";
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

function isSameOriginOrLocal(req) {
  if (isLoopbackRequest(req)) return true;
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch (_) {
    return false;
  }
}

function normalizeDeepSeekUrl(baseUrl, allowLocalEndpoints) {
  const trimmed = String(baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (_) {
    throw new Error("Invalid AI API URL.");
  }

  const isOfficialDeepSeek =
    parsed.protocol === "https:" && parsed.hostname === "api.deepseek.com";
  const isLocalCompatible =
    allowLocalEndpoints &&
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");

  if (!isOfficialDeepSeek && !isLocalCompatible) {
    throw new Error(
      "Only official https://api.deepseek.com endpoints (or local compatible gateways in desktop/local mode) are allowed."
    );
  }

  if (/\/chat\/completions$/i.test(parsed.pathname)) {
    return parsed.toString();
  }
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/chat/completions`;
  return parsed.toString();
}

function normalizeProxyUrl(proxyUrl, allowLocalProxy = false) {
  const clientRaw = allowLocalProxy ? String(proxyUrl || "").trim() : "";
  const envRaw = String(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
  const raw = clientRaw || envRaw;
  if (!raw) return "";

  const candidate = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (_) {
    throw new Error("Invalid proxy URL format.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Proxy URL must use http or https.");
  }
  // If supplied by the client, strictly confine to loopback proxy (e.g. local Clash/V2Ray)
  if (clientRaw) {
    const host = parsed.hostname.toLowerCase();
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
      throw new Error("Client-supplied proxy URL must point to localhost / 127.0.0.1.");
    }
  }
  return parsed.toString();
}

function getErrorDetail(error) {
  const cause = error && error.cause ? error.cause : null;
  const pieces = [error && error.message ? error.message : "Upstream request failed."];
  if (cause && cause.code) pieces.push(`code=${cause.code}`);
  if (cause && cause.message && cause.message !== pieces[0]) {
    pieces.push(cause.message);
  }
  return pieces.join("; ");
}

function parseHttpHead(head) {
  const lines = head.split("\r\n");
  const statusMatch = lines[0].match(/^HTTP\/\d(?:\.\d)?\s+(\d+)/);
  const status = statusMatch ? Number(statusMatch[1]) : 502;
  const headers = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
    }
  }
  return { status, headers };
}

function decodeChunkedBuffer(buffer) {
  let cursor = 0;
  const chunks = [];
  const crlf = Buffer.from("\r\n");
  while (cursor < buffer.length) {
    const lineEnd = buffer.indexOf(crlf, cursor);
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

function requestHttpsViaProxy({ endpoint, proxyUrl, method = "POST", headers = {}, body = "", timeoutMs = 45000 }) {
  return new Promise((resolve, reject) => {
    const target = new URL(endpoint);
    const proxy = new URL(proxyUrl);
    if (target.protocol !== "https:") {
      reject(new Error("HTTP proxy tunneling supports HTTPS targets only."));
      return;
    }

    const proxyPort = Number(proxy.port || (proxy.protocol === "https:" ? 443 : 80));
    const socket = net.connect(proxyPort, proxy.hostname);
    const timer = setTimeout(() => {
      socket.destroy(new Error("Proxy connection timed out."));
    }, timeoutMs);

    socket.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    socket.once("connect", () => {
      const lines = [
        `CONNECT ${target.hostname}:${target.port || 443} HTTP/1.1`,
        `Host: ${target.hostname}:${target.port || 443}`,
        "Proxy-Connection: Keep-Alive"
      ];
      if (proxy.username) {
        const token = Buffer.from(
          `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`
        ).toString("base64");
        lines.push(`Proxy-Authorization: Basic ${token}`);
      }
      socket.write(`${lines.join("\r\n")}\r\n\r\n`);
    });

    let connectBuffer = "";
    socket.on("data", function onConnect(chunk) {
      connectBuffer += chunk.toString("latin1");
      if (!connectBuffer.includes("\r\n\r\n")) return;
      socket.off("data", onConnect);

      if (!/^HTTP\/\d(?:\.\d)?\s+200/i.test(connectBuffer)) {
        clearTimeout(timer);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${connectBuffer.split("\r\n")[0]}`));
        return;
      }

      const secure = tls.connect({ socket, servername: target.hostname });
      let headerBuf = Buffer.alloc(0);
      let headersParsed = false;
      let status = 502;
      let respHeaders = {};
      const bodyChunks = [];

      secure.once("secureConnect", () => {
        const reqLines = [
          `${method} ${target.pathname}${target.search} HTTP/1.1`,
          `Host: ${target.hostname}`
        ];
        Object.entries(headers).forEach(([k, v]) => {
          if (v !== undefined && v !== null) reqLines.push(`${k}: ${v}`);
        });
        if (method !== "GET" && method !== "HEAD") {
          reqLines.push(`Content-Length: ${Buffer.byteLength(body)}`);
        }
        reqLines.push("Connection: close", "", body);
        secure.write(reqLines.join("\r\n"));
      });

      secure.on("data", (dataChunk) => {
        if (headersParsed) {
          bodyChunks.push(dataChunk);
          return;
        }
        headerBuf = Buffer.concat([headerBuf, dataChunk]);
        const splitAt = headerBuf.indexOf(Buffer.from("\r\n\r\n"));
        if (splitAt < 0) return;
        const parsed = parseHttpHead(headerBuf.slice(0, splitAt).toString("latin1"));
        status = parsed.status;
        respHeaders = parsed.headers;
        const rest = headerBuf.slice(splitAt + 4);
        if (rest.length) bodyChunks.push(rest);
        headersParsed = true;
      });

      secure.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      secure.on("end", () => {
        clearTimeout(timer);
        const rawBody = Buffer.concat(bodyChunks);
        const te = String(respHeaders["transfer-encoding"] || "").toLowerCase();
        const decoded = te.includes("chunked") ? decodeChunkedBuffer(rawBody) : rawBody;
        const expectedLen = Number(respHeaders["content-length"]);
        const finalBuf = Number.isFinite(expectedLen) ? decoded.slice(0, expectedLen) : decoded;
        resolve({
          status,
          text: finalBuf.toString("utf8"),
          contentType: respHeaders["content-type"] || "application/json; charset=utf-8"
        });
      });
    });
  });
}

async function handleDeepSeekProxy(req, res, options) {
  try {
    if (!isSameOriginOrLocal(req)) {
      sendJson(res, 403, { error: "Cross-origin requests are not allowed." });
      return;
    }

    const raw = await readBody(req);
    let input;
    try {
      input = JSON.parse(raw || "{}");
    } catch (_) {
      sendJson(res, 400, { error: "Invalid JSON body." });
      return;
    }

    const accessToken = String(process.env.API_ACCESS_TOKEN || "").trim();
    const userSuppliedKey = String(input.apiKey || "").trim();
    const envKey = String(process.env.DEEPSEEK_API_KEY || "").trim();

    let apiKey = userSuppliedKey;
    if (!apiKey && envKey) {
      if (accessToken) {
        const providedToken = String(req.headers["x-access-token"] || "").trim();
        if (providedToken !== accessToken) {
          sendJson(res, 401, {
            error: "Access token required to use server-configured API key."
          });
          return;
        }
      }
      apiKey = envKey;
    }

    if (!apiKey) {
      sendJson(res, 400, {
        error: "请先在设置页配置 DeepSeek API Key，或在服务端环境变量中设置 DEEPSEEK_API_KEY。"
      });
      return;
    }

    const allowLocal = Boolean(options.allowLocalEndpoints || isLoopbackRequest(req));
    const endpoint = normalizeDeepSeekUrl(input.baseUrl, allowLocal);
    const proxyUrl = normalizeProxyUrl(input.proxyUrl, allowLocal);
    const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
    const wantStream = Boolean(payload.stream);

    if (proxyUrl && !wantStream) {
      try {
        const upstream = await requestHttpsViaProxy({
          endpoint,
          proxyUrl,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload),
          timeoutMs: 60000
        });
        send(res, upstream.status, upstream.text, {
          "Content-Type": upstream.contentType
        });
        return;
      } catch (proxyErr) {
        // Fallback to direct connection if proxy fails
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        try {
          const directRes = await fetch(endpoint, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
          });
          const text = await directRes.text();
          send(res, directRes.status, text, {
            "Content-Type": directRes.headers.get("content-type") || "application/json; charset=utf-8",
            "X-Proxy-Fallback": "direct"
          });
          return;
        } catch (directErr) {
          throw new Error(
            `代理请求失败（${getErrorDetail(proxyErr)}），直连亦失败（${getErrorDetail(directErr)}）。`
          );
        } finally {
          clearTimeout(timer);
        }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    req.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (wantStream && upstream.ok && upstream.body) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Content-Type-Options": "nosniff"
        });
        const reader = upstream.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!res.writableEnded) res.write(Buffer.from(value));
        }
        if (!res.writableEnded) res.end();
        return;
      }

      const text = await upstream.text();
      send(res, upstream.status, text, {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8"
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (res.writableEnded) return;
    sendJson(res, 500, { error: getErrorDetail(error) });
  }
}

function formatPosAbbr(pos) {
  const key = String(pos || "").trim().toLowerCase();
  const map = {
    noun: "n.",
    verb: "v.",
    adjective: "adj.",
    adverb: "adv.",
    preposition: "prep.",
    conjunction: "conj.",
    pronoun: "pron.",
    interjection: "interj.",
    determiner: "det.",
    exclamation: "excl.",
    numeral: "num.",
    auxiliary: "aux.",
    article: "art."
  };
  return map[key] || pos || "";
}

function normalizeDictionaryPayload(data, requestedWord) {
  const entries = Array.isArray(data) ? data : [];
  const entry = entries[0] || {};
  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const phonetic = entry.phonetic || phonetics.find((item) => item.text)?.text || "";
  const audioRaw = phonetics.find((item) => item.audio)?.audio || "";
  const audio = audioRaw.startsWith("//") ? `https:${audioRaw}` : audioRaw;
  const allMeanings = [];

  for (const meaning of entry.meanings || []) {
    const abbrPos = formatPosAbbr(meaning.partOfSpeech || "");
    for (const definition of meaning.definitions || []) {
      if (!definition.definition) continue;
      allMeanings.push({
        partOfSpeech: abbrPos,
        definition: definition.definition,
        example: definition.example || "",
        synonyms: Array.isArray(definition.synonyms) ? definition.synonyms.slice(0, 4) : []
      });
    }
  }

  // Prefer general definitions over niche parenthetical jargon like "(UML)", and strictly cap to 2 entries
  const general = allMeanings.filter((m) => !/^\([A-Z]{2,}\)/.test(m.definition.trim()));
  const meanings = (general.length >= 2 ? general : allMeanings).slice(0, 2);

  return {
    ok: Boolean(entry.word && meanings.length),
    source: "dictionaryapi.dev",
    word: entry.word || requestedWord,
    phonetic,
    audio: /^https?:\/\//i.test(audio) ? audio : "",
    meanings
  };
}

function parseYoudaoChinese(data, requestedWord) {
  const entries = data?.data?.entries;
  if (!Array.isArray(entries) || !entries.length) {
    return { cnExplain: "", cnDefinitions: [], cnPartOfSpeech: "" };
  }
  const exact =
    entries.find((e) => String(e.entry || "").trim().toLowerCase() === requestedWord) ||
    entries[0];
  const explain = String(exact?.explain || "").trim();
  if (!explain) return { cnExplain: "", cnDefinitions: [], cnPartOfSpeech: "" };

  const posMatch = explain.match(/^([a-z]{1,5}\.(?:\/[a-z]{1,5}\.)?)\s*/i);
  const cnPartOfSpeech = posMatch ? posMatch[1] : "";
  const body = posMatch ? explain.slice(posMatch[0].length) : explain;
  const cnDefinitions = body
    .split(/[；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    cnExplain: explain,
    cnDefinitions,
    cnPartOfSpeech
  };
}

async function fetchJsonWithOptionalProxy(endpoint, proxyUrl, timeoutMs = 9000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    clearTimeout(timer);
    return {
      status: response.status,
      text: await response.text()
    };
  } catch (directError) {
    if (!proxyUrl) throw directError;
    return requestHttpsViaProxy({
      endpoint,
      proxyUrl,
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: Math.max(timeoutMs, 12000)
    });
  }
}

async function handleDictionaryLookup(req, res, port, options = {}) {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const word = String(url.searchParams.get("word") || "").trim().toLowerCase();
  const proxyRaw = String(url.searchParams.get("proxyUrl") || "").trim();

  if (!word || word.length > 64 || !/^[a-z]+(?:['-][a-z]+)?$/.test(word)) {
    sendJson(res, 400, { ok: false, error: "Invalid word." });
    return;
  }

  const allowLocal = Boolean(options.allowLocalEndpoints || isLoopbackRequest(req));
  let proxyUrl = "";
  try {
    proxyUrl = normalizeProxyUrl(proxyRaw, allowLocal);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: getErrorDetail(err) });
    return;
  }

  const dictEndpoint = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const youdaoEndpoint = `https://dict.youdao.com/suggest?num=3&ver=3.0&doctype=json&cache=false&le=en&q=${encodeURIComponent(word)}`;

  const [youdaoSettled, dictSettled] = await Promise.allSettled([
    fetchJsonWithOptionalProxy(youdaoEndpoint, proxyUrl, 7000),
    fetchJsonWithOptionalProxy(dictEndpoint, proxyUrl, 8000)
  ]);

  let cn = { cnExplain: "", cnDefinitions: [], cnPartOfSpeech: "" };
  if (youdaoSettled.status === "fulfilled" && youdaoSettled.value.status >= 200 && youdaoSettled.value.status < 300) {
    try {
      cn = parseYoudaoChinese(JSON.parse(youdaoSettled.value.text), word);
    } catch (_) {
      // Ignore malformed response
    }
  }

  let en = {
    ok: false,
    word,
    phonetic: "",
    audio: "",
    meanings: []
  };
  if (dictSettled.status === "fulfilled" && dictSettled.value.status >= 200 && dictSettled.value.status < 300) {
    try {
      en = normalizeDictionaryPayload(JSON.parse(dictSettled.value.text), word);
    } catch (_) {
      // Ignore malformed response
    }
  }

  const hasResult = Boolean(cn.cnExplain || en.ok);
  const sources = [];
  if (cn.cnExplain) sources.push("youdao");
  if (en.ok) sources.push("dictionaryapi.dev");

  if (!hasResult && youdaoSettled.status === "rejected" && dictSettled.status === "rejected") {
    sendJson(res, 502, {
      ok: false,
      error: `联网查词失败：${getErrorDetail(dictSettled.reason || youdaoSettled.reason)}`
    });
    return;
  }

  const resolvedWord = en.word || word;
  sendJson(res, 200, {
    ok: hasResult,
    source: sources.join(" + ") || "online",
    word: resolvedWord,
    phonetic: en.phonetic || "",
    audio: `/api/audio?word=${encodeURIComponent(resolvedWord)}`,
    partOfSpeech: formatPosAbbr(cn.cnPartOfSpeech || en.meanings[0]?.partOfSpeech || ""),
    cnExplain: cn.cnExplain,
    cnDefinitions: cn.cnDefinitions,
    meanings: (en.meanings || []).slice(0, 2)
  });
}

async function handleAudioProxy(req, res, port) {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const word = String(url.searchParams.get("word") || "").trim();
    const type = url.searchParams.get("type") === "1" ? "1" : "2";
    if (!word || !/^[A-Za-z][A-Za-z'\-\s]{0,63}$/.test(word)) {
      sendJson(res, 400, { ok: false, error: "Invalid word parameter." });
      return;
    }

    const endpoint = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
    const upstream = await fetch(endpoint, {
      method: "GET",
      headers: {
        "User-Agent": "AI-English-Reader/2.0",
        Accept: "audio/mpeg, audio/*;q=0.9, */*;q=0.1"
      },
      signal: AbortSignal.timeout(8000)
    });

    const contentType = String(upstream.headers.get("content-type") || "");
    if (!upstream.ok || !contentType.toLowerCase().startsWith("audio/")) {
      sendJson(res, 502, { ok: false, error: "Audio source unavailable." });
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) {
      sendJson(res, 502, { ok: false, error: "Empty audio response." });
      return;
    }

    send(res, 200, buf, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400"
    });
  } catch (_) {
    sendJson(res, 502, { ok: false, error: "Audio proxy failed." });
  }
}

async function handleSentenceTranslate(req, res, options = {}) {
  try {
    if (!isSameOriginOrLocal(req)) {
      sendJson(res, 403, { ok: false, error: "Cross-origin requests are not allowed." });
      return;
    }

    const raw = await readBody(req, 64 * 1024);
    let input;
    try {
      input = JSON.parse(raw || "{}");
    } catch (_) {
      sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
      return;
    }

    const text = String(input.text || "").replace(/\s+/g, " ").trim();
    if (!text) {
      sendJson(res, 400, { ok: false, error: "Text is required." });
      return;
    }
    if (text.length > 500) {
      sendJson(res, 200, { ok: false, error: "句子较长，请点击 AI 翻译获取更准确译文。" });
      return;
    }

    const allowLocal = Boolean(options.allowLocalEndpoints || isLoopbackRequest(req));
    let proxyUrl = "";
    try {
      proxyUrl = normalizeProxyUrl(input.proxyUrl, allowLocal);
    } catch (_) {
      proxyUrl = "";
    }

    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const upstream = await fetchJsonWithOptionalProxy(endpoint, proxyUrl, 7000);
    if (upstream.status < 200 || upstream.status >= 300) {
      sendJson(res, 200, { ok: false, error: `联网翻译暂不可用（HTTP ${upstream.status}）` });
      return;
    }

    const parsed = JSON.parse(upstream.text);
    const translated = String(parsed?.responseData?.translatedText || "").trim();
    const invalid =
      !translated ||
      parsed.quotaFinished ||
      Number(parsed.responseStatus) !== 200 ||
      /MYMEMORY WARNING/i.test(translated) ||
      translated.toLowerCase() === text.toLowerCase();

    if (invalid) {
      sendJson(res, 200, { ok: false, error: "联网翻译未返回有效结果，可点击 AI 翻译。" });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      source: "mymemory",
      translation: translated
    });
  } catch (error) {
    sendJson(res, 200, { ok: false, error: "联网翻译暂不可用，可点击 AI 翻译。" });
  }
}

function serveStatic(req, res, port) {
  let pathname;
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    pathname = decodeURIComponent(url.pathname);
  } catch (_) {
    send(res, 400, "Bad Request", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (pathname.includes("\0")) {
    send(res, 400, "Bad Request", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const segments = relativePath.split("/");
  if (segments.some((seg) => seg.startsWith("."))) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 500, "Internal Server Error", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
    });
  });
}

function createAppServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const host = options.host || "0.0.0.0";
  const allowLocalEndpoints = Boolean(options.allowLocalEndpoints);

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        serverKeyConfigured: Boolean(String(process.env.DEEPSEEK_API_KEY || "").trim()),
        accessTokenRequired: Boolean(String(process.env.API_ACCESS_TOKEN || "").trim())
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/deepseek") {
      handleDeepSeekProxy(req, res, { allowLocalEndpoints });
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/dictionary")) {
      handleDictionaryLookup(req, res, port, { allowLocalEndpoints });
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/audio")) {
      handleAudioProxy(req, res, port);
      return;
    }

    if (req.method === "POST" && req.url === "/api/translate") {
      handleSentenceTranslate(req, res, { allowLocalEndpoints });
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res, port);
      return;
    }

    send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is already in use.`);
    } else {
      console.error("Server error:", err);
    }
  });

  function start() {
    return new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        server.off("error", reject);
        console.log(`AI English Reader is running at http://${host}:${port}/`);
        resolve({ server, port, host });
      });
    });
  }

  return { server, start, port, host };
}

module.exports = {
  createAppServer,
  normalizeDictionaryPayload
};
