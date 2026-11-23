import { createId, normalizeWhitespace, stripExtension } from "./utils.js";

export async function parseImportedFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const buffer = await file.arrayBuffer();

  if (ext === "txt") return { ext, ...parseTxtBook(file.name, buffer) };
  if (ext === "epub") return { ext, ...(await parseEpubBook(file.name, buffer)) };
  if (ext === "pdf") return { ext, ...parsePdfBook(file.name, buffer) };
  throw new Error("暂不支持这个格式，请导入 EPUB、TXT 或 PDF。");
}

function parseTxtBook(fileName, buffer) {
  const text = decodeText(buffer);
  const title = stripExtension(fileName);
  return {
    title,
    author: "",
    chapters: splitTextIntoChapters(text, title).map((chapter, index) => ({
      id: createId("chapter"),
      title: chapter.title || `Chapter ${index + 1}`,
      text: chapter.text
    }))
  };
}

function parsePdfBook(fileName, buffer) {
  return {
    title: stripExtension(fileName),
    author: "",
    chapters: [{ id: createId("chapter"), title: "PDF 文档", text: "" }],
    pdfBuffer: buffer
  };
}

async function parseEpubBook(fileName, buffer) {
  if (!("DecompressionStream" in window)) {
    throw new Error("当前浏览器不支持 EPUB 解压能力，请使用新版 Chromium/Edge/Firefox。");
  }
  const zip = await readZip(buffer);
  const containerText = await zip.readText("META-INF/container.xml");
  const containerXml = parseXml(containerText);
  const rootFile = firstByLocalName(containerXml, "rootfile");
  if (!rootFile) throw new Error("EPUB 缺少 container.xml rootfile。");

  const opfPath = rootFile.getAttribute("full-path");
  const opfText = await zip.readText(opfPath);
  const opf = parseXml(opfText);
  const baseDir = dirname(opfPath);
  const title = textOf(firstByLocalName(opf, "title")) || stripExtension(fileName);
  const author = textOf(firstByLocalName(opf, "creator")) || "";

  const manifest = {};
  Array.from(opf.getElementsByTagName("*")).forEach((node) => {
    if (node.localName !== "item") return;
    manifest[node.getAttribute("id")] = {
      href: node.getAttribute("href"),
      mediaType: node.getAttribute("media-type")
    };
  });

  const itemRefs = Array.from(opf.getElementsByTagName("*"))
    .filter((node) => node.localName === "itemref")
    .map((node) => node.getAttribute("idref"))
    .filter(Boolean);

  const chapters = [];
  for (const idref of itemRefs) {
    const item = manifest[idref];
    if (!item || !/x?html/i.test(item.mediaType || item.href || "")) continue;
    const chapterPath = joinPath(baseDir, item.href);
    try {
      const html = await zip.readText(chapterPath);
      const extracted = extractHtmlText(html);
      if (extracted.text.trim()) {
        const chunks = splitLongChapter(extracted.text, 26000);
        chunks.forEach((chunk, chunkIndex) => {
          chapters.push({
            id: createId("chapter"),
            title: chunkIndex
              ? `${extracted.title || `Chapter ${chapters.length + 1}`} · ${chunkIndex + 1}`
              : extracted.title || `Chapter ${chapters.length + 1}`,
            text: chunk
          });
        });
      }
    } catch (_) {
      // Skip optional absent spine items
    }
  }

  if (!chapters.length) {
    throw new Error("EPUB 没有解析出可阅读章节，可能是 DRM 加密或扫描版图片。");
  }
  return { title, author, chapters };
}

