// @ts-check
// Called by actions/github-script; github, context, and core are passed in as parameters.

"use strict";

const fs = require("fs");
const path = require("path");

const marker = "<!-- integration-coverage-comment -->";

/**
 * @param {{ github: import('@actions/github').getOctokit, context: object, core: object }} params
 */
module.exports = async ({ github, context, core }) => {
  // context.payload.pull_request is forwarded through workflow_call when the caller is a
  // pull_request trigger and gives the correct PR number directly. Fall back to a SHA
  // lookup for workflow_dispatch and other non-PR triggers (context.sha is the merge
  // commit in pull_request runs so the API lookup is unreliable as a primary strategy).
  let prNumber = context.payload.pull_request?.number;

  if (!prNumber) {
    const { data: prs } =
      await github.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
      });

    prNumber = prs[0]?.number;
  }

  if (!prNumber) {
    core.warning("No PR found for this run — skipping coverage comment.");
    return;
  }

  let coverageText = "";

  const totalsPath = path.join(
    "coverage",
    "integration",
    "coverage-totals.txt"
  );

  if (fs.existsSync(totalsPath)) {
    const output = fs.readFileSync(totalsPath, "utf8");
    const rows = [];

    for (const line of output.split("\n")) {
      const match = line.match(
        /^(Statements|Branches|Functions|Lines)\s*:\s*([\d.]+%)\s*\(\s*(\d+)\/(\d+)\s*\)/
      );

      if (match) {
        rows.push({
          metric: match[1],
          percent: match[2],
          covered: match[3],
          total: match[4],
        });
      }
    }

    if (rows.length > 0) {
      coverageText = [
        "| Metric | Coverage | Covered | Total |",
        "|--------|----------|---------|-------|",
        ...rows.map(
          (r) => `| ${r.metric} | ${r.percent} | ${r.covered} | ${r.total} |`
        ),
      ].join("\n");
    } else {
      coverageText = "_Could not parse coverage-totals.txt._";
    }
  } else {
    coverageText =
      ":x: Coverage job did not complete successfully — no report available.";
  }

  const body = [
    marker,
    "## Integration Coverage (Chromium)",
    "",
    "_Coverage is collected by running the full Playwright suite on Chromium with V8 instrumentation. It reflects how much of `src/` is exercised by the integration tests._",
    "",
    coverageText,
    "",
    `*Generated from [workflow run](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})*`,
  ].join("\n");

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  const existing = comments.find((c) => c.body && c.body.includes(marker));

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body,
    });
  }
};
