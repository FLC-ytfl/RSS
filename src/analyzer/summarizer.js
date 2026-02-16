/**
 * Content summarization using AI
 */

/**
 * Generate summary for a single article
 * @param {Object} article - Article object
 * @param {Object} client - AI client
 * @returns {string} Generated summary
 */
async function generateSummary(article, client) {
  const content = article.extractedContent?.markdown ||
    article.content ||
    article.description ||
    '';

  const title = article.title || '';

  if (!client) {
    // Fallback: return truncated content
    const truncated = content.substring(0, 200);
    return truncated.length < content.length ? truncated + '...' : truncated;
  }

  try {
    const response = await client.chat({
      messages: [{
        role: 'user',
        content: `Summarize the following article in 100-200 words. Focus on the key points and main takeaways.
Keep the summary concise and informative.

Title: ${title}

Content:
${content.substring(0, 3000)}`
      }]
    });

    return response.choices?.[0]?.message?.content || content.substring(0, 200);
  } catch (error) {
    return content.substring(0, 200);
  }
}

/**
 * Generate summaries for multiple articles
 * @param {Array} articles - Array of article objects
 * @param {Object} client - AI client
 * @returns {Array} Articles with summary field
 */
async function generateSummaries(articles, client) {
  if (!Array.isArray(articles)) {
    return [];
  }

  const results = [];

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);

    if (!client) {
      // Fallback: use content truncation
      for (const article of batch) {
        const content = article.extractedContent?.markdown ||
          article.content ||
          article.description ||
          '';
        const truncated = content.substring(0, 200);
        results.push({
          ...article,
          summary: truncated.length < content.length ? truncated + '...' : truncated
        });
      }
      continue;
    }

    // Process batch in parallel
    const summaries = await Promise.all(
      batch.map(article => generateSummary(article, client))
    );

    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        summary: summaries[j]
      });
    }

    // Small delay between batches
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

module.exports = { generateSummaries };
