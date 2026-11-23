import { explainAiError, testAiConnection } from "./ai.js";
import { dbClear, dbGetAll, dbPut, saveBooks, saveSettings } from "./storage.js";
import { clamp, downloadText, escapeAttr, escapeHtml, toast } from "./utils.js";

export function renderSettings(ctx) {
  const { state, els } = ctx;
  const ai = state.settings.ai;
  const reader = state.settings.reader;

  els.settingsView.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div class="page-title">
          <h1>设置</h1>
          <p>配置 AI 模型、阅读偏好与本地学习数据备份。</p>
        </div>
        <div class="toolbar">
          <button id="saveSettingsBtn" class="btn primary">保存设置</button>
        </div>
      </header>
      <div class="content-scroll">
        <div class="settings-grid">
          <section class="settings-panel">
            <div class="panel-pad">
              <h2 style="margin:0 0 14px;font-size:16px">AI 接口配置（DeepSeek / OpenAI 兼容）</h2>
              ${
                state.serverKeyConfigured
                  ? `<p class="muted" style="margin:0 0 12px">服务端已配置默认 DEEPSEEK_API_KEY；如需使用个人 Key，可在下方填写覆盖。</p>`
                  : ""
              }
              <div class="field">
                <label for="settingBaseUrl">API 地址</label>
                <input id="settingBaseUrl" class="input" value="${escapeAttr(ai.baseUrl)}" placeholder="https://api.deepseek.com" />
              </div>
              <div class="field">
                <label for="settingApiKey">API Key</label>
                <input id="settingApiKey" class="input" type="password" value="${escapeAttr(ai.apiKey)}" placeholder="${state.serverKeyConfigured ? "已由服务端提供（留空使用服务端 Key）" : "sk-..."}" />
              </div>
              ${
                state.accessTokenRequired
                  ? `
                <div class="field">
                  <label for="settingAccessToken">服务访问令牌（Access Token）</label>
                  <input id="settingAccessToken" class="input" type="password" value="${escapeAttr(ai.accessToken || "")}" placeholder="服务端启用了令牌校验" />
                </div>`
                  : ""
              }
              <div class="field">
                <label for="settingProxyUrl">HTTP 代理地址（可选，无需代理请留空）</label>
                <input id="settingProxyUrl" class="input" value="${escapeAttr(ai.proxyUrl || "")}" placeholder="例如 http://127.0.0.1:7890" />
              </div>
              <div class="field">
                <label for="settingQuickModel">快速任务模型（查词 / 记忆辅助）</label>
                <input id="settingQuickModel" class="input" value="${escapeAttr(ai.quickModel)}" placeholder="deepseek-chat" />
              </div>
              <div class="field">
                <label for="settingAdvancedModel">深度分析模型（长难句 / 段落精讲）</label>
                <input id="settingAdvancedModel" class="input" value="${escapeAttr(ai.advancedModel)}" placeholder="deepseek-chat 或 deepseek-reasoner" />
              </div>
              <label class="switch-line">
                <input id="settingThinking" type="checkbox" ${ai.thinkingEnabled ? "checked" : ""} />
                深度任务启用思考模式（配合 deepseek-reasoner 等模型）
              </label>
              <label class="switch-line">
                <input id="settingStream" type="checkbox" ${ai.streamEnabled ? "checked" : ""} />
                启用流式输出预览（直连模式下实时显示进度）
              </label>
              <label class="switch-line">
                <input id="settingCache" type="checkbox" ${ai.cacheEnabled ? "checked" : ""} />
                缓存 AI 分析结果到本地（重复查词/拆句秒开省额度）
              </label>
              <label class="switch-line">
                <input id="settingSendContext" type="checkbox" ${ai.sendContextEnabled ? "checked" : ""} />
                使用 AI 时发送选中文本和必要上下文
              </label>
              <p class="muted" style="margin:6px 0 14px">书籍全文不会自动上传，仅在你主动触发查词或分析时发送当前选中片段。</p>
              <div class="toolbar">
                <button id="testAiBtn" class="btn ghost">测试连接</button>
                <button id="clearAiCacheBtn" class="btn ghost">清空 AI 缓存</button>
              </div>
              <div id="aiDiagnostic" class="stream-preview" style="display:none;margin-top:12px"></div>
            </div>
          </section>

          <section class="settings-panel">
            <div class="panel-pad">
              <h2 style="margin:0 0 14px;font-size:16px">阅读与学习习惯</h2>
              <div class="field">
                <label for="settingTheme">全局界面与阅读主题</label>
                <select id="settingTheme" class="select">
                  <option value="light" ${reader.theme === "light" ? "selected" : ""}>浅色</option>
                  <option value="sepia" ${reader.theme === "sepia" ? "selected" : ""}>米色护眼</option>
                  <option value="dark" ${reader.theme === "dark" ? "selected" : ""}>深色夜间</option>
                </select>
              </div>
              <div class="field">
                <label for="settingFontSize">正文字号（14 - 28 px）</label>
                <input id="settingFontSize" class="input tabular" type="number" min="14" max="28" value="${reader.fontSize}" />
              </div>
              <div class="field">
                <label for="settingLineHeight">正文行距（1.3 - 2.2）</label>
                <input id="settingLineHeight" class="input tabular" type="number" min="1.3" max="2.2" step="0.05" value="${reader.lineHeight}" />
              </div>
              <div class="field">
                <label for="settingTtsRate">语音朗读语速：<span id="ttsRateLabel" class="tabular">${reader.ttsRate || 0.95}x</span></label>
                <input id="settingTtsRate" type="range" min="0.7" max="1.4" step="0.05" value="${reader.ttsRate || 0.95}" />
              </div>
              <label class="switch-line">
                <input id="settingAutoSaveVocab" type="checkbox" ${reader.autoSaveVocab ? "checked" : ""} />
                查词后自动加入生词本（关闭则需手动点击“收藏”）
              </label>
              <label class="switch-line">
                <input id="settingAutoAnalyze" type="checkbox" ${reader.autoAnalyzeSelection ? "checked" : ""} />
                划选单个单词时自动查词（双击单词始终直接查词）
              </label>

              <div class="panel-section" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);border-bottom:0">
                <h2 style="margin:0 0 10px;font-size:15px">数据备份与恢复</h2>
                <p class="muted" style="margin:0 0 12px">导出或恢复生词本、高亮笔记与阅读进度（不含大体积书籍正文和 API Key）。</p>
                <div class="toolbar">
                  <button id="exportBackupBtn" class="btn ghost">导出学习备份 (JSON)</button>
                  <button id="importBackupBtn" class="btn ghost">导入恢复备份</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  document.getElementById("settingTtsRate")?.addEventListener("input", (e) => {
    const label = document.getElementById("ttsRateLabel");
    if (label) label.textContent = `${e.target.value}x`;
  });

  document.getElementById("saveSettingsBtn")?.addEventListener("click", () => collectAndSaveSettings(ctx, true));

  document.getElementById("testAiBtn")?.addEventListener("click", async () => {
    collectAndSaveSettings(ctx, false);
    const diag = document.getElementById("aiDiagnostic");
    if (!diag) return;
    diag.style.display = "block";
    diag.textContent = "正在测试连接...";
    try {
      const output = await testAiConnection(state.settings);
      diag.textContent = `连接成功：${output}`;
      toast("AI 接口连接成功");
    } catch (error) {
      diag.textContent = explainAiError(error.message || String(error));
      toast("连接测试失败，请查看诊断信息");
    }
  });

  document.getElementById("clearAiCacheBtn")?.addEventListener("click", async () => {
    await dbClear("aiCache");
    toast("本地 AI 缓存已清空");
  });

  document.getElementById("exportBackupBtn")?.addEventListener("click", () => exportLearningBackup(state));
  document.getElementById("importBackupBtn")?.addEventListener("click", () => els.backupInput?.click());
}

