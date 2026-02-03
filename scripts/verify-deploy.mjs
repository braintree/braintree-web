#!/usr/bin/env node

/**
 * Post-deploy verification script
 *
 * Usage:
 *   npm run verify-deploy           # Uses version from package.json
 *   npm run verify-deploy 3.134.0   # Explicit version
 */

import https from "node:https";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CDN_BASE = "https://js.braintreegateway.com/web";
const REGISTRY = "https://registry.npmjs.org";

/**
 * Check if a URL returns 200
 */
const checkUrl = (url) => {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        resolve({
          url,
          status: res.statusCode,
          ok: res.statusCode === 200,
        });
      })
      .on("error", (err) => {
        resolve({
          url,
          status: "ERROR",
          ok: false,
          error: err.message,
        });
      });
  });
};

/**
 * Check npm package version
 */
const checkNpm = (version) => {
  try {
    const result = execSync(
      `npm view braintree-web@${version} version --registry=${REGISTRY}`,
      { encoding: "utf8" }
    ).trim();

    return {
      check: `npm braintree-web@${version}`,
      expected: version,
      actual: result,
      ok: result === version,
    };
  } catch {
    return {
      check: `npm braintree-web@${version}`,
      expected: version,
      actual: "NOT FOUND",
      ok: false,
    };
  }
};

/**
 * Check npm dist-tags
 */
const checkDistTags = (version) => {
  try {
    const result = execSync(
      `npm view braintree-web dist-tags --json --registry=${REGISTRY}`,
      { encoding: "utf8" }
    );
    const tags = JSON.parse(result);

    // Determine expected tag
    let expectedTag = "latest";

    if (version.includes("-beta")) {
      expectedTag = "beta";
    } else if (version.includes("-alpha")) {
      expectedTag = "alpha";
    } else if (version.includes("-rc")) {
      expectedTag = "rc";
    }

    const actualVersion = tags[expectedTag];

    return {
      check: `npm dist-tag '${expectedTag}'`,
      expected: version,
      actual: actualVersion || "NOT SET",
      ok: actualVersion === version,
      allTags: tags,
    };
  } catch {
    return {
      check: "npm dist-tags",
      expected: "readable",
      actual: "ERROR",
      ok: false,
    };
  }
};

/**
 * Main execution
 */
const main = async () => {
  let version = process.argv[2];

  if (!version) {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8")
    );

    version = pkg.version;
  }

  console.log("\nVerify Deploy\n");
  console.log(`  Version: ${version}`);
  console.log("");

  const results = [];
  let allPassed = true;

  // CDN checks
  console.log("Checking CDN assets...");
  const cdnFiles = [
    "client.min.js",
    "client.js",
    "hosted-fields.min.js",
    "paypal-checkout.min.js",
  ];

  for (const file of cdnFiles) {
    const url = `${CDN_BASE}/${version}/js/${file}`;
    const result = await checkUrl(url);

    results.push({
      check: `CDN ${file}`,
      ok: result.ok,
      detail: result.ok ? "200 OK" : `${result.status}`,
    });

    if (!result.ok) allPassed = false;
  }

  // npm checks
  console.log("Checking npm...");
  const npmResult = checkNpm(version);

  results.push({
    check: npmResult.check,
    ok: npmResult.ok,
    detail: npmResult.ok
      ? npmResult.actual
      : `Expected ${npmResult.expected}, got ${npmResult.actual}`,
  });

  if (!npmResult.ok) allPassed = false;

  // dist-tags check
  const tagResult = checkDistTags(version);

  results.push({
    check: tagResult.check,
    ok: tagResult.ok,
    detail: tagResult.ok
      ? tagResult.actual
      : `Expected ${tagResult.expected}, got ${tagResult.actual}`,
  });

  if (!tagResult.ok) allPassed = false;

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("Results:\n");

  for (const r of results) {
    const icon = r.ok ? "[OK]" : "[FAIL]";

    console.log(`  ${icon} ${r.check}`);

    if (!r.ok) {
      console.log(`       ${r.detail}`);
    }
  }

  console.log("\n" + "=".repeat(60));

  if (allPassed) {
    console.log("All checks passed!\n");

    // Show dist-tags for reference
    if (tagResult.allTags) {
      console.log("Current npm dist-tags:");

      for (const [tag, ver] of Object.entries(tagResult.allTags)) {
        console.log(`  ${tag}: ${ver}`);
      }

      console.log("");
    }

    process.exit(0);
  } else {
    console.log(`Some checks failed!
Troubleshooting:
  - CDN: Wait a few minutes for propagation, then retry
  - npm: Verify publish completed successfully
  - Tags: Check if you used the correct --tag flag
`);
    process.exit(1);
  }
};

main().catch(console.error);
