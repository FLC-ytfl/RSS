const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeArticles } = require('../src/analyzer');

function withEnv(patch, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(patch)) {
    previous[key] = Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined;
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }

  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  try {
    const result = fn();
    return Promise.resolve(result).finally(restore);
  } catch (error) {
    restore();
    throw error;
  }
}

function assertNoTranslations(result) {
  const shortNews = result?.sections?.short_news || [];
  const longArticles = result?.sections?.long_articles || [];

  for (const item of shortNews) {
    assert.equal(item.translated_title, null);
    assert.equal(item.translated_summary, null);
  }

  for (const item of longArticles) {
    assert.equal(item.translated_title, null);
    assert.equal(item.translated_summary, null);
    assert.equal(item.translated_content, null);
  }
}

test('analyzeArticles keeps translated_* null when AI_API_KEY is not set', async () => {
  await withEnv(
    {
      AI_API_KEY: undefined,
      MAX_LONG_EXTRACTIONS: 0,
      MAX_LONG_FINAL: 0,
      MAX_TOPICS: 0,
      TARGET_MAX_ITEMS: 3,
      TARGET_MIN_ITEMS: 0
    },
    async () => {
      const result = await analyzeArticles();
      assertNoTranslations(result);
    }
  );
});

test('analyzeArticles keeps translated_* null when AI_API_KEY is set', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({ choices: [{ message: { content: '[]' } }] })
  });

  try {
    await withEnv(
      {
        AI_API_KEY: 'test-key',
        AI_API_URL: 'https://example.invalid',
        MAX_LONG_EXTRACTIONS: 0,
        MAX_LONG_FINAL: 0,
        MAX_TOPICS: 0,
        TARGET_MAX_ITEMS: 3,
        TARGET_MIN_ITEMS: 0
      },
      async () => {
        const result = await analyzeArticles();
        assertNoTranslations(result);
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

