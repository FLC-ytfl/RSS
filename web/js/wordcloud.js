/**
 * RSS Report Viewer - Word Cloud Rendering
 * Uses wordcloud2.js for word cloud visualization
 */

// Word cloud configuration
const WORDCLOUD_CONFIG = {
  fontFamily: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif',
  fontWeight: 'normal',
  gridSize: 8,
  weightFactor: 3,
  rotateRatio: 0.3,
  rotationSteps: 2,
  backgroundColor: 'transparent',
  drawOutOfBound: false,
  shrinkToFit: true,
  minSize: 12,
  maxSize: 60
};

/**
 * Get colors based on current theme
 */
function getWordCloudColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark
    ? ['#64b5f6', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4dd0e1', '#aed581', '#ff8a65']
    : ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#689f38', '#e64a19'];
}

/**
 * Render word cloud
 * @param {object} wordData - Object with words as keys and frequencies as values
 * @param {string} containerId - Canvas container ID
 */
function renderWordCloud(wordData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Check if wordcloud2.js is available
  if (typeof WordCloud === 'undefined') {
    console.warn('WordCloud library not loaded');
    container.innerHTML = '<p class="no-data">Word cloud library not available</p>';
    return;
  }

  // Process data - convert to array format [[word, weight], ...]
  const words = Object.entries(wordData)
    .filter(([word]) => word.length > 1) // Filter single characters
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100); // Limit to top 100 words

  if (words.length === 0) {
    container.innerHTML = '<p class="no-data">No word frequency data available</p>';
    return;
  }

  // Calculate weight factor based on container size and max frequency
  const maxFreq = Math.max(...words.map(([, freq]) => freq));
  const containerWidth = container.offsetWidth || 600;
  const containerHeight = container.offsetHeight || 300;

  // Adjust weight factor to fit container
  const weightFactor = Math.min(
    (containerWidth / 10) / Math.sqrt(maxFreq),
    (containerHeight / 5) / Math.sqrt(maxFreq)
  );

  // Get colors for current theme
  const colors = getWordCloudColors();

  // Create canvas if needed
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    container.innerHTML = '';
    container.appendChild(canvas);
  }

  // Clear previous word cloud
  WordCloud.stop(canvas);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Generate word cloud
  const wordList = words.map(([word, freq]) => [word, Math.sqrt(freq)]);

  WordCloud(canvas, {
    list: wordList,
    fontFamily: WORDCLOUD_CONFIG.fontFamily,
    fontWeight: WORDCLOUD_CONFIG.fontWeight,
    gridSize: Math.max(4, Math.floor(containerWidth / 80)),
    weightFactor: weightFactor,
    rotateRatio: WORDCLOUD_CONFIG.rotateRatio,
    rotationSteps: WORDCLOUD_CONFIG.rotationSteps,
    backgroundColor: WORDCLOUD_CONFIG.backgroundColor,
    color: function() {
      return colors[Math.floor(Math.random() * colors.length)];
    },
    drawOutOfBound: WORDCLOUD_CONFIG.drawOutOfBound,
    shrinkToFit: WORDCLOUD_CONFIG.shrinkToFit,
    minSize: WORDCLOUD_CONFIG.minSize,
    hover: function(item, dimension, event) {
      // Show tooltip on hover
      if (item) {
        canvas.style.cursor = 'pointer';
        // Could add tooltip here if needed
      } else {
        canvas.style.cursor = 'default';
      }
    },
    click: function(item) {
      // Click handler - could filter articles by word
      if (item) {
        console.log('Clicked word:', item[0], 'frequency:', Math.pow(item[1], 2));
      }
    }
  });
}

/**
 * Render word cloud with custom options
 * @param {object} wordData - Word frequency data
 * @param {string} containerId - Container ID
 * @param {object} options - Custom options
 */
function renderWordCloudWithOptions(wordData, containerId, options) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Merge with default config
  const mergedOptions = { ...WORDCLOUD_CONFIG, ...options };

  // Process data
  const words = Object.entries(wordData)
    .filter(([word]) => word.length > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.maxWords || 100);

  if (words.length === 0) {
    container.innerHTML = '<p class="no-data">No word frequency data available</p>';
    return;
  }

  const colors = getWordCloudColors();
  const wordList = words.map(([word, freq]) => [word, Math.sqrt(freq)]);

  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 600;
    canvas.height = container.offsetHeight || 300;
    container.innerHTML = '';
    container.appendChild(canvas);
  }

  WordCloud.stop(canvas);

  WordCloud(canvas, {
    list: wordList,
    ...mergedOptions,
    color: mergedOptions.color || function() {
      return colors[Math.floor(Math.random() * colors.length)];
    }
  });
}

/**
 * Re-render word cloud (e.g., after theme change)
 */
function refreshWordCloud(wordData, containerId) {
  renderWordCloud(wordData, containerId);
}

// Export functions
window.renderWordCloud = renderWordCloud;
window.renderWordCloudWithOptions = renderWordCloudWithOptions;
window.refreshWordCloud = refreshWordCloud;
