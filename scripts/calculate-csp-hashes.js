"use strict";

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var cheerio = require("cheerio");

// Common constants and configurations
var CONDITIONAL_COMMENT_REGEX = /<!--\[if[^>]*\]>.*?<!\[endif\]-->/gs;
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
 * Extract external scripts from HTML content and hash their file contents
 * @param {string} htmlContent - HTML content to parse
 * @param {string} htmlDir - Directory of the HTML file (for resolving relative paths)
 * @returns {Array} Array of external script objects
 */
function extractExternalScripts(htmlContent, htmlDir) {
  // First, remove conditional comments to avoid matching IE9 polyfill scripts
  var cleanedContent = htmlContent.replace(CONDITIONAL_COMMENT_REGEX, "");
  var externalScripts = [];
  var $;

  $ = cheerio.load(cleanedContent, CHEERIO_CONFIG);

  $("script[src]").each(function () {
    var src = $(this).attr("src");
    var resolvedPath = path.resolve(htmlDir, src);
    var rawBuffer;

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        "External script file not found: " +
          resolvedPath +
          " (referenced as " +
          src +
          ")"
      );
    }

    // Read as raw buffer and hash the exact bytes. Unlike inline scripts,
    // browsers hash external scripts using the bytes received over the network,
    // without any line-ending normalization.
    rawBuffer = fs.readFileSync(resolvedPath);

    externalScripts.push({
      type: "external",
      src: src,
      hash:
        "sha256-" +
        crypto.createHash("sha256").update(rawBuffer).digest("base64"),
      size: rawBuffer.length,
    });
  });

  return externalScripts;
}

/**
 * Extract all scripts from HTML content (inline and external)
 * @param {string} htmlContent - HTML content to parse
 * @param {string} htmlDir - Directory of the HTML file (for resolving relative src paths)
 * @returns {Array} Array of script objects (inline: type, hash, size; external: type, hash, size, src)
 */
function extractScripts(htmlContent, htmlDir) {
  return extractInlineScripts(htmlContent).concat(
    extractExternalScripts(htmlContent, htmlDir)
  );
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

  return (
    "script-src " + hashes.join(" ") + "; style-src 'self' 'unsafe-inline'"
  );
}

/**
 * Generate CSP metadata for an HTML file
 * @param {string} htmlFilePath - Path to HTML file
 * @returns {Object} CSP metadata object
 */
function generateCSPMetadata(htmlFilePath) {
  var htmlContent = fs.readFileSync(htmlFilePath, "utf8");
  var htmlDir = path.dirname(htmlFilePath);
  var fileName = path.basename(htmlFilePath);
  var scripts = extractScripts(htmlContent, htmlDir);
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
