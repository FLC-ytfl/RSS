## Context

当前分析流水线在存在 `AI_API_KEY` 时会初始化 `APIClient`，并在分析末尾调用 `translateArticles` 生成 `translated_title` / `translated_summary` / `translated_content`。翻译实现位于 `src/analyzer/translator.js`，其通过外部 AI 接口发送翻译提示词。前端 `web/daily.html` 会在 `translated_*` 任一为 truthy 时渲染“🌐 翻译”切换按钮。

## Goals / Non-Goals

**Goals:**
- 移除分析流水线中的 AI 翻译步骤，不再产生任何翻译提示词请求。
- 保持对外数据契约稳定：现有产物中的 `translated_*` 字段仍保留，但对新产物恒为 `null`。
- 不影响其他 AI 处理能力（摘要、标签等）的启用与输出。
- 保持日报页可用；在无翻译内容时不展示翻译切换按钮。

**Non-Goals:**
- 不改动/清理历史已生成的日报产物。
- 不移除或改写其他 AI 能力（摘要、标签、主题合并等）的实现与网络调用。
- 不强制重构前端翻译切换逻辑（本次通过产物字段恒为 `null` 达成“不展示按钮”）。

## Decisions

- 删除分析编排中的翻译步骤：移除 `src/analyzer/index.js` 中对 `translateArticles` 的引用与调用（长文与短资讯两处）。
- 删除翻译实现模块：移除 `src/analyzer/translator.js`，同时确保仓库中不残留翻译提示词文本。
- 固化产物字段不变量：在 `output/processed-articles.json` 的输出映射层显式写入 `translated_*: null`（按既有 schema：`long_articles` 包含 3 个字段，`short_news` 包含 2 个字段；`topic` 保持由合并逻辑产出为 `null`）。
- 前端保持不变：`hasTranslation` 仍以 `translated_*` truthy 判定；由于新产物恒为 `null`，翻译按钮不会出现。

## Risks / Trade-offs

- 保留前端翻译切换代码会形成“死分支”，但能最大化避免不相关 UI 改动带来的回归风险。
- 若未来需要彻底移除 `translated_*` 字段，应通过独立变更升级对外数据契约并同步前端。

