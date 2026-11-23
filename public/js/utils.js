export function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function stripExtension(fileName) {
  return String(fileName || "Untitled").replace(/\.[^.]+$/, "");
}

export function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function limitText(text, limit) {
  const value = String(text || "");
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

export function unique(items) {
  return Array.from(new Set(items));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatDate(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function formatDateTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

export function isSafeHttpUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (_) {
    return false;
  }
}

export function renderSafeMarkdown(text) {
  if (!text) return "";
  const raw = String(text);
  // Require DOMPurify before rendering HTML from Markdown to prevent XSS
  if (window.marked && window.DOMPurify) {
    try {
      window.marked.setOptions({ breaks: true, gfm: true });
      const html = window.marked.parse(raw);
      return window.DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "b", "em", "i", "code", "pre",
          "ul", "ol", "li", "blockquote", "h3", "h4", "hr", "span"
        ],
        ALLOWED_ATTR: ["class"]
      });
    } catch (_) {
      return escapeHtml(raw).replace(/\n/g, "<br>");
    }
  }
  return escapeHtml(raw).replace(/\n/g, "<br>");
}

export function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadText(fileName, text, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function toast(message) {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = String(message || "");
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3400);
}

export function renderEmptyText(title, body) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
      </div>
    </div>
  `;
}

export function highlightWordInText(sentence, targetWord) {
  const safeSentence = escapeHtml(sentence || "");
  const cleanWord = String(targetWord || "").trim();
  if (!cleanWord || !/^[A-Za-z]+(?:['-][A-Za-z]+)?$/.test(cleanWord)) {
    return safeSentence;
  }
  const escapedPattern = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b(${escapedPattern}[a-z]*)\\b`, "gi");
  return safeSentence.replace(regex, `<mark class="reader-highlight" data-color="amber">$1</mark>`);
}
