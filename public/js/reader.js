import { abortActiveAiRequest, requestAiJson } from "./ai.js";
import {
  extractWord,
  fetchOnlineDictionary,
  fetchOnlineTranslation,
  formatPosAbbr,
  lookupLocalDictionary,
  onTtsStateChange,
  playWordPronunciation,
  ttsIsSpeaking,
  ttsSpeak,
  ttsStop
} from "./dictionary.js";
import { splitParagraphs } from "./parsers.js";
import { dbPut, saveBooks, saveSettings } from "./storage.js";
import {
  clamp,
  createId,
  escapeAttr,
  escapeHtml,
  limitText,
  normalizeWhitespace,
  renderSafeMarkdown,
  toast,
  unique
} from "./utils.js";

let pdfDoc = null;
let pdfObserver = null;
let pdfRenderedPages = new Set();
let pdfScale = 1.35;
let pdfCurrentPage = 1;
let pdfTotalPages = 0;
let scrollSaveTimer = null;
let autoSelectTimer = null;
let ttsUnsubscribe = null;

function cleanupPdfObserver() {
  if (pdfObserver) {
    pdfObserver.disconnect();
    pdfObserver = null;
  }
  pdfRenderedPages.clear();
  pdfDoc = null;
}

export function renderReader(ctx) {
  const { state, els } = ctx;
  cleanupPdfObserver();

  if (ttsUnsubscribe) {
    ttsUnsubscribe();
    ttsUnsubscribe = null;
  }

  if (!state.currentBookId) {
    els.readerView.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-inner">
            <h2>选择一本书开始精读</h2>
            <p>从书库打开 EPUB、TXT 或 PDF，即可进行语境查词、长难句拆解、段落精讲与高亮笔记。</p>
            <button id="goLibraryBtn" class="btn primary">前往书库</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("goLibraryBtn")?.addEventListener("click", () => ctx.setView("library"));
    return;
  }

  if (state.readerError) {
    els.readerView.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-inner">
            <h2>暂时无法打开这本书</h2>
            <p>${escapeHtml(state.readerError)}</p>
            <div class="toolbar" style="justify-content:center">
              <button id="goLibraryBtn" class="btn primary">回到书库</button>
              <button id="retryOpenBookBtn" class="btn ghost">重试打开</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById("goLibraryBtn")?.addEventListener("click", () => ctx.setView("library"));
    document.getElementById("retryOpenBookBtn")?.addEventListener("click", () => ctx.openBook(state.currentBookId));
    return;
  }

  const book = ctx.findBook(state.currentBookId);
  const content = state.currentBookContent;
  if (!book || !content) {
    els.readerView.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-inner">
            <h2>正文数据缺失</h2>
            <p>书库中存在该书记录，但未找到本地正文缓存。请删除记录后重新导入。</p>
            <button id="goLibraryBtn" class="btn primary">回到书库</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("goLibraryBtn")?.addEventListener("click", () => ctx.setView("library"));
    return;
  }

  const chapters = content.chapters || [];
  if (!chapters.length) {
    state.readerError = "该文件未解析出可阅读章节，可能是加密或纯图片格式。";
    renderReader(ctx);
    return;
  }

  const chapter = chapters[state.currentChapterIndex] || chapters[0];
  const isPdf = book.format === "pdf";
  const canGoPrev = state.currentChapterIndex > 0;
  const canGoNext = state.currentChapterIndex < chapters.length - 1;
  const layoutClasses = [
    "reader-layout",
    state.tocCollapsed ? "toc-collapsed" : "",
    state.panelCollapsed ? "panel-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");

  els.readerView.innerHTML = `
    <div id="readerLayout" class="${layoutClasses}" style="--panel-width: ${state.panelWidth}px">
      <aside class="reader-pane toc-pane" aria-label="章节目录">
        <div class="pane-header">
          <strong>目录 · <span class="tabular">${chapters.length}</span> 节</strong>
          <button id="toggleTocBtn" class="btn ghost icon-btn" title="收起目录" aria-label="收起目录">‹</button>
        </div>
        <div class="pane-scroll">
          <ul class="toc-list">
            ${chapters
              .map(
                (item, index) => `
              <li>
                <button class="toc-item ${index === state.currentChapterIndex ? "is-active" : ""}" data-chapter-index="${index}">
                  ${escapeHtml(item.title || `Chapter ${index + 1}`)}
                </button>
              </li>`
              )
              .join("")}
          </ul>
        </div>
      </aside>

      <section id="readerMain" class="reader-main" style="--reader-font-size: ${state.settings.reader.fontSize}px; --reader-line-height: ${state.settings.reader.lineHeight};">
        <div class="reader-topbar">
          <div class="reader-title-group">
            <button id="toggleTocBtnTop" class="btn ghost small" title="展开/收起目录">目录</button>
            <div class="reader-title" title="${escapeAttr(book.title)}">${escapeHtml(book.title)}</div>
          </div>
          <div class="toolbar">
            ${
              !isPdf
                ? `
              <button class="btn ghost small" id="prevChapterBtn" ${canGoPrev ? "" : "disabled"} title="上一节 (Alt+←)">上一节</button>
              <button class="btn ghost small" id="nextChapterBtn" ${canGoNext ? "" : "disabled"} title="下一节 (Alt+→)">下一节</button>
              <button class="btn ghost small ${state.readerSearchOpen ? "is-active-toggle" : ""}" id="toggleSearchBtn" title="书内搜索 (Ctrl+F)">搜索</button>
            `
                : ""
            }
            <button class="btn ghost small ${ttsIsSpeaking() ? "is-active-toggle" : ""}" id="ttsToggleBtn" title="朗读选中文本或本节内容">
              ${ttsIsSpeaking() ? "停止朗读" : "朗读"}
            </button>
            <button class="btn ghost small" id="fontDownBtn" title="减小字号 (Ctrl+-)">A-</button>
            <button class="btn ghost small" id="fontUpBtn" title="增大字号 (Ctrl+=)">A+</button>
            <button class="btn ghost small" id="saveProgressBtn" title="保存阅读进度">保存进度</button>
            <button class="btn ghost small" id="togglePanelBtn" title="展开/收起学习侧栏">${state.panelCollapsed ? "学习侧栏" : "收起侧栏"}</button>
          </div>
        </div>

        <div id="readerSearchBar" class="reader-search-bar" ${state.readerSearchOpen && !isPdf ? "" : "hidden"}>
          <div class="reader-search-row">
            <input id="readerSearchInput" class="input" placeholder="在全书中搜索英文关键词或短语..." value="${escapeAttr(state.readerSearch || "")}" />
            <button id="readerSearchClose" class="btn ghost small">关闭</button>
          </div>
          <div id="readerSearchResults" class="search-results-list"></div>
        </div>

        ${
          isPdf
            ? `
          <div class="pdf-toolbar">
            <button id="pdfZoomOut" class="btn ghost small" title="缩小">−</button>
            <span id="pdfZoomLabel" class="muted tabular">${Math.round(pdfScale * 100)}%</span>
            <button id="pdfZoomIn" class="btn ghost small" title="放大">+</button>
            <span class="muted">·</span>
            <span class="muted">第</span>
            <input id="pdfPageInput" class="input tabular" type="number" min="1" value="${book.progress?.pdfPage || 1}" style="width:68px;height:30px;text-align:center;" />
            <span id="pdfTotalPagesLabel" class="muted tabular">/ -- 页</span>
          </div>
          <div id="pdfContainer" class="pdf-container">
            <div id="pdfPages" class="pdf-pages">
              <div class="empty-state"><p style="color:#d1d5db">正在准备 PDF 文档...</p></div>
            </div>
          </div>
        `
            : `
          <div id="readerScroll" class="reader-scroll">
            ${renderTextChapter(ctx, book, chapter, canGoPrev, canGoNext)}
          </div>
        `
        }
      </section>

      <aside class="reader-pane study-pane" aria-label="AI 学习侧栏">
        <div class="resize-handle" id="resizeHandle" title="拖动调整侧栏宽度"></div>
        <div class="pane-header">
          <strong>学习侧栏</strong>
          <span class="muted tabular">${escapeHtml(state.settings.ai.quickModel || "deepseek-chat")}</span>
        </div>
        <div id="studyPanelHost" class="pane-scroll">
          ${renderStudyPanel(state)}
        </div>
      </aside>
    </div>
  `;

  bindReaderEvents(ctx, book, content);
}

