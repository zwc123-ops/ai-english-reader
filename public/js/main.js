import { initTts, ttsStop } from "./dictionary.js";
import { renderNotes } from "./notes.js";
import { parseImportedFile } from "./parsers.js";
import {
  adjustFontSize,
  goToChapter,
  handleReaderAction,
  hideSelectionToolbar,
  refreshChapterBodyOnly,
  renderReader,
  toggleInBookSearch
} from "./reader.js";
import { importLearningBackup, renderSettings } from "./settings.js";
import {
  dbGet,
  dbGetAll,
  dbPut,
  dbRemove,
  loadBooks,
  loadSettings,
  openDb,
  saveBooks,
  saveSettings
} from "./storage.js";
import { clamp, createId, escapeAttr, escapeHtml, formatDate, toast } from "./utils.js";
import { handleFlashcardKey, renderVocabulary } from "./vocabulary.js";

const SAMPLE_ARTICLE = {
  title: "The Craft of Slow Reading",
  author: "Editorial Sample",
  chapters: [
    {
      id: "sample_ch_1",
      title: "1. Why Deep Reading Still Matters",
      text: `In an age defined by relentless notifications and algorithmic feeds, the discipline of slow reading has become an unexpectedly radical habit. When we skim headlines or scroll past fragmented commentary, our attention adapts to speed at the expense of synthesis. Deep reading, by contrast, asks us to pause when a sentence resists immediate comprehension, to trace how a writer constructs an argument, and to notice how a single well-chosen word can shift the tone of an entire paragraph.

Cognitive researchers often describe reading not as a passive transfer of information, but as an active negotiation between the text and the reader's prior knowledge. Whenever you encounter an unfamiliar idiom or a layered subordinate clause, the friction you feel is not a failure of fluency; rather, it is the precise moment where lasting vocabulary acquisition takes place. By inspecting the sentence structure, questioning why an author chose "inevitable" over "likely," and recording concise notes in your own words, you turn ordinary pages into a durable personal library.`
    },
    {
      id: "sample_ch_2",
      title: "2. Building a Sustainable Intensive-Reading Loop",
      text: `Many learners abandon original English books after the first two chapters because they attempt to look up every unknown word indiscriminately. A far more sustainable approach is to distinguish between words that merely add local color and words that carry the logical spine of the passage. Look up the essential ones immediately in context, save only those worth meeting again, and let spaced repetition bring them back just before memory fades.

Over weeks of steady practice, complex prose begins to yield its patterns almost effortlessly. Concessive clauses introduced by "although" or "notwithstanding," participial modifiers tucked between subject and verb, and subtle transitions of perspective stop feeling like obstacles. Instead, they become signposts guiding you smoothly through the author's mind.`
    }
  ]
};

const state = {
  view: "library",
  books: [],
  vocab: [],
  notes: [],
  settings: null,
  serverKeyConfigured: false,
  accessTokenRequired: false,
  currentBookId: null,
  currentBookContent: null,
  currentChapterIndex: 0,
  tocCollapsed: false,
  panelCollapsed: false,
  panelWidth: 380,
  selectedText: "",
  selectedContext: null,
  wordCard: null,
  aiResult: null,
  aiBusy: false,
  aiBusyTask: "",
  aiStreamPreview: "",
  readerError: "",
  libraryQuery: "",
  readerSearch: "",
  readerSearchOpen: false,
  selectedVocabId: null,
  vocabQuery: "",
  vocabFilter: "all",
  vocabBookFilter: "all",
  vocabReviewMode: false,
  flashcardQueue: [],
  flashcardIndex: 0,
  flashcardRevealed: false,
  notesQuery: "",
  notesBookFilter: "all"
};

const els = {
  libraryView: document.getElementById("libraryView"),
  readerView: document.getElementById("readerView"),
  vocabularyView: document.getElementById("vocabularyView"),
  notesView: document.getElementById("notesView"),
  settingsView: document.getElementById("settingsView"),
  fileInput: document.getElementById("fileInput"),
  backupInput: document.getElementById("backupInput"),
  selectionToolbar: document.getElementById("selectionToolbar"),
  noteModal: document.getElementById("noteModal")
};

let noteModalState = null;

const ctx = {
  state,
  els,
  setView,
  findBook,
  openBook,
  updateBookStats,
  applyTheme,
  renderActiveView,
  openNoteModal
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await openDb();
  state.settings = loadSettings();
  state.books = loadBooks();
  state.vocab = await dbGetAll("vocab");
  state.notes = await dbGetAll("notes");

  applyTheme(state.settings.reader.theme || "sepia");
  initTts();
  bindGlobalEvents();
  bindNoteModalEvents();
  checkServerHealth();
  renderLibrary();
}

