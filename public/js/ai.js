import { dbGet, dbPut } from "./storage.js";
import { limitText, normalizeWhitespace } from "./utils.js";

let activeAbortController = null;

export function abortActiveAiRequest() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
}

function getSchemaExample(taskType) {
  if (taskType === "word_context") {
    return {
      lemma: "example",
      partOfSpeech: "n.",
      meaningInContext: "在当前句中的准确中文含义（1-2句）",
      simpleChinese: "常见中文释义",
      example: "An independent English example sentence using the word.",
      exampleTranslation: "例句的自然中文翻译",
      phonetic: "/ɪɡˈzɑːmpəl/",
      synonyms: ["instance", "sample"],
      antonyms: [],
      learningTip: "一句实用记忆或用法提示"
    };
  }
  if (taskType === "sentence_analysis") {
    return {
      overview: "一句话概括句子大意（25字以内）",
      coreSentence: "提取出的主干（主+谓+宾）",
      structure: [
        { role: "subject", text: "原文主语片段", explanation: "简短中文语法说明" }
      ],
      phrases: [
        { phrase: "关键短语或固定搭配", meaning: "中文释义", note: "用法说明" }
      ],
      translation: "自然流畅的中文翻译",
      learningTip: "一句聚焦句法/表达的学习建议",
      quiz: {
        question: "一道基于该句结构的简短理解或改写小题",
        answer: "参考答案与解析"
      }
    };
  }
  if (taskType === "paragraph_explain") {
    return {
      summary: "用2-3句中文清晰概括段落核心思想",
      keyIdeas: ["要点 1", "要点 2"],
      difficultSentences: [
        { sentence: "段落中最难的1-2个原句", reason: "难点原因", briefExplanation: "简明中文拆解" }
      ],
      vocabulary: [
        { wordOrPhrase: "关键词或短语", meaningInContext: "在此段语境下的中文释义" }
      ],
      comprehensionQuestion: {
        question: "一道检验理解的阅读思考题",
        answer: "参考解答"
      }
    };
  }
  if (taskType === "word_memory") {
    return {
      mnemonic: "直观有趣的记忆口诀或联想方法",
      etymology: "简短词根词缀或词源演变",
      confusable: "容易混淆的近形/近义词对比",
      example: "一句简洁地道、方便记忆的英文例句（附中文）"
    };
  }
  if (taskType === "sentence_translate") {
    return {
      translation: "自然流畅、忠实原意的中文翻译"
    };
  }
  return {};
}

function buildCacheKey({ bookId, chapterIndex, taskType, model, text }) {
  const norm = normalizeWhitespace(text).toLowerCase().slice(0, 1200);
  return `${bookId || "global"}::${chapterIndex ?? 0}::${taskType}::${model}::${norm}`;
}

function selectModelForTask(settings, taskType) {
  const ai = settings.ai;
  if (taskType === "word_context" || taskType === "word_memory" || taskType === "sentence_translate") {
    return ai.quickModel || "deepseek-chat";
  }
  return ai.advancedModel || ai.quickModel || "deepseek-chat";
}

