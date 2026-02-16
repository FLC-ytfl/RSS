/**
 * Translation module for multilingual content
 */

/**
 * Detect if text is in English
 * @param {string} text - Text to check
 * @returns {boolean} True if text appears to be in English
 */
function isEnglish(text) {
  if (!text) return true;

  // Check for common English words
  const englishWords = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
    'will', 'would', 'could', 'should', 'can', 'may', 'might',
    'this', 'that', 'these', 'those', 'and', 'or', 'but', 'not'];

  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const word of englishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) {
      matchCount += matches.length;
    }
  }

  // If we find several English words, assume it's English
  const wordCount = text.split(/\s+/).length;
  return matchCount >= Math.min(3, wordCount * 0.05);
}

/**
 * Translate text using AI
 * @param {string} text - Text to translate
 * @param {Object} client - AI client
 * @param {string} targetLang - Target language (default: 'Chinese')
 * @returns {string} Translated text
 */
async function translateText(text, client, targetLang = 'Chinese') {
  if (!text || !client) {
    return text;
  }

  // Skip if already in target language (simplified check)
  if (targetLang === 'Chinese' && /[\u4e00-\u9fa5]/.test(text)) {
    // Already contains Chinese characters
    const chineseRatio = (text.match(/[\u4e00-\u9fa5]/g) || []).length / text.length;
    if (chineseRatio > 0.3) {
      return text; // Already mostly Chinese
    }
  }

  try {
    const response = await client.chat({
      messages: [{
        role: 'user',
        content: `Translate the following text to ${targetLang}. Only output the translation, no explanations.

Text:
${text}`
      }]
    });

    return response.choices?.[0]?.message?.content || text;
  } catch (error) {
    return text;
  }
}

/**
 * Translate articles
 * @param {Array} articles - Array of article objects
 * @param {Object} client - AI client
 * @returns {Array} Articles with translated fields
 */
async function translateArticles(articles, client) {
  if (!Array.isArray(articles)) {
    return [];
  }

  const results = [];

  for (const article of articles) {
    const needsTranslation = !isEnglish(article.title) ||
      !isEnglish(article.summary || '') ||
      !isEnglish(article.content || '');

    // For English content, we might still want to translate to Chinese
    const shouldTranslate = client && isEnglish(article.title);

    if (!shouldTranslate) {
      results.push({
        ...article,
        translated_title: null,
        translated_summary: null,
        translated_content: null,
        translation_skipped: true
      });
      continue;
    }

    // Translate title
    const translated_title = await translateText(article.title, client, 'Chinese');

    // Translate summary if exists
    let translated_summary = null;
    if (article.summary) {
      translated_summary = await translateText(article.summary, client, 'Chinese');
    }

    // Translate content only for long articles
    let translated_content = null;
    if (article.classification?.type === 'long_article' && article.extractedContent?.markdown) {
      // Only translate first 2000 chars of content to save tokens
      translated_content = await translateText(
        article.extractedContent.markdown.substring(0, 2000),
        client,
        'Chinese'
      );
    }

    results.push({
      ...article,
      translated_title,
      translated_summary,
      translated_content,
      translation_skipped: false
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

module.exports = { translateArticles };