async function checkServerHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return;
    const info = await res.json();
    state.serverKeyConfigured = Boolean(info.serverKeyConfigured);
    state.accessTokenRequired = Boolean(info.accessTokenRequired);
    if (state.view === "settings") renderSettings(ctx);
  } catch (_) {
    // Offline or non-API host
  }
}

function applyTheme(theme) {
  const valid = ["light", "sepia", "dark"].includes(theme) ? theme : "sepia";
  document.documentElement.setAttribute("data-theme", valid);
  document.querySelectorAll("[data-quick-theme]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.quickTheme === valid);
  });
}

function bindGlobalEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-quick-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.quickTheme;
      state.settings.reader.theme = theme;
      saveSettings(state.settings);
      applyTheme(theme);
    });
  });

  els.fileInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    await importFiles(files);
  });

  els.backupInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await importLearningBackup(ctx, file);
  });

  els.selectionToolbar.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    hideSelectionToolbar(ctx);
    await handleReaderAction(ctx, button.dataset.action);
  });

  document.addEventListener("mousedown", (event) => {
    if (
      !event.target.closest("#selectionToolbar") &&
      !event.target.closest(".reading-body") &&
      !event.target.closest(".pdf-text-layer")
    ) {
      hideSelectionToolbar(ctx);
    }
  });

  // Global keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    const tag = (event.target?.tagName || "").toLowerCase();
    const isInput = tag === "input" || tag === "textarea" || tag === "select";

    if (event.key === "Escape") {
      if (!els.noteModal.hidden) {
        closeNoteModal();
        return;
      }
      hideSelectionToolbar(ctx);
      if (state.readerSearchOpen) toggleInBookSearch(ctx, false);
      ttsStop();
      return;
    }

    if (isInput) return;

    if (handleFlashcardKey(ctx, event)) return;

    if (state.view === "reader" && state.currentBookId) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleInBookSearch(ctx, true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        adjustFontSize(ctx, 1);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        adjustFontSize(ctx, -1);
        return;
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        goToChapter(ctx, state.currentChapterIndex - 1);
        return;
      }
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        goToChapter(ctx, state.currentChapterIndex + 1);
      }
    }
  });
}

function setView(view) {
  state.view = view;
  hideSelectionToolbar(ctx);
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((viewEl) => {
    viewEl.classList.toggle("is-active", viewEl.id === `${view}View`);
  });
  renderActiveView();
}

function renderActiveView() {
  if (state.view === "library") renderLibrary();
  else if (state.view === "reader") renderReader(ctx);
  else if (state.view === "vocabulary") renderVocabulary(ctx);
  else if (state.view === "notes") renderNotes(ctx);
  else if (state.view === "settings") renderSettings(ctx);
}

