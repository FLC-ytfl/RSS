const fs = require('fs').promises;
const path = require('path');
const { filterArticles } = require('./filter');
const { classifyArticles } = require('./classifier');
const { extractContents } = require('./content-extractor');
const { generateTags } = require('./tagger');
const { generateSummaries } = require('./summarizer');
const { mergeSimilarArticles } = require('./merger');
const { APIClient } = require('../utils/api-client');

function truncate(text, maxLength) {
  if (!text) return '';
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).trimEnd() + '...';
}

function estimateReadingTimeMinutes(markdown) {
  const text = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_\-\[\]\(\)!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = text ? text.split(' ').length : 0;
  return wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : null;
}

function buildShortSummary(article) {
  const snippet = article.contentSnippet || '';
  const fallback = article.content || article.description || '';
  return truncate(snippet || fallback, 220);
}

/**
 * Main analysis pipeline for RSS articles
 * Orchestrates filtering, classification, content extraction,
 * tagging, summarization, translation, and merging.
 */
async function analyzeArticles() {
  console.log('Starting analysis pipeline...');

  // 1. Load raw articles from output/raw-articles.json
  const rawPath = path.join(__dirname, '..', '..', 'output', 'raw-articles.json');
  const rawArticles = JSON.parse(await fs.readFile(rawPath, 'utf-8'));
  console.log(`Loaded ${rawArticles.length} raw articles`);

  // 2. Filter articles (keep top 150)
  const filtered = filterArticles(rawArticles, 150);
  console.log(`After filtering: ${filtered.length} articles`);

  // 3. Classify into short_news and long_articles
  const classified = classifyArticles(filtered);
  console.log(`Short news: ${classified.short_news.length}, Long articles: ${classified.long_articles.length}`);

  // 4. Initialize AI client (if credentials available)
  const client = process.env.AI_API_KEY ? new APIClient() : null;

  const maxLongExtractions = Number.parseInt(process.env.MAX_LONG_EXTRACTIONS || '30', 10);
  const maxTopics = Number.parseInt(process.env.MAX_TOPICS || '10', 10);
  const maxLongFinal = Number.parseInt(process.env.MAX_LONG_FINAL || '15', 10);
  const targetMax = Number.parseInt(process.env.TARGET_MAX_ITEMS || '30', 10);
  const targetMin = Number.parseInt(process.env.TARGET_MIN_ITEMS || '20', 10);

  // 5. Prepare and merge short news (cheap path)
  const shortCandidates = classified.short_news.map(a => ({
    ...a,
    type: 'short_news',
    url: a.link || a.url || '',
    published_at: a.pubDate || a.isoDate || null,
    summary: buildShortSummary(a)
  }));

  const { topics: shortTopics, standalone: shortStandalone } = await mergeSimilarArticles(
    shortCandidates,
    null
  );

  // 6. Extract content for long articles (limited for speed/cost)
  const longSorted = [...classified.long_articles].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  const longExtractionCandidates = longSorted.slice(0, Math.max(0, maxLongExtractions));

  const longWithContent = await extractContents(longExtractionCandidates);
  const longContentOk = longWithContent.filter(a => a.extractionSuccess && a.extractedContent?.markdown);
  console.log(`Extracted content for ${longContentOk.length} long articles`);

  const longSelected = longContentOk
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    .slice(0, Math.max(0, maxLongFinal));

  // 7. Summarize + tag + translate ONLY final long articles
  const longWithSummaries = await generateSummaries(longSelected, client);
  const longTagInput = longWithSummaries.map(a => ({
    ...a,
    content: a.extractedContent?.markdown || a.content || a.description || ''
  }));
  const longTagged = await generateTags(longTagInput, client);
  const longTranslated = longTagged;

  const longFinal = longTranslated.map(a => {
    const content = a.extractedContent?.markdown || '';
    return {
      type: 'article',
      title: a.title || 'Untitled',
      summary: a.summary || truncate(content, 220),
      content,
      url: a.link || a.url || '',
      source: a.source || 'Unknown',
      tags: a.tags || [],
      published_at: a.pubDate || a.isoDate || null,
      reading_time: estimateReadingTimeMinutes(content),
      translated_title: null,
      translated_summary: null,
      translated_content: null
    };
  });

  // 8. Pick final short items (topics + standalone) to reach 20-30 total
  const maxShortAllowed = Math.max(0, targetMax - longFinal.length);
  const topicsSelected = shortTopics.slice(0, Math.min(Math.max(0, maxTopics), maxShortAllowed));
  const remainingForShort = Math.max(0, maxShortAllowed - topicsSelected.length);

  const standaloneSelected = [...shortStandalone]
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    .slice(0, remainingForShort);

  const shortPicked = [...topicsSelected, ...standaloneSelected].slice(0, maxShortAllowed);

  // 9. Tag + translate final short items
  const shortTagInput = shortPicked.map(item => ({
    ...item,
    content: item.type === 'topic'
      ? `${item.title}\n${item.summary}\n${(item.articles || []).map(a => a.title).join('\n')}`
      : item.contentSnippet || item.content || item.summary || ''
  }));
  const shortTagged = await generateTags(shortTagInput, client);
  const shortTranslated = shortTagged;

  const shortFinal = shortTranslated.map(item => {
    if (item.type === 'topic') {
      return {
        ...item,
        tags: item.tags || [],
        translated_title: null,
        translated_summary: null
      };
    }

    return {
      type: 'short_news',
      title: item.title || 'Untitled',
      summary: item.summary || buildShortSummary(item),
      url: item.url || item.link || '',
      source: item.source || 'Unknown',
      tags: item.tags || [],
      published_at: item.published_at || item.pubDate || item.isoDate || null,
      translated_title: null,
      translated_summary: null
    };
  });

  // 10. Save processed data for reporter step
  const result = {
    processed_at: new Date().toISOString(),
    stats: {
      total_fetched: rawArticles.length,
      after_filter: filtered.length,
      final_count: shortFinal.length + longFinal.length,
      short_news: shortFinal.length,
      long_articles: longFinal.length
    },
    sections: {
      short_news: shortFinal,
      long_articles: longFinal
    }
  };

  const processedPath = path.join(__dirname, '..', '..', 'output', 'processed-articles.json');
  await fs.writeFile(processedPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log('Analysis complete!');
  console.log(`Final: ${result.stats.final_count} items (${result.stats.short_news} short, ${result.stats.long_articles} long)`);

  return result;
}

// Run if called directly
if (require.main === module) {
  analyzeArticles().catch(console.error);
}

module.exports = { analyzeArticles };
