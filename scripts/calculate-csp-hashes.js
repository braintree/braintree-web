"use strict";

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var cheerio = require("cheerio");

// Common constants and configurations
var CONDITIONAL_COMMENT_REGEX = /<!--\[if[^>]*\]>.*?<!\[endif\]-->/gs;
var IE9_CONDITIONAL_REGEX = /<!--\[if IE 9\s*\]>(.*?)<!\[endif\]-->/gs;
var CHEERIO_CONFIG = {
  xmlMode: false,
  decodeEntities: false,
};

/**
 * Calculate SHA-256 hash for a string
 * @param {string} content - Content to hash
 * @returns {string} SHA-256 hash in base64 format
 */
function calculateHash(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("base64");
}

/**
 * Normalize line endings to Unix format (LF) to match what browsers receive
 * @param {string} content - Content to normalize
 * @returns {string} Content with normalized line endings
 */
function normalizeLineEndings(content) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Extract inline scripts from HTML content
 * @param {string} htmlContent - HTML content to parse
 * @returns {Array} Array of inline script objects
 */
function extractInlineScripts(htmlContent) {
  // First, remove conditional comments to avoid cross-tag matching
  var cleanedContent = htmlContent.replace(CONDITIONAL_COMMENT_REGEX, "");
  var inlineScripts = [];
  var $;
  var normalizedContent;

  // Use cheerio to parse the cleaned HTML content
  $ = cheerio.load(cleanedContent, CHEERIO_CONFIG);

  // Find all script tags without src attributes (inline scripts)
  $("script:not([src])").each(function () {
    var content = $(this).html();

    if (content && content.trim()) {
      normalizedContent = normalizeLineEndings(content);
      inlineScripts.push({
        type: "inline",
        hash: "sha256-" + calculateHash(normalizedContent),
        size: normalizedContent.length,
      });
    }
  });

  return inlineScripts;
}

/**
 * Process a script element and add it to conditional comments
 * @param {Object} element - Cheerio element
 * @param {Array} conditionalComments - Array to add processed script to
 */
function processScriptElement(element, conditionalComments) {
  var src = element.attribs.src;
  var scriptTag;
  var attributes;
  var attr;
  var normalizedContent;

  if (src) {
    // Get the original script tag HTML by reconstructing it
    scriptTag = "<script";

    attributes = element.attribs;

    for (attr in attributes) {
      if (Object.prototype.hasOwnProperty.call(attributes, attr)) {
        scriptTag += " " + attr + '="' + attributes[attr] + '"';
      }
    }

    scriptTag += "></script>";

    normalizedContent = normalizeLineEndings(scriptTag);

    conditionalComments.push({
      type: "conditional_comment",
      condition: "IE 9",
      src: src,
      content: normalizedContent,
      hash: "sha256-" + calculateHash(normalizedContent),
    });
  }
}

/**
 * Extract conditional comments from HTML content
 * @param {string} htmlContent - HTML content to parse
 * @returns {Array} Array of conditional comment objects
 */
function extractConditionalComments(htmlContent) {
  var conditionalComments = [];
  var match;
  var conditionalContent;
  var $;

  // Reset regex state to ensure consistent behavior on repeated calls
  IE9_CONDITIONAL_REGEX.lastIndex = 0;
  match = IE9_CONDITIONAL_REGEX.exec(htmlContent);

  while (match !== null) {
    conditionalContent = match[1];

    $ = cheerio.load(conditionalContent, CHEERIO_CONFIG);

    $("script[src]").each(function () {
      processScriptElement(this, conditionalComments);
    });

    match = IE9_CONDITIONAL_REGEX.exec(htmlContent);
  }

  return conditionalComments;
}

/**
 * Extract all scripts from HTML content
 * @param {string} htmlContent - HTML content to parse
 * @returns {Array} Array of script objects with type, content, and hash
 */
function extractScripts(htmlContent) {
  return []
    .concat(extractInlineScripts(htmlContent))
    .concat(extractConditionalComments(htmlContent));
}

/**
 * Generate CSP header string from script hashes
 * @param {Array} scripts - Array of script objects
 * @returns {string} CSP header value
 */
function generateCSPHeader(scripts) {
  var hashes = scripts.map(function (script) {
    return "'" + script.hash + "'";
  });

  // Add 'self' to allow external scripts from same origin
  hashes.push("'self'");

  return "script-src " + hashes.join(" ");
}

/**
 * Generate CSP metadata for an HTML file
 * @param {string} htmlFilePath - Path to HTML file
 * @param {string} version - Version string
 * @returns {Object} CSP metadata object
 */
function generateCSPMetadata(htmlFilePath) {
  var htmlContent = fs.readFileSync(htmlFilePath, "utf8");
  var fileName = path.basename(htmlFilePath);
  var scripts = extractScripts(htmlContent);
  var cspHeader = generateCSPHeader(scripts);

  return {
    file: fileName,
    csp_header: cspHeader,
    scripts: scripts,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate CSP meta tag from CSP header
 * @param {string} cspHeader - CSP header value
 * @returns {string} CSP meta tag HTML
 */
function generateCSPMetaTag(cspHeader) {
  return (
    '<meta http-equiv="Content-Security-Policy" content="' + cspHeader + '">'
  );
}

module.exports = {
  calculateHash: calculateHash,
  generateCSPMetadata: generateCSPMetadata,
  generateCSPMetaTag: generateCSPMetaTag,
};
