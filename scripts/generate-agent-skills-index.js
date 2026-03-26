#!/usr/bin/env node

"use strict";

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");

var SKILLS_DIR = path.join(
  __dirname,
  "..",
  ".well-known",
  "agent-skills",
  "skills"
);
var INDEX_PATH = path.join(
  __dirname,
  "..",
  ".well-known",
  "agent-skills",
  "index.json"
);
var SCHEMA_URL = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

/**
 * Parse YAML frontmatter from a markdown file.
 * Expects --- delimiters. Returns { name, description } or null.
 */
function parseFrontmatter(content) {
  var match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    return null;
  }

  var frontmatter = match[1];
  var result = {};

  frontmatter.split("\n").forEach(function (line) {
    var colonIndex = line.indexOf(":");
    var key, value;

    if (colonIndex > 0) {
      key = line.slice(0, colonIndex).trim();
      value = line.slice(colonIndex + 1).trim();

      result[key] = value;
    }
  });

  return result;
}

/**
 * Compute SHA-256 digest of file contents.
 */
function computeDigest(filePath) {
  var content = fs.readFileSync(filePath);
  var hash = crypto.createHash("sha256").update(content).digest("hex");

  return "sha256:" + hash;
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error("Skills directory not found:", SKILLS_DIR);
    process.exit(1);
  }

  var files = fs
    .readdirSync(SKILLS_DIR)
    .filter(function (f) {
      return f.endsWith(".md");
    })
    .sort();

  var skills = [];
  var errors = [];

  files.forEach(function (filename) {
    var filePath = path.join(SKILLS_DIR, filename);
    var content = fs.readFileSync(filePath, "utf8");
    var meta = parseFrontmatter(content);

    if (!meta || !meta.name || !meta.description) {
      errors.push(
        filename + ": missing required frontmatter (name, description)"
      );

      return;
    }

    // Validate name format: 1-64 chars, lowercase alphanumeric + hyphens
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(meta.name)) {
      errors.push(
        filename +
          ': invalid name "' +
          meta.name +
          '" (must be 1-64 lowercase alphanumeric + hyphens)'
      );

      return;
    }

    // Validate description length
    if (meta.description.length > 1024) {
      errors.push(
        filename +
          ": description exceeds 1024 characters (" +
          meta.description.length +
          ")"
      );

      return;
    }

    skills.push({
      name: meta.name,
      type: "skill-md",
      description: meta.description,
      url: "skills/" + filename,
      digest: computeDigest(filePath),
    });
  });

  if (errors.length > 0) {
    console.error("Errors found:");
    errors.forEach(function (e) {
      console.error("  - " + e);
    });
    process.exit(1);
  }

  var index = {
    $schema: SCHEMA_URL,
    skills: skills,
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");

  console.log("Generated " + INDEX_PATH);
  console.log("Skills registered: " + skills.length);
  skills.forEach(function (s) {
    console.log("  - " + s.name + " (" + s.digest.slice(0, 15) + "...)");
  });
}

main();
