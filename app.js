(() => {
  const DB_NAME = "ai-english-reader-db";
  const DB_VERSION = 1;
  const BOOKS_KEY = "ai-reader.books";
  const SETTINGS_KEY = "ai-reader.settings";

  const seedDictionary = {
    abandon: ["放弃", "抛弃"],
    ability: ["能力", "才能"],
    absorb: ["吸收", "理解"],
    abstract: ["抽象的", "摘要"],
    abundant: ["丰富的", "充足的"],
    access: ["进入", "获取", "通道"],
    accommodate: ["容纳", "适应"],
    account: ["账户", "解释", "描述"],
    accurate: ["准确的"],
    achieve: ["实现", "达到"],
    acquire: ["获得", "习得"],
    adapt: ["适应", "改编"],
    adequate: ["足够的", "合格的"],
    adjacent: ["相邻的"],
    adjust: ["调整", "适应"],
    advocate: ["提倡", "倡导者"],
    affect: ["影响"],
    agency: ["机构", "能动性"],
    ambiguous: ["模糊的", "有歧义的"],
    analyze: ["分析"],
    apparent: ["明显的", "表面上的"],
    approach: ["方法", "接近"],
    arbitrary: ["任意的", "武断的"],
    assume: ["假设", "承担"],
    authority: ["权威", "当局"],
    benefit: ["好处", "受益"],
    capacity: ["能力", "容量"],
    coherent: ["连贯的", "一致的"],
    compensate: ["补偿", "弥补"],
    complex: ["复杂的"],
    comprehensive: ["全面的", "综合的"],
    concept: ["概念"],
    conduct: ["进行", "行为"],
    consequence: ["后果", "结果"],
    consist: ["由……组成", "在于"],
    constant: ["持续的", "常量"],
    constitute: ["构成", "组成"],
    context: ["上下文", "背景"],
    contrast: ["对比", "形成对照"],
    contribute: ["贡献", "促成"],
    conventional: ["传统的", "常规的"],
    crucial: ["关键的"],
    derive: ["源于", "获得"],
    determine: ["决定", "确定"],
    distinct: ["不同的", "清楚的"],
    eliminate: ["消除", "淘汰"],
    emerge: ["出现", "显现"],
    emphasize: ["强调"],
    enable: ["使能够"],
    encounter: ["遇到", "遭遇"],
    enhance: ["增强", "提高"],
    establish: ["建立", "确立"],
    evaluate: ["评估"],
    evidence: ["证据"],
    expand: ["扩大", "扩展"],
    explicit: ["明确的", "清楚的"],
    facilitate: ["促进", "使便利"],
    fundamental: ["基础的", "根本的"],
    imply: ["暗示", "意味着"],
    indicate: ["表明", "指出"],
    inevitable: ["不可避免的"],
    interpret: ["解释", "理解"],
    maintain: ["维持", "主张"],
    obtain: ["获得"],
    occur: ["发生", "出现"],
    perceive: ["察觉", "理解"],
    perspective: ["视角", "观点"],
    significant: ["重要的", "显著的"],
    substantial: ["大量的", "实质性的"],
    sufficient: ["足够的"],
    tendency: ["趋势", "倾向"],
    transform: ["改变", "转化"],
    valid: ["有效的", "合理的"]
  };

  const localDictionary = {
    abandon: { pos: "v.", cn: ["放弃", "抛弃"], note: "give up completely" },
    ability: { pos: "n.", cn: ["能力", "才能"], note: "the power to do something" },
    absorb: { pos: "v.", cn: ["吸收", "理解"], note: "take in; fully understand" },
    abstract: { pos: "adj./n.", cn: ["抽象的", "摘要"], note: "not concrete; a short summary" },
    abundant: { pos: "adj.", cn: ["丰富的", "充足的"], note: "more than enough" },
    access: { pos: "n./v.", cn: ["进入", "获取", "通道"], note: "the right or way to use something" },
    accommodate: { pos: "v.", cn: ["容纳", "适应"], note: "make room for; adjust to" },
    account: { pos: "n./v.", cn: ["账户", "解释", "描述"], note: "an explanation or record" },
    accurate: { pos: "adj.", cn: ["准确的"], note: "correct in detail" },
    achieve: { pos: "v.", cn: ["实现", "达到"], note: "successfully reach a goal" },
    acquire: { pos: "v.", cn: ["获得", "习得"], note: "gain by effort or experience" },
    adapt: { pos: "v.", cn: ["适应", "改编"], note: "change to fit a new situation" },
    adequate: { pos: "adj.", cn: ["足够的", "合格的"], note: "good enough for a purpose" },
    adjacent: { pos: "adj.", cn: ["相邻的"], note: "next to something" },
    adjust: { pos: "v.", cn: ["调整", "适应"], note: "change slightly to fit" },
    advocate: { pos: "v./n.", cn: ["提倡", "倡导者"], note: "publicly support" },
    affect: { pos: "v.", cn: ["影响"], note: "make a difference to" },
    agency: { pos: "n.", cn: ["机构", "能动性"], note: "organization; capacity to act" },
    ambiguous: { pos: "adj.", cn: ["模糊的", "有歧义的"], note: "open to more than one meaning" },
    analyze: { pos: "v.", cn: ["分析"], note: "examine in detail" },
    apparent: { pos: "adj.", cn: ["明显的", "表面上的"], note: "easy to see; seeming" },
    approach: { pos: "n./v.", cn: ["方法", "接近"], note: "a way of dealing with something" },
    arbitrary: { pos: "adj.", cn: ["任意的", "武断的"], note: "based on choice, not reason" },
    assume: { pos: "v.", cn: ["假设", "承担"], note: "take as true without proof" },
    authority: { pos: "n.", cn: ["权威", "当局"], note: "power or official right" },
    benefit: { pos: "n./v.", cn: ["好处", "受益"], note: "advantage; gain" },
    capacity: { pos: "n.", cn: ["能力", "容量"], note: "ability or amount something can hold" },
    coherent: { pos: "adj.", cn: ["连贯的", "一致的"], note: "logical and clear" },
    compensate: { pos: "v.", cn: ["补偿", "弥补"], note: "make up for loss or weakness" },
    complex: { pos: "adj.", cn: ["复杂的"], note: "made of many connected parts" },
    comprehensive: { pos: "adj.", cn: ["全面的", "综合的"], note: "including nearly everything" },
    concept: { pos: "n.", cn: ["概念"], note: "an abstract idea" },
    conduct: { pos: "v./n.", cn: ["进行", "行为"], note: "carry out; behavior" },
    consequence: { pos: "n.", cn: ["后果", "结果"], note: "a result or effect" },
    consist: { pos: "v.", cn: ["由……组成", "在于"], note: "be made up of" },
    constant: { pos: "adj./n.", cn: ["持续的", "常量"], note: "unchanging; continuous" },
    constitute: { pos: "v.", cn: ["构成", "组成"], note: "form or make up" },
    context: { pos: "n.", cn: ["上下文", "背景"], note: "surrounding words or situation" },
    contrast: { pos: "n./v.", cn: ["对比", "形成对照"], note: "difference between things" },
    contribute: { pos: "v.", cn: ["贡献", "促成"], note: "help cause or provide" },
    conventional: { pos: "adj.", cn: ["传统的", "常规的"], note: "usual or traditional" },
    crucial: { pos: "adj.", cn: ["关键的"], note: "extremely important" },
    debate: { pos: "n./v.", cn: ["争论", "辩论"], note: "discussion with different views" },
    decisive: { pos: "adj.", cn: ["决定性的", "果断的"], note: "settling an issue" },
    derive: { pos: "v.", cn: ["源于", "获得"], note: "come from; obtain" },
    destruction: { pos: "n.", cn: ["破坏", "毁灭"], note: "the act of destroying" },
    determine: { pos: "v.", cn: ["决定", "确定"], note: "decide or establish" },
    development: { pos: "n.", cn: ["发展", "开发"], note: "growth or progress" },
    differ: { pos: "v.", cn: ["不同", "有区别"], note: "be unlike" },
    distinct: { pos: "adj.", cn: ["不同的", "清楚的"], note: "clearly different" },
    economic: { pos: "adj.", cn: ["经济的"], note: "related to the economy" },
    enormous: { pos: "adj.", cn: ["巨大的"], note: "very large" },
    eliminate: { pos: "v.", cn: ["消除", "淘汰"], note: "remove completely" },
    emerge: { pos: "v.", cn: ["出现", "显现"], note: "come into view" },
    emphasize: { pos: "v.", cn: ["强调"], note: "give special importance to" },
    enable: { pos: "v.", cn: ["使能够"], note: "make possible" },
    encounter: { pos: "v./n.", cn: ["遇到", "遭遇"], note: "meet unexpectedly" },
    enhance: { pos: "v.", cn: ["增强", "提高"], note: "improve or increase" },
    establish: { pos: "v.", cn: ["建立", "确立"], note: "set up firmly" },
    evaluate: { pos: "v.", cn: ["评估"], note: "judge value or quality" },
    evidence: { pos: "n.", cn: ["证据"], note: "facts showing something is true" },
    expand: { pos: "v.", cn: ["扩大", "扩展"], note: "become or make larger" },
    explicit: { pos: "adj.", cn: ["明确的", "清楚的"], note: "clearly stated" },
    facilitate: { pos: "v.", cn: ["促进", "使便利"], note: "make easier" },
    fundamental: { pos: "adj.", cn: ["基础的", "根本的"], note: "basic and important" },
    institutional: { pos: "adj.", cn: ["制度的", "机构的"], note: "related to institutions" },
    institution: { pos: "n.", cn: ["制度", "机构"], note: "organization or established rule" },
    imply: { pos: "v.", cn: ["暗示", "意味着"], note: "suggest indirectly" },
    indicate: { pos: "v.", cn: ["表明", "指出"], note: "show or point out" },
    inevitable: { pos: "adj.", cn: ["不可避免的"], note: "certain to happen" },
    interpret: { pos: "v.", cn: ["解释", "理解"], note: "explain the meaning of" },
    maintain: { pos: "v.", cn: ["维持", "主张"], note: "keep; state firmly" },
    multiplicity: { pos: "n.", cn: ["多样性", "众多"], note: "a large number or variety" },
    obtain: { pos: "v.", cn: ["获得"], note: "get" },
    occur: { pos: "v.", cn: ["发生", "出现"], note: "happen" },
    openness: { pos: "n.", cn: ["开放性", "坦率"], note: "quality of being open" },
    permit: { pos: "v./n.", cn: ["允许", "许可证"], note: "allow" },
    perceive: { pos: "v.", cn: ["察觉", "理解"], note: "notice or understand" },
    perspective: { pos: "n.", cn: ["视角", "观点"], note: "way of seeing something" },
    political: { pos: "adj.", cn: ["政治的"], note: "related to government or power" },
    property: { pos: "n.", cn: ["财产", "属性"], note: "owned thing; quality" },
    significant: { pos: "adj.", cn: ["重要的", "显著的"], note: "important or noticeable" },
    similar: { pos: "adj.", cn: ["相似的"], note: "almost the same" },
    society: { pos: "n.", cn: ["社会"], note: "people living together under shared rules" },
    substantial: { pos: "adj.", cn: ["大量的", "实质性的"], note: "large or important" },
    sufficient: { pos: "adj.", cn: ["足够的"], note: "enough" },
    tendency: { pos: "n.", cn: ["趋势", "倾向"], note: "inclination or trend" },
    transform: { pos: "v.", cn: ["改变", "转化"], note: "change greatly" },
    valid: { pos: "adj.", cn: ["有效的", "合理的"], note: "well-founded or legally acceptable" },
    willingness: { pos: "n.", cn: ["意愿", "乐意"], note: "readiness to do something" }
  };

  const state = {
    view: "library",
    books: [],
    vocab: [],
    settings: null,
    currentBookId: null,
    currentBookContent: null,
    currentChapterIndex: 0,
    tocCollapsed: false,
    panelWidth: 380,
    selectedText: "",
    selectedContext: null,
    wordCard: null,
    aiResult: null,
    aiBusy: false,
    readerError: "",
    libraryQuery: "",
    selectedVocabId: null,
    readerSearch: ""
  };

  const els = {
    libraryView: document.getElementById("libraryView"),
    readerView: document.getElementById("readerView"),
    vocabularyView: document.getElementById("vocabularyView"),
    settingsView: document.getElementById("settingsView"),
    fileInput: document.getElementById("fileInput"),
    selectionToolbar: document.getElementById("selectionToolbar"),
    toastHost: document.getElementById("toastHost")
  };

  let dbPromise;
  let scrollTimer;
  let autoSelectionTimer;
  let pdfObjectUrl;
  let ttsUtterance = null;
  let ttsVoicesReady = false;
  let ttsEnVoice = null;

  // ===== TTS 语音引擎初始化（解决 Chrome 首次调用无声问题）=====
  function initTts() {
    if (!window.speechSynthesis) return;
    // 立即尝试加载一次（部分浏览器同步返回）
    tryLoadTtsVoices();
    // 监听 voiceschanged 事件（Chrome 异步加载）
    window.speechSynthesis.addEventListener("voiceschanged", tryLoadTtsVoices);
    // Chrome hack: 页面可见性变化时取消残留的 speech 任务，防止"卡死"
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    });
  }

  function tryLoadTtsVoices() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    ttsVoicesReady = true;
    // 优先选择美式英语女声 > 英式英语 > 任意英语
    const enVoice =
      voices.find((v) => v.lang.startsWith("en-US") && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang.startsWith("en-US") && v.name.includes("Google")) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices.find((v) => v.lang.startsWith("en-GB")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) ttsEnVoice = enVoice;
  }

  function ttsSpeak(text, lang) {
    if (!window.speechSynthesis) {
      toast("当前浏览器不支持语音朗读。");
      return;
    }
    // 取消之前的朗读
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang || "en-US";
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;

    // 设置英语语音
    if (ttsEnVoice) {
      utter.voice = ttsEnVoice;
    }

    // 错误处理
    utter.onerror = (e) => {
      console.warn("TTS error:", e);
      if (e.error !== "canceled") {
        toast(`语音朗读失败：${e.error}`);
      }
    };

    utter.onstart = () => {
      ttsUtterance = utter;
    };

    utter.onend = () => {
      ttsUtterance = null;
    };

    // Chrome hack: 如果 speechSynthesis 处于挂起状态（常见于首次调用），先 cancel 再 speak
    window.speechSynthesis.cancel();
    // 延迟一小段确保 cancel 生效
    setTimeout(() => {
      window.speechSynthesis.speak(utter);
    }, 50);
  }

  function ttsStop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    ttsUtterance = null;
  }

  function ttsIsSpeaking() {
    return window.speechSynthesis && window.speechSynthesis.speaking;
  }

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    dbPromise = openDb();
    state.settings = loadSettings();
    state.books = loadBooks();
    state.vocab = await getAll("vocab");
    bindGlobalEvents();
    initTts();
    render();
  }

  function bindGlobalEvents() {
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    els.fileInput.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      if (!files.length) return;
      await importFiles(files);
    });

    els.selectionToolbar.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      hideSelectionToolbar();
      await handleSelectionAction(button.dataset.action);
    });

    document.addEventListener("mousedown", (event) => {
      if (!event.target.closest("#selectionToolbar") && !event.target.closest(".reading-body")) {
        hideSelectionToolbar();
      }
    });
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((viewEl) => {
      viewEl.classList.toggle("is-active", viewEl.id === `${view}View`);
    });
    render();
  }

  function render() {
    renderLibrary();
    renderReader();
    renderVocabulary();
    renderSettings();
  }

  function renderLibrary() {
    const books = state.books
      .filter((book) => {
        const query = state.libraryQuery.trim().toLowerCase();
        if (!query) return true;
        return `${book.title} ${book.author || ""} ${book.fileName || ""}`.toLowerCase().includes(query);
      })
      .sort((a, b) => String(b.lastOpenedAt || b.importedAt).localeCompare(String(a.lastOpenedAt || a.importedAt)));

    els.libraryView.innerHTML = `
      <div class="page">
        <header class="page-header">
          <div class="page-title">
            <h1>书库</h1>
            <p>导入英文书籍，开始查词、分析长难句和沉淀生词。</p>
          </div>
          <div class="toolbar">
            <input id="librarySearch" class="input" style="width: 260px" placeholder="搜索书名或作者" value="${escapeAttr(state.libraryQuery)}" />
            <button id="importBooksBtn" class="btn primary">导入书籍</button>
          </div>
        </header>
        <div class="content-scroll">
          ${books.length ? renderBookGrid(books) : renderLibraryEmpty()}
        </div>
      </div>
    `;

    const importButton = document.getElementById("importBooksBtn") || document.getElementById("emptyImportBtn");
    importButton?.addEventListener("click", () => els.fileInput.click());
    document.getElementById("librarySearch").addEventListener("input", (event) => {
      state.libraryQuery = event.target.value;
      renderLibrary();
    });

    els.libraryView.querySelectorAll("[data-book-id]").forEach((card) => {
      card.addEventListener("click", () => openBook(card.dataset.bookId));
    });

    els.libraryView.querySelectorAll("[data-delete-book]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const book = findBook(button.dataset.deleteBook);
        if (!book) return;
        if (!confirm(`删除《${book.title}》的应用内记录？原始文件不会被删除。`)) return;
        await deleteBook(book.id);
      });
    });
  }

  function renderBookGrid(books) {
    return `
      <div class="library-grid">
        ${books.map((book) => {
          const progress = Math.round((book.progress?.percentage || 0) * 100);
          const initial = escapeHtml((book.title || "Book").trim().slice(0, 1).toUpperCase());
          return `
            <article class="book-card" data-book-id="${book.id}">
              <div class="book-cover">${initial}</div>
              <div>
                <h2 class="book-title">${escapeHtml(book.title)}</h2>
                <div class="book-meta">${escapeHtml(book.author || "未知作者")} · ${escapeHtml(book.format.toUpperCase())}</div>
              </div>
              <div class="progress-track" aria-label="阅读进度">
                <div class="progress-value" style="width: ${progress}%"></div>
              </div>
              <div class="book-meta">${progress}% · ${book.chapterCount || 0} 节 · 生词 ${book.stats?.vocabularyCount || 0} · ${formatDate(book.lastOpenedAt || book.importedAt)}</div>
              <button class="btn ghost danger" data-delete-book="${book.id}">删除记录</button>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderLibraryEmpty() {
    return `
      <div class="empty-state">
        <div>
          <h2>还没有书籍</h2>
          <p>先导入 EPUB、TXT 或 PDF。EPUB 和 TXT 支持选词与 AI 分析，PDF 当前用于基础阅读预览。</p>
          <button id="emptyImportBtn" class="btn primary">导入书籍</button>
        </div>
      </div>
    `;
  }

  function renderReader() {
    // 获取当前滚动位置（用于重新渲染时保持位置）
    const readerScroll = document.getElementById("readerScroll");
    const currentScrollTop = readerScroll?.scrollTop || 0;

    if (!state.currentBookId) {
      els.readerView.innerHTML = `
        <div class="page">
          <div class="empty-state">
            <div>
              <h2>选择一本书开始阅读</h2>
              <p>从书库打开一本书后，这里会显示目录、正文和 AI 学习侧栏。</p>
              <button id="goLibraryBtn" class="btn primary">去书库</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById("goLibraryBtn").addEventListener("click", () => setView("library"));
      return;
    }

    if (state.readerError) {
      els.readerView.innerHTML = `
        <div class="page">
          <div class="empty-state">
            <div>
              <h2>这本书暂时打不开</h2>
              <p>${escapeHtml(state.readerError)}</p>
              <div class="toolbar" style="justify-content: center">
                <button id="goLibraryBtn" class="btn primary">回到书库</button>
                <button id="retryOpenBookBtn" class="btn ghost">重试打开</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.getElementById("goLibraryBtn").addEventListener("click", () => setView("library"));
      document.getElementById("retryOpenBookBtn").addEventListener("click", () => openBook(state.currentBookId));
      return;
    }

    const book = findBook(state.currentBookId);
    const content = state.currentBookContent;
    if (!book || !content) {
      els.readerView.innerHTML = `
        <div class="page">
          <div class="empty-state">
            <div>
              <h2>正文内容缺失</h2>
              <p>书库里有这本书的记录，但没有找到解析后的正文。请删除记录后重新导入一次。</p>
              <button id="goLibraryBtn" class="btn primary">回到书库</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById("goLibraryBtn")?.addEventListener("click", () => setView("library"));
      return;
    }

    const chapters = content.chapters || [];
    if (!chapters.length) {
      state.readerError = "这本 EPUB 没有解析出可阅读章节，可能是 DRM 加密、目录结构异常，或正文被做成了图片。";
      renderReader();
      return;
    }
    const chapter = chapters[state.currentChapterIndex] || chapters[0];
    const theme = state.settings.reader.theme;
    const canGoPrev = state.currentChapterIndex > 0;
    const canGoNext = state.currentChapterIndex < chapters.length - 1;

    els.readerView.innerHTML = `
      <div class="reader-layout ${state.tocCollapsed ? "toc-collapsed" : ""}" style="--panel-width: ${state.panelWidth}px">
        <aside class="reader-pane toc-pane">
          <div class="pane-header">
            <strong>目录</strong>
            <div class="toolbar">
              <span class="muted">${chapters.length} 节</span>
              <button id="toggleTocBtn" class="btn ghost icon-btn" title="收起目录">‹</button>
            </div>
          </div>
          <ul class="toc-list">
            ${chapters.map((item, index) => `
              <li>
                <button class="toc-item ${index === state.currentChapterIndex ? "is-active" : ""}" data-chapter-index="${index}">
                  ${escapeHtml(item.title || `Chapter ${index + 1}`)}
                </button>
              </li>
            `).join("")}
          </ul>
        </aside>
        <section class="reader-main theme-${theme}" style="--reader-font-size: ${state.settings.reader.fontSize}px; --reader-line-height: ${state.settings.reader.lineHeight};">
          <div class="reader-topbar">
            <div class="toolbar" style="min-width: 0">
              ${state.tocCollapsed ? `<button id="toggleTocBtnTop" class="btn ghost">目录</button>` : ""}
              <div class="reader-title">${escapeHtml(book.title)}</div>
            </div>
            <div class="toolbar">
              <button class="btn ghost" id="prevChapterBtn" ${canGoPrev ? "" : "disabled"}>上一节</button>
              <button class="btn ghost" id="nextChapterBtn" ${canGoNext ? "" : "disabled"}>下一节</button>
              <button class="btn ghost" id="ttsReadBtn" title="朗读选中文本或当前段落">▶ 朗读</button>
              <button class="btn ghost" id="saveProgressBtn">💾 保存进度</button>
              <button class="btn ghost" id="fontDownBtn">A-</button>
              <button class="btn ghost" id="fontUpBtn">A+</button>
              <select id="themeSelect" class="select" style="width: 92px">
                <option value="light" ${theme === "light" ? "selected" : ""}>浅色</option>
                <option value="sepia" ${theme === "sepia" ? "selected" : ""}>米色</option>
                <option value="dark" ${theme === "dark" ? "selected" : ""}>深色</option>
              </select>
            </div>
          </div>
          <div id="readerScroll" class="reader-scroll">
            ${book.format === "pdf" ? renderPdf(content) : renderTextChapter(chapter)}
          </div>
        </section>
        <aside class="reader-pane right" style="position: relative;">
          <div class="resize-handle" id="resizeHandle" title="拖动调整宽度"></div>
          <div class="pane-header">
            <strong>学习侧栏</strong>
            <span class="muted">DeepSeek Ready</span>
          </div>
          ${renderStudyPanel()}
        </aside>
      </div>
    `;

    bindReaderEvents(book, content);
  }

  function renderTextChapter(chapter) {
    const text = chapter?.text || "";
    const parts = splitParagraphs(text);
    return `
      <article id="readingBody" class="reading-body" tabindex="0">
        <h2>${escapeHtml(chapter?.title || "Untitled")}</h2>
        ${parts.length ? parts.map((part) => `<p>${escapeHtml(part)}</p>`).join("") : `<p class="muted">这一节没有解析出正文。可以尝试下一节，或重新导入原始 EPUB。</p>`}
      </article>
    `;
  }

  function renderPdf(content) {
    return `
      <div id="pdfContainer" class="pdf-container"
           data-pdf-loaded="false"
           style="width:100%;height:100%;overflow:auto;background:#525659;padding:12px;">
        <div id="pdfPages" style="display:flex;flex-direction:column;align-items:center;gap:10px;">
          <div class="empty-state" style="min-height:200px"><p style="color:#ccc">正在加载 PDF...</p></div>
        </div>
      </div>
    `;
  }

  async function initPdfViewer(content) {
    if (!window.pdfjsLib) {
      const container = document.getElementById("pdfPages");
      if (container) container.innerHTML = '<div class="empty-state" style="min-height:200px"><p style="color:#ccc">PDF.js 未加载，无法解析 PDF。请检查网络连接。</p></div>';
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(content.pdfBuffer) });
      const pdf = await loadingTask.promise;
      const container = document.getElementById("pdfPages");
      if (!container) return;

      container.innerHTML = "";
      const totalPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const pageWrapper = document.createElement("div");
        pageWrapper.className = "pdf-page-wrapper";
        pageWrapper.style.cssText = "position:relative;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:#fff;";

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = "display:block;";
        pageWrapper.appendChild(canvas);

        const textLayerDiv = document.createElement("div");
        textLayerDiv.className = "pdf-text-layer";
        textLayerDiv.style.cssText = `position:absolute;left:0;top:0;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden;opacity:0.25;line-height:1;`;
        pageWrapper.appendChild(textLayerDiv);

        container.appendChild(pageWrapper);

        // Render canvas
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Render text layer
        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({
          textSource: page,
          container: textLayerDiv,
          viewport,
          textContentSource: textContent
        });
      }

      // Bind selection on text layers
      container.querySelectorAll(".pdf-text-layer").forEach((layer) => {
        layer.addEventListener("mouseup", handleReadingSelection);
        layer.addEventListener("dblclick", handleDoubleClick);
      });

    } catch (error) {
      const container = document.getElementById("pdfPages");
      if (container) container.innerHTML = `<div class="empty-state" style="min-height:200px"><p style="color:#ccc">PDF 加载失败：${escapeHtml(error.message || error)}</p></div>`;
    }
  }

  function renderStudyPanel() {
    // 如果有 AI 分析结果（句子分析），优先显示结果界面
    if (state.aiResult?.type === "sentence") {
      return renderSentenceAnalysis(state.aiResult);
    }
    // 如果有词卡，显示词卡
    if (state.wordCard) {
      return renderWordCard(state.wordCard);
    }
    // AI 分析中：显示加载状态
    if (state.aiBusy && state.selectedText) {
      return renderAnalyzingState();
    }
    // 未查词状态：只显示提示
    return `
      <div class="analysis-panel">
        <section class="panel-section compact">
          <div class="empty-hint">选中正文里的单词或句子<br>双击单词可快速查词</div>
        </section>
      </div>
    `;
  }

  function renderAnalyzingState() {
    return `
      <div class="analysis-panel">
        <section class="panel-section compact">
          <div class="selected-preview">${escapeHtml(limitText(state.selectedText, 120))}</div>
          <div class="toolbar compact-bar">
            <button class="btn" disabled>重新分析</button>
          </div>
        </section>
        <section class="panel-section ai-section">
          <div class="section-header">
            <span class="section-title">🤖 AI 句子分析</span>
            <span class="skeleton-loader"></span>
          </div>
          <div class="sentence-analysis skeleton">
            <div class="analysis-block overview">
              <div class="block-label">📋 概览</div>
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
            </div>
            <div class="analysis-block core">
              <div class="block-label">🎯 句子主干</div>
              <div class="skeleton-line medium"></div>
            </div>
            <div class="analysis-block">
              <div class="block-label">🔨 结构拆解</div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line long"></div>
            </div>
            <div class="analysis-block">
              <div class="block-label">📌 难点词组</div>
              <div class="skeleton-line"></div>
            </div>
            <div class="analysis-block translation">
              <div class="block-label">📝 自然翻译</div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
            <div class="analysis-block tip">
              <div class="block-label">💡 学习建议</div>
              <div class="skeleton-line medium"></div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function renderSentenceAnalysis(result) {
    const data = result.data;
    return `
      <div class="analysis-panel">
        <section class="panel-section compact">
          <div class="selected-preview">${escapeHtml(limitText(state.selectedText, 120))}</div>
          <div class="toolbar compact-bar">
            <button class="btn" data-panel-action="sentence" ${state.selectedText ? "" : "disabled"}>重新分析</button>
          </div>
        </section>

        <section class="panel-section ai-section">
          <div class="section-header">
            <span class="section-title">🤖 AI 句子分析</span>
            <button class="btn small" data-panel-action="tts-sentence" title="朗读原句">▶ 朗读</button>
          </div>
          ${state.aiBusy ? `<p class="muted">正在请求 DeepSeek...</p>` : renderAiResult(result)}
        </section>
      </div>
    `;
  }

  function renderWordCard(card) {
    return `
      <div class="analysis-panel">
        <section class="panel-section compact">
          <!-- 紧凑头部：单词 + 音标 + 操作按钮 -->
          <div class="word-header-compact">
            <div class="word-main">
              <span class="word-title">${escapeHtml(card.word)}</span>
              <span class="word-meta">${card.phonetic ? escapeHtml(card.phonetic) : ""} ${card.partOfSpeech ? `· ${escapeHtml(card.partOfSpeech)}` : ""}</span>
            </div>
            <div class="word-actions">
              <button class="btn icon-btn" data-panel-action="play-audio" ${card.audio ? "" : "disabled"} title="在线发音">🔊</button>
              <button class="btn primary" data-panel-action="save-word">${card.isSaved ? "★" : "☆"}</button>
            </div>
          </div>
          <!-- 标签行 -->
          <div class="chip-row compact-chips">
            ${(card.definitions || []).filter(Boolean).map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}
            ${card.onlineLoading ? `<span class="chip loading">查询中...</span>` : ""}
          </div>
        </section>

        <!-- AI 分析 -->
        <section class="panel-section ai-section">
          <div class="section-header">
            <span class="section-title">🤖 AI 分析</span>
            <button class="btn small" data-panel-action="word-ai">补充词义</button>
          </div>
          ${state.aiBusy ? `<p class="muted">正在请求 DeepSeek...</p>` : renderAiResult(state.aiResult)}
        </section>

        <!-- 词典释义 -->
        ${card.contextualMeaning ? `
          <section class="panel-section">
            <div class="section-header"><span class="section-title">📖 此处含义</span></div>
            <p class="contextual-meaning">${escapeHtml(card.contextualMeaning)}</p>
          </section>
        ` : ""}
        ${card.onlineDefinitions?.length ? `
          <section class="panel-section">
            <div class="section-header"><span class="section-title">📚 联网词典</span></div>
            <ul class="dict-list compact">
              ${card.onlineDefinitions.slice(0, 3).map((item) => `
                <li>
                  <strong>${escapeHtml(item.partOfSpeech || "")}</strong> ${escapeHtml(item.definition || "")}
                </li>
              `).join("")}
            </ul>
          </section>
        ` : ""}

        <!-- 分析所在句子 -->
        ${card.sourceSentence ? `
          <section class="panel-section">
            <div class="section-header"><span class="section-title">📍 所在句子</span></div>
            <p class="source-sentence">${escapeHtml(limitText(card.sourceSentence, 200))}</p>
            <div class="toolbar" style="margin-top: 8px">
              <button class="btn" data-panel-action="analyze-context-sentence">🔍 分析这个句子</button>
            </div>
          </section>
        ` : ""}
      </div>
    `;
  }

  function renderAiResult(result) {
    if (!result) return `<p class="muted">分析结果会显示在这里。</p>`;
    if (result.error) return `<p class="danger-text">${escapeHtml(result.error)}</p>`;

    if (result.type === "word" || result.type === "raw") {
      const data = result.data;
      const lemma = data.lemma || data.word || "";
      const pos = data.partOfSpeech || data.pos || "";
      const contextual = data.meaningInContext || data.contextualMeaning || "";
      const simple = data.simpleChinese || data.simple || "";
      const example = data.example || data.exampleSentence || "";
      const phonetic = data.phonetic || data.ipa || "";

      return `
        <div class="ai-word-card">
          <div class="word-header">
            <span class="word-lemma">${escapeHtml(lemma)}</span>
            ${phonetic ? `<span class="word-phonetic">${escapeHtml(phonetic)}</span>` : ""}
            ${pos ? `<span class="word-pos">${escapeHtml(pos)}</span>` : ""}
          </div>
          
          <div class="word-section">
            <div class="section-label">📖 此语境含义</div>
            <div class="section-content contextual">${renderMarkdown(contextual)}</div>
          </div>
          
          ${simple && simple !== contextual ? `
          <div class="word-section">
            <div class="section-label">📝 常见释义</div>
            <div class="section-content">${renderMarkdown(simple)}</div>
          </div>
          ` : ""}
          
          ${example ? `
          <div class="word-section">
            <div class="section-label">💡 例句</div>
            <div class="example-block">
              <div class="example-en">${renderMarkdown(example)}</div>
              ${data.exampleTranslation ? `<div class="example-cn">${escapeHtml(data.exampleTranslation)}</div>` : ""}
            </div>
          </div>
          ` : ""}
          
          ${data.synonyms || data.antonyms ? `
          <div class="word-section">
            ${data.synonyms ? `<div class="word-relation"><span class="relation-label">近义词</span>${escapeHtml(Array.isArray(data.synonyms) ? data.synonyms.join(", ") : data.synonyms)}</div>` : ""}
            ${data.antonyms ? `<div class="word-relation"><span class="relation-label">反义词</span>${escapeHtml(Array.isArray(data.antonyms) ? data.antonyms.join(", ") : data.antonyms)}</div>` : ""}
          </div>
          ` : ""}
          
          ${data.learningTip || data.tip ? `
          <div class="word-section learning-tip">
            <div class="section-label">🎯 学习提示</div>
            <div class="section-content">${renderMarkdown(data.learningTip || data.tip)}</div>
          </div>
          ` : ""}
        </div>
      `;
    }

    if (result.type === "sentence") {
      const data = result.data;
      return `
        <div class="sentence-analysis">
          <!-- 概览 -->
          <div class="analysis-block overview">
            <div class="block-label">📋 概览</div>
            <div class="block-content markdown-body">${renderMarkdown(data.overview || "")}</div>
          </div>

          <!-- 句子主干 -->
          <div class="analysis-block core">
            <div class="block-label">🎯 句子主干</div>
            <div class="core-sentence">${renderMarkdown(data.coreSentence || "")}</div>
          </div>

          <!-- 结构拆解 -->
          <div class="analysis-block">
            <div class="block-label">🔨 结构拆解</div>
            ${renderSentenceStructure(data.structure)}
          </div>

          ${Array.isArray(data.phrases) && data.phrases.length ? `
          <!-- 难点词组 -->
          <div class="analysis-block">
            <div class="block-label">📌 难点词组</div>
            ${renderPhraseList(data.phrases)}
          </div>
          ` : ""}

          <!-- 自然翻译 -->
          <div class="analysis-block translation">
            <div class="block-label">📝 自然翻译</div>
            <div class="translation-text markdown-body">${renderMarkdown(data.translation || "")}</div>
          </div>

          <!-- 学习建议 -->
          <div class="analysis-block tip">
            <div class="block-label">💡 学习建议</div>
            <div class="block-content markdown-body">${renderMarkdown(data.learningTip || "")}</div>
          </div>

          ${data.quiz ? `
          <div class="analysis-block quiz">
            <div class="block-label">❓ 训练题</div>
            <div class="quiz-question markdown-body">${renderMarkdown(data.quiz.question || "")}</div>
            <details class="quiz-answer">
              <summary>查看答案</summary>
              <div class="markdown-body">${renderMarkdown(data.quiz.answer || "")}</div>
            </details>
          </div>
          ` : ""}
        </div>
      `;
    }

    return `<pre class="selected-text">${escapeHtml(JSON.stringify(result.data, null, 2))}</pre>`;
  }

  function renderMarkdown(text) {
    if (!text) return "";
    try {
      if (window.marked) {
        marked.setOptions({
          breaks: true,
          gfm: true
        });
        return marked.parse(String(text));
      }
    } catch (_) {
      // fallback to escaped text
    }
    return escapeHtml(String(text));
  }

  function renderList(items, renderItem) {
    if (!Array.isArray(items) || !items.length) return `<p class="muted">暂无。</p>`;
    return `<ul>${items.map((item) => `<li>${renderItem(item)}</li>`).join("")}</ul>`;
  }

  function renderSentenceStructure(structure) {
    if (!Array.isArray(structure) || !structure.length) return `<p class="muted">暂无结构拆解。</p>`;

    const roleColors = {
      subject: { bg: "#e8f0fe", border: "#4a90d9", tag: "主语", icon: "🔵" },
      predicate: { bg: "#e6f7ed", border: "#3cb371", tag: "谓语", icon: "🟢" },
      verb: { bg: "#e6f7ed", border: "#3cb371", tag: "谓语动词", icon: "🟢" },
      object: { bg: "#fef5e7", border: "#e8913a", tag: "宾语", icon: "🟠" },
      complement: { bg: "#fef5e7", border: "#e8913a", tag: "补语", icon: "🟡" },
      attribute: { bg: "#f3e8ff", border: "#9b59b6", tag: "定语", icon: "🟣" },
      adverbial: { bg: "#fff0e8", border: "#d35400", tag: "状语", icon: "🔴" },
      prepositional: { bg: "#fff0e8", border: "#d35400", tag: "介词短语", icon: "🔴" },
      conjunction: { bg: "#f0f4f8", border: "#607d8b", tag: "连词", icon: "⚫" },
      clause: { bg: "#f5f0ff", border: "#673ab7", tag: "从句", icon: "💜" },
      "relative-clause": { bg: "#f5f0ff", border: "#673ab7", tag: "定语从句", icon: "💜" },
      "noun-clause": { bg: "#fce4ec", border: "#c2185b", tag: "名词性从句", icon: "❤️" }
    };

    return `<div class="syntax-tree">
      ${structure.map((item, i) => {
        const role = (item.role || item.label || "").toLowerCase();
        const style = roleColors[role] || { bg: "#f5f5f5", border: "#999", tag: item.label || "成分", icon: "📌" };
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;

        return `
        <div class="syntax-node" data-role="${role}">
          <div class="syntax-node-header">
            <span class="syntax-role-badge" style="background:${style.bg};color:${style.border};border-color:${style.border}">
              ${style.icon} ${style.tag}
            </span>
            <span class="syntax-node-text">${renderMarkdown(item.text || "")}</span>
          </div>
          ${item.explanation ? `<div class="syntax-node-explain">${escapeHtml(item.explanation)}</div>` : ""}
          ${hasChildren ? `<div class="syntax-children">${item.children.map(child => {
            const cr = (child.role || child.label || "").toLowerCase();
            const cs = roleColors[cr] || { bg: "#fafafa", border: "#bbb", tag: child.label || "", icon: "" };
            return `
              <div class="syntax-child-node" data-child-role="${cr}">
                <div class="syntax-child-line"></div>
                <span class="syntax-child-tag">${cs.icon} ${cs.tag}</span>
                <span class="syntax-child-text">${escapeHtml(child.text || "")}</span>
                ${child.explanation ? `<span class="syntax-child-note">${escapeHtml(child.explanation)}</span>` : ""}
              </div>`;
          }).join("")}</div>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderPhraseList(phrases) {
    if (!Array.isArray(phrases) || !phrases.length) return `<p class="muted">暂无难点词组。</p>`;
    return `<div class="phrase-list">
      ${phrases.map((item) => `
        <div class="phrase-item">
          <div class="phrase-header">
            <span class="phrase-word">${escapeHtml(item.phrase || "")}</span>
            <span class="phrase-arrow">→</span>
            <span class="phrase-meaning">${escapeHtml(item.meaning || "")}</span>
          </div>
          ${item.note ? `<div class="phrase-detail">${renderMarkdown(item.note)}</div>` : ""}
          ${item.example ? `<div class="phrase-example"><span class="quote-icon">"</span>${escapeHtml(item.example)}<span class="quote-icon">"</span></div>` : ""}
        </div>
      `).join("")}
    </div>`;
  }

  function bindReaderEvents(book, content) {
    els.readerView.querySelectorAll("[data-chapter-index]").forEach((button) => {
      button.addEventListener("click", () => {
        state.currentChapterIndex = Number(button.dataset.chapterIndex);
        state.selectedText = "";
        state.wordCard = null;
        state.aiResult = null;
        // 切换章节时重置滚动位置
        const book = findBook(state.currentBookId);
        if (book) {
          book.progress = {
            chapterIndex: state.currentChapterIndex,
            scrollTop: 0,
            percentage: state.currentChapterIndex / Math.max(1, (content.chapters || []).length - 1)
          };
        }
        renderReader();
      });
    });

    document.getElementById("prevChapterBtn")?.addEventListener("click", () => {
      if (state.currentChapterIndex > 0) {
        state.currentChapterIndex -= 1;
        state.selectedText = "";
        resetChapterScroll(content.chapters?.length);
        renderReader();
      }
    });

    document.getElementById("nextChapterBtn")?.addEventListener("click", () => {
      if (state.currentChapterIndex < (content.chapters || []).length - 1) {
        state.currentChapterIndex += 1;
        state.selectedText = "";
        resetChapterScroll(content.chapters?.length);
        renderReader();
      }
    });

    function resetChapterScroll(chapterCount) {
      const book = findBook(state.currentBookId);
      if (book) {
        book.progress = {
          chapterIndex: state.currentChapterIndex,
          scrollTop: 0,
          percentage: state.currentChapterIndex / Math.max(1, chapterCount - 1)
        };
      }
    }

    document.getElementById("saveProgressBtn")?.addEventListener("click", () => {
      const scroller = document.getElementById("readerScroll");
      if (scroller) {
        saveReaderProgress(book.id, scroller);
        toast("阅读进度已保存");
      }
    });

    document.getElementById("ttsReadBtn")?.addEventListener("click", () => {
      const selection = window.getSelection();
      const selected = selection ? selection.toString().trim() : "";
      if (selected) {
        ttsSpeak(selected, "en-US");
        return;
      }
      const readingBody = document.getElementById("readingBody");
      if (readingBody) {
        const text = readingBody.innerText || "";
        if (text) ttsSpeak(text.slice(0, 5000), "en-US");
      }
    });

    document.getElementById("fontDownBtn")?.addEventListener("click", () => {
      state.settings.reader.fontSize = Math.max(14, state.settings.reader.fontSize - 1);
      saveSettings();
      renderReader();
    });

    document.getElementById("fontUpBtn")?.addEventListener("click", () => {
      state.settings.reader.fontSize = Math.min(28, state.settings.reader.fontSize + 1);
      saveSettings();
      renderReader();
    });

    document.getElementById("themeSelect")?.addEventListener("change", (event) => {
      state.settings.reader.theme = event.target.value;
      saveSettings();
      renderReader();
    });

    document.getElementById("toggleTocBtn")?.addEventListener("click", () => {
      state.tocCollapsed = true;
      renderReader();
    });

    document.getElementById("toggleTocBtnTop")?.addEventListener("click", () => {
      state.tocCollapsed = false;
      renderReader();
    });

    // 拖动调整学习侧栏宽度
    const resizeHandle = document.getElementById("resizeHandle");
    if (resizeHandle) {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      resizeHandle.addEventListener("mousedown", (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = state.panelWidth;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        const delta = startX - e.clientX;
        const newWidth = Math.max(280, Math.min(600, startWidth + delta));
        state.panelWidth = newWidth;
        const layout = document.querySelector(".reader-layout");
        if (layout) layout.style.setProperty("--panel-width", `${newWidth}px`);
      });

      document.addEventListener("mouseup", () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      });
    }

    const readerScroll = document.getElementById("readerScroll");
    readerScroll?.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => saveReaderProgress(book.id, readerScroll), 250);
    });

    requestAnimationFrame(() => {
      const newReaderScroll = document.getElementById("readerScroll");
      if (newReaderScroll && book.format !== "pdf") {
        // 只有当保存的进度是当前章节时才恢复滚动位置，否则从顶部开始
        const savedProgress = book?.progress;
        const targetScrollTop = (savedProgress?.chapterIndex === state.currentChapterIndex)
          ? savedProgress.scrollTop
          : 0;
        newReaderScroll.scrollTop = targetScrollTop;
      }
    });

    const readingBody = document.getElementById("readingBody");
    readingBody?.addEventListener("mouseup", handleReadingSelection);
    readingBody?.addEventListener("keyup", handleReadingSelection);
    readingBody?.addEventListener("dblclick", handleDoubleClick);

    // 初始化 PDF.js 查看器（如果是 PDF 格式）
    if (book.format === "pdf" && state.currentBookContent?.pdfBuffer) {
      initPdfViewer(state.currentBookContent);
    }

    els.readerView.querySelectorAll("[data-panel-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        await handleSelectionAction(button.dataset.panelAction);
      });
    });
  }

  function handleReadingSelection() {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : "";
      if (!text) {
        hideSelectionToolbar();
        return;
      }
      state.selectedText = normalizeWhitespace(text);
      state.selectedContext = buildSelectionContext(state.selectedText);
      state.wordCard = null;
      state.aiResult = null;
      // 只更新学习侧栏，不重新渲染整个阅读器
      renderStudyPanelOnly();
      hideSelectionToolbar();
      scheduleAutoSelectionAction(state.selectedText);
    }, 0);
  }

  async function handleDoubleClick(event) {
    // 获取双击选中的单词
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (!text) return;

    // 检查是否是单个单词
    const word = extractWord(text);
    if (!word) return;

    // 重置防重复机制，确保能立即查词
    state.lastAutoSelectionKey = "";
    state.selectedText = word;
    state.selectedContext = buildSelectionContext(word);
    state.wordCard = null;
    state.aiResult = null;

    // 立即显示词卡并查词
    renderStudyPanelOnly();
    try {
      await lookupSelectedWordOnline(word);
      renderStudyPanelOnly();
      await enrichCurrentWordWithAi();
    } catch (error) {
      // Double click lookup failed
    }
  }

  function renderStudyPanelOnly() {
    const rightPane = document.querySelector(".reader-pane.right");
    if (!rightPane) return;
    const oldPanel = rightPane.querySelector(".analysis-panel");
    if (oldPanel) {
      oldPanel.outerHTML = renderStudyPanel();
    } else {
      rightPane.appendChild(document.createRange().createContextualFragment(renderStudyPanel()));
    }
    // 重新绑定事件
    rightPane.querySelectorAll("[data-panel-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        await handleSelectionAction(button.dataset.panelAction);
      });
    });
  }

  function scheduleAutoSelectionAction(text) {
    clearTimeout(autoSelectionTimer);
    const action = classifySelectionAction(text);
    if (!action) return;
    const key = `${state.currentBookId}:${state.currentChapterIndex}:${action}:${text}`;
    if (state.lastAutoSelectionKey === key) return;
    state.lastAutoSelectionKey = key;
    setTimeout(() => {
      if (state.lastAutoSelectionKey === key) state.lastAutoSelectionKey = "";
    }, 2000);
    autoSelectionTimer = setTimeout(async () => {
      try {
        if (action === "word") {
          await lookupSelectedWordOnline(text);
          renderStudyPanelOnly();
          await enrichCurrentWordWithAi();
          return;
        }
        await analyzeSentence(text);
      } catch (error) {
        state.aiBusy = false;
        state.aiResult = { error: error.message || "Auto analysis failed." };
        renderStudyPanelOnly();
      }
    }, action === "word" ? 180 : 420);
  }

  function classifySelectionAction(text) {
    const value = String(text || "").trim();
    if (!value) return "";
    if (/^[A-Za-z]+(?:['-][A-Za-z]+)?$/.test(value)) return "word";
    const words = value.match(/[A-Za-z]+(?:['-][A-Za-z]+)?/g) || [];
    if (words.length >= 2) return "sentence";
    return "";
  }

  function showSelectionToolbar(rect) {
    if (!rect || !rect.width) return;
    const toolbar = els.selectionToolbar;
    toolbar.hidden = false;
    const top = Math.max(8, rect.top - 42);
    const left = Math.min(window.innerWidth - 320, Math.max(230, rect.left + rect.width / 2 - 145));
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
  }

  function hideSelectionToolbar() {
    els.selectionToolbar.hidden = true;
  }

  async function handleSelectionAction(action) {
    if (action === "save-word") {
      await saveCurrentWord();
      return;
    }

    if (action === "play-audio") {
      playWordAudio();
      return;
    }

    if (action === "tts-word") {
      const word = state.wordCard?.word || state.selectedText;
      if (word) ttsSpeak(word, "en-US");
      return;
    }

    if (action === "tts-sentence") {
      const sentence = state.selectedText || state.wordCard?.sourceSentence;
      if (sentence) ttsSpeak(sentence, "en-US");
      return;
    }

    if (action === "word-ai") {
      await enrichCurrentWordWithAi();
      return;
    }

    // 分析单词所在的句子
    if (action === "analyze-context-sentence") {
      const sentence =
        state.wordCard?.sourceSentence ||
        state.selectedContext?.sentence ||
        state.selectedText?.trim();
      if (sentence) {
        state.selectedText = sentence;
        state.wordCard = null;
        await analyzeSentence(sentence);
      } else {
        toast("没有找到该单词所在的句子。");
      }
      return;
    }

    const text = state.selectedText?.trim();
    if (!text) {
      toast("请先在正文中选中内容。");
      return;
    }

    if (action === "lookup") {
      await lookupSelectedWordOnline(text);
      return;
    }

    if (action === "sentence") {
      state.wordCard = null; // 清除词卡
      // 立即显示骨架屏，再发起请求
      state.aiBusy = true;
      hideSelectionToolbar();
      renderStudyPanelOnly();
      await analyzeSentence(text);
      return;
    }
  }

  function lookupSelectedWord(text) {
    const word = extractWord(text);
    if (!word) {
      toast("当前选中内容不是单个英文单词。");
      return;
    }
    const lookup = lookupLocalDictionary(word);
    const lemma = lookup.lemma;
    const definitions = lookup.definitions;
    const currentBook = findBook(state.currentBookId);
    const existing = state.vocab.find((item) => item.lemma === lemma);
    state.wordCard = {
      word,
      lemma,
      definitions,
      partOfSpeech: lookup.partOfSpeech,
      localNote: lookup.note,
      localStatus: lookup.status,
      contextualMeaning: existing?.contextualMeaning || "",
      sourceSentence: state.selectedContext?.sentence || state.selectedText,
      bookId: currentBook?.id,
      bookTitle: currentBook?.title,
      isSaved: Boolean(existing),
      familiarity: existing?.familiarity || 0
    };
  }

  async function lookupSelectedWordOnline(text) {
    const word = extractWord(text);
    if (!word) {
      toast("当前选中内容不是单个英文单词。");
      return;
    }

    const local = lookupLocalDictionary(word);
    const currentBook = findBook(state.currentBookId);
    const existing = state.vocab.find((item) => item.lemma === local.lemma);
    state.wordCard = {
      word,
      lemma: local.lemma,
      definitions: local.definitions,
      partOfSpeech: local.partOfSpeech,
      localNote: local.note,
      localStatus: local.status,
      onlineLoading: true,
      onlineError: "",
      onlineDefinitions: [],
      phonetic: "",
      audio: "",
      contextualMeaning: existing?.contextualMeaning || "",
      sourceSentence: state.selectedContext?.sentence || state.selectedText,
      bookId: currentBook?.id,
      bookTitle: currentBook?.title,
      isSaved: Boolean(existing),
      familiarity: existing?.familiarity || 0
    };
    renderStudyPanelOnly();

    try {
      const data = await fetchOnlineDictionary(word);
      if (state.wordCard?.word?.toLowerCase() !== word.toLowerCase()) return;
      if (data.ok) {
        const firstPos = data.meanings.find((item) => item.partOfSpeech)?.partOfSpeech || state.wordCard.partOfSpeech;
        state.wordCard.lemma = data.word || state.wordCard.lemma;
        state.wordCard.phonetic = data.phonetic || "";
        state.wordCard.audio = data.audio || "";
        state.wordCard.partOfSpeech = firstPos;
        state.wordCard.onlineDefinitions = data.meanings || [];
        state.wordCard.localNote = `${state.wordCard.localNote || "local"} · online: ${data.source}`;
      } else {
        state.wordCard.onlineError = "在线词典暂未收录。";
      }
    } catch (error) {
      if (state.wordCard?.word?.toLowerCase() !== word.toLowerCase()) return;
      state.wordCard.onlineError = `查询失败：${error.message || error}`;
    } finally {
      if (state.wordCard?.word?.toLowerCase() === word.toLowerCase()) {
        state.wordCard.onlineLoading = false;
        // 自动保存到生词本（如果还没保存过）
        if (!state.wordCard.isSaved) {
          await autoSaveCurrentWord();
        }
        renderStudyPanelOnly();
      }
    }
  }

  async function autoSaveCurrentWord() {
    const card = state.wordCard;
    if (!card || card.isSaved) return;
    const existing = state.vocab.find((item) => item.lemma === card.lemma);
    if (existing) {
      card.isSaved = true;
      return;
    }
    const item = {
      id: createId("word"),
      word: card.word,
      lemma: card.lemma,
      definitions: card.definitions,
      contextualMeaning: card.contextualMeaning || "",
      sourceSentence: card.sourceSentence || "",
      bookId: card.bookId,
      bookTitle: card.bookTitle,
      familiarity: 0,
      reviewCount: 0,
      nextReviewAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await put("vocab", item);
    state.vocab = await getAll("vocab");
    updateBookStats();
    card.isSaved = true;
    toast(`已自动收藏 "${card.word}"`);
  }

  async function fetchOnlineDictionary(word) {
    const url = `/api/dictionary?word=${encodeURIComponent(word)}&proxyUrl=${encodeURIComponent(state.settings.ai.proxyUrl || "http://127.0.0.1:7890")}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  function playWordAudio() {
    const audio = state.wordCard?.audio;
    if (!audio) {
      toast("这个词暂时没有在线发音。");
      return;
    }
    new Audio(audio).play().catch((error) => {
      toast(`发音播放失败：${error.message || error}`);
    });
  }

  async function saveCurrentWord() {
    const card = state.wordCard;
    if (!card) {
      lookupSelectedWord(state.selectedText);
    }
    const nextCard = state.wordCard;
    if (!nextCard) return;
    const existing = state.vocab.find((item) => item.lemma === nextCard.lemma);
    if (existing) {
      toast("这个单词已经在生词本里。");
      return;
    }
    const item = {
      id: createId("word"),
      word: nextCard.word,
      lemma: nextCard.lemma,
      definitions: nextCard.definitions,
      contextualMeaning: nextCard.contextualMeaning || "",
      sourceSentence: nextCard.sourceSentence || "",
      bookId: nextCard.bookId,
      bookTitle: nextCard.bookTitle,
      familiarity: 0,
      reviewCount: 0,
      nextReviewAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await put("vocab", item);
    state.vocab = await getAll("vocab");
    updateBookStats();
    state.wordCard.isSaved = true;
    toast("已加入生词本。");
    render();
  }

  async function enrichCurrentWordWithAi() {
    if (!state.wordCard) lookupSelectedWord(state.selectedText);
    if (!state.wordCard) return;
    await runAiWithPanel(async () => {
      const data = await requestAiJson("word_context", [
        {
          role: "system",
          content: "你是英语精读教练。请基于上下文解释英文单词。只输出合法 JSON。"
        },
        {
          role: "user",
          content: `你是英语精读教练。请基于上下文解释英文单词，面向中文母语者。只输出合法 JSON，不要输出 Markdown 代码块。

返回字段说明：
- lemma: 单词原形
- partOfSpeech: 词性（英文缩写，如 n. v. adj.）
- meaningInContext: 在当前语境下的含义（中文，1-2句话）
- simpleChinese: 常见释义（中文）
- example: 英文例句（**必须是独立例句，不能使用 sourceSentence 原文**，要简洁、能用这个词造一个典型句子）
- exampleTranslation: 例句的中文翻译（自然流畅）
- phonetic: 音标（可选）
- synonyms: 近义词数组（可选）
- antonyms: 反义词数组（可选）
- learningTip: 学习提示（可选，1句话）

单词：${state.wordCard.word}
句子（仅用于理解语境，不要当作例句返回）：${state.wordCard.sourceSentence || state.selectedText}`
        }
      ]);
      state.wordCard.contextualMeaning = data.meaningInContext || data.simpleChinese || "";
      state.wordCard.definitions = unique([...(state.wordCard.definitions || []), data.simpleChinese, data.partOfSpeech].filter(Boolean));
      state.aiResult = { type: "raw", data };
    });
  }

  async function analyzeSentence(text) {
    await runAiWithPanel(async () => {
      const data = await requestAiJson("sentence_analysis", [
        {
          role: "system",
          content: `你是英语精读教练，擅长为中文母语者快速拆解英文句子。
你的输出必须是合法 JSON，不要输出 Markdown 代码块。

只分析最核心的 3-5 个句法成分即可，不要过度拆解。

返回字段：
- overview: 一句话概括句子大意（中文，20字以内）
- coreSentence: 句子主干（只保留主谓宾，去掉修饰语）
- structure: 数组，每个元素：role（英文，可选值：subject/verb/object/complement/adverbial/clause）、text（原文片段）、explanation（中文说明，可选）
- translation: 自然流畅的中文翻译（1-2句话即可）
- learningTip: 学习建议（1句话，突出重点）

不要返回 phrases、quiz 等额外字段，保持简洁，加快响应速度。`
        },
        {
          role: "user",
          content: `请快速分析以下英文句子，返回简洁 JSON。

句子：${text}
${state.selectedContext?.paragraph ? `上下文：${state.selectedContext.paragraph}` : ""}`
        }
      ]);
      state.aiResult = { type: "sentence", data };
    });
  }

  async function runAiWithPanel(task) {
    state.aiBusy = true;
    // 不渲染空白状态，保持界面不变直到结果回来
    try {
      await task();
    } catch (error) {
      state.aiResult = { error: error.message || "AI 请求失败。" };
    } finally {
      state.aiBusy = false;
      renderStudyPanelOnly();
    }
  }

  async function requestAiJson(taskType, messages) {
    const settings = state.settings.ai;
    if (!settings.sendContextEnabled) {
      throw new Error("设置中关闭了发送上下文，无法使用 AI 分析。");
    }

    const quick = taskType === "word_context";
    const model = settings.quickModel || "deepseek-v4-flash";
    const payload = {
      model,
      messages,
      response_format: { type: "json_object" },
      stream: false,
      max_tokens: quick ? 800 : 2400
    };

    const response = await fetch("/api/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        proxyUrl: settings.proxyUrl,
        payload
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed.error?.message || parsed.error || message;
      } catch (_) {
        // Keep upstream text.
      }
      throw new Error(`DeepSeek 请求失败：${message}`);
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (_) {
      throw new Error("DeepSeek 返回了非 JSON 响应。");
    }
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek 响应中没有内容。");
    try {
      return JSON.parse(content);
    } catch (_) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("AI 返回内容不是合法 JSON。");
    }
  }

  function renderVocabulary() {
    const dueCount = state.vocab.filter((item) => !item.nextReviewAt || new Date(item.nextReviewAt) <= new Date()).length;
    const selected = state.vocab.find((item) => item.id === state.selectedVocabId) || state.vocab[0];
    if (!state.selectedVocabId && selected) state.selectedVocabId = selected.id;

    els.vocabularyView.innerHTML = `
      <div class="page">
        <header class="page-header">
          <div class="page-title">
            <h1>生词本</h1>
            <p>${state.vocab.length} 个单词，${dueCount} 个今天需要复习。</p>
          </div>
          <div class="toolbar">
            <button id="exportVocabBtn" class="btn ghost" ${state.vocab.length ? "" : "disabled"}>导出 CSV</button>
            <button id="exportVocabObsidianBtn" class="btn ghost" ${state.vocab.length ? "" : "disabled"}>导出 Obsidian</button>
          </div>
        </header>
        <div class="content-scroll">
          ${state.vocab.length ? `
            <div class="vocab-layout">
              <div class="list-panel">
                <ul class="side-list">
                  ${state.vocab.map((item) => `
                    <li>
                      <button class="side-item ${selected?.id === item.id ? "is-active" : ""}" data-vocab-id="${item.id}">
                        <strong>${escapeHtml(item.word)}</strong>
                        <div class="muted">${escapeHtml(item.definitions?.join(" / ") || "")}</div>
                      </button>
                    </li>
                  `).join("")}
                </ul>
              </div>
              <div class="detail-panel">
                ${selected ? renderVocabDetail(selected) : ""}
              </div>
            </div>
          ` : renderEmptyText("还没有收藏单词", "在阅读页选中单词并点击收藏。")}
        </div>
      </div>
    `;

    document.getElementById("exportVocabBtn")?.addEventListener("click", exportVocabulary);
    document.getElementById("exportVocabObsidianBtn")?.addEventListener("click", exportVocabularyForObsidian);
    els.vocabularyView.querySelectorAll("[data-vocab-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedVocabId = button.dataset.vocabId;
        renderVocabulary();
      });
    });
    els.vocabularyView.querySelectorAll("[data-review-grade]").forEach((button) => {
      button.addEventListener("click", async () => reviewWord(button.dataset.wordId, button.dataset.reviewGrade));
    });
    els.vocabularyView.querySelectorAll("[data-delete-word]").forEach((button) => {
      button.addEventListener("click", async () => deleteWord(button.dataset.deleteWord));
    });
    els.vocabularyView.querySelectorAll("[data-ai-memory]").forEach((button) => {
      button.addEventListener("click", async () => generateMemoryAid(button.dataset.aiMemory));
    });
  }

  function renderVocabDetail(item) {
    const hasMemoryAid = item.memoryAid && (item.memoryAid.mnemonic || item.memoryAid.etymology || item.memoryAid.confusable);
    return `
      <div class="panel-pad">
        <div class="word-head">
          <div>
            <strong>${escapeHtml(item.word)}</strong>
            <div class="muted">原形：${escapeHtml(item.lemma)} · 熟悉度 ${item.familiarity} · 间隔 ${item.interval || 0} 天 · EF ${item.easinessFactor || 2.5} · 复习 ${item.reviewCount || 0} 次 · 创建于 ${formatDateTime(item.createdAt)}</div>
          </div>
        </div>
        <h3>释义</h3>
        <div class="chip-row">${(item.definitions || []).map((text) => `<span class="chip">${escapeHtml(text)}</span>`).join("")}</div>
        ${item.contextualMeaning ? `<h3>此处含义</h3><p>${escapeHtml(item.contextualMeaning)}</p>` : ""}
        <h3>来源句</h3>
        <div class="selected-text">${escapeHtml(item.sourceSentence || "暂无来源句")}</div>
        <p class="muted">来源：${escapeHtml(item.bookTitle || "未知书籍")} · 下次复习 ${formatDate(item.nextReviewAt)}</p>
        <div class="toolbar">
          <button class="btn primary" data-review-grade="known" data-word-id="${item.id}">认识</button>
          <button class="btn" data-review-grade="uncertain" data-word-id="${item.id}">模糊</button>
          <button class="btn" data-review-grade="unknown" data-word-id="${item.id}">不认识</button>
          <button class="btn danger" data-delete-word="${item.id}">删除</button>
        </div>

        <!-- AI 记忆辅助 -->
        <div class="memory-aid-section">
          <div class="section-header">
            <h3>🧠 AI 记忆辅助</h3>
            ${!hasMemoryAid ? `<button class="btn small" data-ai-memory="${item.id}">生成记忆技巧</button>` : ""}
          </div>
          ${hasMemoryAid ? renderMemoryAid(item.memoryAid) : `<p class="muted">点击上方按钮，AI 将为你生成记忆技巧、词源解析和易混淆词对比。</p>`}
        </div>
      </div>
    `;
  }

  function renderMemoryAid(memoryAid) {
    if (!memoryAid) return "";
    return `
      <div class="memory-aid-content">
        ${memoryAid.mnemonic ? `
        <div class="memory-block">
          <div class="memory-label">💡 记忆口诀</div>
          <p>${escapeHtml(memoryAid.mnemonic)}</p>
        </div>
        ` : ""}
        ${memoryAid.etymology ? `
        <div class="memory-block">
          <div class="memory-label">📜 词源解析</div>
          <p>${escapeHtml(memoryAid.etymology)}</p>
        </div>
        ` : ""}
        ${memoryAid.confusable ? `
        <div class="memory-block">
          <div class="memory-label">⚠️ 易混淆词</div>
          <p>${escapeHtml(memoryAid.confusable)}</p>
        </div>
        ` : ""}
        ${memoryAid.example ? `
        <div class="memory-block">
          <div class="memory-label">📝 助记例句</div>
          <p class="example-sentence">${escapeHtml(memoryAid.example)}</p>
        </div>
        ` : ""}
      </div>
    `;
  }

  async function generateMemoryAid(wordId) {
    const item = state.vocab.find((word) => word.id === wordId);
    if (!item) return;

    const button = document.querySelector(`[data-ai-memory="${wordId}"]`);
    if (button) {
      button.disabled = true;
      button.textContent = "生成中...";
    }

    try {
      const data = await requestAiJson("word_memory", [
        {
          role: "system",
          content: "你是英语记忆专家。请为给定的英文单词提供记忆辅助内容。输出必须是合法 JSON，包含以下字段：mnemonic（记忆口诀/联想）、etymology（词源解析，简短）、confusable（易混淆词对比）、example（助记例句）。面向中文母语学习者，解释用中文。"
        },
        {
          role: "user",
          content: `单词：${item.word}\n原形：${item.lemma}\n释义：${(item.definitions || []).join("; ")}\n语境含义：${item.contextualMeaning || ""}\n来源句：${item.sourceSentence || ""}`
        }
      ]);

      item.memoryAid = {
        mnemonic: data.mnemonic || "",
        etymology: data.etymology || "",
        confusable: data.confusable || "",
        example: data.example || "",
        generatedAt: new Date().toISOString()
      };
      item.updatedAt = new Date().toISOString();
      await put("vocab", item);
      state.vocab = await getAll("vocab");
      renderVocabulary();
      toast("记忆辅助已生成！");
    } catch (error) {
      toast(`生成失败：${error.message || error}`);
      if (button) {
        button.disabled = false;
        button.textContent = "生成记忆技巧";
      }
    }
  }

  async function deleteWord(wordId) {
    if (!confirm("确定要从生词本中删除这个单词吗？")) return;
    await remove("vocab", wordId);
    state.vocab = await getAll("vocab");
    state.selectedVocabId = state.vocab[0]?.id || null;
    updateBookStats();
    renderVocabulary();
    toast("已删除单词。");
  }

  async function reviewWord(wordId, grade) {
    const item = state.vocab.find((word) => word.id === wordId);
    if (!item) return;
    const now = new Date();

    // SM-2 间隔复习算法
    const sm2 = computeSm2(item, grade);
    item.familiarity = sm2.easinessFactor >= 2.5 ? Math.min(5, Math.round(sm2.easinessFactor)) : sm2.easinessFactor >= 1.8 ? 3 : sm2.easinessFactor >= 1.3 ? 1 : 0;
    item.reviewCount = sm2.repetition;
    item.interval = sm2.interval;
    item.easinessFactor = sm2.easinessFactor;

    const next = new Date(now);
    next.setDate(now.getDate() + sm2.interval);
    item.nextReviewAt = next.toISOString();
    item.updatedAt = now.toISOString();
    await put("vocab", item);
    state.vocab = await getAll("vocab");
    toast(`复习记录已更新，下次复习：${sm2.interval === 0 ? "今天" : sm2.interval === 1 ? "明天" : sm2.interval + " 天后"}`);
    renderVocabulary();
  }

  function computeSm2(item, grade) {
    // grade: "known" = 5 (perfect), "uncertain" = 3 (pass but hard), "unknown" = 1 (fail)
    const qualityMap = { known: 5, uncertain: 3, unknown: 1 };
    const quality = qualityMap[grade] || 3;

    let repetition = item.repetition || 0;
    let easinessFactor = item.easinessFactor || 2.5;
    let interval = item.interval || 0;

    if (quality >= 3) {
      // Passed
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easinessFactor);
      }
      repetition += 1;
    } else {
      // Failed — reset
      repetition = 0;
      interval = 0;
    }

    // Update easiness factor
    easinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easinessFactor < 1.3) easinessFactor = 1.3;

    return { repetition, easinessFactor, interval };
  }

  function exportVocabulary() {
    const rows = [
      ["word", "lemma", "definitions", "contextual_meaning", "source_sentence", "book_title", "familiarity", "next_review_at"],
      ...state.vocab.map((item) => [
        item.word,
        item.lemma,
        (item.definitions || []).join("; "),
        item.contextualMeaning || "",
        item.sourceSentence || "",
        item.bookTitle || "",
        String(item.familiarity || 0),
        item.nextReviewAt || ""
      ])
    ];
    downloadText("vocabulary.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"));
  }

  function exportVocabularyForObsidian() {
    // Obsidian 格式：使用 frontmatter + callout，方便 Dataview 查询
    const lines = [
      "# AI English Reader 生词本",
      "",
      "> 导出时间：" + new Date().toLocaleString("zh-CN"),
      "> 共 " + state.vocab.length + " 个单词",
      "",
      "---",
      ""
    ];

    state.vocab.forEach((item) => {
      lines.push(`## ${item.word}`);
      lines.push("");
      lines.push("```yaml");
      lines.push(`word: "${item.word}"`);
      lines.push(`lemma: "${item.lemma}"`);
      lines.push(`definitions: "${(item.definitions || []).join("; ")}"`);
      lines.push(`familiarity: ${item.familiarity || 0}`);
      lines.push(`book: "${item.bookTitle || "未知书籍"}"`);
      lines.push(`created: "${item.createdAt}"`);
      lines.push(`next_review: "${item.nextReviewAt || ""}"`);
      lines.push("```");
      lines.push("");

      if (item.contextualMeaning) {
        lines.push("> [!tip] 语境含义");
        lines.push("> " + item.contextualMeaning);
        lines.push("");
      }

      if (item.sourceSentence) {
        lines.push("> [!quote] 来源句");
        lines.push("> " + item.sourceSentence);
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    });

    downloadText("vocabulary-obsidian.md", lines.join("\n"));
  }

  function renderSettings() {
    const ai = state.settings.ai;
    const reader = state.settings.reader;
    els.settingsView.innerHTML = `
      <div class="page">
        <header class="page-header">
          <div class="page-title">
            <h1>设置</h1>
            <p>DeepSeek 配置保存在本机浏览器数据中；正式桌面版会改用系统安全存储。</p>
          </div>
          <div class="toolbar">
            <button id="saveSettingsBtn" class="btn primary">保存设置</button>
          </div>
        </header>
        <div class="content-scroll">
          <div class="settings-grid">
            <section class="settings-panel">
              <div class="panel-pad">
                <h2>DeepSeek</h2>
                <div class="field">
                  <label for="settingBaseUrl">API 地址</label>
                  <input id="settingBaseUrl" class="input" value="${escapeAttr(ai.baseUrl)}" />
                </div>
                <div class="field">
                  <label for="settingApiKey">API Key</label>
                  <input id="settingApiKey" class="input" type="password" value="${escapeAttr(ai.apiKey)}" placeholder="sk-..." />
                </div>
                <div class="field">
                  <label for="settingProxyUrl">代理地址（可选）</label>
                  <input id="settingProxyUrl" class="input" value="${escapeAttr(ai.proxyUrl || "")}" placeholder="例如 http://127.0.0.1:7890" />
                </div>
                <div class="field">
                  <label for="settingQuickModel">快速任务模型</label>
                  <input id="settingQuickModel" class="input" value="${escapeAttr(ai.quickModel)}" />
                </div>
                <div class="field">
                  <label for="settingAdvancedModel">深度分析模型</label>
                  <input id="settingAdvancedModel" class="input" value="${escapeAttr(ai.advancedModel)}" />
                </div>
                <label class="switch-line">
                  <input id="settingThinking" type="checkbox" ${ai.thinkingEnabled ? "checked" : ""} />
                  长难句启用思考模式
                </label>
                <label class="switch-line">
                  <input id="settingSendContext" type="checkbox" ${ai.sendContextEnabled ? "checked" : ""} />
                  使用 AI 时发送选中文本和必要上下文
                </label>
                <p class="muted">书籍全文不会自动上传。只有你主动查词或分析句子时，选中文本才会发送给配置的 AI 服务。</p>
                <button id="testDeepSeekBtn" class="btn ghost">测试连接</button>
                <div id="deepSeekDiagnostic" class="selected-text" style="margin-top: 12px; display: none"></div>
              </div>
            </section>
            <section class="settings-panel">
              <div class="panel-pad">
                <h2>阅读</h2>
                <div class="field">
                  <label for="settingTheme">默认主题</label>
                  <select id="settingTheme" class="select">
                    <option value="light" ${reader.theme === "light" ? "selected" : ""}>浅色</option>
                    <option value="sepia" ${reader.theme === "sepia" ? "selected" : ""}>米色</option>
                    <option value="dark" ${reader.theme === "dark" ? "selected" : ""}>深色</option>
                  </select>
                </div>
                <div class="field">
                  <label for="settingFontSize">字号</label>
                  <input id="settingFontSize" class="input" type="number" min="14" max="28" value="${reader.fontSize}" />
                </div>
                <div class="field">
                  <label for="settingLineHeight">行距</label>
                  <input id="settingLineHeight" class="input" type="number" min="1.3" max="2.2" step="0.05" value="${reader.lineHeight}" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;

    document.getElementById("saveSettingsBtn").addEventListener("click", collectAndSaveSettings);
    document.getElementById("testDeepSeekBtn").addEventListener("click", async () => {
      collectAndSaveSettings(false);
      const resultEl = document.getElementById("deepSeekDiagnostic");
      resultEl.style.display = "block";
      resultEl.textContent = "Testing DeepSeek connection...";
      try {
        const data = await testDeepSeekConnection();
        resultEl.textContent = `OK: ${data}`;
        toast("DeepSeek connection OK.");
      } catch (error) {
        resultEl.textContent = explainDeepSeekError(error.message || String(error));
        toast(error.message || "连接失败。");
      }
    });
  }

  async function testDeepSeekConnection() {
    const settings = state.settings.ai;
    if (!settings.apiKey) throw new Error("API Key is empty.");
    const payload = {
      model: settings.quickModel || "deepseek-v4-flash",
      messages: [
        { role: "system", content: "Return only valid json." },
        { role: "user", content: "Return this json object exactly: {\"ok\":true,\"message\":\"connected\"}" }
      ],
      response_format: { type: "json_object" },
      stream: false,
      max_tokens: 80
    };
    const response = await fetch("/api/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        proxyUrl: settings.proxyUrl || "http://127.0.0.1:7890",
        payload
      })
    });
    const raw = await response.text();
    if (!response.ok) {
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed.error?.message || parsed.error || message;
      } catch (_) {
        // Keep raw response text.
      }
      throw new Error(message);
    }
    const parsed = parseLooseJson(raw);
    return parsed.choices?.[0]?.message?.content || "connected";
  }

  function explainDeepSeekError(message) {
    const text = String(message || "");
    if (/Authentication Fails|invalid api key|invalid_request_error/i.test(text)) {
      return "DeepSeek rejected the API Key. Create a new key in the DeepSeek API console, paste it here, then save settings. Raw: " + text;
    }
    if (/insufficient|balance|quota|billing|credits/i.test(text)) {
      return "DeepSeek account quota or balance is insufficient. Check billing or credits in the DeepSeek console. Raw: " + text;
    }
    if (/ECONNREFUSED|Proxy failed|127\.0\.0\.1:7890/i.test(text)) {
      return "The local proxy on 127.0.0.1:7890 refused the connection. Make sure FlClash is running and HTTP proxy or mixed port is 7890. Raw: " + text;
    }
    if (/model|not found|invalid model/i.test(text)) {
      return "The configured model is not accepted by DeepSeek. Try deepseek-v4-flash or check the current model list. Raw: " + text;
    }
    return "DeepSeek test failed. Raw: " + text;
  }

  function collectAndSaveSettings(showToast = true) {
    state.settings.ai.baseUrl = document.getElementById("settingBaseUrl").value.trim() || "https://api.deepseek.com";
    state.settings.ai.apiKey = document.getElementById("settingApiKey").value.trim();
    state.settings.ai.proxyUrl = document.getElementById("settingProxyUrl").value.trim();
    state.settings.ai.quickModel = document.getElementById("settingQuickModel").value.trim() || "deepseek-v4-flash";
    state.settings.ai.advancedModel = state.settings.ai.quickModel;
    state.settings.ai.thinkingEnabled = false;
    state.settings.ai.sendContextEnabled = document.getElementById("settingSendContext").checked;
    state.settings.reader.theme = document.getElementById("settingTheme").value;
    state.settings.reader.fontSize = clamp(Number(document.getElementById("settingFontSize").value || 18), 14, 28);
    state.settings.reader.lineHeight = clamp(Number(document.getElementById("settingLineHeight").value || 1.75), 1.3, 2.2);
    saveSettings();
    if (showToast) toast("设置已保存。");
    renderReader();
  }

  async function importFiles(files) {
    for (const file of files) {
      try {
        toast(`正在导入 ${file.name}...`);
        const book = await importFile(file);
        state.books.push(book);
        saveBooks();
        toast(`已导入《${book.title}》。`);
      } catch (error) {
        toast(`导入失败：${file.name}，${error.message}`);
      }
    }
    render();
  }

  async function importFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const buffer = await file.arrayBuffer();
    const id = createId("book");
    let parsed;
    if (ext === "txt") parsed = parseTxtBook(file.name, buffer);
    else if (ext === "epub") parsed = await parseEpubBook(file.name, buffer);
    else if (ext === "pdf") parsed = parsePdfBook(file.name, buffer);
    else throw new Error("暂不支持这个格式。");

    const book = {
      id,
      title: parsed.title || stripExtension(file.name),
      author: parsed.author || "",
      format: ext,
      fileName: file.name,
      importedAt: new Date().toISOString(),
      lastOpenedAt: null,
      progress: { chapterIndex: 0, scrollTop: 0, percentage: 0 },
      chapterCount: parsed.chapters?.length || 0,
      stats: { vocabularyCount: 0, noteCount: 0, aiAnalysisCount: 0 }
    };
    await put("bookContents", {
      id,
      format: ext,
      chapters: parsed.chapters || [{ id: `${id}_chapter_0`, title: book.title, text: "" }],
      pdfBuffer: parsed.pdfBuffer || null
    });
    return book;
  }

  function parseTxtBook(fileName, buffer) {
    const text = decodeText(buffer);
    return {
      title: stripExtension(fileName),
      author: "",
      chapters: splitTextIntoChapters(text).map((chapter, index) => ({
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
      throw new Error("当前浏览器不支持 EPUB 解压能力，请先导入 TXT，或使用新版 Chromium/Edge。");
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
        // Some EPUBs reference optional files that are absent. Skip them.
      }
    }

    if (!chapters.length) throw new Error("EPUB 没有解析出可阅读章节，可能是加密或结构异常。");
    return { title, author, chapters };
  }

  async function openBook(bookId) {
    try {
      const book = findBook(bookId);
      if (!book) return;
      state.currentBookId = bookId;
      state.readerError = "";
      state.currentBookContent = await get("bookContents", bookId);
      const chapterCount = Math.max(1, state.currentBookContent?.chapters?.length || 1);
      state.currentChapterIndex = clamp(Number(book.progress?.chapterIndex || 0), 0, chapterCount - 1);
      state.selectedText = "";
      state.wordCard = null;
      state.aiResult = null;
      book.lastOpenedAt = new Date().toISOString();
      saveBooks();
      setView("reader");
    } catch (error) {
      state.readerError = error.message || "打开书籍时发生未知错误。";
      setView("reader");
    }
  }

  async function deleteBook(bookId) {
    state.books = state.books.filter((book) => book.id !== bookId);
    if (state.currentBookId === bookId) {
      state.currentBookId = null;
      state.currentBookContent = null;
    }
    await remove("bookContents", bookId);
    saveBooks();
    render();
  }

  function saveReaderProgress(bookId, scroller) {
    const book = findBook(bookId);
    if (!book || !scroller) return;
    const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    const chapterProgress = scroller.scrollTop / max;
    const content = state.currentBookContent;
    const chapterCount = Math.max(1, content?.chapters?.length || 1);
    const percentage = (state.currentChapterIndex + chapterProgress) / chapterCount;
    book.progress = {
      chapterIndex: state.currentChapterIndex,
      scrollTop: scroller.scrollTop,
      percentage: clamp(percentage, 0, 1)
    };
    saveBooks();
    renderLibrary();
  }

  function updateBookStats() {
    state.books.forEach((book) => {
      book.stats = book.stats || {};
      book.stats.vocabularyCount = state.vocab.filter((item) => item.bookId === book.id).length;
    });
    saveBooks();
  }

  function buildSelectionContext(text) {
    const chapter = state.currentBookContent?.chapters?.[state.currentChapterIndex];
    const chapterText = chapter?.text || "";
    const index = chapterText.indexOf(text);
    if (index < 0) return { sentence: text, paragraph: text };
    const before = chapterText.slice(Math.max(0, index - 900), index);
    const after = chapterText.slice(index + text.length, Math.min(chapterText.length, index + text.length + 900));
    const paragraph = findParagraphAround(chapterText, index, text.length);
    return {
      sentence: inferSentence(`${before}${text}${after}`, text),
      paragraph,
      before,
      after
    };
  }

  function inferSentence(windowText, selected) {
    const safe = normalizeWhitespace(windowText);
    const index = safe.indexOf(selected);
    if (index < 0) return selected;
    let start = Math.max(0, index - 1);
    while (start > 0 && !/[.!?。！？]/.test(safe[start])) start -= 1;
    if (/[.!?。！？]/.test(safe[start])) start += 1;
    let end = index + selected.length;
    while (end < safe.length && !/[.!?。！？]/.test(safe[end])) end += 1;
    if (end < safe.length) end += 1;
    return safe.slice(start, end).trim() || selected;
  }

  function findParagraphAround(text, index, length) {
    let start = text.lastIndexOf("\n\n", index);
    let end = text.indexOf("\n\n", index + length);
    if (start < 0) start = Math.max(0, index - 700);
    else start += 2;
    if (end < 0) end = Math.min(text.length, index + length + 700);
    return normalizeWhitespace(text.slice(start, end));
  }

  function splitTextIntoChapters(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const markers = [];
    lines.forEach((line, index) => {
      if (/^\s*(chapter|part)\s+([0-9ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(line) || /^\s*第.{1,8}[章节]\s*$/.test(line)) {
        markers.push({ index, title: line.trim() });
      }
    });

    if (markers.length > 1) {
      return markers.map((marker, idx) => {
        const next = markers[idx + 1]?.index ?? lines.length;
        return {
          title: marker.title,
          text: lines.slice(marker.index + 1, next).join("\n").trim()
        };
      }).filter((item) => item.text);
    }

    const normalized = text.trim();
    const chunks = [];
    const chunkSize = 28000;
    for (let start = 0; start < normalized.length; start += chunkSize) {
      chunks.push({
        title: chunks.length ? `Part ${chunks.length + 1}` : stripExtension("Text"),
        text: normalized.slice(start, start + chunkSize)
      });
    }
    return chunks.length ? chunks : [{ title: "Text", text: "" }];
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

  function splitParagraphs(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .split(/\n\s*\n+/)
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean);
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
      if (view.getUint32(local, true) !== 0x04034b50) throw new Error("EPUB ZIP local header 异常。");
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
    if (xml.getElementsByTagName("parsererror").length) throw new Error("XML 解析失败。");
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

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        ["bookContents", "vocab", "notes"].forEach((store) => {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function tx(storeName, mode, callback) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function get(store, id) {
    return tx(store, "readonly", (objectStore) => objectStore.get(id));
  }

  function getAll(store) {
    return tx(store, "readonly", (objectStore) => objectStore.getAll());
  }

  function put(store, value) {
    return tx(store, "readwrite", (objectStore) => objectStore.put(value));
  }

  function remove(store, id) {
    return tx(store, "readwrite", (objectStore) => objectStore.delete(id));
  }

  function loadBooks() {
    try {
      return JSON.parse(localStorage.getItem(BOOKS_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveBooks() {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(state.books));
  }

  function loadSettings() {
    const defaults = {
      ai: {
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        apiKey: "",
        proxyUrl: "http://127.0.0.1:7890",
        quickModel: "deepseek-v4-flash",
        advancedModel: "deepseek-v4-flash",
        thinkingEnabled: false,
        reasoningEffort: "high",
        sendContextEnabled: true
      },
      reader: {
        theme: "sepia",
        fontSize: 18,
        lineHeight: 1.75
      }
    };
    try {
      const settings = mergeDeep(defaults, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
      settings.ai.quickModel = settings.ai.quickModel || "deepseek-v4-flash";
      settings.ai.advancedModel = settings.ai.quickModel;
      settings.ai.thinkingEnabled = false;
      settings.ai.proxyUrl = settings.ai.proxyUrl || "http://127.0.0.1:7890";
      return settings;
    } catch (_) {
      return defaults;
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function mergeDeep(target, source) {
    const output = Array.isArray(target) ? [...target] : { ...target };
    Object.keys(source || {}).forEach((key) => {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        output[key] = mergeDeep(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
    return output;
  }

  function findBook(bookId) {
    return state.books.find((book) => book.id === bookId);
  }

  function extractWord(text) {
    const match = String(text || "").trim().match(/[A-Za-z]+(?:['-][A-Za-z]+)?/);
    return match ? match[0] : "";
  }

  function lookupLocalDictionary(word) {
    const raw = String(word || "").toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
    const candidates = buildLemmaCandidates(raw);
    for (const candidate of candidates) {
      const entry = localDictionary[candidate];
      if (entry) {
        return {
          lemma: candidate,
          partOfSpeech: entry.pos,
          definitions: entry.cn,
          note: entry.note,
          status: "local"
        };
      }
    }

    const legacyLemma = lemmatize(raw);
    const legacy = seedDictionary[legacyLemma] || seedDictionary[raw];
    if (legacy) {
      return {
        lemma: legacyLemma,
        partOfSpeech: "",
        definitions: legacy,
        note: "legacy local dictionary",
        status: "legacy"
      };
    }

    const guessed = guessByAffix(raw);
    return {
      lemma: guessed.lemma || raw,
      partOfSpeech: guessed.pos || "",
      definitions: guessed.definitions,
      note: guessed.note,
      status: "guessed"
    };
  }

  function buildLemmaCandidates(word) {
    const candidates = new Set([word]);
    const irregular = {
      made: "make",
      gone: "go",
      went: "go",
      seen: "see",
      shown: "show",
      took: "take",
      taken: "take",
      gave: "give",
      given: "give",
      had: "have",
      were: "be",
      was: "be",
      been: "be",
      did: "do",
      done: "do",
      found: "find",
      thought: "think",
      brought: "bring"
    };
    if (irregular[word]) candidates.add(irregular[word]);
    if (word.endsWith("ies") && word.length > 4) candidates.add(`${word.slice(0, -3)}y`);
    if (word.endsWith("ves") && word.length > 4) {
      candidates.add(`${word.slice(0, -3)}f`);
      candidates.add(`${word.slice(0, -3)}fe`);
    }
    if (word.endsWith("ing") && word.length > 5) {
      const base = word.slice(0, -3);
      candidates.add(base);
      candidates.add(`${base}e`);
      candidates.add(base.replace(/([a-z])\1$/, "$1"));
    }
    if (word.endsWith("ed") && word.length > 4) {
      const base = word.slice(0, -2);
      candidates.add(base);
      candidates.add(`${base}e`);
      candidates.add(base.replace(/([a-z])\1$/, "$1"));
    }
    if (word.endsWith("es") && word.length > 3) candidates.add(word.slice(0, -2));
    if (word.endsWith("s") && word.length > 3) candidates.add(word.slice(0, -1));
    if (word.endsWith("ly") && word.length > 4) candidates.add(word.slice(0, -2));
    if (word.endsWith("ness") && word.length > 6) candidates.add(word.slice(0, -4));
    if (word.endsWith("ment") && word.length > 6) candidates.add(word.slice(0, -4));
    if (word.endsWith("tion") && word.length > 6) candidates.add(word.slice(0, -4));
    if (word.endsWith("ity") && word.length > 5) candidates.add(word.slice(0, -3));
    return Array.from(candidates).filter(Boolean);
  }

  function guessByAffix(word) {
    const suffixes = [
      ["tion", "n.", "……行为/过程/结果"],
      ["sion", "n.", "……行为/状态/结果"],
      ["ment", "n.", "……结果/状态/手段"],
      ["ness", "n.", "……性质/状态"],
      ["ity", "n.", "……性质/状态"],
      ["ism", "n.", "……主义/制度/现象"],
      ["ist", "n.", "……者/专家"],
      ["able", "adj.", "可……的"],
      ["ible", "adj.", "可……的"],
      ["al", "adj.", "……的"],
      ["ive", "adj.", "有……倾向的"],
      ["ous", "adj.", "充满……的"],
      ["less", "adj.", "无……的"],
      ["ful", "adj.", "充满……的"],
      ["ly", "adv.", "以……方式"],
      ["ize", "v.", "使……化"],
      ["ise", "v.", "使……化"]
    ];
    for (const [suffix, pos, meaning] of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return {
          lemma: word,
          pos,
          definitions: [`推测含义：${meaning}`],
          note: `suffix: -${suffix}`
        };
      }
    }
    return {
      lemma: word,
      pos: "",
      definitions: [""],
      note: ""
    };
  }

  function lemmatize(word) {
    const lower = String(word || "").toLowerCase().replace(/'s$/, "");
    if (seedDictionary[lower]) return lower;
    const rules = [
      [/ies$/, "y"],
      [/ing$/, ""],
      [/ed$/, ""],
      [/es$/, ""],
      [/s$/, ""]
    ];
    for (const [pattern, replacement] of rules) {
      const next = lower.replace(pattern, replacement);
      if (next.length > 2 && seedDictionary[next]) return next;
    }
    return lower;
  }

  function decodeText(buffer) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch (_) {
      return new TextDecoder("gb18030").decode(buffer);
    }
  }

  function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function stripExtension(fileName) {
    return String(fileName || "Untitled").replace(/\.[^.]+$/, "");
  }

  function normalizeWhitespace(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function limitText(text, limit) {
    const value = String(text || "");
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatDate(value) {
    if (!value) return "暂无";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "暂无";
    return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  }

  function formatDateTime(value) {
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadText(fileName, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderEmptyText(title, body) {
    return `
      <div class="empty-state">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(body)}</p>
        </div>
      </div>
    `;
  }

  async function requestAiJson(taskType, messages) {
    const settings = state.settings.ai;
    if (!settings.sendContextEnabled) {
      throw new Error("AI context sending is disabled in Settings.");
    }

    const quick = taskType === "word_context";
    const model = settings.quickModel || "deepseek-v4-flash";
    const payload = {
      model,
      messages: buildDeepSeekJsonMessages(taskType, messages),
      response_format: { type: "json_object" },
      stream: false,
      max_tokens: quick ? 1200 : 4096
    };

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const json = await callDeepSeekJson(settings, payload);
        const message = json.choices?.[0]?.message || {};
        const finishReason = json.choices?.[0]?.finish_reason;
        if (finishReason === "length") {
          throw new Error("DeepSeek output was truncated. Select less text or raise max_tokens.");
        }
        if (!message.content || !message.content.trim()) {
          throw new Error("DeepSeek returned empty content in JSON mode.");
        }
        return parseModelJsonContent(message.content);
      } catch (error) {
        lastError = error;
        payload.messages = buildDeepSeekJsonMessages(taskType, messages, true);
      }
    }
    throw lastError || new Error("DeepSeek JSON parsing failed.");
  }

  async function callDeepSeekJson(settings, payload) {
    const response = await fetch("/api/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        proxyUrl: settings.proxyUrl,
        payload
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed.error?.message || parsed.error || message;
      } catch (_) {
        // Keep upstream text.
      }
      throw new Error(`DeepSeek request failed: ${message}`);
    }

    try {
      return parseLooseJson(raw);
    } catch (_) {
      throw new Error(`DeepSeek returned a non-JSON HTTP response: ${limitText(raw, 240)}`);
    }
  }

  function parseLooseJson(raw) {
    const text = String(raw || "").trim();
    try {
      return JSON.parse(text);
    } catch (_) {
      // Continue with cleanup strategies below.
    }

    const withoutHeaders = text.includes("\r\n\r\n") ? text.slice(text.lastIndexOf("\r\n\r\n") + 4).trim() : text;
    try {
      return JSON.parse(withoutHeaders);
    } catch (_) {
      // Continue.
    }

    const dechunked = withoutHeaders.replace(/(?:^|\r?\n)[0-9a-f]+(?:;[^\r\n]*)?\r?\n/gi, "\n").replace(/\r?\n0\r?\n[\s\S]*$/i, "");
    try {
      return JSON.parse(dechunked.trim());
    } catch (_) {
      // Continue.
    }

    const start = dechunked.indexOf("{");
    const end = dechunked.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(dechunked.slice(start, end + 1));
    }
    throw new Error("No JSON object found.");
  }

  function buildDeepSeekJsonMessages(taskType, messages, retry = false) {
    const schema = getJsonSchemaForTask(taskType);
    const guard = {
      role: "system",
      content: [
        "You are an English intensive-reading coach for a Chinese native speaker.",
        "Return only valid json. Do not use Markdown. Do not wrap the json in code fences.",
        "The response must be one JSON object and must follow this example schema exactly:",
        JSON.stringify(schema),
        retry ? "Previous output could not be parsed. Return compact valid json only." : ""
      ].filter(Boolean).join("\n")
    };
    return [guard, ...messages];
  }

  function getJsonSchemaForTask(taskType) {
    if (taskType === "word_context") {
      return {
        lemma: "example",
        partOfSpeech: "noun",
        meaningInContext: "Chinese explanation",
        simpleChinese: "short Chinese meaning",
        example: "An English example sentence."
      };
    }
    if (taskType === "sentence_analysis") {
      return {
        overview: "Chinese overview",
        coreSentence: "subject + verb + object",
        structure: [{ label: "main clause", text: "text", explanation: "Chinese explanation" }],
        grammarPoints: [{ name: "grammar point", explanation: "Chinese explanation", exampleFromSentence: "text" }],
        phrases: [{ phrase: "phrase", meaning: "Chinese meaning", note: "Chinese note" }],
        translation: "natural Chinese translation",
        learningTip: "Chinese learning tip",
        quiz: { question: "Chinese question", answer: "Chinese answer" }
      };
    }
    return {
      summary: "Chinese summary",
      keyIdeas: ["idea 1", "idea 2"],
      difficultSentences: [{ sentence: "sentence", reason: "why difficult", briefExplanation: "Chinese explanation" }],
      vocabulary: [{ wordOrPhrase: "word", meaningInContext: "Chinese meaning" }],
      comprehensionQuestion: { question: "Chinese question", answer: "Chinese answer" }
    };
  }

  function parseModelJsonContent(content) {
    const text = String(content || "").trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidates = [
      text,
      fenced?.[1]?.trim(),
      text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // Try the next candidate.
      }
    }
    throw new Error(`AI returned content that could not be parsed as JSON: ${limitText(text, 300)}`);
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    els.toastHost.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3600);
  }
})();
