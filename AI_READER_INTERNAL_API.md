# AI 英语精读阅读器内部接口与数据契约

版本：v0.1  
日期：2026-05-22  
适用范围：桌面端本地应用内部接口、Tauri 命令、数据结构、AI 输出契约

## 1. 接口设计原则

- 前端只通过清晰的命令接口访问本地能力。
- 所有接口返回稳定结构，不直接抛出无法展示的异常。
- 文件路径、API Key 等敏感信息不写入前端日志。
- AI 返回尽量使用 JSON 结构，便于界面展示和缓存。
- 阅读定位使用统一 `locator`，不同格式内部自行转换。

## 2. 通用返回结构

```ts
type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: AppError;
    };

type AppError = {
  code: string;
  message: string;
  detail?: string;
  recoverable: boolean;
};
```

常用错误码：

| code | 含义 |
| --- | --- |
| `FILE_NOT_FOUND` | 文件不存在 |
| `UNSUPPORTED_FORMAT` | 不支持的文件格式 |
| `DRM_NOT_SUPPORTED` | 疑似 DRM 或加密文件 |
| `PARSE_FAILED` | 文件解析失败 |
| `DB_ERROR` | 本地数据库错误 |
| `AI_NOT_CONFIGURED` | 未配置 AI 服务 |
| `AI_REQUEST_FAILED` | AI 请求失败 |
| `AI_RESPONSE_INVALID` | AI 响应结构不合法 |
| `NETWORK_ERROR` | 网络错误 |
| `SELECTION_EMPTY` | 未选中文本 |

## 3. 核心类型

### 3.1 Book

```ts
type BookFormat = 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'docx' | 'html' | 'markdown';

type Book = {
  id: string;
  title: string;
  author?: string;
  format: BookFormat;
  filePath: string;
  coverPath?: string;
  language?: string;
  importedAt: string;
  lastOpenedAt?: string;
  progress?: ReadingProgress;
  stats: BookStats;
};

type BookStats = {
  highlightCount: number;
  noteCount: number;
  vocabularyCount: number;
  aiAnalysisCount: number;
};
```

### 3.2 Chapter

```ts
type Chapter = {
  id: string;
  bookId: string;
  title: string;
  orderIndex: number;
  parentId?: string;
  locator: string;
  plainTextPreview?: string;
};
```

### 3.3 Locator

统一阅读定位：

```ts
type ReaderLocator = {
  format: BookFormat;
  value: string;
  chapterId?: string;
  pageIndex?: number;
  percentage?: number;
};
```

格式说明：

| 格式 | value 示例 | 说明 |
| --- | --- | --- |
| EPUB | `epubcfi(/6/14!/4/2/8)` | EPUB CFI |
| PDF | `page:12:x:128:y:440` | 页码和坐标 |
| TXT | `offset:18291` | 字符偏移 |

### 3.4 Selection

```ts
type ReaderSelection = {
  bookId: string;
  chapterId?: string;
  text: string;
  normalizedText: string;
  kind: 'word' | 'sentence' | 'paragraph' | 'range';
  locator: ReaderLocator;
  context: {
    sentence?: string;
    paragraph?: string;
    before?: string;
    after?: string;
  };
};
```

## 4. Tauri 命令

### 4.1 书库

#### `library.list_books`

获取本地书库。

请求：

```ts
type ListBooksRequest = {
  query?: string;
  format?: BookFormat;
  sort?: 'last_opened' | 'imported_at' | 'title' | 'author';
};
```

响应：

```ts
type ListBooksResponse = {
  books: Book[];
};
```

#### `library.import_book`

导入本地书籍。

请求：

```ts
type ImportBookRequest = {
  filePath: string;
  copyToLibrary: boolean;
};
```

响应：

```ts
type ImportBookResponse = {
  book: Book;
  chapters: Chapter[];
  warnings: string[];
};
```

#### `library.delete_book`

删除书籍记录。

请求：

```ts
type DeleteBookRequest = {
  bookId: string;
  deleteOriginalFile: boolean;
};
```

默认不删除用户原始文件，只删除应用内副本和记录。

### 4.2 阅读

#### `reader.get_book_manifest`

获取阅读所需的元数据、目录和资源索引。