export function splitParagraphs(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function splitTextIntoChapters(text, fallbackTitle) {
  const lines = text.replace(/\r/g, "").split("\n");
  const markers = [];
  lines.forEach((line, index) => {
    if (
      /^\s*(chapter|part)\s+([0-9ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(line) ||
      /^\s*第.{1,8}[章节回]\s*/.test(line)
    ) {
      markers.push({ index, title: line.trim() });
    }
  });

  if (markers.length > 1) {
    return markers
      .map((marker, idx) => {
        const next = markers[idx + 1]?.index ?? lines.length;
        return {
          title: marker.title,
          text: lines.slice(marker.index + 1, next).join("\n").trim()
        };
      })
      .filter((item) => item.text);
  }

  const normalized = text.trim();
  const chunks = [];
  const chunkSize = 28000;
  for (let start = 0; start < normalized.length; start += chunkSize) {
    chunks.push({
      title: chunks.length ? `Part ${chunks.length + 1}` : fallbackTitle || "Part 1",
      text: normalized.slice(start, start + chunkSize)
    });
  }
  return chunks.length ? chunks : [{ title: fallbackTitle || "Text", text: "" }];
}

function splitLongChapter(text, maxLength) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return [value];
  const paragraphs = value.split(/\n\s*\n+/);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxLength * 1.25) return [chunk];
    const parts = [];
    for (let start = 0; start < chunk.length; start += maxLength) {
      parts.push(chunk.slice(start, start + maxLength));
    }
    return parts;
  });
}

async function readZip(buffer) {
  const view = new DataView(buffer);
  const decoder = new TextDecoder("utf-8");
  const eocd = findEocd(view);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const entries = new Map();
  let cursor = centralOffset;

  for (let i = 0; i < entryCount; i += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameBytes = new Uint8Array(buffer, cursor + 46, fileNameLength);
    const name = decoder.decode(nameBytes);
    entries.set(name, { name, method, compressedSize, localOffset });
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  async function readBytes(name) {
    const entry = entries.get(name) || entries.get(decodeURIComponent(name));
    if (!entry) throw new Error(`EPUB 中找不到文件：${name}`);
    const local = entry.localOffset;
    if (view.getUint32(local, true) !== 0x04034b50) {
      throw new Error("EPUB ZIP local header 异常。");
    }
    const fileNameLength = view.getUint16(local + 26, true);
    const extraLength = view.getUint16(local + 28, true);
    const dataStart = local + 30 + fileNameLength + extraLength;
    const compressed = buffer.slice(dataStart, dataStart + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRaw(compressed);
    throw new Error(`EPUB 使用了暂不支持的压缩方法：${entry.method}`);
  }

  return {
    readText: async (name) => decoder.decode(await readBytes(name))
  };
}

function findEocd(view) {
  const min = Math.max(0, view.byteLength - 66000);
  for (let i = view.byteLength - 22; i >= min; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error("不是有效的 EPUB ZIP 文件。");
}

async function inflateRaw(buffer) {
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer();
}

function parseXml(text) {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.getElementsByTagName("parsererror").length) {
    throw new Error("XML 解析失败。");
  }
  return xml;
}

function extractHtmlText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, link, iframe, object").forEach((node) => node.remove());
  const title = doc.querySelector("h1,h2,h3,title")?.textContent?.trim() || "";
  const body = doc.body || doc.documentElement;
  const text = extractVisibleText(body)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

function extractVisibleText(root) {
  if (!root) return "";
  const blockTags = new Set([
    "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt",
    "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table",
    "tbody", "td", "tfoot", "th", "thead", "tr", "ul"
  ]);
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue.replace(/\s+/g, " ");
      if (value.trim()) parts.push(value);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (blockTags.has(tag)) parts.push("\n");
    Array.from(node.childNodes).forEach(walk);
    if (blockTags.has(tag)) parts.push("\n");
  };
  walk(root);
  return parts.join("");
}

function firstByLocalName(doc, localName) {
  return Array.from(doc.getElementsByTagName("*")).find((node) => node.localName === localName) || null;
}

function textOf(node) {
  return node?.textContent?.trim() || "";
}

function dirname(filePath) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(0, index + 1) : "";
}

function joinPath(base, href) {
  const cleanHref = decodeURIComponent(String(href || "").split("#")[0]);
  const parts = `${base}${cleanHref}`.split("/");
  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function decodeText(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch (_) {
    return new TextDecoder("gb18030").decode(buffer);
  }
}