export async function requestAiJson({
  taskType,
  messages,
  settings,
  cacheContext = null,
  forceRefresh = false,
  onStreamText = null
}) {
  const ai = settings.ai;
  if (!ai.sendContextEnabled) {
    throw new Error("设置中关闭了“发送选中文本与上下文”，无法使用 AI 分析。");
  }

  const model = selectModelForTask(settings, taskType);
  const useCache = Boolean(ai.cacheEnabled && cacheContext && !forceRefresh);
  const cacheKey = cacheContext ? buildCacheKey({ ...cacheContext, taskType, model }) : null;

  if (useCache && cacheKey) {
    try {
      const cached = await dbGet("aiCache", cacheKey);
      if (cached && cached.data) {
        return { data: cached.data, fromCache: true, model };
      }
    } catch (_) {
      // Proceed without cache on IndexedDB read errors
    }
  }

  abortActiveAiRequest();
  const controller = new AbortController();
  activeAbortController = controller;

  const isQuick = taskType === "word_context" || taskType === "word_memory";
  const schema = getSchemaExample(taskType);
  const guardSystem = {
    role: "system",
    content: [
      "你是面向中文母语学习者的英语精读教练。",
      "必须严格输出单个合法 JSON 对象，不要包含 Markdown 代码块（```）或额外说明文字。",
      "请遵循以下 JSON 字段结构：",
      JSON.stringify(schema)
    ].join("\n")
  };

  const fullMessages = [guardSystem, ...messages];
  const useThinking = !isQuick && Boolean(ai.thinkingEnabled);
  const wantStream = Boolean(ai.streamEnabled && typeof onStreamText === "function" && !ai.proxyUrl);

  const payload = {
    model,
    messages: fullMessages,
    response_format: { type: "json_object" },
    stream: wantStream,
    max_tokens: isQuick ? 1000 : 2800
  };

  if (useThinking && /reasoner|r1/i.test(model)) {
    delete payload.response_format;
  }

  const headers = { "Content-Type": "application/json" };
  if (ai.accessToken) {
    headers["X-Access-Token"] = ai.accessToken;
  }

  try {
    const response = await fetch("/api/deepseek", {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        baseUrl: ai.baseUrl,
        apiKey: ai.apiKey,
        proxyUrl: ai.proxyUrl || "",
        payload
      })
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed.error?.message || parsed.error || message;
      } catch (_) {
        // Keep raw message
      }
      throw new Error(message || `HTTP ${response.status}`);
    }

    let content = "";
    const contentType = response.headers.get("content-type") || "";
    if (wantStream && contentType.includes("text/event-stream") && response.body) {
      content = await readSseContent(response.body, onStreamText);
    } else {
      const raw = await response.text();
      const json = parseLooseJson(raw);
      const choice = json.choices?.[0];
      if (choice?.finish_reason === "length") {
        throw new Error("模型输出被截断，请缩短选中文本后重试。");
      }
      content = choice?.message?.content || "";
    }

    if (!content.trim()) {
      throw new Error("AI 返回内容为空。");
    }

    const parsedData = parseModelJsonContent(content);

    if (cacheKey) {
      dbPut("aiCache", {
        id: cacheKey,
        taskType,
        model,
        data: parsedData,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }

    return { data: parsedData, fromCache: false, model };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("已取消本次 AI 分析。");
    }
    throw error;
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

async function readSseContent(stream, onStreamText) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let accumulated = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr || dataStr === "[DONE]") continue;
      try {
        const chunk = JSON.parse(dataStr);
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          accumulated += delta;
          onStreamText(accumulated);
        }
      } catch (_) {
        // Ignore partial chunk JSON
      }
    }
  }
  return accumulated;
}

export async function testAiConnection(settings) {
  const ai = settings.ai;
  const headers = { "Content-Type": "application/json" };
  if (ai.accessToken) headers["X-Access-Token"] = ai.accessToken;

  const payload = {
    model: ai.quickModel || "deepseek-chat",
    messages: [
      { role: "system", content: "Return only valid json." },
      { role: "user", content: 'Return this exact JSON object: {"ok":true,"message":"connected"}' }
    ],
    response_format: { type: "json_object" },
    stream: false,
    max_tokens: 60
  };

  const response = await fetch("/api/deepseek", {
    method: "POST",
    headers,
    body: JSON.stringify({
      baseUrl: ai.baseUrl,
      apiKey: ai.apiKey,
      proxyUrl: ai.proxyUrl || "",
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
      // Keep raw
    }
    throw new Error(message || `HTTP ${response.status}`);
  }
  const parsed = parseLooseJson(raw);
  return parsed.choices?.[0]?.message?.content || "connected";
}

export function explainAiError(message) {
  const text = String(message || "");
  if (/Authentication Fails|invalid api key|401/i.test(text)) {
    return `API Key 认证失败，请核对 DeepSeek API Key 是否正确或已过期。详情：${text}`;
  }
  if (/insufficient|balance|quota|billing|402/i.test(text)) {
    return `账户余额不足，请检查 DeepSeek 控制台额度。详情：${text}`;
  }
  if (/ECONNREFUSED|Proxy|timed out/i.test(text)) {
    return `网络连接或代理地址不可达，若无需代理请清空代理地址后重试。详情：${text}`;
  }
  if (/model|not found|invalid model/i.test(text)) {
    return `模型名称不被接口接受，建议使用 deepseek-chat 或 deepseek-reasoner。详情：${text}`;
  }
  return `连接测试失败：${text}`;
}

function parseLooseJson(raw) {
  const text = String(raw || "").trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error(`接口返回了非 JSON 响应：${limitText(text, 200)}`);
  }
}

function parseModelJsonContent(content) {
  const text = String(content || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const candidates = [
    text,
    fenced?.[1]?.trim(),
    start >= 0 && end > start ? text.slice(start, end + 1) : ""
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Try next candidate
    }
  }
  throw new Error(`AI 输出无法解析为 JSON：${limitText(text, 240)}`);
}