```ts
type GetBookManifestRequest = {
  bookId: string;
};

type GetBookManifestResponse = {
  book: Book;
  chapters: Chapter[];
  lastProgress?: ReadingProgress;
};
```

#### `reader.save_progress`

保存阅读进度。

```ts
type ReadingProgress = {
  bookId: string;
  chapterId?: string;
  locator: ReaderLocator;
  percentage: number;
  updatedAt: string;
};
```

#### `reader.search_in_book`

搜索当前书。

```ts
type SearchInBookRequest = {
  bookId: string;
  query: string;
  limit: number;
};

type SearchHit = {
  chapterId?: string;
  locator: ReaderLocator;
  excerpt: string;
};
```

### 4.3 词典和生词

#### `dictionary.lookup`

查询单词。

```ts
type LookupRequest = {
  word: string;
  sentence?: string;
  bookId?: string;
  chapterId?: string;
  locator?: ReaderLocator;
  includeAiExplanation: boolean;
};

type LookupResponse = {
  word: WordCard;
  aiPending: boolean;
};
```

```ts
type WordCard = {
  display: string;
  lemma: string;
  phonetic?: string;
  partOfSpeech?: string[];
  definitions: string[];
  contextualMeaning?: string;
  example?: string;
  sourceSentence?: string;
  isSaved: boolean;
  familiarity?: number;
};
```

#### `vocabulary.save_word`

收藏单词。

```ts
type SaveWordRequest = {
  word: string;
  lemma: string;
  bookId?: string;
  chapterId?: string;
  sentence?: string;
  locator?: ReaderLocator;
  meaningSnapshot?: string;
};

type SaveWordResponse = {
  wordId: string;
  occurrenceId: string;
};
```

#### `vocabulary.list_words`

获取生词本。

```ts
type ListWordsRequest = {
  bookId?: string;
  familiarity?: 'new' | 'learning' | 'known';
  dueOnly?: boolean;
  query?: string;
  limit: number;
  offset: number;
};
```

#### `vocabulary.review_word`

提交复习结果。

```ts
type ReviewGrade = 'known' | 'uncertain' | 'unknown';

type ReviewWordRequest = {
  wordId: string;
  grade: ReviewGrade;
};

type ReviewWordResponse = {
  wordId: string;
  familiarity: number;
  nextReviewAt: string;
};
```

### 4.4 高亮和笔记

#### `notes.create_highlight`

```ts
type CreateHighlightRequest = {
  bookId: string;
  chapterId?: string;
  selectedText: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  locator: ReaderLocator;
};
```

#### `notes.create_note`

```ts
type CreateNoteRequest = {
  highlightId: string;
  content: string;
};
```

#### `notes.export_book_notes`

```ts
type ExportBookNotesRequest = {
  bookId: string;
  format: 'markdown' | 'csv';
  targetPath: string;
};
```

### 4.5 AI

#### `ai.analyze_sentence`

```ts
type AnalyzeSentenceRequest = {
  bookId?: string;
  chapterId?: string;
  sentence: string;
  paragraph?: string;
  level: LearningLevel;
  locator?: ReaderLocator;
  forceRefresh?: boolean;
};

type LearningLevel = 'general' | 'cet4' | 'cet6' | 'postgraduate' | 'ielts' | 'toefl';
```

响应：

```ts
type SentenceAnalysis = {
  overview: string;
  coreSentence: string;
  structure: SentenceStructureItem[];
  grammarPoints: GrammarPoint[];
  phrases: PhraseExplanation[];
  translation: string;
  learningTip: string;
  quiz?: LearningQuiz;
  model: string;
  cached: boolean;
};

type SentenceStructureItem = {
  label: string;
  text: string;
  explanation: string;
};

type GrammarPoint = {
  name: string;
  explanation: string;
  exampleFromSentence?: string;
};

type PhraseExplanation = {
  phrase: string;
  meaning: string;
  note?: string;
};

type LearningQuiz = {
  question: string;
  answer: string;
};
```

#### `ai.explain_paragraph`