function renderTextChapter(ctx, book, chapter, canGoPrev, canGoNext) {
  const paragraphs = splitParagraphs(chapter?.text || "");
  const chapterNotes = ctx.state.notes.filter(
    (n) => n.bookId === book.id && n.chapterIndex === ctx.state.currentChapterIndex
  );

  const renderedParas = paragraphs.length
    ? paragraphs
        .map((part, idx) => `<p data-para-index="${idx}">${applyHighlightsToParagraph(part, chapterNotes)}</p>`)
        .join("")
    : `<p class="muted">这一节没有解析出正文，可以尝试切换下一节或重新导入原文件。</p>`;

  return `
    <article id="readingBody" class="reading-body" tabindex="0">
      <h2>${escapeHtml(chapter?.title || "Untitled")}</h2>
      ${renderedParas}
      <div class="chapter-footer-nav">
        <button class="btn ghost" id="footerPrevBtn" ${canGoPrev ? "" : "disabled"}>← 上一节</button>
        <span class="muted tabular">${ctx.state.currentChapterIndex + 1} / ${(ctx.state.currentBookContent?.chapters || []).length}</span>
        <button class="btn ghost" id="footerNextBtn" ${canGoNext ? "" : "disabled"}>下一节 →</button>
      </div>
    </article>
  `;
}

function applyHighlightsToParagraph(paragraphText, chapterNotes) {
  let html = escapeHtml(paragraphText);
  if (!chapterNotes.length) return html;

  // Apply non-overlapping highlights safely on escaped text
  const sorted = [...chapterNotes].sort((a, b) => (b.quote?.length || 0) - (a.quote?.length || 0));
  for (const note of sorted) {
    const escapedQuote = escapeHtml(normalizeWhitespace(note.quote || ""));
    if (!escapedQuote || escapedQuote.length < 2) continue;
    const idx = html.indexOf(escapedQuote);
    if (idx < 0) continue;
    // Skip if already inside an existing <mark> tag
    const before = html.slice(0, idx);
    const openMarks = (before.match(/<mark\b/g) || []).length;
    const closeMarks = (before.match(/<\/mark>/g) || []).length;
    if (openMarks > closeMarks) continue;

    const color = escapeAttr(note.color || "amber");
    const titleAttr = note.note ? ` title="${escapeAttr(note.note)}"` : "";
    html =
      before +
      `<mark class="reader-highlight" data-note-id="${escapeAttr(note.id)}" data-color="${color}"${titleAttr}>${escapedQuote}</mark>` +
      html.slice(idx + escapedQuote.length);
  }
  return html;
}

export function refreshChapterBodyOnly(ctx) {
  const book = ctx.findBook(ctx.state.currentBookId);
  const content = ctx.state.currentBookContent;
  const scroller = document.getElementById("readerScroll");
  if (!book || !content || !scroller || book.format === "pdf") return;
  const savedTop = scroller.scrollTop;
  const chapters = content.chapters || [];
  const chapter = chapters[ctx.state.currentChapterIndex] || chapters[0];
  const canGoPrev = ctx.state.currentChapterIndex > 0;
  const canGoNext = ctx.state.currentChapterIndex < chapters.length - 1;
  scroller.innerHTML = renderTextChapter(ctx, book, chapter, canGoPrev, canGoNext);
  scroller.scrollTop = savedTop;
  bindReadingBodyEvents(ctx);
}

function bindReaderEvents(ctx, book, content) {
  const { state, els } = ctx;
  const chapters = content.chapters || [];

  els.readerView.querySelectorAll("[data-chapter-index]").forEach((button) => {
    button.addEventListener("click", () => {
      goToChapter(ctx, Number(button.dataset.chapterIndex));
    });
  });

  document.getElementById("prevChapterBtn")?.addEventListener("click", () => goToChapter(ctx, state.currentChapterIndex - 1));
  document.getElementById("nextChapterBtn")?.addEventListener("click", () => goToChapter(ctx, state.currentChapterIndex + 1));

  document.getElementById("saveProgressBtn")?.addEventListener("click", () => {
    const scroller = book.format === "pdf" ? document.getElementById("pdfContainer") : document.getElementById("readerScroll");
    if (scroller) {
      saveReaderProgress(ctx, book.id, scroller);
      toast("阅读进度已保存");
    }
  });

  // TTS toggle with Start / Stop
  const ttsBtn = document.getElementById("ttsToggleBtn");
  ttsBtn?.addEventListener("click", () => {
    if (ttsIsSpeaking()) {
      ttsStop();
      return;
    }
    const sel = window.getSelection()?.toString().trim();
    const rate = state.settings.reader.ttsRate || 0.95;
    if (sel) {
      ttsSpeak(sel, { rate });
      return;
    }
    const readingBody = document.getElementById("readingBody");
    if (readingBody) {
      const text = readingBody.innerText.trim();
      if (text) ttsSpeak(text.slice(0, 6000), { rate });
    } else {
      toast("请先选中需要朗读的英文文本。");
    }
  });

  ttsUnsubscribe = onTtsStateChange((speaking) => {
    const btn = document.getElementById("ttsToggleBtn");
    if (!btn) return;
    btn.textContent = speaking ? "停止朗读" : "朗读";
    btn.classList.toggle("is-active-toggle", speaking);
  });

  // Font size adjustments mutate CSS variable directly without destroying PDF/scroll
  document.getElementById("fontDownBtn")?.addEventListener("click", () => adjustFontSize(ctx, -1));
  document.getElementById("fontUpBtn")?.addEventListener("click", () => adjustFontSize(ctx, 1));

  // TOC & Right panel toggles mutate layout classes directly (no full re-render!)
  const toggleToc = () => {
    state.tocCollapsed = !state.tocCollapsed;
    document.getElementById("readerLayout")?.classList.toggle("toc-collapsed", state.tocCollapsed);
  };
  document.getElementById("toggleTocBtn")?.addEventListener("click", toggleToc);
  document.getElementById("toggleTocBtnTop")?.addEventListener("click", toggleToc);

  document.getElementById("togglePanelBtn")?.addEventListener("click", () => {
    state.panelCollapsed = !state.panelCollapsed;
    document.getElementById("readerLayout")?.classList.toggle("panel-collapsed", state.panelCollapsed);
    const btn = document.getElementById("togglePanelBtn");
    if (btn) btn.textContent = state.panelCollapsed ? "学习侧栏" : "收起侧栏";
  });

  // Leak-free panel resizer: mousemove/mouseup attached only while dragging
  const resizeHandle = document.getElementById("resizeHandle");
  if (resizeHandle) {
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = state.panelWidth;
      resizeHandle.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMouseMove = (moveEvent) => {
        const delta = startX - moveEvent.clientX;
        const newWidth = clamp(startWidth + delta, 280, 620);
        state.panelWidth = newWidth;
        document.getElementById("readerLayout")?.style.setProperty("--panel-width", `${newWidth}px`);
      };

      const onMouseUp = () => {
        resizeHandle.classList.remove("is-dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  // In-book search
  document.getElementById("toggleSearchBtn")?.addEventListener("click", () => toggleInBookSearch(ctx));
  document.getElementById("readerSearchClose")?.addEventListener("click", () => toggleInBookSearch(ctx, false));
  const searchInput = document.getElementById("readerSearchInput");
  searchInput?.addEventListener("input", (event) => {
    state.readerSearch = event.target.value;
    renderInBookSearchResults(ctx, chapters);
  });
  if (state.readerSearchOpen && state.readerSearch) {
    renderInBookSearchResults(ctx, chapters);
  }

  // Reading scroll & progress
  const readerScroll = document.getElementById("readerScroll");
  readerScroll?.addEventListener("scroll", () => {
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => saveReaderProgress(ctx, book.id, readerScroll), 300);
  });

  if (book.format !== "pdf" && readerScroll) {
    requestAnimationFrame(() => {
      const saved = book.progress;
      readerScroll.scrollTop = saved?.chapterIndex === state.currentChapterIndex ? saved.scrollTop || 0 : 0;
    });
    bindReadingBodyEvents(ctx);
  } else if (book.format === "pdf" && content.pdfBuffer) {
    initLazyPdfViewer(ctx, book, content);
  }

  bindStudyPanelActions(ctx);
}

function bindReadingBodyEvents(ctx) {
  const { state } = ctx;
  const readingBody = document.getElementById("readingBody");
  if (!readingBody) return;

  readingBody.addEventListener("mouseup", (e) => {
    if (e.target.closest("button")) return;
    handleReadingSelection(ctx);
  });
  readingBody.addEventListener("keyup", () => handleReadingSelection(ctx));
  readingBody.addEventListener("dblclick", () => handleDoubleClickWord(ctx));

  readingBody.addEventListener("click", (e) => {
    const mark = e.target.closest("mark.reader-highlight");
    if (!mark) return;
    const noteId = mark.dataset.noteId;
    const existing = state.notes.find((n) => n.id === noteId);
    if (existing) {
      ctx.openNoteModal({ existingNote: existing });
    }
  });

  document.getElementById("footerPrevBtn")?.addEventListener("click", () => goToChapter(ctx, state.currentChapterIndex - 1));
  document.getElementById("footerNextBtn")?.addEventListener("click", () => goToChapter(ctx, state.currentChapterIndex + 1));
}

export function adjustFontSize(ctx, delta) {
  const { state } = ctx;
  state.settings.reader.fontSize = clamp((state.settings.reader.fontSize || 18) + delta, 14, 28);
  saveSettings(state.settings);
  document.getElementById("readerMain")?.style.setProperty("--reader-font-size", `${state.settings.reader.fontSize}px`);
}

export function goToChapter(ctx, nextIndex, highlightSnippet = "") {
  const { state } = ctx;
  const chapters = state.currentBookContent?.chapters || [];
  if (nextIndex < 0 || nextIndex >= chapters.length) return;
  state.currentChapterIndex = nextIndex;
  state.selectedText = "";
  state.wordCard = null;
  state.aiResult = null;
  const book = ctx.findBook(state.currentBookId);
  if (book) {
    book.progress = {
      chapterIndex: nextIndex,
      scrollTop: 0,
      percentage: chapters.length > 1 ? nextIndex / (chapters.length - 1) : 0
    };
    saveBooks(state.books);
  }
  renderReader(ctx);
  if (highlightSnippet) {
    requestAnimationFrame(() => {
      const paras = document.querySelectorAll("#readingBody p");
      const lower = highlightSnippet.toLowerCase();
      for (const p of paras) {
        if (p.textContent.toLowerCase().includes(lower)) {
          p.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        }
      }
    });
  }
}

export function toggleInBookSearch(ctx, forceState) {
  const { state } = ctx;
  const book = ctx.findBook(state.currentBookId);
  if (!book || book.format === "pdf") return;
  state.readerSearchOpen = typeof forceState === "boolean" ? forceState : !state.readerSearchOpen;
  const bar = document.getElementById("readerSearchBar");
  const btn = document.getElementById("toggleSearchBtn");
  if (bar) bar.hidden = !state.readerSearchOpen;
  if (btn) btn.classList.toggle("is-active-toggle", state.readerSearchOpen);
  if (state.readerSearchOpen) {
    const input = document.getElementById("readerSearchInput");
    input?.focus();
    input?.select();
    renderInBookSearchResults(ctx, state.currentBookContent?.chapters || []);
  }
}

function renderInBookSearchResults(ctx, chapters) {
  const host = document.getElementById("readerSearchResults");
  if (!host) return;
  const query = (ctx.state.readerSearch || "").trim();
  if (query.length < 2) {
    host.innerHTML = query ? `<div class="muted">请输入至少 2 个字符开始搜索</div>` : "";
    return;
  }
  const lower = query.toLowerCase();
  const hits = [];
  for (let i = 0; i < chapters.length && hits.length < 30; i += 1) {
    const text = chapters[i].text || "";
    const idx = text.toLowerCase().indexOf(lower);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 48);
    const end = Math.min(text.length, idx + query.length + 72);
    hits.push({
      chapterIndex: i,
      chapterTitle: chapters[i].title || `Chapter ${i + 1}`,
      snippet: normalizeWhitespace(text.slice(start, end))
    });
  }

  if (!hits.length) {
    host.innerHTML = `<div class="muted">全书中未找到 “${escapeHtml(query)}”</div>`;
    return;
  }

  host.innerHTML = hits
    .map(
      (hit) => `
    <button class="search-hit-item" data-hit-chapter="${hit.chapterIndex}">
      <div class="search-hit-chapter">${escapeHtml(hit.chapterTitle)}</div>
      <div class="search-hit-snippet">...${escapeHtml(hit.snippet)}...</div>
    </button>
  `
    )
    .join("");

  host.querySelectorAll("[data-hit-chapter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToChapter(ctx, Number(btn.dataset.hitChapter), query);
    });
  });
}

