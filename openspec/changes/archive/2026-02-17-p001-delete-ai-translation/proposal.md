## Why

当前分析流水线在配置 `AI_API_KEY` 时，会调用外部 AI 接口对文章标题/摘要/正文进行翻译，并将结果写入产物字段 `translated_title` / `translated_summary` / `translated_content`。该能力带来额外成本与风险，且不再符合需求；本变更将移除此“AI 翻译”能力，并将行为以可验证的方式固化为规范。

## What Changes

- 移除分析流水线中的“AI 翻译”步骤：不再向 AI 接口发送翻译提示词（参考现有 `src/analyzer/translator.js`）。
- 产物中 `translated_title` / `translated_summary` / `translated_content` 不再产生翻译内容（保持为 `null`，以尽量避免破坏现有前端渲染与历史数据兼容性）。
- 日报页在无翻译内容时不展示“翻译”切换按钮（现有逻辑基于 `hasTranslation` 条件渲染）。

## Capabilities

### New Capabilities

- `ai-translation`: 系统不提供 AI 翻译输出（本变更的需求约束与对外可观察行为）

### Modified Capabilities

- （无）

## Impact

- 代码影响点：`src/analyzer/index.js`（翻译步骤编排）、`src/analyzer/translator.js`（翻译实现）、`web/daily.html`（翻译切换按钮的展示依赖 `translated_*`）。
- 数据影响点：`output/processed-articles.json` 以及日报 JSON 中的 `translated_*` 字段将恒为 `null`。

## Constraints

### Hard Constraints

- 只删除“AI 翻译”能力，不影响其他 AI 处理能力（如摘要、标签、合并主题）（验证：对比变更前后 `src/analyzer/index.js` 中除翻译外步骤顺序与输入输出字段保持一致）。
- 不得新增新的外部依赖或新的网络调用（验证：`package.json` 依赖无新增；运行分析流程时不出现翻译相关外部请求）。
- 即使设置了 `AI_API_KEY`，也不得产生任何非空的 `translated_*` 翻译结果（验证：生成 `output/processed-articles.json` 后抽样检查/脚本校验 `translated_*` 全为 `null`）。
- 变更必须保持前端页面可用（不得出现因翻译缺失导致的渲染异常）（验证：打开 `web/daily.html`，文章列表可正常展开/收起，且不出现翻译按钮或“暂无翻译”占位被误触发）。

### Soft Constraints

- 代码层面彻底移除无用翻译模块与提示词文本，避免残留误用（验证：`rg -n \"Translate the following text\" src web` 无命中）。
- 若对外数据契约允许，可在后续变更中进一步移除 `translated_*` 字段（默认本次先保留字段、值恒为 `null`）（验证：对外接口/页面未依赖字段存在性）。

## Success Criteria

- `src/analyzer/translator.js` 不再被分析流水线引用；分析流程无任何翻译提示词请求（验证：`rg -n \"require\\('./translator'\\)\" src` 无命中；或运行流程并开启请求日志）。
- 在配置 `AI_API_KEY` 的情况下运行分析流程，产物 JSON 中 `translated_title` / `translated_summary` / `translated_content` 均为 `null`（验证：运行后检查输出文件）。
- 日报页不展示“翻译”切换按钮，且文章内容/摘要/标题仍可正常展示（验证：打开 `web/daily.html` 检查渲染）。

