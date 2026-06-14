# AI 英语精读阅读器

个人桌面版 AI 英语精读阅读器原型。当前版本先用本地 Node 服务承载前端应用，后续可以迁入 Tauri 或 Electron 桌面壳。

## 运行

```bash
npm start
```

打开：

```text
http://127.0.0.1:18789/
```

## 当前已实现

- 本地书库。
- 导入 `TXT`、`EPUB`、`PDF`。
- `TXT` 阅读与章节切分。
- `EPUB` 基础解析、目录和正文阅读。
- `PDF` 基础内嵌预览。
- 阅读进度保存。
- 字号和主题切换。
- 选中单词查词。
- 单词收藏到生词本。
- 生词复习：认识、模糊、不认识。
- 高亮和笔记。
- 笔记导出 Markdown。
- 生词导出 CSV。
- DeepSeek 设置页。
- DeepSeek 本地代理接口。
- AI 单词上下文解释、长难句分析、段落解释。

## DeepSeek 配置

在设置页填写：

```text
API 地址：https://api.deepseek.com
快速任务模型：deepseek-v4-flash
深度分析模型：deepseek-v4-pro
```

API Key 可以填在设置页，也可以通过环境变量启动：

```bash
$env:DEEPSEEK_API_KEY="你的 key"
npm start
```

当前本地代理只允许访问 DeepSeek 官方地址或本机兼容接口，避免把 API Key 发送到不明地址。

## 格式说明

- `EPUB`：支持未加密 EPUB。已加密或 DRM 文件不会解析。
- `PDF`：当前是基础预览，无法读取内嵌 PDF 选中文本；建议优先用 EPUB/TXT 做精读。
- `TXT`：支持 UTF-8，兼容常见中文编码兜底。

## 后续建议

1. 接入 Tauri，使用系统文件选择器和安全密钥存储。
2. 补 PDF.js 文本层，支持 PDF 选词和句子分析。
3. 引入完整本地词典数据库。
4. 增加 Anki 导出。
5. 增加 OCR，支持扫描版 PDF。
