// Use global fetch in Node 18+

class APIClient {
  constructor() {
    this.baseUrl = process.env.AI_API_URL || 'https://api.openai.com/v1';
    this.apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4';
  }

  async chat(request, options = {}) {
    const payload = Array.isArray(request)
      ? { messages: request, ...options }
      : { ...(request || {}), ...options };

    const { messages } = payload;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid chat payload: messages is required');
    }

    const model = payload.model || this.model;
    const temperature = payload.temperature ?? 0.7;
    const max_tokens = payload.max_tokens ?? payload.maxTokens;

    const extra = { ...payload };
    delete extra.messages;
    delete extra.model;
    delete extra.temperature;
    delete extra.max_tokens;
    delete extra.maxTokens;

    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(max_tokens ? { max_tokens } : {}),
            ...extra
          })
        });

        if (response.status === 429) {
          // Rate limit - wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this._sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error;

        // Exponential backoff for retryable errors
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await this._sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  async batchChat(items, systemPrompt, userPromptTemplate, batchSize = 10) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const userPrompt = typeof userPromptTemplate === 'function'
            ? userPromptTemplate(item)
            : userPromptTemplate.replace('{item}', JSON.stringify(item));

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ];

          try {
            return await this.chat(messages);
          } catch (error) {
            return { error: error.message, item };
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { APIClient };
