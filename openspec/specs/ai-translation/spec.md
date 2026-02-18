# ai-translation Specification

## Purpose
TBD - created by archiving change p001-delete-ai-translation. Update Purpose after archive.
## Requirements
### Requirement: 系统不提供 AI 翻译输出
系统 MUST NOT 通过外部 AI 接口将文章标题/摘要/正文翻译为中文；并且在任何情况下（包括设置 `AI_API_KEY` 时），分析流程产物 JSON 中的翻译字段 MUST 满足以下不变量：
- 对于 `sections.long_articles[*]`（`type = "article"`）：`translated_title` / `translated_summary` / `translated_content` 均 MUST 为 `null`
- 对于 `sections.short_news[*]`（`type = "short_news"` 或 `type = "topic"`）：`translated_title` / `translated_summary` 均 MUST 为 `null`

#### Properties (PBT)

**Invariant**
- 不论输入文章语言、长度、是否包含中文字符，不论是否设置 `AI_API_KEY`，产物中的 `translated_*` 字段均保持为 `null`（按上文类型约束）。
- 仓库中不得残留任何翻译提示词文本或翻译实现模块被引用（验证：静态搜索无命中）。

**Edge**
- `AI_API_KEY` 未设置 / 已设置但无效 / 已设置且可用：均不得产生任何非空翻译字段。
- 文章标题/摘要/正文为空字符串、超长文本、包含 Markdown/代码块：均不得触发翻译字段写入。

**Falsification**
- 生成一组包含随机英文标题/摘要/正文的输入文章，运行分析后若任一条目出现非空 `translated_*` 即为反例。
- 对仓库执行 `rg -n "Translate the following text" src web`，若有命中即为反例（仍存在可被调用的翻译提示词实现）。

#### Scenario: 启用 AI_API_KEY 时也不翻译
- **WHEN** 环境变量 `AI_API_KEY` 已配置并运行分析流程生成产物 JSON
- **THEN** `sections.long_articles[*]` 的 `translated_title` / `translated_summary` / `translated_content` 均为 `null`
- **AND** `sections.short_news[*]` 的 `translated_title` / `translated_summary` 均为 `null`

#### Scenario: 日报页不展示翻译切换
- **WHEN** 日报页渲染某条文章且其 `translated_*` 全为 `null`
- **THEN** 页面不渲染“翻译”切换按钮

