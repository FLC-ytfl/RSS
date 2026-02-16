/**
 * Article classifier - Short news vs long article
 */

// Patterns that indicate short news
const SHORT_NEWS_PATTERNS = [
  /^release\s*v?\d/i,
  /^announc/i,
  /^update\s*v?\d/i,
  /^version\s+\d/i,
  /^patch\s+note/i,
  /^changelog/i,
  /^now\s+available/i,
  /^just\s+released/i,
  /^minor\s+update/i,
  /^bug\s+fix/i,
  /^security\s+patch/i,
  /^hotfix/i
];

// Patterns that indicate long articles
const LONG_ARTICLE_PATTERNS = [
  /how\s+to/i,
  /tutorial/i,
  /guide/i,
  /deep\s+dive/i,
  /comprehensive/i,
  /complete\s+guide/i,
  /ultimate\s+guide/i,
  /walkthrough/i,
  /analysis/i,
  /in-depth/i,
  /explainer/i
];

// Code block patterns
const CODE_PATTERNS = [
  /```[\s\S]*?```/,
  /<code>[\s\S]*?<\/code>/,
  /<pre>[\s\S]*?<\/pre>/,
  /\n {4}\w/
];

// Section header patterns
const SECTION_PATTERNS = [
  /^#{1,3}\s+\w/gm,
  /^<h[1-3]>/gm
];

/**
 * Classify a single article
 * @param {Object} article - Article object with title and content
 * @returns {Object} Classification result { type, confidence }
 */
function classifyArticle(article) {
  const title = article.title || '';
  const content = article.content || article.description || '';
  let shortScore = 0;
  let longScore = 0;

  // 1. Content length check (primary factor)
  const contentLength = content.length;
  if (contentLength < 300) {
    shortScore += 50;
  } else if (contentLength < 800) {
    shortScore += 30;
  } else if (contentLength < 1500) {
    // Neutral zone
    shortScore += 10;
    longScore += 15;
  } else if (contentLength < 3000) {
    longScore += 35;
  } else {
    longScore += 50;
  }

  // 2. Title pattern matching
  for (const pattern of SHORT_NEWS_PATTERNS) {
    if (pattern.test(title)) {
      shortScore += 25;
      break;
    }
  }

  for (const pattern of LONG_ARTICLE_PATTERNS) {
    if (pattern.test(title)) {
      longScore += 25;
      break;
    }
  }

  // 3. Content structure analysis
  // Check for code blocks
  let hasCodeBlocks = false;
  for (const pattern of CODE_PATTERNS) {
    if (pattern.test(content)) {
      hasCodeBlocks = true;
      longScore += 15;
      break;
    }
  }

  // Check for section headers
  for (const pattern of SECTION_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length >= 3) {
      longScore += 15;
      break;
    }
  }

  // 4. Additional content indicators
  // Multiple paragraphs indicate long article
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
  if (paragraphs.length >= 5) {
    longScore += 10;
  }

  // Links in content
  const linkCount = (content.match(/https?:\/\//g) || []).length;
  if (linkCount >= 3) {
    longScore += 5;
  }

  // Calculate final classification
  const totalScore = shortScore + longScore;
  const type = longScore > shortScore ? 'long_article' : 'short_news';
  const confidence = totalScore > 0
    ? Math.max(shortScore, longScore) / totalScore
    : 0.5;

  return {
    type,
    confidence: Math.min(1, Math.max(0, confidence))
  };
}

/**
 * Classify all articles
 * @param {Array} articles - Array of article objects
 * @returns {Object} Classification result { short_news: [...], long_articles: [...] }
 */
function classifyArticles(articles) {
  if (!Array.isArray(articles)) {
    return { short_news: [], long_articles: [] };
  }

  const short_news = [];
  const long_articles = [];

  for (const article of articles) {
    const classification = classifyArticle(article);
    const classifiedArticle = {
      ...article,
      classification
    };

    if (classification.type === 'short_news') {
      short_news.push(classifiedArticle);
    } else {
      long_articles.push(classifiedArticle);
    }
  }

  return { short_news, long_articles };
}

module.exports = { classifyArticle, classifyArticles };
