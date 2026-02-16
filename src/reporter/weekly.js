const fs = require('fs').promises;
const path = require('path');
const { formatDate, getWeekId, getWeekStart, parseDate } = require('../utils/date-helper');
const { generateWordCloudData } = require('./wordcloud');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf-8'));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function addDays(dateStr, days) {
  const date = typeof dateStr === 'string' ? parseDate(dateStr) : new Date(dateStr);
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return formatDate(copy);
}

function isWithinRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

function aggregateWeeklyStats(dailyReports) {
  const tagCounts = new Map();
  const sourceCounts = new Map();
  const dailyTrend = [];

  for (const report of dailyReports) {
    const shortNews = report.sections?.short_news || [];
    const longArticles = report.sections?.long_articles || [];

    dailyTrend.push({
      date: report.date,
      count: shortNews.length + longArticles.length
    });

    const items = [...shortNews, ...longArticles];
    for (const item of items) {
      for (const tag of (item.tags || [])) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }

      if (item.type === 'topic') {
        for (const article of (item.articles || [])) {
          const source = article.source || 'Unknown';
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        }
      } else {
        const source = item.source || 'Unknown';
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      }
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  const totalArticles = dailyTrend.reduce((sum, d) => sum + d.count, 0);

  return {
    total_articles: totalArticles,
    days_covered: dailyReports.length,
    top_tags: topTags,
    top_sources: topSources,
    daily_trend: dailyTrend.sort((a, b) => a.date.localeCompare(b.date))
  };
}

function collectWeeklyHighlights(dailyReports) {
  const allLongArticles = [];

  for (const report of dailyReports) {
    for (const article of (report.sections?.long_articles || [])) {
      allLongArticles.push({ ...article, date: report.date });
    }
  }

  return allLongArticles
    .sort((a, b) => (b.reading_time || 0) - (a.reading_time || 0))
    .slice(0, 15);
}

async function resolveDataRoot() {
  const cwd = process.cwd();
  const rootDaily = path.join(cwd, 'daily');
  const rootIndex = path.join(cwd, 'index.json');
  if (await exists(rootDaily) && await exists(rootIndex)) {
    return cwd;
  }
  return path.join(cwd, 'output');
}

async function listDailyReportsForWeek(index, weekStart, weekEnd) {
  const dailyReports = (index.daily_reports || index.reports || [])
    .map(r => (typeof r === 'string' ? { date: r, file: `daily/${r}.json` } : r))
    .filter(r => r?.date && isWithinRange(r.date, weekStart, weekEnd));

  return dailyReports.sort((a, b) => a.date.localeCompare(b.date));
}

async function generateWeeklyReport() {
  const dataRoot = await resolveDataRoot();
  const indexPath = path.join(dataRoot, 'index.json');
  const index = await readJson(indexPath);

  const weekStart = formatDate(getWeekStart(new Date()));
  const weekEnd = addDays(weekStart, 6);
  const weekId = getWeekId(parseDate(weekStart));

  const dailyEntries = await listDailyReportsForWeek(index, weekStart, weekEnd);
  if (dailyEntries.length === 0) {
    throw new Error(`No daily reports found for ${weekStart} - ${weekEnd}`);
  }

  const dailyReports = [];
  for (const entry of dailyEntries) {
    const filePath = path.join(dataRoot, entry.file || `daily/${entry.date}.json`);
    dailyReports.push(await readJson(filePath));
  }

  const stats = aggregateWeeklyStats(dailyReports);
  const highlights = collectWeeklyHighlights(dailyReports);
  const allItems = dailyReports.flatMap(r => [
    ...(r.sections?.short_news || []),
    ...(r.sections?.long_articles || [])
  ]);

  const report = {
    week_id: weekId,
    week_start: weekStart,
    week_end: weekEnd,
    generated_at: new Date().toISOString(),
    stats,
    highlights,
    wordcloud: generateWordCloudData(allItems, { minCount: 2, maxWords: 120 }),
    daily_reports: dailyEntries.map(e => e.date)
  };

  const weeklyPath = path.join(dataRoot, 'weekly', `${weekId}.json`);
  await writeJson(weeklyPath, report);

  index.weekly_reports = index.weekly_reports || [];
  const existing = index.weekly_reports.find(r => r.week_id === weekId);
  if (!existing) {
    index.weekly_reports.push({
      week_id: weekId,
      week_start: weekStart,
      file: `weekly/${weekId}.json`,
      stats: {
        total_articles: stats.total_articles,
        days_covered: stats.days_covered
      }
    });
    index.weekly_reports.sort((a, b) => b.week_id.localeCompare(a.week_id));
  } else {
    existing.stats = {
      total_articles: stats.total_articles,
      days_covered: stats.days_covered
    };
    existing.week_start = existing.week_start || weekStart;
    existing.file = existing.file || `weekly/${weekId}.json`;
  }

  index.lastUpdated = new Date().toISOString();
  await writeJson(indexPath, index);

  return { weeklyPath, indexPath };
}

if (require.main === module) {
  generateWeeklyReport()
    .then(({ weeklyPath, indexPath }) => {
      console.log(`Weekly report written: ${weeklyPath}`);
      console.log(`Index updated: ${indexPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateWeeklyReport, aggregateWeeklyStats, collectWeeklyHighlights };