```ts
type ExplainParagraphRequest = {
  bookId?: string;
  chapterId?: string;
  paragraph: string;
  level: LearningLevel;
  locator?: ReaderLocator;
  forceRefresh?: boolean;
};

type ParagraphExplanation = {
  summary: string;
  keyIdeas: string[];
  difficultSentences: {
    sentence: string;
    reason: string;
    briefExplanation: string;
  }[];
  vocabulary: {
    wordOrPhrase: string;
    meaningInContext: string;
  }[];
  comprehensionQuestion?: LearningQuiz;
  model: string;
  cached: boolean;
};
```

#### `ai.explain_word_in_context`

```ts
type ExplainWordInContextRequest = {
  word: string;
  sentence: string;
  paragraph?: string;
  level: LearningLevel;
};

type ContextualWordExplanation = {
  lemma: string;
  partOfSpeech: string;
  meaningInContext: string;
  simpleChinese: string;
  example: string;
};
```

### 4.6 设置

#### `settings.get`

```ts
type AppSettings = {
  ai: {
    provider: 'deepseek' | 'openai-compatible' | 'local';
    baseUrl: string;
    model: string;
    quickModel?: string;
    advancedModel?: string;
    thinkingEnabled?: boolean;
    reasoningEffort?: 'high' | 'max';
    apiKeyConfigured: boolean;
    sendContextEnabled: boolean;
  };
  reader: {
    theme: 'light' | 'sepia' | 'dark';
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  };
  privacy: {
    allowAiRequests: boolean;
    storeAiHistory: boolean;
  };
};
```

#### `settings.update`

更新设置。API Key 单独处理，不在普通设置响应中返回。

```ts
type UpdateSettingsRequest = Partial<AppSettings> & {
  apiKey?: string;
};
```

## 10. DeepSeek Provider 契约

### 10.1 默认配置

```ts
const deepSeekDefaultConfig = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  quickModel: 'deepseek-v4-flash',
  advancedModel: 'deepseek-v4-pro',
  thinkingEnabled: true,
  reasoningEffort: 'high',
};
```

### 10.2 请求映射

DeepSeek 走 OpenAI 兼容 Chat Completions 格式。业务层不要直接拼接 DeepSeek 请求，由 `AiProviderClient` 统一转换。

```ts
type AiTaskType = 'word_context' | 'sentence_analysis' | 'paragraph_explanation' | 'chapter_summary';

type AiProviderRequest = {
  taskType: AiTaskType;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  jsonOutput: boolean;
  stream: boolean;
  maxTokens?: number;
};
```

DeepSeek 参数选择：

```ts
function selectDeepSeekOptions(taskType: AiTaskType) {
  if (taskType === 'word_context') {
    return {
      model: 'deepseek-v4-flash',
      thinking: { type: 'disabled' },
      reasoning_effort: 'high',
      max_tokens: 800,
    };
  }

  return {
    model: 'deepseek-v4-pro',
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
    max_tokens: 2400,
  };
}
```

JSON 输出请求需要同时设置响应格式和提示词约束：

```json
{
  "model": "deepseek-v4-pro",
  "messages": [],
  "thinking": { "type": "enabled" },
  "reasoning_effort": "high",
  "response_format": { "type": "json_object" },
  "stream": false
}
```

### 10.3 设置页字段

DeepSeek 设置页需要包含：

- Provider：DeepSeek。
- Base URL：默认 `https://api.deepseek.com`。
- API Key：密码输入框，只显示是否已配置。
- 快速模型：默认 `deepseek-v4-flash`。
- 深度分析模型：默认 `deepseek-v4-pro`。
- 思考模式：开关。
- 推理强度：`high` / `max`。
- 发送上下文给 AI：隐私开关。

### 10.4 错误处理

DeepSeek Provider 需要额外处理：

- API Key 未配置：返回 `AI_NOT_CONFIGURED`。
- 余额、限速或服务繁忙：返回 `AI_REQUEST_FAILED`，保留 provider 错误摘要。
- JSON 不合法：返回 `AI_RESPONSE_INVALID`，可重试一次。
- `finish_reason = length`：提示结果被截断，并建议提高 `max_tokens` 或缩短选中文本。

## 5. AI Prompt 契约

### 5.1 句子分析 System 约束

```text
你是英语精读教练。请分析用户提供的英文句子。
你的输出必须是合法 JSON，不要输出 Markdown。
解释面向中文母语学习者。
不要整段意译后结束，必须拆解句子结构。
如果上下文不足，请基于当前句子说明不确定点。
```

