#!/usr/bin/env node
/* eslint-disable no-console */

const { execSync } = require("child_process");
const fs = require("fs");

const DIVIDER = "-------------------------------------------------";
const DEPENDENCY_KEYS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
// when pushing a branch that does not yet exist on the remote, remote_sha is all 0
const NULL_SHA = "0000000000000000000000000000000000000000";

// executes a shell command and returns trimmed stdout, or "" on any error
function exec(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

// check resolved URL in package-lock.json point to the public npm
// to make sure we don't accidentally point to internal repo
function checkRegistrySources() {
  let lockContent;

  try {
    lockContent = fs.readFileSync("package-lock.json", "utf8");
  } catch {
    console.error(DIVIDER);
    console.error(
      "Could not read package-lock.json. Do you need to re-generate it?"
    );
    console.error(DIVIDER);
    process.exit(1);
  }

  const badLines = lockContent
    .split("\n")
    .filter(function (line) {
      return /"resolved":/.test(line);
    })
    .filter(function (line) {
      return !/"resolved": "(https:\/\/registry\.npmjs\.org|git)/.test(line);
    });

  if (badLines.length > 0) {
    console.error(DIVIDER);
    console.error(
      "🥴 Found dependencies not from the public NPM registry or git"
    );
    console.error(DIVIDER);
    badLines.forEach(function (line) {
      console.error(line.trim());
    });
    process.exit(1);
  }
}

// generate a stable string fingerprint of all four dependency sections in package.json
// so we can check if the dependencies changed via string comparison
function getDepsFingerprint(ref) {
  try {
    const pkg = JSON.parse(
      execSync("git show " + ref + ":package.json", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })
    );

    return DEPENDENCY_KEYS.map(function (k) {
      return JSON.stringify(pkg[k] || {});
    }).join("");
  } catch {
    return "";
  }
}

// if remote branch doesn't exist, we have to compare against the closest release branch
// so iterate through commits and find the closest divergence
function findBaseCommit(localSha) {
  const refs = exec(
    'git for-each-ref --format="%(refname:short)" "refs/remotes/origin/main" "refs/remotes/origin/v*.x"'
  )
    .split("\n")
    .filter(Boolean);

  let base = "";
  let bestCount = Infinity;

  refs.forEach(function (ref) {
    const candidate = exec("git merge-base " + localSha + " " + ref);

    if (!candidate) return;

    const count = parseInt(
      exec("git rev-list --count " + candidate + ".." + localSha),
      10
    );

    if (!isNaN(count) && count < bestCount) {
      base = candidate;
      bestCount = count;
    }
  });

  return base || exec("git rev-list --max-parents=0 " + localSha);
}

// checks if any dependencies changed between base and tip, and if so,
// check package-lock.json was also updated in the same range of commits.
function checkDependencySync(localSha, remoteSha) {
  // for an existing remote branch, remote_sha is where new commits start,
  // so diff from there to local tip covers only the commits being pushed
  const base = remoteSha === NULL_SHA ? findBaseCommit(localSha) : remoteSha;

  if (!base) return true;

  if (getDepsFingerprint(base) === getDepsFingerprint(localSha)) return true;

  const changedFiles = exec("git diff --name-only " + base + ".." + localSha);
  const lockChanged = changedFiles.split("\n").some(function (f) {
    return f.trim() === "package-lock.json";
  });

  if (!lockChanged) {
    console.error(DIVIDER);
    console.error(
      "🥴 Dependencies in package.json changed without updating package-lock.json"
    );
    console.error("Run 'npm install' and commit the result.");
    console.error(DIVIDER);

    return false;
  }

  return true;
}

function main() {
  checkRegistrySources();

  // git writes push refs to the hook's stdin and closes it; if stdin is a TTY
  // (manual invocation), skip reading to avoid blocking indefinitely
  // Each line has the format: <local-ref> <local-sha> <remote-ref> <remote-sha>
  const stdinContent = process.stdin.isTTY ? "" : fs.readFileSync(0, "utf8");
  const lines = stdinContent.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const localSha = parts[1];
    const remoteSha = parts[3];

    if (!localSha || !remoteSha) continue;

    if (!checkDependencySync(localSha, remoteSha)) {
      process.exit(1);
    }
  }

  process.exit(0);
}

main();
