import { isSafeHttpUrl, toast } from "./utils.js";

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

export function extractWord(text) {
  const match = String(text || "").trim().match(/[A-Za-z]+(?:['-][A-Za-z]+)?/);
  return match ? match[0] : "";
}

export function lookupLocalDictionary(word) {
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
    made: "make", gone: "go", went: "go", seen: "see", shown: "show",
    took: "take", taken: "take", gave: "give", given: "give", had: "have",
    were: "be", was: "be", been: "be", did: "do", done: "do",
    found: "find", thought: "think", brought: "bring", wrote: "write",
    written: "write", spoke: "speak", spoken: "speak", became: "become"
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
        definitions: [`词缀推测：${meaning}`],
        note: `suffix: -${suffix}`
      };
    }
  }
  return { lemma: word, pos: "", definitions: [], note: "" };
}

export function formatPosAbbr(pos) {
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
  return map[key] || String(pos || "").trim();
}

export async function fetchOnlineDictionary(word, proxyUrl = "") {
  const params = new URLSearchParams({ word });
  if (proxyUrl && proxyUrl.trim()) {
    params.set("proxyUrl", proxyUrl.trim());
  }
  const response = await fetch(`/api/dictionary?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function fetchOnlineTranslation(text, proxyUrl = "") {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      proxyUrl: proxyUrl && proxyUrl.trim() ? proxyUrl.trim() : ""
    })
  });
  return response.json();
}

let activeAudioEl = null;

function isAllowedAudioUrl(url) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (s.startsWith("/api/audio?")) return true;
  return isSafeHttpUrl(s);
}

export function playAudioUrl(url, fallbackWord = "", rate = 0.95) {
  const fallback = () => {
    if (fallbackWord) {
      ttsSpeak(fallbackWord, { rate });
    }
  };

  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch (_) {
      // Ignore stop error
    }
    activeAudioEl = null;
  }

  if (!isAllowedAudioUrl(url)) {
    fallback();
    return;
  }

  let settled = false;
  const triggerFallback = () => {
    if (settled) return;
    settled = true;
    activeAudioEl = null;
    fallback();
  };

  try {
    const audio = new Audio(url);
    activeAudioEl = audio;
    audio.addEventListener("error", triggerFallback, { once: true });
    audio.addEventListener(
      "ended",
      () => {
        if (activeAudioEl === audio) activeAudioEl = null;
      },
      { once: true }
    );
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(triggerFallback);
    }
  } catch (_) {
    triggerFallback();
  }
}

export function playWordPronunciation(word, { audioUrl = "", rate = 0.95 } = {}) {
  const clean = extractWord(word) || String(word || "").trim();
  if (!clean) return;
  const resolvedUrl = isAllowedAudioUrl(audioUrl)
    ? audioUrl
    : `/api/audio?word=${encodeURIComponent(clean)}`;
  playAudioUrl(resolvedUrl, clean, rate);
}

// ===== TTS Engine =====
let ttsEnVoice = null;
let speakingState = false;
const ttsListeners = new Set();

function notifyTtsState(speaking) {
  speakingState = speaking;
  ttsListeners.forEach((fn) => {
    try {
      fn(speaking);
    } catch (_) {
      // Ignore listener errors
    }
  });
}

export function onTtsStateChange(listener) {
  ttsListeners.add(listener);
  return () => ttsListeners.delete(listener);
}

export function ttsIsSpeaking() {
  return speakingState || Boolean(window.speechSynthesis && window.speechSynthesis.speaking);
}

function loadVoices() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  ttsEnVoice =
    voices.find((v) => v.lang.startsWith("en-US") && /google|natural|samantha/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en-US")) ||
    voices.find((v) => v.lang.startsWith("en-GB")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null;
}

export function initTts() {
  if (!window.speechSynthesis) return;
  loadVoices();
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && ttsIsSpeaking()) {
      ttsStop();
    }
  });
}

export function ttsSpeak(text, { lang = "en-US", rate = 0.95 } = {}) {
  if (!window.speechSynthesis) {
    toast("当前浏览器不支持语音朗读。");
    return;
  }
  const clean = String(text || "").trim();
  if (!clean) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = lang;
  utter.rate = Math.min(1.5, Math.max(0.6, Number(rate) || 0.95));
  utter.pitch = 1;
  utter.volume = 1;
  if (ttsEnVoice) utter.voice = ttsEnVoice;

  utter.onstart = () => notifyTtsState(true);
  utter.onend = () => notifyTtsState(false);
  utter.onerror = (e) => {
    notifyTtsState(false);
    if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
      toast(`语音朗读失败：${e.error}`);
    }
  };

  setTimeout(() => {
    notifyTtsState(true);
    window.speechSynthesis.speak(utter);
  }, 40);
}

export function ttsStop() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  notifyTtsState(false);
}
