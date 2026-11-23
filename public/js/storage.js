const DB_NAME = "ai-english-reader-db";
const DB_VERSION = 2;
const BOOKS_KEY = "ai-reader.books";
const SETTINGS_KEY = "ai-reader.settings";

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      ["bookContents", "vocab", "notes", "aiCache"].forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function runTx(storeName, mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function dbGet(store, id) {
  return runTx(store, "readonly", (s) => s.get(id));
}

export function dbGetAll(store) {
  return runTx(store, "readonly", (s) => s.getAll());
}

export function dbPut(store, value) {
  return runTx(store, "readwrite", (s) => s.put(value));
}

export function dbRemove(store, id) {
  return runTx(store, "readwrite", (s) => s.delete(id));
}

export function dbClear(store) {
  return runTx(store, "readwrite", (s) => s.clear());
}

export function loadBooks() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOKS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

export function saveBooks(books) {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

function mergeDeep(target, source) {
  const output = Array.isArray(target) ? [...target] : { ...target };
  Object.keys(source || {}).forEach((key) => {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      output[key] = mergeDeep(output[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  });
  return output;
}

export function getDefaultSettings() {
  return {
    ai: {
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "",
      accessToken: "",
      proxyUrl: "",
      quickModel: "deepseek-chat",
      advancedModel: "deepseek-chat",
      thinkingEnabled: false,
      streamEnabled: true,
      cacheEnabled: true,
      sendContextEnabled: true
    },
    reader: {
      theme: "sepia",
      fontSize: 18,
      lineHeight: 1.75,
      ttsRate: 0.95,
      autoSaveVocab: false,
      autoAnalyzeSelection: true
    }
  };
}

export function loadSettings() {
  const defaults = getDefaultSettings();
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const settings = mergeDeep(defaults, stored);
    settings.ai.baseUrl = settings.ai.baseUrl || "https://api.deepseek.com";
    settings.ai.quickModel = settings.ai.quickModel || "deepseek-chat";
    settings.ai.advancedModel = settings.ai.advancedModel || settings.ai.quickModel;
    return settings;
  } catch (_) {
    return defaults;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Standard SM-2 spaced repetition update.
 * Properly tracks `repetition` separately from total `reviewCount` so intervals advance:
 * 1 day -> 6 days -> round(interval * EF).
 */
export function computeSm2(item, grade) {
  const qualityMap = { known: 5, uncertain: 3, unknown: 1 };
  const quality = qualityMap[grade] ?? 3;

  let repetition = Number.isFinite(item.repetition) ? item.repetition : 0;
  let easinessFactor = Number.isFinite(item.easinessFactor) ? item.easinessFactor : 2.5;
  let interval = Number.isFinite(item.interval) ? item.interval : 0;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(interval * easinessFactor));
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 0;
  }

  easinessFactor =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easinessFactor < 1.3) easinessFactor = 1.3;
  easinessFactor = Math.round(easinessFactor * 100) / 100;

  let familiarity = 0;
  if (repetition >= 4 && easinessFactor >= 2.2) familiarity = 5;
  else if (repetition >= 3) familiarity = 4;
  else if (repetition === 2) familiarity = 3;
  else if (repetition === 1 && quality >= 4) familiarity = 2;
  else if (repetition === 1) familiarity = 1;

  return {
    repetition,
    easinessFactor,
    interval,
    familiarity,
    reviewCount: (Number(item.reviewCount) || 0) + 1
  };
}
