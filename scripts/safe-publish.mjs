#!/usr/bin/env node

/**
 * Safe npm publish script
 *
 * Determines the correct npm tag based on version string and
 * requires confirmation before publishing.
 *
 * Usage:
 *   npm run safe-publish
 *   npm run safe-publish -- --dry-run
 *   npm run safe-publish -- --yes (skip confirmation)
 */

import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Configuration
const REGISTRY = "https://registry.npmjs.org";
const NPM_DIR = join(__dirname, "..", "dist", "npm");

// CONFIGURATION: Update this when a new major version becomes Next
// Current: V4 is Next, so block V4+ from publishing as 'latest'
// After V4 GA: Change to 5 (V5 becomes Next)
const NEXT_MAJOR_VERSION = 4;

/**
 * Determines the npm tag based on version string
 *
 * Examples:
 *   "3.134.1" -> "latest"
 *   "4.0.0-beta.1" -> "beta"
 *   "4.1.0-alpha.2" -> "alpha"
 *   "4.0.0-rc.1" -> "rc"
 *   "3.134.0-beta-fastlane.1" -> "beta-fastlane" (custom tag)
 *   "3.134.0-rc-pwc.1" -> "rc-pwc" (custom tag)
 */
const determineTag = (version) => {
  // Production version (no prerelease identifier)
  if (!version.includes("-")) {
    return "latest";
  }

  const prerelease = version.split("-")[1];

  // Standard prerelease channels
  if (prerelease.startsWith("alpha.")) return "alpha";
  if (prerelease.startsWith("beta.")) return "beta";
  if (prerelease.startsWith("rc.")) return "rc";

  // Custom prerelease (e.g., beta-fastlane.1 -> beta-fastlane)
  const customTag = prerelease.split(".")[0];

  return customTag;
};

/**
 * Validates the publish operation is safe
 *
 * IMPORTANT: Update NEXT_MAJOR_VERSION when version roles change.
 * See VERSION-MATRIX.md for current role-to-version assignments.
 */
const validatePublish = (version, tag) => {
  const errors = [];
  const warnings = [];

  // Error: Next version without prerelease trying to publish as latest
  const majorVersion = parseInt(version.split(".")[0], 10);

  if (majorVersion >= NEXT_MAJOR_VERSION && tag === "latest") {
    errors.push(
      `BLOCKED: Version ${version} is Next (V${NEXT_MAJOR_VERSION}+) but would publish as 'latest'.\n` +
        `Next must use a prerelease version (e.g., ${NEXT_MAJOR_VERSION}.0.0-beta.1) until GA.\n` +
        `If V${NEXT_MAJOR_VERSION} is now GA, update NEXT_MAJOR_VERSION in this script.`
    );
  }

  // Warning: Publishing to latest
  if (tag === "latest") {
    warnings.push(
      "Publishing to 'latest' tag. This will be the default for 'npm install braintree-web'."
    );
  }

  // Warning: Non-standard tag
  const standardTags = ["latest", "beta", "alpha", "rc", "legacy"];

  if (!standardTags.includes(tag)) {
    warnings.push(
      `Using non-standard tag '${tag}'. Merchants will need to specify this tag explicitly.`
    );
  }

  return { errors, warnings };
};

/**
 * Prompts for user confirmation
 */
const confirm = (message) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
};

/**
 * Execute the publish command
 */
const executePublish = (publishCmd, version) => {
  console.log("\nPublishing...\n");
  try {
    execSync(publishCmd, { cwd: NPM_DIR, stdio: "inherit" });
    console.log("\nPublished successfully!");

    // Show verification command
    console.log("\nVerify with:");
    console.log(
      `  npm view braintree-web@${version} version --registry=${REGISTRY}`
    );
    console.log(`  npm view braintree-web dist-tags --registry=${REGISTRY}`);
  } catch (e) {
    console.error("\nPublish failed");
    console.error(e);
    process.exit(1);
  }
};

/**
 * Main execution
 */
const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipConfirm = args.includes("--yes") || args.includes("-y");

  // Read version from package.json in dist/npm
  let pkg;

  try {
    pkg = require(join(NPM_DIR, "package.json"));
  } catch (e) {
    console.error("Error: Could not read dist/npm/package.json");
    console.error('Run "npm run build" first to build the npm package.');
    console.error(e);
    process.exit(1);
  }

  const { version } = pkg;
  const tag = determineTag(version);

  console.log("\nSafe Publish\n");
  console.log(`  Version:  ${version}`);
  console.log(`  Tag:      ${tag}`);
  console.log(`  Registry: ${REGISTRY}`);
  console.log("");

  // Validate
  const { errors, warnings } = validatePublish(version, tag);

  // Show warnings
  for (const warning of warnings) {
    console.log(`  Warning: ${warning}\n`);
  }

  // Block on errors
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}\n`);
    }
    process.exit(1);
  }

  // Build command
  const publishCmd =
    tag === "latest"
      ? `npm publish --registry=${REGISTRY}`
      : `npm publish --tag ${tag} --registry=${REGISTRY}`;

  console.log(`  Command: ${publishCmd}`);
  console.log("");

  // Dry run mode
  if (dryRun) {
    console.log("Dry run mode - no changes made");
    process.exit(0);
  }

  // Confirm
  if (!skipConfirm) {
    const confirmed = await confirm("Proceed with publish?");

    if (!confirmed) {
      console.log("Cancelled.");
      process.exit(0);
    }
  }

  executePublish(publishCmd, version);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
