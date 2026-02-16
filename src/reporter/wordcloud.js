// Common English stopwords
const ENGLISH_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'would', 'could', 'ought', 'i', 'me', 'my', 'myself',
  'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'am', 'if', 'because', 'as', 'until', 'while', 'also', 'use',
  'used', 'using', 'uses', 'said', 'says', 'say', 'get', 'got', 'gets',
  'make', 'made', 'makes', 'see', 'seen', 'saw', 'go', 'goes', 'went',
  'come', 'comes', 'came', 'take', 'takes', 'took', 'new', 'old', 'one',
  'two', 'three', 'four', 'five', 'first', 'second', 'third', 'last',
  'next', 'many', 'much', 'any', 'every', 'both', 'over', 'out', 'back',
  'even', 'still', 'way', 'well', 'may', 'might', 'must', 'need', 'shall'
]);

// Common Chinese stopwords
const CHINESE_STOPWORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
  '看', '好', '自己', '这', '那', '他', '她', '它', '们', '这个', '那个',
  '什么', '怎么', '如何', '为什么', '哪', '哪里', '哪个', '可以', '能',
  '这个', '那个', '这些', '那些', '之', '与', '及', '或', '但', '而',
  '却', '虽然', '因为', '所以', '如果', '但是', '而且', '或者', '以及',
  '还是', '不仅', '而且', '既', '又', '更', '最', '已经', '正在', '将',
  '等', '等等', '比如', '例如', '像', '对', '对于', '关于', '通过',
  '按照', '根据', '由于', '为了', '把', '被', '让', '给', '向', '从'
]);

const STOPWORDS = new Set([...ENGLISH_STOPWORDS, ...CHINESE_STOPWORDS]);

/**
 * Tokenize text into words, handling both English and Chinese
 * @param {string} text - Text to tokenize
 * @returns {Array<string>} Array of tokens
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const tokens = [];

  // Normalize text
  const normalizedText = text.toLowerCase().trim();

  // Extract English words (sequences of letters)
  const englishWords = normalizedText.match(/[a-z][a-z'-]*/g) || [];

  // Extract Chinese characters and common words
  // Match Chinese characters (Unicode range for CJK)
  const chineseChars = normalizedText.match(/[\u4e00-\u9fff]+/g) || [];

  // Process English words
  for (const word of englishWords) {
    if (word.length >= 2 && !ENGLISH_STOPWORDS.has(word)) {
      tokens.push(word);
    }
  }

  // Process Chinese - for simplicity, treat each character or common word
  for (const segment of chineseChars) {
    // If segment is short (1-2 chars), check as whole
    if (segment.length <= 4) {
      if (!CHINESE_STOPWORDS.has(segment)) {
        tokens.push(segment);
      }
    } else {
      // For longer segments, could do word segmentation
      // For now, just add as is (simple approach)
      tokens.push(segment);
    }
  }

  return tokens;
}

/**
 * Generate word cloud data from articles
 * @param {Array} articles - Array of article objects with title and summary
 * @param {Object} options - Configuration options
 * @param {number} options.minCount - Minimum count to include (default: 2)
 * @param {number} options.maxWords - Maximum words to return (default: 100)
 * @returns {Array<Object>} Array of { word, count } objects sorted by count
 */
function generateWordCloudData(articles, options = {}) {
  const { minCount = 2, maxWords = 100 } = options;
  const wordCounts = {};

  for (const article of articles) {
    // Tokenize title
    const titleTokens = tokenize(article.title);
    for (const token of titleTokens) {
      wordCounts[token] = (wordCounts[token] || 0) + 1;
    }

    // Tokenize summary/description
    const summaryTokens = tokenize(article.summary || article.description);
    for (const token of summaryTokens) {
      wordCounts[token] = (wordCounts[token] || 0) + 1;
    }
  }

  // Filter by minimum count and sort
  const result = Object.entries(wordCounts)
    .filter(([word, count]) => count >= minCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);

  return result;
}

module.exports = {
  generateWordCloudData,
  tokenize,
  STOPWORDS,
  ENGLISH_STOPWORDS,
  CHINESE_STOPWORDS
};