// ========== Library View (Focus-preserving search!) ==========
function renderLibrary() {
  els.libraryView.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div class="page-title">
          <h1>书库</h1>
          <p>导入英文原版 EPUB、TXT 或 PDF，沉浸阅读并沉淀生词与笔记。</p>
        </div>
        <div class="toolbar">
          <input id="librarySearch" class="input" style="width:240px" placeholder="搜索书名或作者" value="${escapeAttr(state.libraryQuery)}" />
          <button id="importSampleBtn" class="btn ghost">导入示例文章</button>
          <button id="importBooksBtn" class="btn primary">导入书籍</button>
        </div>
      </header>
      <div class="content-scroll">
        <div id="libraryGridHost"></div>
      </div>
    </div>
  `;

  document.getElementById("importBooksBtn")?.addEventListener("click", () => els.fileInput.click());
  document.getElementById("importSampleBtn")?.addEventListener("click", importSampleArticle);

  // Only re-render the grid host on input so search box NEVER loses focus or IME state
  document.getElementById("librarySearch")?.addEventListener("input", (event) => {
    state.libraryQuery = event.target.value;
    renderLibraryGridOnly();
  });

  renderLibraryGridOnly();
}

function renderLibraryGridOnly() {
  const host = document.getElementById("libraryGridHost");
  if (!host) return;

  const query = state.libraryQuery.trim().toLowerCase();
  const books = state.books
    .filter((book) => {
      if (!query) return true;
      return `${book.title} ${book.author || ""} ${book.fileName || ""}`.toLowerCase().includes(query);
    })
    .sort((a, b) => String(b.lastOpenedAt || b.importedAt).localeCompare(String(a.lastOpenedAt || a.importedAt)));

  if (!books.length) {
    host.innerHTML = state.books.length
      ? `
        <div class="empty-state">
          <div class="empty-state-inner">
            <h2>没有匹配的书籍</h2>
            <p>尝试换一个书名或作者关键词。</p>
          </div>
        </div>`
      : `
        <div class="empty-state">
          <div class="empty-state-inner">
            <h2>书库还是空的</h2>
            <p>支持本地导入 EPUB、TXT、PDF 文件，或先导入内置英文精读示例体验全部功能。</p>
            <div class="toolbar" style="justify-content:center">
              <button id="emptyImportBtn" class="btn primary">导入本地书籍</button>
              <button id="emptySampleBtn" class="btn ghost">导入示例精读文章</button>
            </div>
          </div>
        </div>`;

    document.getElementById("emptyImportBtn")?.addEventListener("click", () => els.fileInput.click());
    document.getElementById("emptySampleBtn")?.addEventListener("click", importSampleArticle);
    return;
  }

  host.innerHTML = `
    <div class="library-grid">
      ${books
        .map((book) => {
          const progress = Math.round((book.progress?.percentage || 0) * 100);
          const initial = escapeHtml((book.title || "B").trim().slice(0, 1).toUpperCase());
          return `
          <article class="book-card" data-book-id="${escapeAttr(book.id)}">
            <div class="book-card-top">
              <div class="book-cover">${initial}</div>
              <div class="book-info">
                <h2 class="book-title">${escapeHtml(book.title)}</h2>
                <div class="book-meta">${escapeHtml(book.author || "未知作者")} · ${escapeHtml((book.format || "txt").toUpperCase())}</div>
              </div>
            </div>
            <div class="progress-track" aria-label="阅读进度">
              <div class="progress-value" style="width:${progress}%"></div>
            </div>
            <div class="book-meta-row">
              <span class="book-meta">
                <span class="tabular">${progress}%</span> · 生词 <span class="tabular">${book.stats?.vocabularyCount || 0}</span> · 笔记 <span class="tabular">${book.stats?.noteCount || 0}</span> · ${formatDate(book.lastOpenedAt || book.importedAt)}
              </span>
              <button class="btn ghost small danger" data-delete-book="${escapeAttr(book.id)}">删除</button>
            </div>
          </article>
        `;
        })
        .join("")}
    </div>
  `;

  host.querySelectorAll("[data-book-id]").forEach((card) => {
    card.addEventListener("click", () => openBook(card.dataset.bookId));
  });

  host.querySelectorAll("[data-delete-book]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await deleteBook(button.dataset.deleteBook);
    });
  });
}

async function importSampleArticle() {
  const existing = state.books.find((b) => b.fileName === "sample-slow-reading.txt");
  if (existing) {
    await openBook(existing.id);
    return;
  }
  const id = createId("book");
  const book = {
    id,
    title: SAMPLE_ARTICLE.title,
    author: SAMPLE_ARTICLE.author,
    format: "txt",
    fileName: "sample-slow-reading.txt",
    importedAt: new Date().toISOString(),
    lastOpenedAt: null,
    progress: { chapterIndex: 0, scrollTop: 0, percentage: 0 },
    chapterCount: SAMPLE_ARTICLE.chapters.length,
    stats: { vocabularyCount: 0, noteCount: 0 }
  };
  await dbPut("bookContents", {
    id,
    format: "txt",
    chapters: SAMPLE_ARTICLE.chapters,
    pdfBuffer: null
  });
  state.books.push(book);
  saveBooks(state.books);
  toast(`已导入示例文章《${book.title}》`);
  await openBook(id);
}

async function importFiles(files) {
  for (const file of files) {
    try {
      toast(`正在解析 ${file.name}...`);
      const parsed = await parseImportedFile(file);
      const id = createId("book");
      const book = {
        id,
        title: parsed.title || file.name,
        author: parsed.author || "",
        format: parsed.ext,
        fileName: file.name,
        importedAt: new Date().toISOString(),
        lastOpenedAt: null,
        progress: { chapterIndex: 0, scrollTop: 0, percentage: 0 },
        chapterCount: parsed.chapters?.length || 0,
        stats: { vocabularyCount: 0, noteCount: 0 }
      };
      await dbPut("bookContents", {
        id,
        format: parsed.ext,
        chapters: parsed.chapters || [{ id: `${id}_ch_0`, title: book.title, text: "" }],
        pdfBuffer: parsed.pdfBuffer || null
      });
      state.books.push(book);
      saveBooks(state.books);
      toast(`已导入《${book.title}》`);
    } catch (error) {
      toast(`导入失败：${file.name}（${error.message}）`);
    }
  }
  renderLibraryGridOnly();
}

async function openBook(bookId, targetChapterIndex = null, highlightSnippet = "") {
  try {
    const book = findBook(bookId);
    if (!book) return;
    state.currentBookId = bookId;
    state.readerError = "";
    state.currentBookContent = await dbGet("bookContents", bookId);
    const chapterCount = Math.max(1, state.currentBookContent?.chapters?.length || 1);
    const desired =
      targetChapterIndex !== null ? Number(targetChapterIndex) : Number(book.progress?.chapterIndex || 0);
    state.currentChapterIndex = clamp(desired, 0, chapterCount - 1);
    state.selectedText = "";
    state.wordCard = null;
    state.aiResult = null;
    book.lastOpenedAt = new Date().toISOString();
    saveBooks(state.books);
    setView("reader");

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
  } catch (error) {
    state.readerError = error.message || "打开书籍时发生未知错误。";
    setView("reader");
  }
}

async function deleteBook(bookId) {
  const book = findBook(bookId);
  if (!book) return;
  state.books = state.books.filter((b) => b.id !== bookId);
  if (state.currentBookId === bookId) {
    state.currentBookId = null;
    state.currentBookContent = null;
  }
  await dbRemove("bookContents", bookId);
  saveBooks(state.books);
  renderLibraryGridOnly();
  toast(`已移除《${book.title}》`);
}

function findBook(bookId) {
  return state.books.find((b) => b.id === bookId);
}

function updateBookStats() {
  state.books.forEach((book) => {
    book.stats = book.stats || {};
    book.stats.vocabularyCount = state.vocab.filter((item) => item.bookId === book.id).length;
    book.stats.noteCount = state.notes.filter((item) => item.bookId === book.id).length;
  });
  saveBooks(state.books);
}

// ========== Note Modal ==========
function openNoteModal({ existingNote = null, quote = "", bookId = null, chapterIndex = 0 }) {
  noteModalState = {
    existingNote,
    quote: existingNote ? existingNote.quote : quote,
    bookId: existingNote ? existingNote.bookId : bookId,
    chapterIndex: existingNote ? existingNote.chapterIndex : chapterIndex,
    color: existingNote?.color || "amber"
  };

  document.getElementById("noteModalTitle").textContent = existingNote ? "编辑高亮与笔记" : "添加高亮与笔记";
  document.getElementById("noteModalQuote").textContent = noteModalState.quote || "";
  document.getElementById("noteModalInput").value = existingNote?.note || "";
  document.getElementById("noteModalDelete").hidden = !existingNote;

  document.querySelectorAll("[data-hl-color]").forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.hlColor === noteModalState.color);
  });

  els.noteModal.hidden = false;
  document.getElementById("noteModalInput").focus();
}

function closeNoteModal() {
  els.noteModal.hidden = true;
  noteModalState = null;
}

function bindNoteModalEvents() {
  document.getElementById("noteModalClose")?.addEventListener("click", closeNoteModal);
  document.getElementById("noteModalCancel")?.addEventListener("click", closeNoteModal);

  els.noteModal.addEventListener("click", (e) => {
    if (e.target === els.noteModal) closeNoteModal();
  });

  document.querySelectorAll("[data-hl-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!noteModalState) return;
      noteModalState.color = btn.dataset.hlColor;
      document.querySelectorAll("[data-hl-color]").forEach((b) => {
        b.classList.toggle("is-selected", b.dataset.hlColor === noteModalState.color);
      });
    });
  });

  document.getElementById("noteModalSave")?.addEventListener("click", async () => {
    if (!noteModalState) return;
    const noteText = document.getElementById("noteModalInput").value.trim();
    const now = new Date().toISOString();

    if (noteModalState.existingNote) {
      const target = noteModalState.existingNote;
      target.note = noteText;
      target.color = noteModalState.color;
      target.updatedAt = now;
      await dbPut("notes", target);
      toast("笔记已更新");
    } else {
      const book = findBook(noteModalState.bookId);
      const chapter = state.currentBookContent?.chapters?.[noteModalState.chapterIndex];
      const item = {
        id: createId("note"),
        bookId: noteModalState.bookId,
        bookTitle: book?.title || "",
        chapterIndex: noteModalState.chapterIndex,
        chapterTitle: chapter?.title || "",
        quote: noteModalState.quote,
        note: noteText,
        color: noteModalState.color,
        createdAt: now,
        updatedAt: now
      };
      await dbPut("notes", item);
      state.notes = [item, ...state.notes];
      toast("高亮笔记已保存");
    }

    updateBookStats();
    closeNoteModal();
    if (state.view === "reader") refreshChapterBodyOnly(ctx);
    else if (state.view === "notes") renderNotes(ctx);
  });

  document.getElementById("noteModalDelete")?.addEventListener("click", async () => {
    if (!noteModalState?.existingNote) return;
    const id = noteModalState.existingNote.id;
    await dbRemove("notes", id);
    state.notes = state.notes.filter((n) => n.id !== id);
    updateBookStats();
    closeNoteModal();
    if (state.view === "reader") refreshChapterBodyOnly(ctx);
    else if (state.view === "notes") renderNotes(ctx);
    toast("已删除高亮与笔记");
  });
}
