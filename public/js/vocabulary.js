import { requestAiJson } from "./ai.js";
import { ttsSpeak } from "./dictionary.js";
import { computeSm2, dbPut, dbRemove } from "./storage.js";
import {
  csvCell,
  downloadText,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatDateTime,
  highlightWordInText,
  renderEmptyText,
  toast
} from "./utils.js";

function isDueForReview(item) {
  return !item.nextReviewAt || new Date(item.nextReviewAt) <= new Date();
}

function getFilteredVocab(state) {
  const q = (state.vocabQuery || "").trim().toLowerCase();
  const filter = state.vocabFilter || "all";
  const bookFilter = state.vocabBookFilter || "all";

  return state.vocab
    .filter((item) => {
      if (filter === "due" && !isDueForReview(item)) return false;
      if (filter === "new" && (item.familiarity || 0) > 1) return false;
      if (filter === "mastered" && (item.familiarity || 0) < 4) return false;
      if (bookFilter !== "all" && item.bookId !== bookFilter) return false;
      if (q) {
        const hay = `${item.word} ${item.lemma} ${(item.definitions || []).join(" ")} ${item.contextualMeaning || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function renderVocabulary(ctx) {
  const { state, els } = ctx;
  const dueCount = state.vocab.filter(isDueForReview).length;

  els.vocabularyView.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div class="page-title">
          <h1>生词本</h1>
          <p><span class="tabular">${state.vocab.length}</span> 个生词 · 今日待复习 <span class="tabular">${dueCount}</span> 个</p>
        </div>
        <div class="toolbar">
          <button id="toggleFlashcardBtn" class="btn primary" ${state.vocab.length ? "" : "disabled"}>
            ${state.vocabReviewMode ? "返回列表" : dueCount ? `开始复习 (${dueCount})` : "闪卡练习"}
          </button>
          <button id="exportVocabCsvBtn" class="btn ghost" ${state.vocab.length ? "" : "disabled"}>导出 CSV</button>
          <button id="exportVocabObsidianBtn" class="btn ghost" ${state.vocab.length ? "" : "disabled"}>导出 Obsidian</button>
        </div>
      </header>
      <div class="content-scroll">
        ${
          !state.vocab.length
            ? renderEmptyText("还没有收藏单词", "在阅读器中双击英文单词，点击「收藏」即可沉淀到生词本。")
            : state.vocabReviewMode
            ? `<div id="vocabBodyHost"></div>`
            : `
          <div class="filter-bar">
            <input id="vocabSearchInput" class="input" style="width:240px" placeholder="搜索单词或中文释义" value="${escapeAttr(state.vocabQuery || "")}" />
            <div class="segmented" role="tablist" aria-label="生词筛选">
              <button type="button" data-vfilter="all" class="${(state.vocabFilter || "all") === "all" ? "is-active" : ""}">全部</button>
              <button type="button" data-vfilter="due" class="${state.vocabFilter === "due" ? "is-active" : ""}">今日待复习</button>
              <button type="button" data-vfilter="new" class="${state.vocabFilter === "new" ? "is-active" : ""}">生疏</button>
              <button type="button" data-vfilter="mastered" class="${state.vocabFilter === "mastered" ? "is-active" : ""}">已掌握</button>
            </div>
            <select id="vocabBookSelect" class="select" style="width:190px">
              <option value="all">全部书籍</option>
              ${state.books
                .map(
                  (b) =>
                    `<option value="${escapeAttr(b.id)}" ${state.vocabBookFilter === b.id ? "selected" : ""}>${escapeHtml(b.title)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div id="vocabBodyHost" style="height:calc(100% - 52px)"></div>
        `
        }
      </div>
    </div>
  `;

  document.getElementById("exportVocabCsvBtn")?.addEventListener("click", () => exportVocabularyCsv(state));
  document.getElementById("exportVocabObsidianBtn")?.addEventListener("click", () => exportVocabularyObsidian(state));

  document.getElementById("toggleFlashcardBtn")?.addEventListener("click", () => {
    if (state.vocabReviewMode) {
      state.vocabReviewMode = false;
      state.flashcardQueue = [];
      renderVocabulary(ctx);
      return;
    }
    const dueWords = state.vocab.filter(isDueForReview);
    const queue = dueWords.length ? dueWords : getFilteredVocab(state);
    if (!queue.length) {
      toast("当前筛选条件下没有可复习的单词。");
      return;
    }
    state.vocabReviewMode = true;
    state.flashcardQueue = queue.map((w) => w.id);
    state.flashcardIndex = 0;
    state.flashcardRevealed = false;
    renderVocabulary(ctx);
  });

  // Search updates ONLY #vocabBodyHost so input never loses focus
  document.getElementById("vocabSearchInput")?.addEventListener("input", (e) => {
    state.vocabQuery = e.target.value;
    renderVocabBodyOnly(ctx);
  });

  els.vocabularyView.querySelectorAll("[data-vfilter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.vocabFilter = btn.dataset.vfilter;
      els.vocabularyView.querySelectorAll("[data-vfilter]").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.vfilter === state.vocabFilter);
      });
      renderVocabBodyOnly(ctx);
    });
  });

  document.getElementById("vocabBookSelect")?.addEventListener("change", (e) => {
    state.vocabBookFilter = e.target.value;
    renderVocabBodyOnly(ctx);
  });

  if (state.vocab.length) {
    renderVocabBodyOnly(ctx);
  }
}

export function renderVocabBodyOnly(ctx) {
  const { state } = ctx;
  const host = document.getElementById("vocabBodyHost");
  if (!host) return;

  if (state.vocabReviewMode) {
    renderFlashcardStage(ctx, host);
    return;
  }

  const list = getFilteredVocab(state);
  if (!list.length) {
    host.innerHTML = renderEmptyText("没有匹配的单词", "可以调整筛选条件或清空搜索关键词。");
    return;
  }

  let selected = list.find((item) => item.id === state.selectedVocabId) || list[0];
  state.selectedVocabId = selected.id;

  host.innerHTML = `
    <div class="vocab-layout">
      <div class="list-panel">
        <ul class="side-list">
          ${list
            .map(
              (item) => `
            <li>
              <button class="side-item ${selected.id === item.id ? "is-active" : ""}" data-vocab-id="${item.id}">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
                  <strong>${escapeHtml(item.word)}</strong>
                  <span class="muted tabular">Lv.${item.familiarity || 0}</span>
                </div>
                <div class="muted" style="margin-top:2px">${escapeHtml((item.definitions || []).join(" · ") || item.contextualMeaning || "暂无释义")}</div>
              </button>
            </li>`
            )
            .join("")}
        </ul>
      </div>
      <div class="detail-panel">
        ${renderVocabDetail(selected)}
      </div>
    </div>
  `;

  host.querySelectorAll("[data-vocab-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedVocabId = btn.dataset.vocabId;
      renderVocabBodyOnly(ctx);
    });
  });

  bindVocabDetailEvents(ctx, host);
}

function renderVocabDetail(item) {
  const hasMemoryAid =
    item.memoryAid &&
    (item.memoryAid.mnemonic || item.memoryAid.etymology || item.memoryAid.confusable || item.memoryAid.example);

  return `
    <div class="panel-pad">
      <div class="word-header-compact">
        <div>
          <div class="word-title">${escapeHtml(item.word)}</div>
          <div class="word-meta">
            ${item.phonetic ? `<span class="tabular">${escapeHtml(item.phonetic)}</span> · ` : ""}
            原形 ${escapeHtml(item.lemma)} · 熟悉度 <span class="tabular">${item.familiarity || 0}/5</span> · 连续答对 <span class="tabular">${item.repetition || 0}</span> 次 · 间隔 <span class="tabular">${item.interval || 0}</span> 天 · EF <span class="tabular">${item.easinessFactor || 2.5}</span>
          </div>
        </div>
        <button class="btn ghost small" data-tts-vocab="${escapeAttr(item.word)}">发音</button>
      </div>

      <div class="panel-section" style="margin-top:14px">
        <div class="word-section-label">释义</div>
        <div class="def-inline-list">${escapeHtml((item.definitions || []).filter(Boolean).join(" · ") || "暂无基础释义")}</div>
      </div>

      ${
        item.contextualMeaning
          ? `
        <div class="panel-section">
          <div class="word-section-label">语境含义</div>
          <div class="contextual-box">${escapeHtml(item.contextualMeaning)}</div>
        </div>`
          : ""
      }

      <div class="panel-section">
        <div class="word-section-label">来源原句</div>
        <p class="source-sentence">${highlightWordInText(item.sourceSentence || "暂无来源句", item.word)}</p>
        <div class="muted" style="margin-top:8px">
          来源：${escapeHtml(item.bookTitle || "未知书籍")} · 创建于 <span class="tabular">${formatDateTime(item.createdAt)}</span> · 下次复习 <span class="tabular">${formatDate(item.nextReviewAt)}</span>
        </div>
      </div>

      <div class="panel-section">
        <div class="toolbar">
          <button class="btn primary small" data-review-grade="known" data-word-id="${item.id}">认识</button>
          <button class="btn small" data-review-grade="uncertain" data-word-id="${item.id}">模糊</button>
          <button class="btn small" data-review-grade="unknown" data-word-id="${item.id}">不认识</button>
          <button class="btn danger small" data-delete-word="${item.id}" style="margin-left:auto">删除</button>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">AI 记忆辅助</span>
          <button class="btn ghost small" data-ai-memory="${item.id}">${hasMemoryAid ? "重新生成" : "生成记忆技巧"}</button>
        </div>
        ${
          hasMemoryAid
            ? renderMemoryAid(item.memoryAid)
            : `<p class="muted" style="margin:0">生成记忆口诀、词源拆解、易混淆词对比与助记例句。</p>`
        }
      </div>
    </div>
  `;
}

function renderMemoryAid(aid) {
  return `
    <div class="analysis-stack">
      ${aid.mnemonic ? `<div class="analysis-block"><div class="block-label">记忆口诀</div><div>${escapeHtml(aid.mnemonic)}</div></div>` : ""}
      ${aid.etymology ? `<div class="analysis-block"><div class="block-label">词源解析</div><div>${escapeHtml(aid.etymology)}</div></div>` : ""}
      ${aid.confusable ? `<div class="analysis-block"><div class="block-label">易混淆词</div><div>${escapeHtml(aid.confusable)}</div></div>` : ""}
      ${aid.example ? `<div class="analysis-block"><div class="block-label">助记例句</div><div class="example-en">${escapeHtml(aid.example)}</div></div>` : ""}
    </div>
  `;
}

function renderFlashcardStage(ctx, host) {
  const { state } = ctx;
  const queue = state.flashcardQueue || [];
  const idx = state.flashcardIndex || 0;

  if (idx >= queue.length) {
    host.innerHTML = `
      <div class="flashcard-stage" style="text-align:center">
        <h2 style="margin:0">本轮复习已完成</h2>
        <p class="muted" style="margin:0">你刚刚完成了 <span class="tabular">${queue.length}</span> 个单词的 SM-2 间隔复习。</p>
        <div class="flashcard-actions">
          <button id="finishReviewBtn" class="btn primary">返回生词本</button>
        </div>
      </div>
    `;
    document.getElementById("finishReviewBtn")?.addEventListener("click", () => {
      state.vocabReviewMode = false;
      renderVocabulary(ctx);
    });
    return;
  }

  const item = state.vocab.find((w) => w.id === queue[idx]);
  if (!item) {
    state.flashcardIndex += 1;
    renderFlashcardStage(ctx, host);
    return;
  }

  const progress = Math.round(((idx + 1) / queue.length) * 100);

  host.innerHTML = `
    <div class="flashcard-stage">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="muted tabular">进度 ${idx + 1} / ${queue.length}</span>
        <button class="btn ghost small" data-tts-vocab="${escapeAttr(item.word)}">朗读发音</button>
      </div>
      <div class="progress-track"><div class="progress-value" style="width:${progress}%"></div></div>

      <div>
        <div class="flashcard-word">${escapeHtml(item.word)}</div>
        <div class="flashcard-phonetic tabular">${escapeHtml(item.phonetic || item.partOfSpeech || "")}</div>
      </div>

      ${
        item.sourceSentence
          ? `<p class="source-sentence">${highlightWordInText(item.sourceSentence, item.word)}</p>`
          : ""
      }

      ${
        !state.flashcardRevealed
          ? `
        <div class="flashcard-actions">
          <button id="revealFlashcardBtn" class="btn primary">显示释义 (空格)</button>
        </div>`
          : `
        <div class="flashcard-reveal">
          <div>
            <div class="word-section-label">释义</div>
            <div class="def-inline-list">${escapeHtml((item.definitions || []).filter(Boolean).join(" · ") || "暂无基础释义")}</div>
          </div>
          ${
            item.contextualMeaning
              ? `<div class="contextual-box">${escapeHtml(item.contextualMeaning)}</div>`
              : ""
          }
          ${item.memoryAid?.mnemonic ? `<div class="learning-tip-box">口诀：${escapeHtml(item.memoryAid.mnemonic)}</div>` : ""}
          <div class="flashcard-actions" style="margin-top:8px">
            <button class="btn danger" data-fc-grade="unknown" data-word-id="${item.id}">不认识 (1)</button>
            <button class="btn" data-fc-grade="uncertain" data-word-id="${item.id}">模糊 (2)</button>
            <button class="btn primary" data-fc-grade="known" data-word-id="${item.id}">认识 (3)</button>
          </div>
        </div>`
      }
    </div>
  `;

  host.querySelectorAll("[data-tts-vocab]").forEach((btn) => {
    btn.addEventListener("click", () => ttsSpeak(btn.dataset.ttsVocab, { rate: state.settings.reader.ttsRate }));
  });

  document.getElementById("revealFlashcardBtn")?.addEventListener("click", () => {
    state.flashcardRevealed = true;
    renderFlashcardStage(ctx, host);
  });

  host.querySelectorAll("[data-fc-grade]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await reviewWord(ctx, btn.dataset.wordId, btn.dataset.fcGrade, true);
      state.flashcardIndex += 1;
      state.flashcardRevealed = false;
      renderFlashcardStage(ctx, host);
    });
  });
}

export function handleFlashcardKey(ctx, event) {
  const { state } = ctx;
  if (state.view !== "vocabulary" || !state.vocabReviewMode) return false;
  const host = document.getElementById("vocabBodyHost");
  if (!host) return false;

  if (event.code === "Space" && !state.flashcardRevealed) {
    event.preventDefault();
    state.flashcardRevealed = true;
    renderFlashcardStage(ctx, host);
    return true;
  }

  if (state.flashcardRevealed) {
    const map = { Digit1: "unknown", Digit2: "uncertain", Digit3: "known" };
    const grade = map[event.code];
    if (grade) {
      event.preventDefault();
      const wordId = state.flashcardQueue[state.flashcardIndex];
      if (wordId) {
        reviewWord(ctx, wordId, grade, true).then(() => {
          state.flashcardIndex += 1;
          state.flashcardRevealed = false;
          renderFlashcardStage(ctx, host);
        });
      }
      return true;
    }
  }
  return false;
}

function bindVocabDetailEvents(ctx, host) {
  const { state } = ctx;
  host.querySelectorAll("[data-tts-vocab]").forEach((btn) => {
    btn.addEventListener("click", () => ttsSpeak(btn.dataset.ttsVocab, { rate: state.settings.reader.ttsRate }));
  });
  host.querySelectorAll("[data-review-grade]").forEach((btn) => {
    btn.addEventListener("click", () => reviewWord(ctx, btn.dataset.wordId, btn.dataset.reviewGrade, false));
  });
  host.querySelectorAll("[data-delete-word]").forEach((btn) => {
    btn.addEventListener("click", () => deleteWord(ctx, btn.dataset.deleteWord));
  });
  host.querySelectorAll("[data-ai-memory]").forEach((btn) => {
    btn.addEventListener("click", () => generateMemoryAid(ctx, btn.dataset.aiMemory));
  });
}

async function reviewWord(ctx, wordId, grade, silentRender) {
  const { state } = ctx;
  const item = state.vocab.find((w) => w.id === wordId);
  if (!item) return;

  const now = new Date();
  const sm2 = computeSm2(item, grade);
  // Properly persist repetition alongside reviewCount so SM-2 intervals advance!
  item.repetition = sm2.repetition;
  item.reviewCount = sm2.reviewCount;
  item.interval = sm2.interval;
  item.easinessFactor = sm2.easinessFactor;
  item.familiarity = sm2.familiarity;

  const next = new Date(now);
  next.setDate(now.getDate() + sm2.interval);
  item.nextReviewAt = next.toISOString();
  item.updatedAt = now.toISOString();

  await dbPut("vocab", item);
  const label = sm2.interval === 0 ? "今天稍后" : sm2.interval === 1 ? "明天" : `${sm2.interval} 天后`;
  toast(`已更新复习计划 · 下次复习：${label}`);
  if (!silentRender) renderVocabulary(ctx);
}

async function deleteWord(ctx, wordId) {
  const { state } = ctx;
  await dbRemove("vocab", wordId);
  state.vocab = state.vocab.filter((w) => w.id !== wordId);
  state.selectedVocabId = state.vocab[0]?.id || null;
  ctx.updateBookStats();
  renderVocabulary(ctx);
  toast("已删除该单词");
}

async function generateMemoryAid(ctx, wordId) {
  const { state } = ctx;
  const item = state.vocab.find((w) => w.id === wordId);
  if (!item) return;

  const btn = document.querySelector(`[data-ai-memory="${wordId}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = "生成中...";
  }

  try {
    const res = await requestAiJson({
      taskType: "word_memory",
      settings: state.settings,
      forceRefresh: true,
      messages: [
        {
          role: "user",
          content: `请为以下英文单词提供高效记忆辅助（记忆口诀、词源拆解、易混淆词对比、助记例句）：\n单词：${item.word}\n原形：${item.lemma}\n释义：${(item.definitions || []).join("; ")}\n语境含义：${item.contextualMeaning || ""}\n来源句：${item.sourceSentence || ""}`
        }
      ]
    });

    const data = res.data || {};
    item.memoryAid = {
      mnemonic: data.mnemonic || "",
      etymology: data.etymology || "",
      confusable: data.confusable || "",
      example: data.example || "",
      generatedAt: new Date().toISOString()
    };
    item.updatedAt = new Date().toISOString();
    await dbPut("vocab", item);
    renderVocabBodyOnly(ctx);
    toast("AI 记忆辅助已生成");
  } catch (error) {
    toast(`生成失败：${error.message || error}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "生成记忆技巧";
    }
  }
}

function exportVocabularyCsv(state) {
  const rows = [
    ["word", "lemma", "phonetic", "definitions", "contextual_meaning", "source_sentence", "book_title", "familiarity", "repetition", "interval", "next_review_at"],
    ...state.vocab.map((item) => [
      item.word,
      item.lemma,
      item.phonetic || "",
      (item.definitions || []).join("; "),
      item.contextualMeaning || "",
      item.sourceSentence || "",
      item.bookTitle || "",
      String(item.familiarity || 0),
      String(item.repetition || 0),
      String(item.interval || 0),
      item.nextReviewAt || ""
    ])
  ];
  downloadText("vocabulary.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
}

function exportVocabularyObsidian(state) {
  const lines = [
    "# AI English Reader 生词本",
    "",
    `> 导出时间：${new Date().toLocaleString("zh-CN")}`,
    `> 共 ${state.vocab.length} 个单词`,
    "",
    "---",
    ""
  ];
  state.vocab.forEach((item) => {
    lines.push(`## ${item.word}${item.phonetic ? ` \`${item.phonetic}\`` : ""}`, "");
    lines.push("```yaml");
    lines.push(`word: "${item.word}"`);
    lines.push(`lemma: "${item.lemma}"`);
    lines.push(`definitions: "${(item.definitions || []).join("; ")}"`);
    lines.push(`familiarity: ${item.familiarity || 0}`);
    lines.push(`book: "${item.bookTitle || "未知书籍"}"`);
    lines.push(`next_review: "${item.nextReviewAt || ""}"`);
    lines.push("```", "");
    if (item.contextualMeaning) lines.push(`> [!tip] 语境含义\n> ${item.contextualMeaning}`, "");
    if (item.sourceSentence) lines.push(`> [!quote] 来源句\n> ${item.sourceSentence}`, "");
    if (item.memoryAid?.mnemonic) lines.push(`> [!note] 记忆口诀\n> ${item.memoryAid.mnemonic}`, "");
    lines.push("---", "");
  });
  downloadText("vocabulary-obsidian.md", lines.join("\n"), "text/markdown;charset=utf-8");
}
