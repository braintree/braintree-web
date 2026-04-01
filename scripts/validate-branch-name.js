#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Branch name validation script
 * Enforces lowercase kebab-case branch naming convention
 * with optional Jira ticket prefix and period-number suffix for beta branches
 *
 * Valid examples:
 *   - feature-name
 *   - fix-bug
 *   - update-dependencies
 *   - beta.1
 *   - release-candidate.2
 *   - DTBTWEB-123-fix-payment-bug
 *   - PAYPL-1234-add-new-feature
 *   - ABC-99-hotfix.1
 *   - v3.x
 *   - backport/fix-bug
 *   - backport/DTBTWEB-123-fix-bug
 *
 * Invalid examples:
 *   - FeatureName (contains uppercase without Jira prefix)
 *   - feature_name (uses underscores)
 *   - feature name (contains spaces)
 *   - feature.name (period without number at end)
 *   - dtbtweb-123-feature (lowercase Jira prefix)
 *   - DTBTWEB123-feature (missing hyphen in Jira ticket)
 */

const BRANCH_NAME_PATTERN = /^([A-Z]+-\d+\-)?[a-z0-9\-]*(\.\d+)?$$/;
const EXEMPT_BRANCHES = ["main"];

function validateBranchName(branchName) {
  const cleanBranchName = branchName.replace("refs/heads/", "");

  if (EXEMPT_BRANCHES.includes(cleanBranchName)) {
    return { valid: true, branch: cleanBranchName };
  }

  if (/^v\d+\.x$/.test(cleanBranchName)) {
    return { valid: true, branch: cleanBranchName };
  }

  if (/^backport\/([A-Z]+-\d+-)?[a-z0-9-]*(\.\d+)?$/.test(cleanBranchName)) {
    return { valid: true, branch: cleanBranchName };
  }

  const isValid = BRANCH_NAME_PATTERN.test(cleanBranchName);

  return {
    valid: isValid,
    branch: cleanBranchName,
    pattern: BRANCH_NAME_PATTERN.toString(),
  };
}

function getErrorMessage(branchName) {
  const errors = [];

  const jiraPrefixMatch = branchName.match(/^([A-Z]+-\d+\-)?(.*)$/);
  const hasJiraPrefix = jiraPrefixMatch && jiraPrefixMatch[1];
  const mainPart = jiraPrefixMatch ? jiraPrefixMatch[2] : branchName;

  const hasMalformedJiraPrefix =
    branchName.match(/^[A-Z]+\d/) || branchName.match(/^[A-Z]+-[^0-9]/);

  if (hasMalformedJiraPrefix) {
    errors.push(
      "Jira prefix must be in format LETTERS-NUMBERS- (e.g., DTBTWEB-811-)"
    );
  } else if (!hasJiraPrefix && /[A-Z]/.test(branchName)) {
    errors.push(
      "contains uppercase letters (use Jira prefix format or all lowercase)"
    );
  }

  if (/[^a-z0-9\.\-]/.test(mainPart) && !/[A-Z]/.test(mainPart)) {
    errors.push(
      "branch name contains invalid characters (only lowercase letters, numbers, hyphens, and periods allowed)"
    );
  }

  if (!/\.\d+$/.test(mainPart) && /\./.test(mainPart)) {
    errors.push(
      "periods are only allowed when followed by a number at the end (e.g., beta.1)"
    );
  }

  if (mainPart && !/^[a-z]/.test(mainPart)) {
    errors.push(
      "branch name after Jira prefix must start with a lowercase letter"
    );
  }

  return errors.length > 0
    ? `Branch name issues: ${errors.join(", ")}`
    : "Branch name does not match the required pattern";
}

if (require.main === module) {
  const branchName = process.argv[2];

  if (!branchName) {
    console.error("Usage: node validate-branch-name.js <branch-name>");

    process.exit(1);
  }

  const result = validateBranchName(branchName);

  if (!result.valid) {
    console.error(`❌ Invalid branch name: "${result.branch}"`);
    console.error(`   ${getErrorMessage(result.branch)}`);
    console.error("");
    console.error("✅ Valid branch name examples:");
    console.error("   - feature-name");
    console.error("   - fix-payment-bug");
    console.error("   - DTBTWEB-123-fix-payment-bug");
    console.error("   - PAYPL-1234-add-new-feature");
    console.error("   - beta.1");
    console.error("   - ABC-99-hotfix.2");
    console.error("   - v3.x");
    console.error("   - v10.x");
    console.error("   - backport/fix-bug");
    console.error("   - backport/DTBTWEB-123-fix-bug");
    console.error("");
    console.error(
      "📏 Pattern: [JIRA-123-]kebab-case[.version] or vN.x or backport/..."
    );
    console.error("   Optional Jira prefix: LETTERS-NUMBERS-");
    console.error("   Main part: lowercase letters, numbers, and hyphens");
    console.error("   Optional version suffix: .NUMBER");
    console.error("   Major version branches: v3.x, v4.x, etc.");

    process.exit(1);
  }

  console.log(`✅ Valid branch name: "${result.branch}"`);

  process.exit(0);
}

module.exports = {
  validateBranchName,
  getErrorMessage,
  BRANCH_NAME_PATTERN,
  EXEMPT_BRANCHES,
};
