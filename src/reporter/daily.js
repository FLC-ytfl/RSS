const fs = require('fs').promises;
const path = require('path');
const { formatDate } = require('../utils/date-helper');
const { generateWordCloudData } = require('./wordcloud');

function truncate(text, maxLength) {
  if (!text) return '';
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).trimEnd() + '...';
}

function buildHighlights(sections) {
  const longArticles = sections?.long_articles || [];
  const shortNews = sections?.short_news || [];

  const candidates = [
    ...longArticles,
    ...shortNews.filter(i => i.type === 'topic')
  ];

  return candidates
    .slice(0, 5)
    .map(item => `${item.title} - ${truncate(item.summary || '', 90)}`.trimEnd());
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf-8'));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function generateDailyReport() {
  const outputRoot = path.join(__dirname, '..', '..', 'output');
  const processedPath = path.join(outputRoot, 'processed-articles.json');

  const processed = await readJson(processedPath);
  const date = formatDate(new Date(processed.processed_at || Date.now()));

  const sections = processed.sections || { short_news: [], long_articles: [] };
  const allItems = [
    ...(sections.short_news || []),
    ...(sections.long_articles || [])
  ];

  const report = {
    date,
    stats: {
      total_fetched: processed.stats?.total_fetched ?? 0,
      after_filter: processed.stats?.after_filter ?? 0,
      final_count: allItems.length,
      short_news: sections.short_news?.length ?? 0,
      long_articles: sections.long_articles?.length ?? 0
    },
    sections,
    highlights: buildHighlights(sections),
    wordcloud: generateWordCloudData(allItems, { minCount: 2, maxWords: 100 })
  };

  const dailyPath = path.join(outputRoot, 'daily', `${date}.json`);
  await writeJson(dailyPath, report);

  const indexPath = path.join(outputRoot, 'index.json');
  let index = { daily_reports: [], weekly_reports: [], lastUpdated: null };
  try {
    index = await readJson(indexPath);
  } catch {
    // ignore
  }

  index.daily_reports = index.daily_reports || [];
  index.weekly_reports = index.weekly_reports || [];
  const existing = index.daily_reports.find(r => r.date === date);
  if (!existing) {
    index.daily_reports.push({
      date,
      file: `daily/${date}.json`,
      stats: report.stats
    });
    index.daily_reports.sort((a, b) => b.date.localeCompare(a.date));
  } else {
    existing.stats = report.stats;
    existing.file = existing.file || `daily/${date}.json`;
  }

  index.lastUpdated = new Date().toISOString();
  index.reports = index.daily_reports.map(r => ({ date: r.date, stats: r.stats }));

  await writeJson(indexPath, index);

  return { reportPath: dailyPath, indexPath };
}

if (require.main === module) {
  generateDailyReport()
    .then(({ reportPath, indexPath }) => {
      console.log(`Daily report written: ${reportPath}`);
      console.log(`Index updated: ${indexPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateDailyReport };
