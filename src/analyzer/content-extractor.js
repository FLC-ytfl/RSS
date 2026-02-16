/**
 * Content extractor - Extract full article content using Readability
 */

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

async function fetchWithTimeout(url, { timeoutMs, headers }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert HTML to Markdown
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {string} Markdown content
 */
function htmlToMarkdown(html, baseUrl = '') {
  let md = html;

  // Convert headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gis, '\n# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gis, '\n#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gis, '\n##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gis, '\n###### $1\n\n');

  // Convert links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)');

  // Convert images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gis, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gis, '![]($1)');

  // Convert code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n\n');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gis, '`$1`');

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gis, (match, content) => {
    const lines = content.trim().split('\n');
    return '\n' + lines.map(l => '> ' + l.trim()).join('\n') + '\n\n';
  });

  // Convert lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gis, '$1\n');
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gis, '$1\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n');

  // Convert paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gis, '$1\n\n');

  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Convert strong/bold
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gis, '**$2**');

  // Convert em/italic
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gis, '*$2*');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

/**
 * Extract content from a URL
 * @param {string} url - URL to extract content from
 * @returns {Object} Extraction result { content, markdown, success, error }
 */
async function extractContent(url) {
  try {
    const response = await fetchWithTimeout(url, {
      timeoutMs: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-AI-Bot/1.0)'
      }
    });

    if (!response.ok) {
      return {
        content: null,
        markdown: null,
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return {
        content: null,
        markdown: null,
        success: false,
        error: 'Failed to parse article content'
      };
    }

    const markdown = htmlToMarkdown(article.content, url);

    return {
      content: article.textContent,
      markdown,
      title: article.title,
      success: true,
      error: null
    };
  } catch (error) {
    return {
      content: null,
      markdown: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract content for multiple articles
 * @param {Array} articles - Array of article objects
 * @param {number} maxConcurrent - Maximum concurrent extractions
 * @returns {Array} Articles with extracted content
 */
async function extractContents(articles, maxConcurrent = 5) {
  if (!Array.isArray(articles)) {
    return [];
  }

  const results = [];
  const queue = [...articles];

  async function processQueue() {
    while (queue.length > 0) {
      const article = queue.shift();
      const url = article.link || article.url;

      if (!url) {
        results.push({
          ...article,
          extractedContent: null,
          extractionSuccess: false,
          extractionError: 'No URL provided'
        });
        continue;
      }

      const extraction = await extractContent(url);

      results.push({
        ...article,
        extractedContent: extraction.success ? extraction : null,
        extractionSuccess: extraction.success,
        extractionError: extraction.error
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Process with concurrency limit
  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrent, articles.length); i++) {
    workers.push(processQueue());
  }

  await Promise.all(workers);

  return results;
}

module.exports = { extractContent, extractContents };