### 5.2 句子分析 User 输入模板

```text
学习等级：{level}
句子：{sentence}
上下文段落：{paragraph}

请返回：
overview, coreSentence, structure, grammarPoints, phrases, translation, learningTip, quiz
```

### 5.3 JSON Schema 简化版

```json
{
  "overview": "string",
  "coreSentence": "string",
  "structure": [
    {
      "label": "string",
      "text": "string",
      "explanation": "string"
    }
  ],
  "grammarPoints": [
    {
      "name": "string",
      "explanation": "string",
      "exampleFromSentence": "string"
    }
  ],
  "phrases": [
    {
      "phrase": "string",
      "meaning": "string",
      "note": "string"
    }
  ],
  "translation": "string",
  "learningTip": "string",
  "quiz": {
    "question": "string",
    "answer": "string"
  }
}
```

## 6. SQLite 表设计草案

```sql
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  format TEXT NOT NULL,
  file_path TEXT NOT NULL,
  cover_path TEXT,
  language TEXT,
  imported_at TEXT NOT NULL,
  last_opened_at TEXT
);

CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  parent_id TEXT,
  locator TEXT NOT NULL,
  plain_text TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE reading_progress (
  book_id TEXT PRIMARY KEY,
  chapter_id TEXT,
  locator_json TEXT NOT NULL,
  percentage REAL NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE vocabulary_words (
  id TEXT PRIMARY KEY,
  lemma TEXT NOT NULL,
  display TEXT NOT NULL,
  phonetic TEXT,
  definitions_json TEXT,
  familiarity INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE vocabulary_occurrences (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  book_id TEXT,
  chapter_id TEXT,
  sentence TEXT,
  locator_json TEXT,
  meaning_snapshot TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (word_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

CREATE TABLE highlights (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  selected_text TEXT NOT NULL,
  color TEXT NOT NULL,
  locator_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  highlight_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (highlight_id) REFERENCES highlights(id) ON DELETE CASCADE
);

CREATE TABLE ai_analyses (
  id TEXT PRIMARY KEY,
  book_id TEXT,
  chapter_id TEXT,
  type TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  source_text TEXT NOT NULL,
  request_json TEXT,
  result_json TEXT NOT NULL,
  model TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_chapters_book ON chapters(book_id, order_index);
CREATE INDEX idx_vocab_lemma ON vocabulary_words(lemma);
CREATE INDEX idx_vocab_next_review ON vocabulary_words(next_review_at);
CREATE INDEX idx_ai_cache ON ai_analyses(type, source_hash, model);
```

## 7. 前端模块接口

### 7.1 ReaderAdapter

每种格式实现统一适配器。

```ts
interface ReaderAdapter {
  load(book: Book, container: HTMLElement): Promise<void>;
  destroy(): Promise<void>;
  goTo(locator: ReaderLocator): Promise<void>;
  getCurrentLocator(): Promise<ReaderLocator>;
  getProgress(): Promise<number>;
  getSelection(): Promise<ReaderSelection | null>;
  search(query: string): Promise<SearchHit[]>;
  setTheme(theme: ReaderTheme): Promise<void>;
}
```

### 7.2 SelectionService

```ts
interface SelectionService {
  classify(text: string): 'word' | 'sentence' | 'paragraph' | 'range';
  normalizeWord(text: string): string;
  expandToSentence(selection: ReaderSelection): Promise<ReaderSelection>;
  getContext(selection: ReaderSelection): Promise<ReaderSelection['context']>;
}
```

## 8. 日志和诊断

日志级别：

- `debug`：开发调试。
- `info`：导入成功、AI 请求开始/结束。
- `warn`：解析警告、AI 结构回退。
- `error`：导入失败、数据库错误、AI 请求失败。

敏感信息禁止进入日志：

- API Key。
- 完整文件路径可在 debug 关闭时隐藏。
- 大段书籍原文。

## 9. 导出格式

### 9.1 生词 CSV

字段：

```text
word,lemma,phonetic,definitions,contextual_meaning,source_sentence,book_title,created_at,familiarity
```

### 9.2 笔记 Markdown

```markdown
# {Book Title}

## Highlights

### Chapter: {Chapter Title}

> {selected_text}

Note: {note}

AI:
{analysis_summary}
```
