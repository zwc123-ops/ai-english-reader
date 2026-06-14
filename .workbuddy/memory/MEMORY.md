# AI 英语精读阅读器 - 项目记忆

## 技术栈
- 后端：Node.js 原生 HTTP（server.js，~560行，端口 18789）
- 前端：原生 JS（app.js，~2800行）+ styles.css，无框架无构建
- 存储：IndexedDB（books/vocab/highlights/notes）
- AI：DeepSeek 通过 /api/deepseek 代理，支持 HTTP CONNECT 隧道+直连双路
- 词典：dictionaryapi.dev 通过 /api/dictionary 代理，~80 种子词

## 已实现功能
- 书库（TXT/EPUB/PDF 导入）
- 阅读器（章节切分、进度、字号/主题）
- 查词（双击/划选 → 词典 + AI）
- 生词本（SM-2 间隔复习算法）
- 高亮与笔记（导出 Markdown/CSV）
- AI 分析（单词释义、长难句、段落解释）
- TTS 朗读（Web Speech API）
- PDF 文本层（PDF.js 渲染+可选文字）
- Markdown 渲染（marked.js）

## 关键文件
- `app.js` - 前端全部逻辑
- `server.js` - 后端代理+静态服务
- `index.html` - 入口页面（含 PDF.js、marked.js CDN）
- `styles.css` - 全部样式
- `DEV_DOCUMENT.md` - 完整需求+里程碑+风险
- `AI_READER_INTERNAL_API.md` - TypeScript 接口契约+SQL 建表（为迁 Tauri 准备）

## 已完成的优化（2026-06-14）
1. TTS 朗读功能
2. SM-2 间隔复习算法
3. PDF 文本层支持
4. 流式 Markdown 渲染

## 待做
- PDF 高亮写回（复杂，短期可用坐标存 IndexedDB 方案）
- SQLite 迁移（为 Tauri 做准备）
- 阅读统计（分钟数、新词数正反馈）
- 词汇热力图
