# AI 英语精读阅读器界面与代码风格规范

版本：v0.1  
日期：2026-05-22  
适用范围：桌面版 UI、交互、视觉、前端代码和本地服务代码

## 1. 设计目标

这款软件应该像一个安静、可靠、懂英语学习的桌面工具。它的重点不是炫技，而是让用户能持续阅读热门外文书，并在不打断心流的情况下解决词汇、长句和理解问题。

设计关键词：

- 安静
- 清晰
- 学习友好
- 可长期使用
- 信息密度适中
- AI 辅助但不喧宾夺主

## 2. 页面结构

### 2.1 主导航

桌面端采用左侧窄导航：

- 书库
- 阅读
- 生词
- 笔记
- 设置

导航宽度建议：

- 收起：56px
- 展开：180px

### 2.2 书库页

书库页以实用为主：

- 顶部：搜索框、导入按钮、视图切换。
- 主体：书籍网格或紧凑列表。
- 空状态：提供导入入口。

书籍卡片内容：

- 封面。
- 标题。
- 作者。
- 进度。
- 最近阅读时间。
- 生词数量。

### 2.3 阅读页

阅读页采用三栏布局：

- 左栏：目录、书签、搜索结果。
- 中栏：正文阅读。
- 右栏：词卡、AI 分析、笔记。

宽度建议：

```text
左栏：260px，可折叠
中栏：minmax(560px, 820px)
右栏：360px，可折叠
```

阅读页不要使用营销式大标题、装饰性背景、浮夸渐变。用户需要长时间盯着文本，视觉应稳定。

### 2.4 生词本页

生词本布局：

- 顶部筛选：全部、今日复习、按书籍、熟悉度。
- 左侧或主体：单词列表。
- 右侧：单词详情和来源句。
- 底部或顶部：开始复习按钮。

## 3. 视觉规范

### 3.1 色彩

默认主题以中性色为主，使用少量强调色。

浅色主题：

```css
--bg: #f7f7f4;
--surface: #ffffff;
--surface-muted: #f0f1ed;
--text: #1f2328;
--text-muted: #667085;
--border: #d8dcd2;
--accent: #2f6f6d;
--accent-soft: #dcefed;
--warning: #a15c16;
--danger: #b42318;
```

米色阅读主题：

```css
--reader-bg: #f4ecd8;
--reader-text: #24201a;
--reader-muted: #756b5c;
```

深色阅读主题：

```css
--reader-bg: #171a1f;
--reader-text: #e7e1d5;
--reader-muted: #a9a095;
--surface: #20242b;
--border: #343a44;
```

避免：

- 大面积高饱和蓝紫渐变。
- 大面积纯黑白强对比。
- 装饰性光斑、浮动色块。
- 过多卡片嵌套。

### 3.2 字体

界面字体：

```css
font-family: Inter, "Segoe UI", system-ui, sans-serif;
```

阅读字体选项：

- Georgia
- Charter
- Source Serif
- Times New Roman
- System Sans

中文解释字体：

```css
font-family: "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
```

字号建议：

| 场景 | 字号 |
| --- | --- |
| 阅读正文 | 18px 默认，可调 14-28px |
| 侧栏正文 | 14px |
| 词卡单词 | 24px |
| 页面标题 | 20px |
| 按钮文字 | 13-14px |

行距：

- 阅读正文默认 1.75。
- AI 分析文本 1.6。
- 列表项 1.4。

不要用随视口缩放的字体大小。

### 3.3 圆角和阴影

- 常规控件圆角：6px。
- 书籍卡片圆角：8px。
- 弹出菜单圆角：8px。
- 不使用过重阴影。
- 阅读正文区域不放在厚重卡片里。

### 3.4 图标

优先使用 lucide 图标：

- 导入：`Upload`
- 搜索：`Search`
- 设置：`Settings`
- 书库：`Library`
- 生词：`Languages` 或 `BookMarked`
- 笔记：`Highlighter` / `NotebookPen`
- AI：`Sparkles`
- 目录：`ListTree`
- 书签：`Bookmark`
- 复制：`Copy`
- 删除：`Trash2`

图标按钮需要 tooltip。

## 4. 交互规范

### 4.1 文本选择

桌面默认交互：

- 双击单词：查词。
- 划选单词：显示查词菜单。
- 划选句子：显示分析句子、高亮、复制。
- 划选段落：显示解释段落、高亮、复制。
- 右键选中文本：打开上下文菜单。

触控屏增强：

- 长按单词：查词。
- 长按句子或划选句子：分析句子。

### 4.2 AI 侧栏

AI 结果显示在右侧栏，不用弹窗覆盖正文。

结构顺序：

1. 概览。
2. 主干。
3. 结构拆解。
4. 难点词组。
5. 自然翻译。
6. 学习建议。
7. 追问输入框。

状态：

- 空状态：显示最近一次选择的提示。
- 加载中：骨架屏或小型进度。
- 成功：结构化展示。
- 失败：明确错误和重试按钮。

### 4.2.1 DeepSeek 设置体验

设置页将 DeepSeek 作为默认 AI 服务展示，字段保持开发者友好但不吓人：

- 服务商：DeepSeek。
- API 地址：默认 `https://api.deepseek.com`，可展开高级设置修改。
- API Key：密码输入框，只显示“已配置 / 未配置”。
- 快速任务模型：`deepseek-v4-flash`。
- 深度分析模型：`deepseek-v4-pro`。
- 思考模式：默认开启，用于长难句和段落解释。
- 发送上下文：默认开启前需要清楚提示隐私含义。

文案示例：

