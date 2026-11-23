import { dbRemove } from "./storage.js";
import {
  downloadText,
  escapeAttr,
  escapeHtml,
  formatDateTime,
  renderEmptyText,
  toast
} from "./utils.js";

function getFilteredNotes(state) {
  const query = (state.notesQuery || "").trim().toLowerCase();
  const bookId = state.notesBookFilter || "all";
  return state.notes
    .filter((item) => {
      if (bookId !== "all" && item.bookId !== bookId) return false;
      if (query) {
        const hay = `${item.quote || ""} ${item.note || ""} ${item.bookTitle || ""} ${item.chapterTitle || ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

export function renderNotes(ctx) {
  const { state, els } = ctx;
  els.notesView.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div class="page-title">
          <h1>高亮与笔记</h1>
          <p>共 <span class="tabular">${state.notes.length}</span> 条阅读摘录与批注</p>
        </div>
        <div class="toolbar">
          <button id="exportNotesMdBtn" class="btn ghost" ${state.notes.length ? "" : "disabled"}>导出 Markdown</button>
        </div>
      </header>
      <div class="content-scroll">
        ${
          !state.notes.length
            ? renderEmptyText("还没有高亮或笔记", "在阅读器中划选任意英文句子，点击悬浮工具栏的「高亮」或「记笔记」。")
            : `
          <div class="filter-bar">
            <input id="notesSearchInput" class="input" style="width:260px" placeholder="搜索原文摘录或笔记内容" value="${escapeAttr(state.notesQuery || "")}" />
            <select id="notesBookSelect" class="select" style="width:200px">
              <option value="all">全部书籍</option>
              ${state.books
                .map(
                  (b) =>
                    `<option value="${escapeAttr(b.id)}" ${state.notesBookFilter === b.id ? "selected" : ""}>${escapeHtml(b.title)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div id="notesListHost"></div>
        `
        }
      </div>
    </div>
  `;

  document.getElementById("exportNotesMdBtn")?.addEventListener("click", () => exportNotesMarkdown(state));
  document.getElementById("notesSearchInput")?.addEventListener("input", (e) => {
    state.notesQuery = e.target.value;
    renderNotesListOnly(ctx);
  });
  document.getElementById("notesBookSelect")?.addEventListener("change", (e) => {
    state.notesBookFilter = e.target.value;
    renderNotesListOnly(ctx);
  });

  if (state.notes.length) {
    renderNotesListOnly(ctx);
  }
}

export function renderNotesListOnly(ctx) {
  const { state } = ctx;
  const host = document.getElementById("notesListHost");
  if (!host) return;
  const items = getFilteredNotes(state);
  if (!items.length) {
    host.innerHTML = renderEmptyText("没有找到匹配的笔记", "尝试调整搜索关键词或书籍筛选。");
    return;
  }

  host.innerHTML = `
    <div class="note-list-grid">
      ${items
        .map(
          (item) => `
        <article class="note-card">
          <div class="muted" style="display:flex;justify-content:space-between;gap:8px">
            <span>${escapeHtml(item.bookTitle || "未知书籍")}${item.chapterTitle ? ` · ${escapeHtml(item.chapterTitle)}` : ""}</span>
            <span class="tabular">${formatDateTime(item.updatedAt || item.createdAt)}</span>
          </div>
          <blockquote class="note-quote">
            <mark class="reader-highlight" data-color="${escapeAttr(item.color || "amber")}">${escapeHtml(item.quote || "")}</mark>
          </blockquote>
          ${item.note ? `<div style="font-size:14px;white-space:pre-wrap">${escapeHtml(item.note)}</div>` : `<div class="muted">纯高亮摘录（暂无批注）</div>`}
          <div class="toolbar" style="margin-top:auto">
            <button class="btn ghost small" data-jump-note="${item.id}">跳转原文</button>
            <button class="btn ghost small" data-edit-note="${item.id}">编辑</button>
            <button class="btn danger small" data-delete-note="${item.id}" style="margin-left:auto">删除</button>
          </div>
        </article>
      `
        )
        .join("")}
    </div>
  `;

  host.querySelectorAll("[data-jump-note]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const note = state.notes.find((n) => n.id === btn.dataset.jumpNote);
      if (!note) return;
      await ctx.openBook(note.bookId, note.chapterIndex, note.quote);
    });
  });

  host.querySelectorAll("[data-edit-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = state.notes.find((n) => n.id === btn.dataset.editNote);
      if (note) ctx.openNoteModal({ existingNote: note });
    });
  });

  host.querySelectorAll("[data-delete-note]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteNote;
      await dbRemove("notes", id);
      state.notes = state.notes.filter((n) => n.id !== id);
      ctx.updateBookStats();
      renderNotes(ctx);
      toast("已删除该笔记");
    });
  });
}

function exportNotesMarkdown(state) {
  const grouped = new Map();
  state.notes.forEach((n) => {
    const key = n.bookTitle || "未分类书籍";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(n);
  });

  const lines = [
    "# AI English Reader 阅读高亮与笔记",
    "",
    `> 导出时间：${new Date().toLocaleString("zh-CN")}`,
    `> 共 ${state.notes.length} 条记录`,
    ""
  ];

  for (const [bookTitle, items] of grouped.entries()) {
    lines.push(`## ${bookTitle}`, "");
    items.forEach((item) => {
      if (item.chapterTitle) lines.push(`### ${item.chapterTitle}`, "");
      lines.push(`> ${item.quote}`, "");
      if (item.note) lines.push(item.note, "");
      lines.push(`*记录时间：${formatDateTime(item.updatedAt || item.createdAt)}*`, "", "---", "");
    });
  }

  downloadText("reading-notes.md", lines.join("\n"), "text/markdown;charset=utf-8");
}
