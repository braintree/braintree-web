#!/usr/bin/env node

/**
 * Pre-release preparation script
 *
 * Usage:
 *   npm run prepare-release patch       # V3: 3.94.0 -> 3.94.1
 *   npm run prepare-release minor       # V3: 3.94.0 -> 3.95.0
 *   npm run prepare-release major       # V3: 3.94.0 -> 4.0.0 (rare)
 *   npm run prepare-release beta        # V4: 4.0.0-beta.1 -> 4.0.0-beta.2
 *   npm run prepare-release alpha       # V4: 4.0.0-alpha.1 -> 4.0.0-alpha.2
 *   npm run prepare-release 4.1.0-beta.1  # Explicit version
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHANGELOG_PATH = join(__dirname, "..", "CHANGELOG.md");
const PACKAGE_PATH = join(__dirname, "..", "package.json");
const PACKAGE_LOCK_PATH = join(__dirname, "..", "package-lock.json");

/**
 * Step 1: Verify npm registry
 */
const verifyRegistry = () => {
  console.log("Step 1: Verifying npm registry...");

  const lockContent = readFileSync(PACKAGE_LOCK_PATH, "utf8");

  if (lockContent.includes("paypalinc")) {
    throw new Error(
      "Found PayPal internal registry in package-lock.json!\n" +
        "Run: rm -rf node_modules package-lock.json && npm install --registry=https://registry.npmjs.org"
    );
  }

  console.log("  Registry OK (no internal URLs found)\n");
};

/**
 * Step 2: Install dependencies and verify clean tree
 */
const installAndVerify = () => {
  console.log("Step 2: Installing dependencies...");

  execSync("npm install --registry=https://registry.npmjs.org", {
    stdio: "inherit",
  });

  const status = execSync("git status --porcelain").toString().trim();

  if (status) {
    throw new Error(
      "Working tree is not clean after npm install!\n" +
        "Unstaged changes:\n" +
        status +
        "\n\n" +
        "You may have the wrong registry configured."
    );
  }

  console.log("  Dependencies installed, working tree clean\n");
};

/**
 * Step 4: Update CHANGELOG.md with actual version from package.json
 * Replaces UNRELEASED header with versioned header
 */
const updateChangelog = () => {
  console.log("Step 4: Updating CHANGELOG.md...");

  // Read version from package.json
  const version = readVersionFromPackage();

  let changelog = readFileSync(CHANGELOG_PATH, "utf8");

  // Replace UNRELEASED with version (supports both ## UNRELEASED and UNRELEASED\n=== styles)
  const unreleasedPattern = /^## UNRELEASED$/m;

  if (!unreleasedPattern.test(changelog)) {
    console.log("  No UNRELEASED section found (may already be updated)\n");
    return false;
  }

  // Format date as YYYY-MM-DD
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const versionHeader = `## ${version} (${dateStr})`;

  changelog = changelog.replace(unreleasedPattern, versionHeader);

  writeFileSync(CHANGELOG_PATH, changelog);
  console.log(`  Updated UNRELEASED -> ${version}\n`);

  return true;
};

/**
 * Step 3: Run npm version
 * Creates version commit with updated package.json and package-lock.json
 */
const runNpmVersion = (type) => {
  console.log("Step 3: Creating version tag...");

  let cmd;

  // Determine command based on type
  if (["major", "minor", "patch"].includes(type)) {
    cmd = `npm version ${type}`;
  } else if (type === "beta") {
    cmd = "npm version prerelease --preid=beta";
  } else if (type === "alpha") {
    cmd = "npm version prerelease --preid=alpha";
  } else if (/^\d+\.\d+\.\d+/.test(type)) {
    // Explicit version
    cmd = `npm version ${type}`;
  } else {
    throw new Error(`Unknown version type: ${type}`);
  }

  console.log(`  Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });

  console.log(`  Version updated in package.json and package-lock.json\n`);
};

/**
 * Step 5: Amend version commit to include changelog
 * Adds CHANGELOG.md to the commit created by npm version
 */
const commitChangelog = () => {
  console.log("Step 5: Committing changelog...");

  execSync("git add CHANGELOG.md");
  execSync("git commit --amend --no-edit");

  console.log("  Changelog committed (amended version commit)\n");
};

/**
 * Read the current version from package.json
 * Used after npm version has updated the version
 * @returns {string} The version string
 */
const readVersionFromPackage = () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));
  return pkg.version;
};

/**
 * Main execution
 */
const main = () => {
  const type = process.argv[2];

  if (!type) {
    console.error("Usage: npm run prepare-release <type>");
    console.error("");
    console.error("Types:");
    console.error("  patch   - Bug fix (3.94.0 -> 3.94.1)");
    console.error("  minor   - New features (3.94.0 -> 3.95.0)");
    console.error("  major   - Breaking changes (3.94.0 -> 4.0.0)");
    console.error(
      "  beta    - V4 beta increment (4.0.0-beta.1 -> 4.0.0-beta.2)"
    );
    console.error("  alpha   - V4 alpha increment");
    console.error("  X.Y.Z   - Explicit version");
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));
  const currentVersion = pkg.version;

  console.log("\nPrepare Release\n");
  console.log(`  Current version: ${currentVersion}`);
  console.log(`  Type: ${type}`);
  console.log("");

  try {
    // Step 1: Verify registry
    verifyRegistry();

    // Step 2: Install and verify clean tree
    installAndVerify();

    // Step 3: Run npm version (creates commit with package.json + package-lock.json)
    runNpmVersion(type);

    // Step 4: Update changelog with actual version from package.json
    const changelogUpdated = updateChangelog();

    // Step 5: If changelog was updated, amend the commit to include it
    if (changelogUpdated) {
      commitChangelog();
    }

    // Success - read final version for display
    const finalVersion = readVersionFromPackage();
    console.log("=".repeat(50));
    console.log("Release prepared successfully!");
    console.log(`  Version: ${currentVersion} → ${finalVersion}\n`);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
};

main();
