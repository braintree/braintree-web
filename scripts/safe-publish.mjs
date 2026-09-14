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

import { execSync, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const REGISTRY = "https://registry.npmjs.org";
const ROOT_DIR = join(__dirname, "..");
const PKG_PATH = join(ROOT_DIR, "package.json");
const DIST_ENTRY = join(ROOT_DIR, "dist", "npm", "index.js");

// CONFIGURATION: Update this when a new major version becomes Next
// Current: V4 is Next, so block V4+ from publishing as 'latest'
// After V4 GA: Change to 5 (V5 becomes Next)
const NEXT_MAJOR_VERSION = 4;

/**
 * Determines the npm dist-tag for a version, or null when there is no automatic
 * tag for it.
 *
 * Only two tags are ever auto-derived:
 *   - stable releases (no prerelease)          -> "latest"
 *   - Next major (V{NEXT}+) standard prereleases -> "next"
 *
 * Everything else is intentionally left untagged (returns null): v3 prereleases
 * and V4+ named/custom prereleases (e.g. 4.0.0-beta-fastlane.1). Those publish
 * only when an explicit --tag is passed; otherwise they are skipped so they
 * neither move `latest` nor create a channel anyone follows.
 *
 * Examples:
 *   "3.134.1"               -> "latest"
 *   "4.0.0-alpha.0"         -> "next"
 *   "4.0.0-beta.1"          -> "next"
 *   "4.0.0-rc.1"            -> "next"
 *   "4.0.0-beta-fastlane.1" -> null   (V4 named prerelease; needs explicit --tag)
 *   "3.134.0-beta.1"        -> null   (v3 prerelease; needs explicit --tag)
 */
const determineTag = (version) => {
  if (!version.includes("-")) {
    return "latest";
  }

  const major = parseInt(version.split(".")[0], 10);
  const prerelease = version.slice(version.indexOf("-") + 1);
  const isStandardChannel =
    prerelease.startsWith("alpha.") ||
    prerelease.startsWith("beta.") ||
    prerelease.startsWith("rc.");

  if (major >= NEXT_MAJOR_VERSION && isStandardChannel) {
    return "next";
  }

  return null;
};

/**
 * Validates the publish operation is safe
 *
 * IMPORTANT: Update NEXT_MAJOR_VERSION when version roles change.
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
  const standardTags = ["latest", "next", "beta", "alpha", "rc", "legacy"];

  if (!standardTags.includes(tag)) {
    warnings.push(
      `Using non-standard tag '${tag}'. Merchants will need to specify this tag explicitly.`
    );
  }

  return { errors, warnings };
};

/**
 * Refuses to demote the `latest` dist-tag to a lower major.
 *
 * Only relevant when publishing to `latest` (e.g. a v3 patch after v4 GA).
 * Queries the registry for the current `latest` and blocks if it points at a
 * higher major than the version being published. Read-only; safe under --dry-run.
 *
 * Returns an array of error strings (empty when the publish is allowed).
 */
const checkLatestDemotion = (version, tag, packageName) => {
  const errors = [];

  if (tag !== "latest") {
    return errors;
  }

  const major = parseInt(version.split(".")[0], 10);

  let existingLatest = "";

  try {
    existingLatest = execFileSync(
      "npm",
      ["view", packageName, "dist-tags.latest", "--registry", REGISTRY],
      { encoding: "utf8" }
    ).trim();
  } catch {
    // Package or `latest` tag may not exist yet (first publish) — nothing to demote.
    existingLatest = "";
  }

  if (!existingLatest) {
    console.log(
      `  Note: no existing 'latest' on npm for ${packageName} — skipping demotion guard\n`
    );

    return errors;
  }

  const existingMajor = parseInt(existingLatest.split(".")[0], 10);

  if (existingMajor > major) {
    errors.push(
      `BLOCKED: npm 'latest' for ${packageName} is ${existingLatest} (major ${existingMajor}); ` +
        `this build is ${version} (major ${major}).\n` +
        `Publishing as 'latest' would demote latest from major ${existingMajor} to major ${major}.\n` +
        `For older-major patches, pass an explicit --tag (e.g. v3-latest) so the tag is not 'latest'.`
    );

    return errors;
  }

  console.log(
    `  Latest demotion guard OK: existing ${existingLatest} (major ${existingMajor}) <= build ${version} (major ${major})\n`
  );

  return errors;
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

const PACKAGE_JSON_KEY_ALLOWLIST = [
  "author",
  "dependencies",
  "description",
  "engines",
  "exports",
  "files",
  "homepage",
  "keywords",
  "license",
  "main",
  "name",
  "repository",
  "version",
];

const withPrunedManifest = (publish) => {
  const original = readFileSync(PKG_PATH, "utf8");
  const pkg = JSON.parse(original);

  const published = {};

  for (const field of PACKAGE_JSON_KEY_ALLOWLIST) {
    if (field in pkg) {
      published[field] = pkg[field];
    }
  }

  // This logic was added since this script runs through `npm run...`,
  // which wraps the script in an NPM process. So, if we get a `SIGINT`/`SIGTERM`,
  // we will need to catch it and restore our original `package.json`.
  const restoreOnSignal = (signal) => {
    writeFileSync(PKG_PATH, original);
    process.kill(process.pid, signal);
  };
  const onSigint = () => restoreOnSignal("SIGINT");
  const onSigterm = () => restoreOnSignal("SIGTERM");

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  writeFileSync(PKG_PATH, `${JSON.stringify(published, null, 2)}\n`);

  try {
    publish();
  } finally {
    writeFileSync(PKG_PATH, original);
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }
};

/**
 * Execute the publish command
 */
const executePublish = (publishCmd, version) => {
  console.log("\nPublishing...\n");
  try {
    withPrunedManifest(() => {
      execSync(publishCmd, { cwd: ROOT_DIR, stdio: "inherit" });
    });
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
  const printTag = args.includes("--print-tag");
  const skipConfirm = args.includes("--yes") || args.includes("-y");
  const provenance =
    args.includes("--provenance") || process.env.GITHUB_ACTIONS === "true";
  const tagIndex = args.indexOf("--tag");
  let tagOverride = null;

  if (tagIndex >= 0) {
    const value = args[tagIndex + 1];

    if (!value || value.startsWith("-")) {
      console.error("Error: --tag requires a value (e.g. --tag beta).");
      process.exit(1);
    }

    tagOverride = value;
  }

  // Read version from the root package.json (the published manifest).
  let pkg;

  try {
    pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
  } catch (e) {
    console.error("Error: Could not read package.json");
    console.error(e);
    process.exit(1);
  }

  const { version } = pkg;
  const tag = tagOverride || determineTag(version);

  // Classification-only mode: print the resolved dist-tag (empty when there is
  // no automatic tag and no --tag override) and exit. Used by CI to decide
  // whether to publish. No build or registry access required.
  if (printTag) {
    process.stdout.write(`${tag ?? ""}\n`);
    process.exit(0);
  }

  if (!tag) {
    console.log(
      `No automatic npm dist-tag for ${version} — skipping npm publish. ` +
        `Only stable (latest) and V4+ standard prereleases (next) publish ` +
        `automatically; run this script directly with --tag <name> to publish manually.`
    );
    process.exit(0);
  }

  // Preflight: the published `files` allowlist silently ignores missing paths,
  // so a missing dist/npm would ship an empty package. Fail fast instead.
  if (!existsSync(DIST_ENTRY)) {
    console.error(
      "Error: dist/npm/index.js is missing. Run `npm run build:npm` before publishing."
    );
    process.exit(1);
  }

  // The tag is interpolated into the npm publish shell command, so restrict it
  // to a safe dist-tag charset and reject anything else.
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(tag)) {
    console.error(`Error: invalid npm dist-tag '${tag}'.`);
    process.exit(1);
  }

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

  const demotionErrors = checkLatestDemotion(version, tag, pkg.name);

  errors.push(...demotionErrors);

  // Block on errors
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}\n`);
    }
    process.exit(1);
  }

  // `--dry-run` still packs the tarball, so it exercises the prune path too.
  const publishCmd = [
    "npm publish",
    `--registry=${REGISTRY}`,
    `--tag ${tag}`,
    provenance ? "--provenance" : "",
    dryRun ? "--dry-run" : "",
  ]
    .filter(Boolean)
    .join(" ");

  console.log(`  Command: ${publishCmd}`);
  console.log("");

  // Confirm (skipped for dry-run and --yes)
  if (!dryRun && !skipConfirm) {
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
