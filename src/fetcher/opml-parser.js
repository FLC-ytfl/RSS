const fs = require('fs');
const path = require('path');

/**
 * Parse an OPML file and extract RSS feed URLs and metadata
 * @param {string} opmlPath - Path to the OPML file
 * @returns {Array<{title: string, xmlUrl: string, htmlUrl: string}>} Array of feed objects
 */
function parseOPML(opmlPath) {
  const content = fs.readFileSync(opmlPath, 'utf-8');

  // Simple XML parsing without external dependencies
  const feeds = [];

  // Match all outline elements with xmlUrl attribute
  const outlineRegex = /<outline[^>]*xmlUrl=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = outlineRegex.exec(content)) !== null) {
    const outlineTag = match[0];
    const xmlUrl = match[1];

    // Extract title
    const titleMatch = outlineTag.match(/title=["']([^"']+)["']/i);
    const textMatch = outlineTag.match(/text=["']([^"']+)["']/i);
    const title = (titleMatch ? titleMatch[1] : null) || (textMatch ? textMatch[1] : null) || xmlUrl;

    // Extract htmlUrl
    const htmlUrlMatch = outlineTag.match(/htmlUrl=["']([^"']+)["']/i);
    const htmlUrl = htmlUrlMatch ? htmlUrlMatch[1] : '';

    feeds.push({
      title,
      xmlUrl,
      htmlUrl
    });
  }

  return feeds;
}

module.exports = { parseOPML };
