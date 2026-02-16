/**
 * RSS Report Viewer - Translation Interaction
 * Handles translation toggle and markdown rendering
 */

// Translation state management per article
const translationStates = {};

/**
 * Toggle between original and translated content
 * @param {number|string} articleId - The article identifier
 */
function toggleTranslation(articleId) {
  const id = String(articleId);
  const originalEl = document.getElementById(`original-${id}`);
  const translatedEl = document.getElementById(`translated-${id}`);
  const btn = document.querySelector(`#article-${id} .btn-toggle-translation`);

  if (!originalEl || !translatedEl) {
    console.warn(`Article elements not found for ID: ${id}`);
    return;
  }

  // Toggle state
  translationStates[id] = !translationStates[id];
  const showTranslation = translationStates[id];

  if (showTranslation) {
    originalEl.style.display = 'none';
    translatedEl.style.display = 'block';
    if (btn) {
      btn.textContent = 'Show Original';
      btn.classList.add('active');
    }
  } else {
    originalEl.style.display = 'block';
    translatedEl.style.display = 'none';
    if (btn) {
      btn.textContent = 'Show Translation';
      btn.classList.remove('active');
    }
  }
}

/**
 * Get current translation state for an article
 * @param {number|string} articleId - The article identifier
 * @returns {boolean} Whether translation is currently shown
 */
function getTranslationState(articleId) {
  return translationStates[String(articleId)] || false;
}

/**
 * Set up markdown content with syntax highlighting
 * @param {string} content - Markdown content
 * @param {string} containerId - Container ID to insert content into
 * @param {object} options - Rendering options
 */
function setupMarkdownContent(content, containerId, options = {}) {
  const {
    highlightCode = true,
    sanitizeHtml = true,
    addAnchors = true
  } = options;

  let html;

  // Check if marked.js is available
  if (typeof marked !== 'undefined') {
    // Configure marked
    const renderer = new marked.Renderer();

    // Add anchor links to headings
    if (addAnchors) {
      const originalHeading = renderer.heading.bind(renderer);
      renderer.heading = function(text, level, raw) {
        const slug = generateSlug(raw);
        return `<h${level} id="${slug}">
          <a href="#${slug}" class="anchor-link" aria-hidden="true">#</a>
          ${text}
        </h${level}>`;
      };
    }

    // Open links in new tab
    const originalLink = renderer.link.bind(renderer);
    renderer.link = function(href, title, text) {
      const isExternal = href.startsWith('http://') || href.startsWith('https://');
      if (isExternal) {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
      }
      return originalLink(href, title, text);
    };

    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    });

    html = marked.parse(content);
  } else {
    // Fallback: simple paragraph wrapping
    html = content.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
  }

  // Apply syntax highlighting if highlight.js is available
  if (highlightCode && typeof hljs !== 'undefined') {
    // Create a temporary container to process code blocks
    const temp = document.createElement('div');
    temp.innerHTML = html;

    temp.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });

    html = temp.innerHTML;
  }

  // If container ID provided, insert into container
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
    }
  }

  return html;
}

/**
 * Generate URL-friendly slug from text
 * @param {string} text - Text to slugify
 * @returns {string} URL-friendly slug
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-') // Keep alphanumeric and Chinese
    .replace(/^-+|-+$/g, '') // Trim hyphens
    .substring(0, 50); // Limit length
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize translation toggle for all articles
 */
function initTranslationToggles() {
  document.querySelectorAll('.article-item').forEach((article) => {
    const id = article.id.replace('article-', '');
    const btn = article.querySelector('.btn-toggle-translation');

    if (btn) {
      btn.addEventListener('click', () => toggleTranslation(id));
    }

    // Set initial state
    translationStates[id] = false;
  });
}

/**
 * Show translation for all articles
 */
function showAllTranslations() {
  document.querySelectorAll('.article-item').forEach((article) => {
    const id = article.id.replace('article-', '');
    if (!translationStates[id]) {
      toggleTranslation(id);
    }
  });
}

/**
 * Show original for all articles
 */
function showAllOriginals() {
  document.querySelectorAll('.article-item').forEach((article) => {
    const id = article.id.replace('article-', '');
    if (translationStates[id]) {
      toggleTranslation(id);
    }
  });
}

/**
 * Create translation toggle button HTML
 * @param {number|string} articleId - Article identifier
 * @param {boolean} hasTranslation - Whether translation exists
 * @returns {string} Button HTML
 */
function createTranslationButton(articleId, hasTranslation = true) {
  if (!hasTranslation) {
    return '<span class="no-translation">No translation available</span>';
  }
  return `<button class="btn-toggle-translation" onclick="toggleTranslation('${articleId}')">
    Show Translation
  </button>`;
}

/**
 * Process inline translation request
 * @param {string} text - Text to translate (would need actual translation API)
 * @param {string} targetLang - Target language code
 * @returns {Promise<string>} Translated text
 */
async function requestTranslation(text, targetLang = 'zh') {
  // This is a placeholder - actual implementation would need a translation API
  console.log('Translation requested for:', text.substring(0, 50) + '...');
  console.log('Target language:', targetLang);

  // Return placeholder
  return '[Translation would appear here - connect to translation API]';
}

// Export functions
window.toggleTranslation = toggleTranslation;
window.getTranslationState = getTranslationState;
window.setupMarkdownContent = setupMarkdownContent;
window.initTranslationToggles = initTranslationToggles;
window.showAllTranslations = showAllTranslations;
window.showAllOriginals = showAllOriginals;
window.createTranslationButton = createTranslationButton;
