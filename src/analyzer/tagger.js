/**
 * Auto tag generation using AI
 */

const TAG_CATEGORIES = [
  'AI/ML', 'Security', 'Web Dev', 'Systems', 'Database',
  'Cloud', 'Mobile', 'DevOps', 'Hardware', 'Algorithms',
  'Product', 'Startup', 'Other'
];

// Keyword mappings for quick classification
const TAG_KEYWORDS = {
  'AI/ML': [
    'machine learning', 'deep learning', 'neural network', 'ai', 'artificial intelligence',
    'gpt', 'llm', 'transformer', 'nlp', 'computer vision', 'tensorflow', 'pytorch',
    'openai', 'anthropic', 'hugging face', 'model training', 'inference'
  ],
  'Security': [
    'security', 'vulnerability', 'cve', 'exploit', 'hack', 'encryption', 'authentication',
    'authorization', 'firewall', 'penetration', 'malware', 'ransomware', 'zero-day',
    'cybersecurity', 'ssl', 'tls', 'oauth', 'jwt'
  ],
  'Web Dev': [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'frontend',
    'backend', 'api', 'rest', 'graphql', 'css', 'html', 'web', 'browser', 'spa',
    'next.js', 'svelte', 'webassembly', 'wasm'
  ],
  'Systems': [
    'linux', 'kernel', 'operating system', 'os', 'memory', 'cpu', 'process',
    'thread', 'scheduler', 'filesystem', 'driver', 'embedded', 'rust', 'c++',
    'system programming', 'posix', 'unix', 'virtualization'
  ],
  'Database': [
    'database', 'sql', 'nosql', 'postgresql', 'mysql', 'mongodb', 'redis',
    'elasticsearch', 'cassandra', 'dynamodb', 'query', 'index', 'transaction',
    'acid', 'sharding', 'replication', 'orm'
  ],
  'Cloud': [
    'aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'docker', 'container', 'serverless',
    'lambda', 's3', 'ec2', 'terraform', 'infrastructure', 'iaas', 'paas', 'saas'
  ],
  'Mobile': [
    'ios', 'android', 'mobile', 'app', 'swift', 'kotlin', 'flutter', 'react native',
    'xamarin', 'pwa', 'mobile development', 'app store', 'play store'
  ],
  'DevOps': [
    'devops', 'ci/cd', 'pipeline', 'jenkins', 'github actions', 'gitlab ci',
    'monitoring', 'logging', 'prometheus', 'grafana', 'ansible', 'chef', 'puppet',
    'deployment', 'automation', 'sre'
  ],
  'Hardware': [
    'hardware', 'cpu', 'gpu', 'chip', 'processor', 'semiconductor', 'fpga',
    'embedded', 'iot', 'arduino', 'raspberry pi', 'sensor', 'actuator'
  ],
  'Algorithms': [
    'algorithm', 'data structure', 'complexity', 'optimization', 'sorting',
    'searching', 'graph', 'tree', 'dynamic programming', 'recursion', 'hash',
    'big o', 'time complexity', 'space complexity'
  ],
  'Product': [
    'product', 'ux', 'user experience', 'design', 'feature', 'roadmap', 'pm',
    'product manager', 'user research', 'a/b test', 'analytics', 'growth'
  ],
  'Startup': [
    'startup', 'funding', 'vc', 'venture capital', 'seed', 'series a', 'ipo',
    'acquisition', 'founder', 'entrepreneur', 'business model', 'market'
  ]
};

/**
 * Get tags based on keyword matching
 * @param {string} text - Text to analyze
 * @returns {Array} Array of matching tags
 */
function getTagsByKeywords(text) {
  const lowerText = text.toLowerCase();
  const tagScores = {};

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      tagScores[tag] = score;
    }
  }

  // Sort by score and return top tags
  return Object.entries(tagScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}

/**
 * Generate tags for articles using AI
 * @param {Array} articles - Array of article objects
 * @param {Object} client - AI client (optional, uses keyword fallback)
 * @returns {Array} Articles with tags field
 */
async function generateTags(articles, client) {
  if (!Array.isArray(articles)) {
    return [];
  }

  // If no AI client, use keyword-based tagging
  if (!client) {
    return articles.map(article => {
      const text = `${article.title || ''} ${article.content || article.description || ''}`;
      const tags = getTagsByKeywords(text);

      return {
        ...article,
        tags: tags.length > 0 ? tags : ['Other']
      };
    });
  }

  // Use AI for more accurate tagging
  const results = [];

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);

    const prompts = batch.map((article, idx) => {
      const text = `${article.title || ''}\n${(article.content || article.description || '').substring(0, 500)}`;
      return `[${idx}] ${text}`;
    }).join('\n\n---\n\n');

    try {
      const response = await client.chat({
        messages: [{
          role: 'user',
          content: `For each article below, assign 1-3 tags from these categories: ${TAG_CATEGORIES.join(', ')}.
Return as JSON array: [{"index": 0, "tags": ["tag1", "tag2"]}, ...]

Articles:
${prompts}`
        }]
      });

      const content = response.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const tagResults = JSON.parse(jsonMatch[0]);
        const tagMap = new Map(tagResults.map(r => [r.index, r.tags]));

        for (let j = 0; j < batch.length; j++) {
          const tags = tagMap.get(j) || getTagsByKeywords(`${batch[j].title} ${batch[j].content || ''}`);
          results.push({
            ...batch[j],
            tags: tags.length > 0 ? tags : ['Other']
          });
        }
      } else {
        // Fallback to keyword tagging for this batch
        for (const article of batch) {
          const text = `${article.title || ''} ${article.content || article.description || ''}`;
          const tags = getTagsByKeywords(text);
          results.push({
            ...article,
            tags: tags.length > 0 ? tags : ['Other']
          });
        }
      }
    } catch (error) {
      // Fallback to keyword tagging for this batch
      for (const article of batch) {
        const text = `${article.title || ''} ${article.content || article.description || ''}`;
        const tags = getTagsByKeywords(text);
        results.push({
          ...article,
          tags: tags.length > 0 ? tags : ['Other']
        });
      }
    }
  }

  return results;
}

module.exports = { generateTags, TAG_CATEGORIES };