```text
DeepSeek 会在你使用查词、句子分析或段落解释时收到选中的文本和必要上下文。
书籍全文不会自动上传。
```

### 4.3 词卡

词卡优先快速出现：

- 基础释义先显示。
- AI 上下文含义异步补全。
- 收藏按钮固定在词卡右上角。

词卡字段顺序：

1. 单词和音标。
2. 词性和基础释义。
3. 此处含义。
4. 来源句。
5. 例句。
6. 收藏和熟悉度。

### 4.4 快捷键

| 快捷键 | 动作 |
| --- | --- |
| `Ctrl+O` | 导入书籍 |
| `Ctrl+F` | 搜索当前书 |
| `Ctrl+B` | 添加/取消书签 |
| `Ctrl+=` | 增大字号 |
| `Ctrl+-` | 减小字号 |
| `Ctrl+Shift+A` | 分析选中句子 |
| `Ctrl+Shift+W` | 收藏选中单词 |
| `Esc` | 关闭浮层或取消选择 |

## 5. 组件规范

### 5.1 Button

按钮类型：

- Primary：主要动作，如导入、开始复习。
- Secondary：普通动作，如导出、重新解析。
- Ghost：工具栏图标按钮。
- Danger：删除。

按钮需要有明确 loading 和 disabled 状态。

### 5.2 Panel

侧栏面板用于：

- 目录。
- 词卡。
- AI 分析。
- 笔记列表。

不要把侧栏内部再拆成大量嵌套卡片。用分隔线、标题和留白组织信息。

### 5.3 Toast

用于轻量反馈：

- 导入成功。
- 收藏成功。
- 导出完成。
- AI 请求失败。

错误 toast 应提供“查看详情”或“重试”。

### 5.4 Empty State

空状态只给一个明确动作，不写长篇说明。

例：

```text
还没有书籍
[导入书籍]
```

## 6. 文案规范

文案风格：

- 简短。
- 不命令用户。
- 不堆技术词。
- AI 结果用“参考”“建议”语气。

示例：

| 场景 | 文案 |
| --- | --- |
| AI 未配置 | 先配置 AI 服务后再使用句子分析 |
| DRM 文件 | 这个文件可能受加密保护，暂时无法解析 |
| 扫描 PDF | 这份 PDF 可能是扫描版，当前版本无法识别文字 |
| AI 失败 | AI 请求失败，可以稍后重试 |
| 隐私提示 | 使用 AI 功能时，选中文本和必要上下文会发送给你配置的 AI 服务 |

## 7. 前端代码规范

### 7.1 目录结构

```text
src/
  app/
    App.tsx
    routes.tsx
    providers/
  components/
    ui/
    reader/
    vocabulary/
    ai/
  features/
    library/
    reader/
    dictionary/
    vocabulary/
    notes/
    settings/
  services/
    tauriClient.ts
    aiClient.ts
  stores/
    readerStore.ts
    settingsStore.ts
  types/
    book.ts
    reader.ts
    vocabulary.ts
    ai.ts
  utils/
```

### 7.2 命名

- React 组件：`PascalCase`。
- hooks：`useSomething`。
- 类型：`PascalCase`。
- 工具函数：`camelCase`。
- 文件名：组件用 `PascalCase.tsx`，普通模块用 `camelCase.ts`。

### 7.3 状态管理

使用 Zustand 保存跨组件状态：

- 当前书籍。
- 阅读设置。
- 左右栏展开状态。
- AI 当前任务状态。

服务端持久数据从 SQLite 读取，不在 Zustand 中长期保存完整副本。

### 7.4 错误处理

前端所有 Tauri 调用通过统一 client：

```ts
async function invokeCommand<T>(command: string, payload: unknown): Promise<T> {
  const result = await invoke<ApiResult<T>>(command, payload);
  if (!result.ok) {
    throw new AppCommandError(result.error);
  }
  return result.data;
}
```

页面层捕获错误并显示友好提示。

## 8. Rust/Tauri 代码规范

### 8.1 模块结构

```text
src-tauri/
  src/
    main.rs
    commands/
      library.rs
      reader.rs
      vocabulary.rs
      notes.rs
      ai.rs
      settings.rs
    services/
      file_service.rs
      parser_service.rs
      dictionary_service.rs
      ai_service.rs
    repositories/
      book_repository.rs
      vocab_repository.rs
      notes_repository.rs
    models/
    errors.rs
```

### 8.2 原则

- Tauri command 只做参数校验和调度。
- 业务逻辑放 service。
- SQL 放 repository。
- 错误统一转换为 `AppError`。
- 不在日志输出 API Key。

## 9. 可访问性

最低要求：

- 所有图标按钮有 tooltip 和 aria-label。
- 键盘可访问主要操作。
- 阅读主题对比度达标。
- 字号可调。
- AI 加载和错误状态可被读屏理解。

## 10. 性能要求

目标：

- 软件冷启动 3 秒内进入主界面。
- 书库 100 本以内列表滚动流畅。
- EPUB 章节切换 500ms 内有响应。
- 双击查词基础释义 300ms 内显示。
- AI 请求不阻塞阅读。
- 大文件导入显示进度。

优化策略：

- 书籍正文按章节懒加载。
- PDF 按页渲染。
- AI 结果缓存。
- 生词列表分页。
- 搜索建立轻量文本索引。

## 11. 验收视觉清单

每次发布前检查：

- 阅读页没有文字重叠。
- 侧栏收起和展开不会导致正文跳动异常。
- 词卡内容长文本不会溢出。
- 深色模式下高亮仍可读。
- 书名很长时正确截断。
- 窗口缩小到 1024px 宽仍可使用。
- AI 失败、加载、空状态都有明确展示。
