# RSS-AI 每日技术资讯

基于 GitHub Actions 的 RSS 自动化项目，每日抓取技术博客，通过 AI 分析汇总生成日报/周报。

## 功能特性

- 每日自动抓取 93 个技术博客源
- AI 智能筛选、摘要、翻译
- 自动区分短讯和长文，支持正文阅读
- 相似主题自动合并，中英双语切换
- 词云图、趋势图表可视化

## 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/YOUR_USERNAME/RSS.git
cd RSS
npm install
```

### 2. 创建 data 分支

首次使用需创建存储数据的分支：

```bash
git checkout --orphan data
git rm -rf .
echo '{"daily_reports":[],"weekly_reports":[]}' > index.json
mkdir -p daily weekly
git add .
git commit -m "Initialize data branch"
git push origin data
git checkout main
```

### 3. 配置 GitHub Secrets

进入 **Settings > Secrets and variables > Actions**，添加：

| Secret | 说明 | 示例 |
|--------|------|------|
| `AI_API_URL` | API 端点 | `https://api.openai.com/v1` |
| `AI_API_KEY` | API 密钥 | `sk-xxx` |
| `AI_MODEL` | 模型名称 | `gpt-4o-mini` |

### 4. 启用 GitHub Pages

1. 进入 **Settings > Pages**
2. Source 选择 **GitHub Actions**
3. 推送代码后自动部署

### 5. 触发首次运行

进入 **Actions** 标签页，选择 `Daily RSS Fetch`，点击 `Run workflow`。

部署完成后访问：`https://YOUR_USERNAME.github.io/RSS/web/`

---

## GitHub Actions 工作流

| 工作流 | 触发时间 | 说明 |
|--------|---------|------|
| `daily-fetch.yml` | 每日 UTC 22:00（北京 06:00） | 抓取 RSS → AI 分析 → 生成日报 |
| `weekly-report.yml` | 每周日 UTC 22:30 | 聚合 7 天数据生成周报 |
| `pages.yml` | main 分支推送时 | 部署前端到 GitHub Pages |

**数据存储**：生成的数据提交到 `data` 分支，前端通过 `raw.githubusercontent.com` 获取。

---

## 自定义配置

### 修改定时任务

编辑 `.github/workflows/daily-fetch.yml`：

```yaml
schedule:
  - cron: '0 22 * * *'  # UTC 22:00 = 北京 06:00
```

### 修改抓取源

编辑 `feeds.opml` 文件添加或删除 RSS 源。

### 环境变量（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MAX_LONG_EXTRACTIONS` | 30 | 长文最大提取数 |
| `MAX_TOPICS` | 10 | 最大主题合并数 |
| `TARGET_MAX_ITEMS` | 30 | 每日最大条目数 |

---

## 项目结构

```
RSS/
├── .github/workflows/    # GitHub Actions 工作流
├── src/
│   ├── fetcher/          # RSS 抓取
│   ├── analyzer/         # AI 分析
│   └── reporter/         # 报告生成
├── web/                  # 静态前端
├── feeds.opml            # RSS 源定义（93 个）
└── package.json
```

## 本地测试

```bash
node src/fetcher/index.js    # 抓取
node src/analyzer/index.js   # 分析
node src/reporter/daily.js   # 生成日报
npx serve .                  # 启动本地服务器
```

## 技术栈

Node.js 20 + rss-parser + @mozilla/readability + OpenAI API + GitHub Actions + GitHub Pages

## License

MIT
