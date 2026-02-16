const { parseOPML } = require('./opml-parser');
const { parseFeedsParallel } = require('./rss-parser');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fetch all feeds from OPML and save today's articles
 * @param {string} opmlPath - Path to the OPML file (default: feeds.opml in project root)
 * @returns {Promise<{totalFetched: number, totalFeeds: number, failedFeeds: number}>}
 */
async function fetchAllFeeds(opmlPath) {
  // Default OPML path
  const defaultOpmlPath = path.join(__dirname, '..', '..', 'feeds.opml');
  const opmlFile = opmlPath || defaultOpmlPath;

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '..', '..', 'output');
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Parse OPML to get feed URLs
  const feeds = parseOPML(opmlFile);
  console.log(`Found ${feeds.length} feeds in OPML`);

  // 2. Fetch all feeds in parallel
  const { success, failed } = await parseFeedsParallel(feeds, 10);

  // Log failed feeds
  if (failed.length > 0) {
    console.log(`\nFailed feeds (${failed.length}):`);
    failed.forEach(({ feed, error }) => {
      console.log(`  - ${feed.title}: ${error}`);
    });
    await fs.writeFile(
      path.join(outputDir, 'failed-feeds.json'),
      JSON.stringify({ generated_at: new Date().toISOString(), failed }, null, 2),
      'utf-8'
    );
  }

  // 3. Flatten articles from all feeds
  const allArticles = success.flatMap(({ feed, articles }) => articles);

  // 4. Filter articles from today only
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayArticles = allArticles.filter(article => {
    if (!article.pubDate) return false;
    const pubDate = new Date(article.pubDate);
    return pubDate >= today;
  });

  // 5. Deduplicate by URL
  const seenUrls = new Set();
  const uniqueArticles = todayArticles.filter(article => {
    if (seenUrls.has(article.link)) {
      return false;
    }
    seenUrls.add(article.link);
    return true;
  });

  // 6. Write raw articles to output/raw-articles.json
  const outputPath = path.join(outputDir, 'raw-articles.json');
  await fs.writeFile(outputPath, JSON.stringify(uniqueArticles, null, 2), 'utf-8');
  console.log(`\nWrote ${uniqueArticles.length} articles to ${outputPath}`);

  // 7. Return stats
  return {
    totalFetched: uniqueArticles.length,
    totalFeeds: feeds.length,
    failedFeeds: failed.length
  };
}

// Run if called directly
if (require.main === module) {
  fetchAllFeeds()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { fetchAllFeeds };
