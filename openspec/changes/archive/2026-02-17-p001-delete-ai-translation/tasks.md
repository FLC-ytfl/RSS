## 1. 移除翻译步骤（后端）

- [x] 1.1 输入：`src/analyzer/index.js`；动作：移除 `translateArticles` 的 import 与两处调用；验收：`rg -n "translateArticles|\\./translator" src` 无命中。
- [x] 1.2 输入：`src/analyzer/index.js`；动作：在 `longFinal` / `shortFinal` 输出映射中显式设置 `translated_*: null`（保持既有字段集合不扩展）；验收：运行分析流程后 `output/processed-articles.json` 中对应字段恒为 `null`。
- [x] 1.3 输入：`src/analyzer/translator.js`；动作：删除该模块并清理残留引用；验收：`rg -n "Translate the following text" src web` 无命中。

## 2. 验收前端表现（不改功能）

- [x] 2.1 输入：`web/daily.html`；动作：确认 `hasTranslation` 仅依赖 `translated_*` truthy 判定；验收：新产物翻译字段全为 `null` 时页面不渲染“🌐 翻译”按钮。

## 3. 自动化验证

- [x] 3.1 输入：`test/`；动作：新增单测覆盖“不论是否设置 `AI_API_KEY`，产物 `translated_*` 均为 `null`”，并在测试中设置 `MAX_LONG_EXTRACTIONS=0` 避免内容抓取网络请求；验收：`npm test` 通过。
- [x] 3.2 输入：全仓；动作：运行静态检查 `rg -n "Translate the following text" src web`；验收：无命中。
