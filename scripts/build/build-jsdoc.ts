import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ROOT, VERSION } from "./vite/configs/shared.ts";

const DIST = path.resolve(ROOT, "dist/jsdoc");

rmSync(DIST, { recursive: true, force: true });

// Home.md's title has a literal @VERSION the version-interpolator plugin won't
// touch (it only rewrites {@pkg version} in src).
const home = readFileSync(path.resolve(ROOT, "jsdoc/Home.md"), "utf-8");
const readmeDir = mkdtempSync(path.join(tmpdir(), "bt-jsdoc-"));

try {
  const readme = path.join(readmeDir, "Home.md");
  writeFileSync(readme, home.replaceAll("@VERSION", VERSION));
  execFileSync(
    path.resolve(ROOT, "node_modules/.bin/jsdoc"),
    [
      "-c",
      "jsdoc/conf.json",
      "-d",
      `dist/jsdoc/${VERSION}`,
      "-r",
      "-t",
      "node_modules/@braintree/jsdoc-template",
      "-R",
      readme,
      "src",
    ],
    { cwd: ROOT, stdio: "inherit" }
  );
} finally {
  rmSync(readmeDir, { recursive: true, force: true });
}

// Bare version = a relative link to the versioned dir.
symlinkSync(VERSION, path.resolve(DIST, "current"), "dir");

for (const file of ["index.html", ".nojekyll"]) {
  copyFileSync(path.resolve(ROOT, "jsdoc", file), path.resolve(DIST, file));
}