// ========== Lazy PDF.js Viewer ==========
async function initLazyPdfViewer(ctx, book, content) {
  const pagesHost = document.getElementById("pdfPages");
  const container = document.getElementById("pdfContainer");
  if (!pagesHost || !container) return;

  if (!window.pdfjsLib) {
    pagesHost.innerHTML = `<div class="empty-state"><p style="color:#d1d5db">PDF.js 加载失败，请检查网络连接。</p></div>`;
    return;
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  try {
    pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(content.pdfBuffer.slice(0)) }).promise;
    pdfTotalPages = pdfDoc.numPages;
    pdfCurrentPage = clamp(Number(book.progress?.pdfPage || 1), 1, pdfTotalPages);

    const totalLabel = document.getElementById("pdfTotalPagesLabel");
    if (totalLabel) totalLabel.textContent = `/ ${pdfTotalPages} 页`;
    const pageInput = document.getElementById("pdfPageInput");
    if (pageInput) {
      pageInput.max = String(pdfTotalPages);
      pageInput.value = String(pdfCurrentPage);
    }

    await buildPdfPageShells(ctx, pagesHost, container);

    // Jump to saved page
    if (pdfCurrentPage > 1) {
      const targetWrapper = pagesHost.querySelector(`[data-pdf-page="${pdfCurrentPage}"]`);
      targetWrapper?.scrollIntoView({ block: "start" });
    }

    // Bind PDF toolbar controls
    document.getElementById("pdfZoomOut")?.addEventListener("click", async () => {
      pdfScale = clamp(Math.round((pdfScale - 0.15) * 100) / 100, 0.75, 2.4);
      document.getElementById("pdfZoomLabel").textContent = `${Math.round(pdfScale * 100)}%`;
      await buildPdfPageShells(ctx, pagesHost, container);
    });
    document.getElementById("pdfZoomIn")?.addEventListener("click", async () => {
      pdfScale = clamp(Math.round((pdfScale + 0.15) * 100) / 100, 0.75, 2.4);
      document.getElementById("pdfZoomLabel").textContent = `${Math.round(pdfScale * 100)}%`;
      await buildPdfPageShells(ctx, pagesHost, container);
    });
    pageInput?.addEventListener("change", () => {
      const target = clamp(Number(pageInput.value) || 1, 1, pdfTotalPages);
      pageInput.value = String(target);
      pdfCurrentPage = target;
      pagesHost.querySelector(`[data-pdf-page="${target}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      saveReaderProgress(ctx, book.id, container);
    });

    container.addEventListener("scroll", () => {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        updateCurrentPdfPageFromScroll(container, pagesHost);
        saveReaderProgress(ctx, book.id, container);
      }, 250);
    });
  } catch (error) {
    pagesHost.innerHTML = `<div class="empty-state"><p style="color:#d1d5db">PDF 加载失败：${escapeHtml(error.message || error)}</p></div>`;
  }
}

async function buildPdfPageShells(ctx, pagesHost, container) {
  if (!pdfDoc) return;
  if (pdfObserver) pdfObserver.disconnect();
  pdfRenderedPages.clear();
  pagesHost.innerHTML = "";

  const firstPage = await pdfDoc.getPage(1);
  const defaultViewport = firstPage.getViewport({ scale: pdfScale });

  for (let pageNum = 1; pageNum <= pdfTotalPages; pageNum += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "pdf-page-wrapper";
    wrapper.dataset.pdfPage = String(pageNum);
    wrapper.style.width = `${Math.round(defaultViewport.width)}px`;
    wrapper.style.height = `${Math.round(defaultViewport.height)}px`;
    wrapper.innerHTML = `<div class="pdf-page-placeholder tabular">第 ${pageNum} 页</div>`;
    pagesHost.appendChild(wrapper);
  }

  pdfObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const pageNum = Number(entry.target.dataset.pdfPage);
        if (!pdfRenderedPages.has(pageNum)) {
          pdfRenderedPages.add(pageNum);
          renderSinglePdfPage(ctx, pageNum, entry.target);
        }
      }
    },
    { root: container, rootMargin: "500px 0px" }
  );

  pagesHost.querySelectorAll(".pdf-page-wrapper").forEach((el) => pdfObserver.observe(el));
}

async function renderSinglePdfPage(ctx, pageNum, wrapper) {
  if (!pdfDoc) return;
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: pdfScale });
    wrapper.style.width = `${Math.round(viewport.width)}px`;
    wrapper.style.height = `${Math.round(viewport.height)}px`;
    wrapper.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.display = "block";
    wrapper.appendChild(canvas);

    const textLayerDiv = document.createElement("div");
    textLayerDiv.className = "pdf-text-layer";
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    wrapper.appendChild(textLayerDiv);

    const canvasCtx = canvas.getContext("2d");
    await page.render({ canvasContext: canvasCtx, viewport }).promise;

    const textContent = await page.getTextContent();
    await window.pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport
    }).promise;

    textLayerDiv.addEventListener("mouseup", () => handleReadingSelection(ctx));
    textLayerDiv.addEventListener("dblclick", () => handleDoubleClickWord(ctx));
  } catch (_) {
    pdfRenderedPages.delete(pageNum);
  }
}

function updateCurrentPdfPageFromScroll(container, pagesHost) {
  const containerRect = container.getBoundingClientRect();
  const centerY = containerRect.top + containerRect.height * 0.35;
  const wrappers = pagesHost.querySelectorAll(".pdf-page-wrapper");
  for (const w of wrappers) {
    const rect = w.getBoundingClientRect();
    if (rect.top <= centerY && rect.bottom >= centerY) {
      pdfCurrentPage = Number(w.dataset.pdfPage) || 1;
      const input = document.getElementById("pdfPageInput");
      if (input && document.activeElement !== input) input.value = String(pdfCurrentPage);
      break;
    }
  }
}

function saveReaderProgress(ctx, bookId, scroller) {
  const { state } = ctx;
  const book = ctx.findBook(bookId);
  if (!book || !scroller) return;

  if (book.format === "pdf") {
    const percentage = pdfTotalPages > 0 ? clamp(pdfCurrentPage / pdfTotalPages, 0, 1) : 0;
    book.progress = {
      chapterIndex: 0,
      pdfPage: pdfCurrentPage,
      scrollTop: scroller.scrollTop,
      percentage
    };
  } else {
    const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    const chapterProgress = clamp(scroller.scrollTop / max, 0, 1);
    const chapterCount = Math.max(1, state.currentBookContent?.chapters?.length || 1);
    const percentage = (state.currentChapterIndex + chapterProgress) / chapterCount;
    book.progress = {
      chapterIndex: state.currentChapterIndex,
      scrollTop: scroller.scrollTop,
      percentage: clamp(percentage, 0, 1)
    };
  }
  saveBooks(state.books);
}

// ========== Accurate Selection Context & Floating Toolbar ==========
function buildAccurateSelectionContext(selection, selectedText) {
  let paragraphText = "";
  let approxOffset = -1;

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const paraEl = element?.closest("p[data-para-index], .pdf-text-layer");
    if (paraEl) {
      paragraphText = normalizeWhitespace(paraEl.textContent || "");
      // Measure offset of selection inside the exact paragraph DOM node
      try {
        const preRange = document.createRange();
        preRange.selectNodeContents(paraEl);
        preRange.setEnd(range.startContainer, range.startOffset);
        approxOffset = normalizeWhitespace(preRange.toString()).length;
      } catch (_) {
        approxOffset = paragraphText.indexOf(selectedText);
      }
    }
  }

  if (!paragraphText) {
    return { sentence: selectedText, paragraph: selectedText };
  }

  const sentence = extractSentenceAtOffset(paragraphText, selectedText, approxOffset);
  return { sentence, paragraph: paragraphText };
}

function extractSentenceAtOffset(paragraph, selected, approxOffset) {
  const safe = normalizeWhitespace(paragraph);
  let index = -1;
  if (approxOffset >= 0) {
    // Search nearest occurrence around approxOffset
    const windowStart = Math.max(0, approxOffset - 24);
    const found = safe.indexOf(selected, windowStart);
    if (found >= 0 && Math.abs(found - approxOffset) < 60) {
      index = found;
    }
  }
  if (index < 0) index = safe.indexOf(selected);
  if (index < 0) return selected;

  let start = Math.max(0, index - 1);
  while (start > 0 && !/[.!?。！？]/.test(safe[start])) start -= 1;
  if (/[.!?。！？]/.test(safe[start])) start += 1;

  let end = index + selected.length;
  while (end < safe.length && !/[.!?。！？]/.test(safe[end])) end += 1;
  if (end < safe.length) end += 1;

  return safe.slice(start, end).trim() || selected;
}

function handleReadingSelection(ctx) {
  const { state } = ctx;
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection ? normalizeWhitespace(selection.toString()) : "";
    if (!text) {
      hideSelectionToolbar(ctx);
      return;
    }
    state.selectedText = text;
    state.selectedContext = buildAccurateSelectionContext(selection, text);

    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : null;
    showSelectionToolbar(ctx, rect, text);

    // Always auto-lookup single English words via online bilingual dictionary (free, no AI required)
    if (isSingleWord(text)) {
      clearTimeout(autoSelectTimer);
      autoSelectTimer = setTimeout(() => {
        if (ctx.state.selectedText === text) {
          lookupWordFlow(ctx, text);
        }
      }, 140);
    }
  }, 0);
}

async function handleDoubleClickWord(ctx) {
  clearTimeout(autoSelectTimer);
  const selection = window.getSelection();
  const text = selection ? normalizeWhitespace(selection.toString()) : "";
  const word = extractWord(text);
  if (!word || !isSingleWord(text)) return;

  ctx.state.selectedText = word;
  ctx.state.selectedContext = buildAccurateSelectionContext(selection, word);
  hideSelectionToolbar(ctx);
  if (ctx.state.panelCollapsed) {
    ctx.state.panelCollapsed = false;
    document.getElementById("readerLayout")?.classList.remove("panel-collapsed");
  }
  await lookupWordFlow(ctx, word);
}

function isSingleWord(text) {
  return /^[A-Za-z]+(?:['-][A-Za-z]+)?$/.test(String(text || "").trim());
}

function showSelectionToolbar(ctx, rect, text) {
  const toolbar = ctx.els.selectionToolbar;
  if (!toolbar || !rect || (!rect.width && !rect.height)) return;

  const single = isSingleWord(text);
  const wordCount = (text.match(/[A-Za-z]+/g) || []).length;
  toolbar.querySelector('[data-action="lookup"]').hidden = !single;
  toolbar.querySelector('[data-action="sentence"]').hidden = single;
  toolbar.querySelector('[data-action="paragraph"]').hidden = wordCount < 6;

  toolbar.hidden = false;
  const tbRect = toolbar.getBoundingClientRect();
  const top = Math.max(10, rect.top - tbRect.height - 10);
  const left = clamp(rect.left + rect.width / 2 - tbRect.width / 2, 12, window.innerWidth - tbRect.width - 12);
  toolbar.style.top = `${top}px`;
  toolbar.style.left = `${left}px`;
}

export function hideSelectionToolbar(ctx) {
  if (ctx.els.selectionToolbar) {
    ctx.els.selectionToolbar.hidden = true;
  }
}

// ========== Actions & Study Panel ==========
export async function handleReaderAction(ctx, action) {
  const { state } = ctx;

  if (action === "cancel-ai") {
    abortActiveAiRequest();
    state.aiBusy = false;
    state.aiStreamPreview = "";
    if (state.wordCard) {
      state.wordCard.sentenceAnalysisBusy = false;
      state.wordCard.sentenceAnalysisStream = "";
    }
    renderStudyPanelOnly(ctx);
    return;
  }

  if (action === "save-word") {
    await saveCurrentWord(ctx);
    return;
  }

  if (action === "play-audio" || action === "tts-word") {
    const word = state.wordCard?.word || state.selectedText;
    if (word) {
      playWordPronunciation(word, {
        audioUrl: state.wordCard?.audio,
        rate: state.settings.reader.ttsRate
      });
    }
    return;
  }

  if (action === "tts-selection" || action === "tts-sentence") {
    const text = state.selectedText || state.wordCard?.sourceSentence;
    if (text) ttsSpeak(text, { rate: state.settings.reader.ttsRate });
    return;
  }

  if (action === "word-ai" || action === "word-ai-refresh") {
    await enrichWordWithAi(ctx, action === "word-ai-refresh");
    return;
  }

  if (action === "translate-source-sentence") {
    await translateSourceSentenceWithAi(ctx);
    return;
  }

  if (action === "analyze-context-sentence" || action === "analyze-context-sentence-refresh") {
    if (state.wordCard?.sourceSentence) {
      await analyzeWordContextSentence(ctx, action === "analyze-context-sentence-refresh");
    } else {
      const sentence = state.selectedContext?.sentence || state.selectedText;
      if (sentence) {
        state.selectedText = sentence;
        await analyzeSentenceFlow(ctx, sentence, action === "analyze-context-sentence-refresh");
      }
    }
    return;
  }

  if (action === "highlight") {
    await quickCreateHighlight(ctx);
    return;
  }

  if (action === "add-note") {
    if (!state.selectedText) {
      toast("请先选中正文内容。");
      return;
    }
    ctx.openNoteModal({
      quote: state.selectedText,
      bookId: state.currentBookId,
      chapterIndex: state.currentChapterIndex
    });
    return;
  }

  const text = state.selectedText?.trim();
  if (!text) {
    toast("请先在正文中选中内容。");
    return;
  }

  if (state.panelCollapsed) {
    state.panelCollapsed = false;
    document.getElementById("readerLayout")?.classList.remove("panel-collapsed");
  }

  if (action === "lookup") {
    await lookupWordFlow(ctx, text);
    return;
  }

  if (action === "sentence" || action === "sentence-refresh") {
    state.wordCard = null;
    await analyzeSentenceFlow(ctx, text, action === "sentence-refresh");
    return;
  }

  if (action === "paragraph" || action === "paragraph-refresh") {
    state.wordCard = null;
    const paragraph = state.selectedContext?.paragraph || text;
    await explainParagraphFlow(ctx, paragraph, action === "paragraph-refresh");
  }
}

async function quickCreateHighlight(ctx) {
  const { state } = ctx;
  const quote = normalizeWhitespace(state.selectedText);
  if (!quote || !state.currentBookId) return;
  const book = ctx.findBook(state.currentBookId);
  const chapter = state.currentBookContent?.chapters?.[state.currentChapterIndex];
  const noteItem = {
    id: createId("note"),
    bookId: state.currentBookId,
    bookTitle: book?.title || "",
    chapterIndex: state.currentChapterIndex,
    chapterTitle: chapter?.title || "",
    quote,
    note: "",
    color: "amber",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await dbPut("notes", noteItem);
  state.notes = [noteItem, ...state.notes];
  ctx.updateBookStats();
  refreshChapterBodyOnly(ctx);
  toast("已添加高亮");
}

async function lookupWordFlow(ctx, text) {
  const { state } = ctx;
  const word = extractWord(text);
  if (!word) {
    toast("当前选中内容不是单个英文单词。");
    return;
  }

  const local = lookupLocalDictionary(word);
  const book = ctx.findBook(state.currentBookId);
  const existing = state.vocab.find((item) => item.lemma === local.lemma);
  const sourceSentence = normalizeWhitespace(state.selectedContext?.sentence || state.selectedText || "");
  const canTranslateSentence = Boolean(sourceSentence && sourceSentence.split(/\s+/).length >= 3);

  state.aiResult = null;
  state.wordCard = {
    word,
    lemma: local.lemma,
    definitions: local.definitions,
    partOfSpeech: formatPosAbbr(local.partOfSpeech),
    onlineLoading: true,
    onlineError: "",
    onlineDefinitions: [],
    phonetic: existing?.phonetic || "",
    audio: "",
    contextualMeaning: existing?.contextualMeaning || "",
    sourceSentence,
    sentenceTranslation: "",
    sentenceTranslationSource: "",
    sentenceTranslationLoading: canTranslateSentence,
    sentenceTranslationError: "",
    sentenceAiTranslating: false,
    sentenceAnalysis: null,
    sentenceAnalysisBusy: false,
    sentenceAnalysisStream: "",
    sentenceAnalysisError: "",
    bookId: book?.id,
    bookTitle: book?.title,
    isSaved: Boolean(existing)
  };
  renderStudyPanelOnly(ctx, { resetScroll: true });

  // Run online bilingual dictionary + free online sentence translation in parallel
  const dictTask = (async () => {
    try {
      const data = await fetchOnlineDictionary(word, state.settings.ai.proxyUrl);
      if (state.wordCard?.word?.toLowerCase() !== word.toLowerCase()) return;
      if (data.ok) {
        const firstPos = formatPosAbbr(
          data.partOfSpeech ||
            data.meanings?.find((m) => m.partOfSpeech)?.partOfSpeech ||
            state.wordCard.partOfSpeech
        );
        state.wordCard.lemma = data.word || state.wordCard.lemma;
        state.wordCard.phonetic = data.phonetic || state.wordCard.phonetic;
        state.wordCard.audio = data.audio || "";
        state.wordCard.partOfSpeech = firstPos;
        state.wordCard.cnExplain = data.cnExplain || "";
        if (Array.isArray(data.cnDefinitions) && data.cnDefinitions.length) {
          const cleanLocal = (state.wordCard.definitions || []).filter((d) => !d.startsWith("词缀推测："));
          state.wordCard.definitions = unique([...data.cnDefinitions, ...cleanLocal]);
        }
        state.wordCard.onlineDefinitions = (data.meanings || []).slice(0, 2).map((item) => ({
          ...item,
          partOfSpeech: formatPosAbbr(item.partOfSpeech)
        }));
        state.wordCard.onlineSource = data.source || "online";
      } else {
        state.wordCard.onlineError = "在线词典暂未收录";
      }
    } catch (err) {
      if (state.wordCard?.word?.toLowerCase() !== word.toLowerCase()) return;
      state.wordCard.onlineError = `在线查词失败：${err.message || err}`;
    } finally {
      if (state.wordCard?.word?.toLowerCase() === word.toLowerCase()) {
        state.wordCard.onlineLoading = false;
        if (state.settings.reader.autoSaveVocab && !state.wordCard.isSaved) {
          await saveCurrentWord(ctx, true);
        }
        renderStudyPanelOnly(ctx);
      }
    }
  })();

  const translateTask = canTranslateSentence
    ? (async () => {
        try {
          const tr = await fetchOnlineTranslation(sourceSentence, state.settings.ai.proxyUrl);
          if (state.wordCard?.word?.toLowerCase() !== word.toLowerCase()) return;
          if (tr.ok && tr.translation) {
            state.wordCard.sentenceTranslation = tr.translation;
            state.wordCard.sentenceTranslationSource = "online";
            state.wordCard.sentenceTranslationError = "";
          } else {
            state.wordCard.sentenceTranslationError = "联网翻译暂不可用，可点击下方「AI 翻译」";
          }
        } catch (_) {
          if (state.wordCard?.word?.toLowerCase() !== word.toLowerCase()) return;
          state.wordCard.sentenceTranslationError = "联网翻译暂不可用，可点击下方「AI 翻译」";
        } finally {
          if (state.wordCard?.word?.toLowerCase() === word.toLowerCase()) {
            state.wordCard.sentenceTranslationLoading = false;
            renderStudyPanelOnly(ctx);
          }
        }
      })()
    : Promise.resolve();

  await Promise.all([dictTask, translateTask]);

  if (state.settings.ai.apiKey || state.serverKeyConfigured) {
    await enrichWordWithAi(ctx, false);
  }
}

async function saveCurrentWord(ctx, silent = false) {
  const { state } = ctx;
  const card = state.wordCard;
  if (!card) return;

  const existing = state.vocab.find((item) => item.lemma === card.lemma);
  if (existing) {
    // Update contextual meaning / phonetic if newly enriched
    let changed = false;
    if (card.contextualMeaning && !existing.contextualMeaning) {
      existing.contextualMeaning = card.contextualMeaning;
      changed = true;
    }
    if (card.phonetic && !existing.phonetic) {
      existing.phonetic = card.phonetic;
      changed = true;
    }
    if (changed) {
      existing.updatedAt = new Date().toISOString();
      await dbPut("vocab", existing);
    }
    card.isSaved = true;
    if (!silent) toast("该单词已在生词本中。");
    renderStudyPanelOnly(ctx);
    return;
  }

  const now = new Date().toISOString();
  const item = {
    id: createId("word"),
    word: card.word,
    lemma: card.lemma,
    phonetic: card.phonetic || "",
    partOfSpeech: card.partOfSpeech || "",
    definitions: (card.definitions || []).filter(Boolean),
    contextualMeaning: card.contextualMeaning || "",
    sourceSentence: card.sourceSentence || "",
    bookId: card.bookId,
    bookTitle: card.bookTitle,
    familiarity: 0,
    repetition: 0,
    interval: 0,
    easinessFactor: 2.5,
    reviewCount: 0,
    nextReviewAt: now,
    createdAt: now,
    updatedAt: now
  };
  await dbPut("vocab", item);
  state.vocab = [item, ...state.vocab];
  card.isSaved = true;
  ctx.updateBookStats();
  renderStudyPanelOnly(ctx);
  toast(silent ? `已自动收藏 "${card.word}"` : `已加入生词本 "${card.word}"`);
}

async function enrichWordWithAi(ctx, forceRefresh = false) {
  const { state } = ctx;
  const card = state.wordCard;
  if (!card) return;

  state.aiBusy = true;
  state.aiBusyTask = "word";
  state.aiStreamPreview = "";
  renderStudyPanelOnly(ctx);

  try {
    const res = await requestAiJson({
      taskType: "word_context",
      settings: state.settings,
      forceRefresh,
      cacheContext: {
        bookId: state.currentBookId,
        chapterIndex: state.currentChapterIndex,
        text: `${card.word}|${card.sourceSentence || ""}`
      },
      messages: [
        {
          role: "user",
          content: `请基于以下语境解释英文单词，例句必须是全新独立造句，不要照抄原句。\n\n单词：${card.word}\n所在原句：${card.sourceSentence || state.selectedText}`
        }
      ]
    });

    const data = res.data || {};
    card.contextualMeaning = data.meaningInContext || data.simpleChinese || card.contextualMeaning;
    if (data.phonetic && !card.phonetic) card.phonetic = data.phonetic;
    if (data.partOfSpeech && !card.partOfSpeech) card.partOfSpeech = formatPosAbbr(data.partOfSpeech);
    card.definitions = unique([...(card.definitions || []), data.simpleChinese].filter(Boolean));
    state.aiResult = { type: "word", data, fromCache: res.fromCache, model: res.model };

    // Sync enriched meaning back to saved vocab item if present
    const saved = state.vocab.find((v) => v.lemma === card.lemma);
    if (saved && card.contextualMeaning) {
      saved.contextualMeaning = card.contextualMeaning;
      saved.definitions = unique([...(saved.definitions || []), ...card.definitions]);
      if (card.phonetic) saved.phonetic = card.phonetic;
      saved.updatedAt = new Date().toISOString();
      await dbPut("vocab", saved);
    }
  } catch (error) {
    state.aiResult = { error: error.message || "AI 词义解释失败。" };
  } finally {
    state.aiBusy = false;
    state.aiStreamPreview = "";
    renderStudyPanelOnly(ctx);
  }
}

async function translateSourceSentenceWithAi(ctx) {
  const { state } = ctx;
  const card = state.wordCard;
  const sentence = card?.sourceSentence?.trim();
  if (!card || !sentence) return;

  card.sentenceAiTranslating = true;
  card.sentenceTranslationError = "";
  renderStudyPanelOnly(ctx);

  try {
    const res = await requestAiJson({
      taskType: "sentence_translate",
      settings: state.settings,
      cacheContext: {
        bookId: state.currentBookId,
        chapterIndex: state.currentChapterIndex,
        text: sentence
      },
      messages: [
        {
          role: "user",
          content: `请将以下英文原句翻译成自然、准确、流畅的中文：\n\n${sentence}`
        }
      ]
    });
    const translation = String(res.data?.translation || "").trim();
    if (translation) {
      card.sentenceTranslation = translation;
      card.sentenceTranslationSource = "ai";
      card.sentenceTranslationError = "";
    } else {
      card.sentenceTranslationError = "AI 未返回有效译文，请重试。";
    }
  } catch (error) {
    card.sentenceTranslationError = error.message || "AI 翻译失败，请先在设置中配置模型 API Key。";
  } finally {
    card.sentenceAiTranslating = false;
    renderStudyPanelOnly(ctx);
  }
}

async function analyzeWordContextSentence(ctx, forceRefresh = false) {
  const { state } = ctx;
  const card = state.wordCard;
  const sentenceText = card?.sourceSentence?.trim();
  if (!card || !sentenceText) return;

  card.sentenceAnalysisBusy = true;
  card.sentenceAnalysisStream = "";
  card.sentenceAnalysisError = "";
  renderStudyPanelOnly(ctx);

  try {
    const res = await requestAiJson({
      taskType: "sentence_analysis",
      settings: state.settings,
      forceRefresh,
      cacheContext: {
        bookId: state.currentBookId,
        chapterIndex: state.currentChapterIndex,
        text: sentenceText
      },
      onStreamText: (partial) => {
        if (state.wordCard !== card) return;
        card.sentenceAnalysisStream = partial;
        const previewEl = document.getElementById("inlineSentenceStreamPreview");
        if (previewEl) previewEl.textContent = partial;
      },
      messages: [
        {
          role: "user",
          content: `请对以下英文长难句做精读拆解，重点提取主干、3-5个核心句法成分、关键短语、自然翻译、学习建议和一道小题。\n\n句子：${sentenceText}\n${
            state.selectedContext?.paragraph && state.selectedContext.paragraph !== sentenceText
              ? `所在段落上下文：${state.selectedContext.paragraph}`
              : ""
          }`
        }
      ]
    });
    if (state.wordCard !== card) return;
    card.sentenceAnalysis = { data: res.data, fromCache: res.fromCache, model: res.model };
    if (res.data?.translation && !card.sentenceTranslation) {
      card.sentenceTranslation = String(res.data.translation).trim();
      card.sentenceTranslationSource = "ai";
      card.sentenceTranslationError = "";
    }
  } catch (error) {
    if (state.wordCard !== card) return;
    card.sentenceAnalysisError = error.message || "AI 句子分析失败。";
  } finally {
    if (state.wordCard === card) {
      card.sentenceAnalysisBusy = false;
      card.sentenceAnalysisStream = "";
      renderStudyPanelOnly(ctx);
    }
  }
}

async function analyzeSentenceFlow(ctx, sentenceText, forceRefresh = false) {
  const { state } = ctx;
  state.aiBusy = true;
  state.aiBusyTask = "sentence";
  state.aiStreamPreview = "";
  state.aiResult = null;
  renderStudyPanelOnly(ctx, { resetScroll: true });

  try {
    const res = await requestAiJson({
      taskType: "sentence_analysis",
      settings: state.settings,
      forceRefresh,
      cacheContext: {
        bookId: state.currentBookId,
        chapterIndex: state.currentChapterIndex,
        text: sentenceText
      },
      onStreamText: (partial) => {
        state.aiStreamPreview = partial;
        const previewEl = document.getElementById("aiStreamPreview");
        if (previewEl) previewEl.textContent = partial;
      },
      messages: [
        {
          role: "user",
          content: `请对以下英文长难句做精读拆解，重点提取主干、3-5个核心句法成分、关键短语、自然翻译、学习建议和一道小题。\n\n句子：${sentenceText}\n${
            state.selectedContext?.paragraph && state.selectedContext.paragraph !== sentenceText
              ? `所在段落上下文：${state.selectedContext.paragraph}`
              : ""
          }`
        }
      ]
    });
    state.aiResult = { type: "sentence", data: res.data, fromCache: res.fromCache, model: res.model };
  } catch (error) {
    state.aiResult = { error: error.message || "AI 句子分析失败。" };
  } finally {
    state.aiBusy = false;
    state.aiStreamPreview = "";
    renderStudyPanelOnly(ctx);
  }
}

async function explainParagraphFlow(ctx, paragraphText, forceRefresh = false) {
  const { state } = ctx;
  state.selectedText = paragraphText;
  state.aiBusy = true;
  state.aiBusyTask = "paragraph";
  state.aiStreamPreview = "";
  state.aiResult = null;
  renderStudyPanelOnly(ctx, { resetScroll: true });

  try {
    const res = await requestAiJson({
      taskType: "paragraph_explain",
      settings: state.settings,
      forceRefresh,
      cacheContext: {
        bookId: state.currentBookId,
        chapterIndex: state.currentChapterIndex,
        text: paragraphText
      },
      onStreamText: (partial) => {
        state.aiStreamPreview = partial;
        const previewEl = document.getElementById("aiStreamPreview");
        if (previewEl) previewEl.textContent = partial;
      },
      messages: [
        {
          role: "user",
          content: `请精讲以下英文段落，输出核心摘要、关键要点、1-2个难点句解析、重点词汇和一道阅读理解思考题。\n\n段落：\n${paragraphText}`
        }
      ]
    });
    state.aiResult = { type: "paragraph", data: res.data, fromCache: res.fromCache, model: res.model };
  } catch (error) {
    state.aiResult = { error: error.message || "AI 段落解释失败。" };
  } finally {
    state.aiBusy = false;
    state.aiStreamPreview = "";
    renderStudyPanelOnly(ctx);
  }
}

export function renderStudyPanelOnly(ctx, { resetScroll = false } = {}) {
  const host = document.getElementById("studyPanelHost");
  if (!host) return;
  const prevScrollTop = host.scrollTop;
  host.innerHTML = renderStudyPanel(ctx.state);
  bindStudyPanelActions(ctx);
  host.scrollTop = resetScroll ? 0 : prevScrollTop;
}

function bindStudyPanelActions(ctx) {
  const host = document.getElementById("studyPanelHost");
  if (!host) return;
  host.querySelectorAll("[data-panel-action]").forEach((button) => {
    button.addEventListener("click", () => handleReaderAction(ctx, button.dataset.panelAction));
  });
}

function renderStudyPanel(state) {
  if (state.aiResult?.type === "sentence") {
    return renderSentenceAnalysisPanel(state);
  }
  if (state.aiResult?.type === "paragraph") {
    return renderParagraphExplainPanel(state);
  }
  if (state.wordCard) {
    return renderWordCardPanel(state);
  }
  if (state.aiBusy) {
    return renderBusyPanel(state);
  }
  if (state.aiResult?.error) {
    return `
      <div class="analysis-panel">
        <div class="panel-card">
          <p class="danger-text" style="margin:0 0 10px">${escapeHtml(state.aiResult.error)}</p>
          <div class="toolbar">
            <button class="btn small" data-panel-action="${state.aiBusyTask === "paragraph" ? "paragraph" : "sentence"}">重试</button>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="analysis-panel">
      <div class="empty-hint">
        双击正文中的英文单词即可快速查词<br>
        划选句子或段落后，在悬浮菜单中选择「分析句子」「解释段落」或「高亮记笔记」
      </div>
    </div>
  `;
}

function renderBusyPanel(state) {
  const title = state.aiBusyTask === "paragraph" ? "正在精讲段落..." : "正在拆解句子...";
  return `
    <div class="analysis-panel">
      <div class="panel-card">
        <div class="selected-preview">${escapeHtml(limitText(state.selectedText, 160))}</div>
        <div class="section-header" style="margin-bottom:6px">
          <span class="section-title">${title}</span>
          <button class="btn ghost small" data-panel-action="cancel-ai">取消</button>
        </div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
        <div id="aiStreamPreview" class="stream-preview">${escapeHtml(state.aiStreamPreview || "")}</div>
      </div>
    </div>
  `;
}

function renderWordCardPanel(state) {
  const card = state.wordCard;
  const defs = (card.definitions || []).filter(Boolean);
  const posAbbr = formatPosAbbr(card.partOfSpeech);
  const metaParts = [
    card.phonetic ? `<span class="tabular">${escapeHtml(card.phonetic)}</span>` : "",
    posAbbr ? `<span class="pos-abbr">${escapeHtml(posAbbr)}</span>` : "",
    card.lemma && card.lemma.toLowerCase() !== card.word.toLowerCase()
      ? `原形 ${escapeHtml(card.lemma)}`
      : ""
  ].filter(Boolean);

  // Ensure Chinese line clearly displays part-of-speech abbreviation
  let cnLine = card.cnExplain || "";
  if (!cnLine && defs.length) {
    const joined = defs.join(" · ");
    const hasPosPrefix = /^(n|v|vt|vi|adj|adv|prep|conj|pron|int|art|aux|num|det)\.\s*/i.test(joined);
    cnLine = posAbbr && !hasPosPrefix ? `${posAbbr} ${joined}` : joined;
  }

  const enDefs = (card.onlineDefinitions || []).slice(0, 2);
  const needAiTranslateEmphasis = Boolean(!card.sentenceTranslation && !card.sentenceTranslationLoading);

  return `
    <div class="analysis-panel">
      <section class="panel-card">
        <div class="word-header-compact">
          <div>
            <div class="word-title">${escapeHtml(card.word)}</div>
            ${metaParts.length ? `<div class="word-meta">${metaParts.join(" · ")}</div>` : ""}
          </div>
          <div class="toolbar">
            <button class="btn ghost small" data-panel-action="play-audio" title="朗读发音">发音</button>
            <button class="btn ${card.isSaved ? "ghost" : "primary"} small" data-panel-action="save-word">
              ${card.isSaved ? "已收藏" : "收藏"}
            </button>
          </div>
        </div>
        ${
          cnLine
            ? `<div class="def-inline-list" style="margin-top:4px">${escapeHtml(cnLine)}</div>`
            : card.onlineLoading
            ? `<div class="muted">正在联网查词...</div>`
            : `<div class="muted">${escapeHtml(card.onlineError || "未查到中文释义")}</div>`
        }
        ${card.onlineLoading && cnLine ? `<div class="muted" style="margin-top:4px">正在补充联网词典...</div>` : ""}
      </section>

      <section class="panel-section">
        <div class="section-header">
          <span class="section-title">
            AI 语境释义 ${state.aiResult?.fromCache ? "· 已缓存" : ""}
          </span>
          <div class="toolbar">
            ${
              state.aiBusy
                ? `<button class="btn ghost small" data-panel-action="cancel-ai">取消</button>`
                : `<button class="btn ghost small" data-panel-action="${state.aiResult?.type === "word" ? "word-ai-refresh" : "word-ai"}">${state.aiResult?.type === "word" ? "重新生成" : "AI 补充语境"}</button>`
            }
          </div>
        </div>
        ${
          state.aiBusy
            ? `<div class="skeleton-line"></div><div class="skeleton-line medium"></div>`
            : renderAiWordBody(state.aiResult, Boolean(state.settings.ai.apiKey || state.serverKeyConfigured))
        }
      </section>

      ${
        enDefs.length
          ? `
        <section class="panel-section">
          <div class="section-header"><span class="section-title">英英词典释义</span></div>
          <ul class="dict-list">
            ${enDefs
              .map(
                (item) => `
              <li>
                ${item.partOfSpeech ? `<strong class="pos-abbr">${escapeHtml(formatPosAbbr(item.partOfSpeech))}</strong> ` : ""}
                <span>${escapeHtml(item.definition || "")}</span>
              </li>`
              )
              .join("")}
          </ul>
        </section>`
          : ""
      }

      ${
        card.sourceSentence
          ? `
        <section class="panel-section">
          <div class="section-header"><span class="section-title">所在原句</span></div>
          <p class="source-sentence">${escapeHtml(limitText(card.sourceSentence, 260))}</p>
          ${
            card.sentenceAiTranslating
              ? `<div class="sentence-translation-status muted">正在使用 AI 翻译原句...</div>`
              : card.sentenceTranslationLoading
              ? `<div class="sentence-translation-status muted">正在联网翻译原句...</div>`
              : card.sentenceTranslation
              ? `<div class="sentence-translation-box"><span>${escapeHtml(card.sentenceTranslation)}</span><span class="sentence-trans-tag">${card.sentenceTranslationSource === "ai" ? "AI 译文" : "联网译文"}</span></div>`
              : card.sentenceTranslationError
              ? `<div class="sentence-translation-status muted">${escapeHtml(card.sentenceTranslationError)}</div>`
              : ""
          }
          <div class="toolbar" style="margin-top:10px">
            <button class="btn ${needAiTranslateEmphasis ? "primary" : "ghost"} small" data-panel-action="translate-source-sentence" ${card.sentenceAiTranslating ? "disabled" : ""}>
              ${card.sentenceAiTranslating ? "翻译中..." : "AI 翻译"}
            </button>
            ${
              card.sentenceAnalysisBusy
                ? `<button class="btn ghost small" data-panel-action="cancel-ai">取消分析</button>`
                : `<button class="btn small" data-panel-action="${card.sentenceAnalysis ? "analyze-context-sentence-refresh" : "analyze-context-sentence"}">${card.sentenceAnalysis ? "重新分析句子" : "分析这个句子"}</button>`
            }
          </div>
        </section>`
          : ""
      }

      ${
        card.sentenceAnalysisBusy
          ? `
        <section class="panel-section">
          <div class="section-header">
            <span class="section-title">AI 句子精读拆解 · 生成中</span>
            <button class="btn ghost small" data-panel-action="cancel-ai">取消</button>
          </div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
          <div id="inlineSentenceStreamPreview" class="stream-preview">${escapeHtml(card.sentenceAnalysisStream || "")}</div>
        </section>`
          : card.sentenceAnalysisError
          ? `
        <section class="panel-section">
          <div class="section-header"><span class="section-title">AI 句子精读拆解</span></div>
          <p class="danger-text" style="margin:0 0 8px">${escapeHtml(card.sentenceAnalysisError)}</p>
          <button class="btn ghost small" data-panel-action="analyze-context-sentence">重试分析</button>
        </section>`
          : card.sentenceAnalysis?.data
          ? `
        <section class="panel-section">
          <div class="section-header">
            <span class="section-title">AI 句子精读拆解 ${card.sentenceAnalysis.fromCache ? "· 已缓存" : ""}</span>
            <button class="btn ghost small" data-panel-action="analyze-context-sentence-refresh">重新分析</button>
          </div>
          ${renderSentenceAnalysisBlocks(card.sentenceAnalysis.data)}
        </section>`
          : ""
      }
    </div>
  `;
}

function renderAiWordBody(result, hasAiConfigured) {
  if (!result) {
    return `<p class="muted" style="margin:0">${
      hasAiConfigured
        ? "AI 释义仅供参考，点击右上角可按当前语境补充解释。"
        : "未配置 AI Key 时已自动完成联网英汉查词；在「设置」中配置 DeepSeek 后可解锁语境精讲。"
    }</p>`;
  }
  if (result.error) return `<p class="danger-text" style="margin:0">${escapeHtml(result.error)}</p>`;
  const data = result.data || {};
  return `
    <div class="ai-word-card">
      ${
        data.meaningInContext
          ? `<div class="contextual-box">${renderSafeMarkdown(data.meaningInContext)}</div>`
          : ""
      }
      ${
        data.example
          ? `
        <div>
          <div class="word-section-label">独立例句</div>
          <div class="example-block">
            <div class="example-en">${escapeHtml(data.example)}</div>
            ${data.exampleTranslation ? `<div class="example-cn">${escapeHtml(data.exampleTranslation)}</div>` : ""}
          </div>
        </div>`
          : ""
      }
      ${
        (Array.isArray(data.synonyms) && data.synonyms.length) ||
        (Array.isArray(data.antonyms) && data.antonyms.length)
          ? `
        <div class="muted">
          ${data.synonyms?.length ? `近义词：${escapeHtml(data.synonyms.join(", "))}` : ""}
          ${data.synonyms?.length && data.antonyms?.length ? " · " : ""}
          ${data.antonyms?.length ? `反义词：${escapeHtml(data.antonyms.join(", "))}` : ""}
        </div>`
          : ""
      }
      ${
        data.learningTip
          ? `<div class="learning-tip-box">${renderSafeMarkdown(data.learningTip)}</div>`
          : ""
      }
    </div>
  `;
}

function renderSentenceAnalysisBlocks(data = {}) {
  const roleLabels = {
    subject: "主语",
    predicate: "谓语",
    verb: "谓语动词",
    object: "宾语",
    complement: "补语",
    attribute: "定语",
    adverbial: "状语",
    prepositional: "介词短语",
    conjunction: "连词",
    clause: "从句",
    "relative-clause": "定语从句",
    "noun-clause": "名词性从句"
  };

  return `
    <div class="analysis-stack">
      ${
        data.overview
          ? `<div class="analysis-block"><div class="block-label">一句话总览</div><div class="markdown-body">${renderSafeMarkdown(data.overview)}</div></div>`
          : ""
      }
      ${
        data.coreSentence
          ? `<div class="analysis-block is-accent"><div class="block-label">句子主干</div><div class="core-sentence">${escapeHtml(data.coreSentence)}</div></div>`
          : ""
      }
      ${
        Array.isArray(data.structure) && data.structure.length
          ? `
        <div class="analysis-block">
          <div class="block-label">结构拆解</div>
          <div class="syntax-tree">
            ${data.structure
              .map((item) => {
                const key = String(item.role || item.label || "").toLowerCase();
                const tag = roleLabels[key] || item.label || item.role || "成分";
                return `
                <div class="syntax-node">
                  <div class="syntax-node-header">
                    <span class="syntax-role-tag">${escapeHtml(tag)}</span>
                    <span class="syntax-node-text">${escapeHtml(item.text || "")}</span>
                  </div>
                  ${item.explanation ? `<div class="syntax-node-explain">${escapeHtml(item.explanation)}</div>` : ""}
                </div>`;
              })
              .join("")}
          </div>
        </div>`
          : ""
      }
      ${
        Array.isArray(data.phrases) && data.phrases.length
          ? `
        <div class="analysis-block">
          <div class="block-label">关键短语与表达</div>
          <div class="phrase-list">
            ${data.phrases
              .map(
                (p) => `
              <div class="phrase-item">
                <div>
                  <span class="phrase-word">${escapeHtml(p.phrase || "")}</span>
                  <span class="phrase-meaning">${escapeHtml(p.meaning || "")}</span>
                </div>
                ${p.note ? `<div class="phrase-detail">${escapeHtml(p.note)}</div>` : ""}
              </div>`
              )
              .join("")}
          </div>
        </div>`
          : ""
      }
      ${
        data.translation
          ? `<div class="analysis-block"><div class="block-label">自然翻译</div><div class="markdown-body">${renderSafeMarkdown(data.translation)}</div></div>`
          : ""
      }
      ${
        data.learningTip
          ? `<div class="analysis-block"><div class="block-label">学习建议</div><div class="markdown-body">${renderSafeMarkdown(data.learningTip)}</div></div>`
          : ""
      }
      ${
        data.quiz?.question
          ? `
        <div class="analysis-block">
          <div class="block-label">精读微练习</div>
          <div class="markdown-body">${renderSafeMarkdown(data.quiz.question)}</div>
          <details class="quiz-answer">
            <summary>查看参考答案</summary>
            <div class="markdown-body" style="margin-top:6px">${renderSafeMarkdown(data.quiz.answer || "")}</div>
          </details>
        </div>`
          : ""
      }
    </div>
  `;
}

function renderSentenceAnalysisPanel(state) {
  const result = state.aiResult;
  const data = result.data || {};

  return `
    <div class="analysis-panel">
      <section class="panel-card">
        <div class="selected-preview">${escapeHtml(limitText(state.selectedText, 240))}</div>
        <div class="toolbar">
          <button class="btn ghost small" data-panel-action="add-note">记笔记</button>
          <button class="btn ghost small" data-panel-action="sentence-refresh">重新分析</button>
          ${result.fromCache ? `<span class="muted">已缓存</span>` : ""}
        </div>
      </section>
      ${renderSentenceAnalysisBlocks(data)}
      <p class="muted" style="margin:0">AI 分析仅供学习参考。</p>
    </div>
  `;
}

function renderParagraphExplainPanel(state) {
  const result = state.aiResult;
  const data = result.data || {};
  return `
    <div class="analysis-panel">
      <section class="panel-card">
        <div class="selected-preview">${escapeHtml(limitText(state.selectedText, 240))}</div>
        <div class="toolbar">
          <button class="btn ghost small" data-panel-action="tts-sentence">朗读段落</button>
          <button class="btn ghost small" data-panel-action="paragraph-refresh">重新精讲</button>
          ${result.fromCache ? `<span class="muted">已缓存</span>` : ""}
        </div>
      </section>

      <div class="analysis-stack">
        ${
          data.summary
            ? `<div class="analysis-block is-accent"><div class="block-label">段落核心摘要</div><div class="markdown-body">${renderSafeMarkdown(data.summary)}</div></div>`
            : ""
        }
        ${
          Array.isArray(data.keyIdeas) && data.keyIdeas.length
            ? `
          <div class="analysis-block">
            <div class="block-label">核心要点</div>
            <ul class="dict-list">
              ${data.keyIdeas.map((idea) => `<li>${escapeHtml(idea)}</li>`).join("")}
            </ul>
          </div>`
            : ""
        }
        ${
          Array.isArray(data.difficultSentences) && data.difficultSentences.length
            ? `
          <div class="analysis-block">
            <div class="block-label">难点句解析</div>
            <div class="syntax-tree">
              ${data.difficultSentences
                .map(
                  (s) => `
                <div class="syntax-node">
                  <div class="syntax-node-text">${escapeHtml(s.sentence || "")}</div>
                  ${s.reason ? `<div class="muted" style="margin-top:4px">难点：${escapeHtml(s.reason)}</div>` : ""}
                  ${s.briefExplanation ? `<div class="syntax-node-explain">${escapeHtml(s.briefExplanation)}</div>` : ""}
                </div>`
                )
                .join("")}
            </div>
          </div>`
            : ""
        }
        ${
          Array.isArray(data.vocabulary) && data.vocabulary.length
            ? `
          <div class="analysis-block">
            <div class="block-label">本段重点词汇</div>
            <div class="phrase-list">
              ${data.vocabulary
                .map(
                  (v) => `
                <div class="phrase-item">
                  <span class="phrase-word">${escapeHtml(v.wordOrPhrase || "")}</span>
                  <span class="phrase-meaning">${escapeHtml(v.meaningInContext || "")}</span>
                </div>`
                )
                .join("")}
            </div>
          </div>`
            : ""
        }
        ${
          data.comprehensionQuestion?.question
            ? `
          <div class="analysis-block">
            <div class="block-label">阅读思考题</div>
            <div class="markdown-body">${renderSafeMarkdown(data.comprehensionQuestion.question)}</div>
            <details class="quiz-answer">
              <summary>查看参考解答</summary>
              <div class="markdown-body" style="margin-top:6px">${renderSafeMarkdown(data.comprehensionQuestion.answer || "")}</div>
            </details>
          </div>`
            : ""
        }
      </div>
      <p class="muted" style="margin:0">AI 分析仅供学习参考。</p>
    </div>
  `;
}
