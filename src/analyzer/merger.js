/**
 * Similar content merger - Group and merge similar articles
 */

function getImportanceLevel(score) {
  if (score >= 4) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function pickTopTags(articles, max = 5) {
  const counts = new Map();
  for (const article of articles) {
    for (const tag of (article.tags || [])) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag]) => tag);
}

/**
 * Calculate similarity between two texts using Jaccard similarity
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score from 0 to 1
 */
function textSimilarity(text1, text2) {
  const normalize = (s) => {
    return s.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
  };

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Find groups of similar articles
 * @param {Array} articles - Array of article objects
 * @param {number} threshold - Similarity threshold (default 0.7)
 * @returns {Array} Array of article groups
 */
function findSimilarGroups(articles, threshold = 0.7) {
  if (!Array.isArray(articles)) {
    return [];
  }

  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue;

    const group = [articles[i]];
    assigned.add(i);

    const text1 = `${articles[i].title || ''} ${articles[i].summary || articles[i].description || ''}`;

    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue;

      const text2 = `${articles[j].title || ''} ${articles[j].summary || articles[j].description || ''}`;
      const similarity = textSimilarity(text1, text2);

      if (similarity >= threshold) {
        group.push(articles[j]);
        assigned.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Merge a group of similar articles into a topic
 * @param {Array} group - Array of similar articles
 * @param {Object} client - AI client (optional)
 * @returns {Object} Topic object
 */
async function mergeGroup(group, client) {
  if (!group || group.length === 0) {
    return null;
  }

  const titles = group.map(a => a.title).filter(Boolean);
  const sources = [...new Set(group.map(a => a.source).filter(Boolean))];

  // Generate combined summary
  let combinedSummary = '';

  if (client) {
    try {
      const articleSummaries = group.map(a =>
        `${a.title}\n${a.summary || a.description || ''}`
      ).join('\n\n---\n\n');

      const response = await client.chat({
        messages: [{
          role: 'user',
          content: `Create a unified summary (100-150 words) for the following related articles on the same topic.
Focus on the key points and news. Write in Chinese.

Articles:
${articleSummaries}`
        }]
      });

      combinedSummary = response.choices?.[0]?.message?.content || '';
    } catch (error) {
      combinedSummary = group[0].summary || group[0].description || '';
    }
  } else {
    // Fallback: use first article's summary
    combinedSummary = group[0].summary || group[0].description || '';
  }

  // Determine importance based on number of sources and article count
  const importanceScore = Math.min(5, group.length + sources.length);

  return {
    type: 'topic',
    title: titles[0] || 'Untitled',
    summary: combinedSummary,
    articles: group.map(a => ({
      title: a.title || 'Untitled',
      url: a.link || a.url || '',
      source: a.source || 'Unknown'
    })),
    tags: pickTopTags(group, 5),
    importance: getImportanceLevel(importanceScore),
    translated_title: null,
    translated_summary: null
  };
}

/**
 * Merge similar articles into topics
 * @param {Array} articles - Array of article objects
 * @param {Object} client - AI client (optional)
 * @returns {Object} { topics: [...], standalone: [...] }
 */
async function mergeSimilarArticles(articles, client) {
  if (!Array.isArray(articles)) {
    return { topics: [], standalone: [] };
  }

  const groups = findSimilarGroups(articles, 0.7);
  const topics = [];
  const standalone = [];

  for (const group of groups) {
    if (group.length <= 1) {
      standalone.push(group[0]);
    } else {
      const topic = await mergeGroup(group, client);
      if (topic) topics.push(topic);
    }
  }

  // Sort topics by importance (high -> low), then by number of articles
  const importanceRank = { high: 3, medium: 2, low: 1 };
  topics.sort((a, b) => {
    const aRank = importanceRank[a.importance] || 0;
    const bRank = importanceRank[b.importance] || 0;
    if (aRank !== bRank) return bRank - aRank;
    return (b.articles?.length || 0) - (a.articles?.length || 0);
  });

  return { topics, standalone };
}

module.exports = { findSimilarGroups, mergeGroup, mergeSimilarArticles };
