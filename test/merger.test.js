const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeSimilarArticles } = require('../src/analyzer/merger');

test('mergeSimilarArticles merges similar items into a topic', async () => {
  const articles = [
    {
      title: 'Node.js 22 enters LTS phase',
      summary: 'Node.js 22 enters LTS phase with long term support.',
      source: 'Source A',
      link: 'https://example.com/a',
      tags: ['Web Dev']
    },
    {
      title: 'Node.js 22 enters LTS phase',
      summary: 'Node.js 22 enters LTS phase with long term support and stability.',
      source: 'Source B',
      link: 'https://example.com/b',
      tags: ['Web Dev']
    }
  ];

  const { topics, standalone } = await mergeSimilarArticles(articles, null);
  assert.equal(topics.length, 1);
  assert.equal(standalone.length, 0);
  assert.equal(topics[0].type, 'topic');
  assert.equal(topics[0].articles.length, 2);
});

test('mergeSimilarArticles keeps unique items standalone', async () => {
  const articles = [
    {
      title: 'Completely unrelated article',
      summary: 'Nothing to merge here.',
      source: 'Only Source',
      link: 'https://example.com/x',
      tags: ['Other']
    }
  ];

  const { topics, standalone } = await mergeSimilarArticles(articles, null);
  assert.equal(topics.length, 0);
  assert.equal(standalone.length, 1);
});
