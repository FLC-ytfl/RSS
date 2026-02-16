const Parser = require('rss-parser');

/**
 * Parse a single RSS/Atom feed
 * @param {string} feedUrl - URL of the RSS/Atom feed
 * @returns {Promise<{title: string, link: string, pubDate: string, content: string, contentSnippet: string, source: string}>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFeedXml(xml) {
  if (!xml) return '';
  let cleaned = xml.replace(/^\uFEFF/, '');
  const firstTagIndex = cleaned.indexOf('<');
  if (firstTagIndex > 0) {
    cleaned = cleaned.slice(firstTagIndex);
  }
  return cleaned;
}

async function fetchWithTimeout(url, { timeoutMs, headers }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseFeed(feedUrl, options = {}) {
  const parser = new Parser({
    headers: {
      'User-Agent': 'RSS-AI Fetcher/1.0'
    }
  });

  const { maxRetries = 3, timeoutMs = 30000 } = options;
  const headers = {
    'User-Agent': 'RSS-AI Fetcher/1.0',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
  };

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(feedUrl, { timeoutMs, headers });

      if (response.status === 429) {
        lastError = new Error('HTTP 429');
        const retryAfter = parseInt(response.headers.get('Retry-After') || '', 10);
        const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.pow(2, attempt) * 1000;
        await sleep(Math.min(delayMs, 60000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = sanitizeFeedXml(await response.text());
      const feed = await parser.parseString(xml);

      const articles = (feed.items || []).map(item => ({
        title: item.title || 'Untitled',
        link: item.link || item.guid || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.content || item['content:encoded'] || item.summary || '',
        contentSnippet: item.contentSnippet || item.summary || '',
        source: feed.title || feedUrl
      }));

      return articles;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw new Error(`Failed to parse feed ${feedUrl}: ${lastError?.message || 'unknown error'}`);
}

/**
 * Parse multiple feeds in parallel with concurrency limit
 * @param {Array<{title: string, xmlUrl: string}>} feeds - Array of feed objects
 * @param {number} concurrency - Maximum concurrent requests (default: 10)
 * @returns {Promise<{success: Array, failed: Array}>}
 */
async function parseFeedsParallel(feeds, concurrency = 10) {
  const success = [];
  const failed = [];

  // Process feeds in batches
  for (let i = 0; i < feeds.length; i += concurrency) {
    const batch = feeds.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (feed) => {
        const articles = await parseFeed(feed.xmlUrl, { maxRetries: 3, timeoutMs: 30000 });
        return { feed, articles };
      })
    );

    for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
      const result = results[resultIndex];
      if (result.status === 'fulfilled') {
        success.push(result.value);
      } else {
        failed.push({
          feed: batch[resultIndex],
          error: result.reason.message
        });
      }
    }
  }

  return { success, failed };
}

module.exports = { parseFeed, parseFeedsParallel };
