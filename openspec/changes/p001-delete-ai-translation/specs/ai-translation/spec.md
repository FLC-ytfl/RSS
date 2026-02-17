## ADDED Requirements

### Requirement: 系统不提供 AI 翻译输出
系统 MUST NOT 通过外部 AI 接口将文章标题/摘要/正文翻译为中文；并且在任何情况下（包括设置 `AI_API_KEY` 时），产物中 `translated_title` / `translated_summary` / `translated_content` MUST NOT 出现非空翻译内容（保留字段时其值 MUST 为 `null`）。

#### Scenario: 启用 AI_API_KEY 时也不翻译
- **WHEN** 环境变量 `AI_API_KEY` 已配置并运行分析流程生成产物 JSON
- **THEN** 产物中所有条目的 `translated_title` / `translated_summary` / `translated_content` 均为 `null`

#### Scenario: 日报页不展示翻译切换
- **WHEN** 日报页渲染某条文章且其 `translated_*` 全为 `null`
- **THEN** 页面不渲染“翻译”切换按钮

