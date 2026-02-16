/**
 * Smart content filter for RSS articles
 */

/**
 * Calculate quality score for an article (0-100)
 * @param {Object} article - Article object with title, content, etc.
 * @returns {number} Quality score from 0 to 100
 */
function calculateQualityScore(article) {
  let score = 0;

  // Content length scoring (up to 40 points)
  const content = article.content || article.description || '';
  const contentLength = content.length;
  if (contentLength >= 500 && contentLength <= 5000) {
    score += 40;
  } else if (contentLength >= 200 && contentLength < 500) {
    score += 25;
  } else if (contentLength > 5000 && contentLength <= 10000) {
    score += 35;
  } else if (contentLength > 10000) {
    score += 30;
  } else if (contentLength > 0) {
    score += 10;
  }

  // Title quality (up to 20 points)
  const title = article.title || '';
  if (title.length >= 10 && title.length <= 100) {
    score += 20;
  } else if (title.length > 0) {
    score += 10;
  }

  // Completeness - has link (up to 15 points)
  if (article.link || article.url) {
    score += 15;
  }

  // Has publish date (up to 10 points)
  if (article.pubDate || article.isoDate || article.published) {
    score += 10;
  }

  // Has author (up to 5 points)
  if (article.author || article.creator) {
    score += 5;
  }

  // Source reputation bonus (up to 10 points)
  const reputableDomains = [
    'github.com', 'arxiv.org', 'medium.com', 'substack.com',
    'techcrunch.com', 'wired.com', 'theverge.com', 'ieee.org',
    'acm.org', 'nature.com', 'science.org', 'nginx.com',
    'redis.com', 'mongodb.com', 'postgresql.org', 'kernel.org'
  ];
  const link = article.link || article.url || '';
  const hasReputableSource = reputableDomains.some(domain => link.includes(domain));
  if (hasReputableSource) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate Jaccard similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score from 0 to 1
 */
function jaccardSimilarity(str1, str2) {
  const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const set1 = new Set(normalize(str1));
  const set2 = new Set(normalize(str2));

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Remove articles with similar titles
 * @param {Array} articles - Array of article objects
 * @param {number} threshold - Similarity threshold (default 0.9)
 * @returns {Array} Deduplicated articles
 */
function deduplicateByTitle(articles, threshold = 0.9) {
  const result = [];
  const seen = new Set();

  for (const article of articles) {
    const title = article.title || '';
    let isDuplicate = false;

    for (let i = 0; i < result.length; i++) {
      const existingTitle = result[i].title || '';
      const similarity = jaccardSimilarity(title, existingTitle);

      if (similarity >= threshold) {
        isDuplicate = true;
        // Keep the one with higher quality score
        if (calculateQualityScore(article) > calculateQualityScore(result[i])) {
          result[i] = article;
        }
        break;
      }
    }

    if (!isDuplicate) {
      result.push(article);
    }
  }

  return result;
}

/**
 * Remove duplicate articles by URL
 * @param {Array} articles - Array of article objects
 * @returns {Array} Deduplicated articles
 */
function deduplicateByUrl(articles) {
  const seen = new Set();
  return articles.filter(article => {
    const url = article.link || article.url || '';
    if (seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });
}

/**
 * Filter and rank articles by quality
 * @param {Array} articles - Array of article objects
 * @param {number} maxCount - Maximum number of articles to return
 * @returns {Array} Filtered and sorted articles
 */
function filterArticles(articles, maxCount = 150) {
  if (!Array.isArray(articles)) {
    return [];
  }

  // 1. Calculate quality scores and filter out very low quality
  const withScores = articles
    .map(article => ({
      ...article,
      qualityScore: calculateQualityScore(article)
    }))
    .filter(article => article.qualityScore >= 15); // Minimum quality threshold

  // 2. Deduplicate by URL
  const dedupedByUrl = deduplicateByUrl(withScores);

  // 3. Deduplicate by title similarity
  const dedupedByTitle = deduplicateByTitle(dedupedByUrl, 0.9);

  // 4. Sort by quality score (descending)
  const sorted = dedupedByTitle.sort((a, b) => b.qualityScore - a.qualityScore);

  // 5. Keep top maxCount
  return sorted.slice(0, maxCount);
}

module.exports = { filterArticles, calculateQualityScore, deduplicateByTitle };