function collectAndSaveSettings(ctx, showToast) {
  const { state } = ctx;
  const quickModel = document.getElementById("settingQuickModel")?.value.trim() || "deepseek-chat";
  const advancedModel = document.getElementById("settingAdvancedModel")?.value.trim() || quickModel;

  state.settings.ai.baseUrl = document.getElementById("settingBaseUrl")?.value.trim() || "https://api.deepseek.com";
  state.settings.ai.apiKey = document.getElementById("settingApiKey")?.value.trim() || "";
  const tokenEl = document.getElementById("settingAccessToken");
  if (tokenEl) state.settings.ai.accessToken = tokenEl.value.trim();
  state.settings.ai.proxyUrl = document.getElementById("settingProxyUrl")?.value.trim() || "";
  state.settings.ai.quickModel = quickModel;
  state.settings.ai.advancedModel = advancedModel;
  state.settings.ai.thinkingEnabled = Boolean(document.getElementById("settingThinking")?.checked);
  state.settings.ai.streamEnabled = Boolean(document.getElementById("settingStream")?.checked);
  state.settings.ai.cacheEnabled = Boolean(document.getElementById("settingCache")?.checked);
  state.settings.ai.sendContextEnabled = Boolean(document.getElementById("settingSendContext")?.checked);

  state.settings.reader.theme = document.getElementById("settingTheme")?.value || "sepia";
  state.settings.reader.fontSize = clamp(Number(document.getElementById("settingFontSize")?.value || 18), 14, 28);
  state.settings.reader.lineHeight = clamp(Number(document.getElementById("settingLineHeight")?.value || 1.75), 1.3, 2.2);
  state.settings.reader.ttsRate = clamp(Number(document.getElementById("settingTtsRate")?.value || 0.95), 0.7, 1.4);
  state.settings.reader.autoSaveVocab = Boolean(document.getElementById("settingAutoSaveVocab")?.checked);
  state.settings.reader.autoAnalyzeSelection = Boolean(document.getElementById("settingAutoAnalyze")?.checked);

  saveSettings(state.settings);
  ctx.applyTheme(state.settings.reader.theme);
  if (showToast) toast("设置已保存");
}

function exportLearningBackup(state) {
  const safeSettings = {
    ...state.settings,
    ai: { ...state.settings.ai, apiKey: "", accessToken: "" }
  };
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    books: state.books,
    vocab: state.vocab,
    notes: state.notes,
    settings: safeSettings
  };
  downloadText(
    `ai-reader-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  toast("学习数据备份已导出");
}

export async function importLearningBackup(ctx, file) {
  const { state } = ctx;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || typeof data !== "object") throw new Error("备份文件格式无效。");

    if (Array.isArray(data.vocab)) {
      for (const item of data.vocab) {
        if (item && item.id) await dbPut("vocab", item);
      }
      state.vocab = await dbGetAll("vocab");
    }

    if (Array.isArray(data.notes)) {
      for (const item of data.notes) {
        if (item && item.id) await dbPut("notes", item);
      }
      state.notes = await dbGetAll("notes");
    }

    if (Array.isArray(data.books)) {
      const existingIds = new Set(state.books.map((b) => b.id));
      data.books.forEach((b) => {
        if (b && b.id && !existingIds.has(b.id)) {
          state.books.push(b);
        }
      });
      saveBooks(state.books);
    }

    ctx.updateBookStats();
    ctx.renderActiveView();
    toast("备份已恢复（生词与笔记已合并）");
  } catch (error) {
    toast(`恢复失败：${error.message || error}`);
  }
}
