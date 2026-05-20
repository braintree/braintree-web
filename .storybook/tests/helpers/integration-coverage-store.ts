import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCoverageMap,
  type CoverageMap,
  type CoverageMapData,
} from "istanbul-lib-coverage";
/* eslint-disable @typescript-eslint/no-require-imports -- v8-to-istanbul is CommonJS */
const v8toIstanbul = require("v8-to-istanbul");
/* eslint-enable @typescript-eslint/no-require-imports */

/** Playwright runs tests in worker processes; global teardown runs in the parent. Persist per-worker state here so teardown can merge. */
const SHARD_SUBDIR = ".playwright-v8-shards";

/**
 * Frame HTML under /local-build/html/ inlines a Browserify bundle; map non-minified
 * HTML basename to the matching internal JS kept on disk when BRAINTREE_JS_COVERAGE_BUILD=true.
 */
const HTML_FRAME_BASENAME_TO_INTERNAL_JS: Record<string, string> = {
  "hosted-fields-frame.html": "hosted-fields-internal.js",
  "payment-request-frame.html": "payment-request-internal.js",
  "venmo-desktop-frame.html": "venmo-desktop-frame-internal.js",
  "dispatch-frame.html": "frame-service-dispatch-frame.js",
  "cancel-frame.html": "frame-service-cancel-frame.js",
  "redirect-frame.html": "frame-service-redirect-frame.js",
  "local-payment-redirect-frame.html": "local-payment-redirect-frame.js",
};

let coverageMap: CoverageMap = createCoverageMap({});

let warnedMinHtmlFrame = false;

/** Tracks files skipped in mergeV8IntoMap due to v8-to-istanbul errors; reset per mergePlaywrightV8Coverage call. */
let mergeV8SkipCount = 0;

/** Once per process: `storybook-static/local-build/js` missing; merge falls back to `dist/`. */
let warnedMergeJsDirFallback = false;

/** When `INTEGRATION_COVERAGE_ZERO_FILL=false`, skip Babel prefill (sparse HTML like pre-zero-fill). Default: enabled. */
function isIntegrationCoverageZeroFillEnabled(): boolean {
  return process.env.INTEGRATION_COVERAGE_ZERO_FILL !== "false";
}

function getShardDir(): string {
  return path.resolve(process.cwd(), "coverage/integration", SHARD_SUBDIR);
}

/**
 * Remove prior run shards (dispatcher process). Safe to call from globalSetup only.
 */
export function clearCoverageShards(): void {
  const shardDir = getShardDir();

  fs.rmSync(shardDir, { recursive: true, force: true });
  warnedMergeJsDirFallback = false;
}

/**
 * Directory for `*-internal.js` and `/local-build/js/` merges: same tree the
 * Playwright test server serves from `storybook-static/` (see test-server), else
 * `dist/hosted/web/<version>/js`.
 */
function getMergeJsDir(cwd: string): string {
  const servedJs = path.join(cwd, "storybook-static", "local-build", "js");

  if (fs.existsSync(servedJs)) {
    try {
      return fs.realpathSync(servedJs);
    } catch {
      return path.normalize(path.resolve(servedJs));
    }
  }

  if (!warnedMergeJsDirFallback) {
    warnedMergeJsDirFallback = true;
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] storybook-static/local-build/js not found; merge uses dist/hosted/web/<version>/js. Run storybook:build after storybook:copy-local-build so served bundles match merge paths."
    );
    /* eslint-enable no-console */
  }

  const pkgPath = path.join(cwd, "package.json");

  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      `[integration-coverage] package.json not found at ${pkgPath}`
    );
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<
    string,
    unknown
  >;

  if (!pkg.version || typeof pkg.version !== "string") {
    throw new Error(
      "[integration-coverage] package.json missing 'version' field"
    );
  }

  return path.resolve(cwd, "dist", "hosted", "web", pkg.version, "js");
}

function persistCoverageShard(): void {
  const dir = getShardDir();

  fs.mkdirSync(dir, { recursive: true });
  const shardPath = path.join(dir, `${process.pid}.json`);

  fs.writeFileSync(shardPath, JSON.stringify(coverageMap.toJSON()), "utf8");
}

type V8CoverageEntry = {
  url: string;
  source?: string;
  functions?: unknown[];
};

/**
 * CDP/V8 usually reports LF; dist files may be CRLF on disk — normalize for merge compare only.
 */
function normalizeLineEndingsForCoverageCompare(source: string): string {
  return source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * HTML-embedded scripts often have leading newline/indent before the Browserify prelude.
 */
function stripLeadingWhitespaceForCoverageCompare(source: string): string {
  return source.replace(/^[\t \n\u00a0\uFEFF]+/, "");
}

/**
 * Trailing whitespace / final newlines often differ between CDP getScriptSource and on-disk files.
 */
function stripTrailingWhitespaceForCoverageCompare(source: string): string {
  return source.replace(/[\t \n\u00a0\uFEFF]+$/, "");
}

function normalizeHtmlInlineScriptForMergeCompare(source: string): string {
  const withLf = normalizeLineEndingsForCoverageCompare(source);
  const trimmed = stripLeadingWhitespaceForCoverageCompare(withLf);

  return stripTrailingWhitespaceForCoverageCompare(trimmed);
}

const HTML_INLINE_NORM_MAX_TAIL_DELTA = 128;

/**
 * True if normalized CDP script text matches normalized disk text, allowing a small
 * tail delta on either side (trailing-only drift after trim + LF normalize).
 */
function htmlInlineNormalizedSourcesMatch(
  normEntry: string,
  normDisk: string
): boolean {
  if (normEntry === normDisk) {
    return true;
  }

  if (normEntry.length > normDisk.length) {
    const d = normEntry.length - normDisk.length;

    return (
      d <= HTML_INLINE_NORM_MAX_TAIL_DELTA && normEntry.startsWith(normDisk)
    );
  }

  if (normDisk.length > normEntry.length) {
    const d = normDisk.length - normEntry.length;

    return (
      d <= HTML_INLINE_NORM_MAX_TAIL_DELTA && normDisk.startsWith(normEntry)
    );
  }

  return false;
}

/**
 * Frame HTML has multiple inline scripts with the same URL; only the main bundle is
 * ~disk size. Skip tiny second <script> blocks (e.g. braintree.hostedFields.create()).
 */
function isSecondaryFrameInlineScript(
  entrySourceLen: number,
  diskSourceLen: number
): boolean {
  if (diskSourceLen === 0) {
    return true;
  }

  if (diskSourceLen <= 400) {
    return entrySourceLen < diskSourceLen - 5;
  }

  const minPrimaryLen = Math.max(
    1,
    Math.min(diskSourceLen - 200, Math.floor(diskSourceLen * 0.92))
  );

  return entrySourceLen < minPrimaryLen;
}

async function mergeV8IntoMap(
  absPath: string,
  entry: V8CoverageEntry,
  logLabel: string
): Promise<boolean> {
  try {
    const converter = v8toIstanbul(
      absPath,
      0,
      entry.source ? { source: entry.source } : {}
    );

    await converter.load();

    if (entry.functions && entry.functions.length > 0) {
      // V8 FunctionCoverage[] from CDP; v8-to-istanbul accepts the same shape.
      converter.applyCoverage(entry.functions as never);
    }

    const istanbulSlice = converter.toIstanbul() as CoverageMapData;

    coverageMap.merge(istanbulSlice);

    return true;
  } catch (err) {
    mergeV8SkipCount++;
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] skip:",
      logLabel,
      err instanceof Error ? err.message : err
    );
    /* eslint-enable no-console */

    return false;
  }
}

async function mergeLocalBuildJsEntry(
  entry: V8CoverageEntry,
  mergeJsDir: string
): Promise<boolean> {
  const { url } = entry;

  if (!url.includes("/local-build/js/")) {
    return false;
  }

  const match = url.match(/\/local-build\/js\/([^?#]+)/);

  if (!match) {
    return true;
  }

  const basename = match[1];
  const absPath = path.join(mergeJsDir, basename);

  if (!fs.existsSync(absPath)) {
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] dist file missing for URL script; run build + copy-local-build:",
      absPath
    );
    /* eslint-enable no-console */

    return true;
  }

  await mergeV8IntoMap(absPath, entry, basename);

  return true;
}

async function mergeLocalBuildHtmlEntry(
  entry: V8CoverageEntry,
  mergeJsDir: string
): Promise<boolean> {
  const { url } = entry;

  if (!url.includes("/local-build/html/")) {
    return false;
  }

  const htmlMatch = url.match(/\/local-build\/html\/([^?#]+)/);

  if (!htmlMatch) {
    return true;
  }

  const htmlBasename = htmlMatch[1];

  if (htmlBasename.endsWith(".min.html")) {
    if (!warnedMinHtmlFrame) {
      warnedMinHtmlFrame = true;
      /* eslint-disable no-console */
      console.warn(
        "[integration-coverage] skipping minified frame HTML URLs (offsets do not match unminified internal bundles). Use integrationCoverage=1 / client debug so stories load non-min frame HTML."
      );
      /* eslint-enable no-console */
    }

    return true;
  }

  const jsBasename = HTML_FRAME_BASENAME_TO_INTERNAL_JS[htmlBasename];

  if (!jsBasename) {
    return true;
  }

  const absPath = path.join(mergeJsDir, jsBasename);

  if (!fs.existsSync(absPath)) {
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] internal frame JS missing; run build:coverage (retains *-internal.js):",
      absPath
    );
    /* eslint-enable no-console */

    return true;
  }

  if (typeof entry.source !== "string") {
    return true;
  }

  const diskSource = fs.readFileSync(absPath, "utf8");

  if (isSecondaryFrameInlineScript(entry.source.length, diskSource.length)) {
    return true;
  }

  const normEntry = normalizeHtmlInlineScriptForMergeCompare(entry.source);
  const normDisk = normalizeHtmlInlineScriptForMergeCompare(diskSource);

  if (!htmlInlineNormalizedSourcesMatch(normEntry, normDisk)) {
    return true;
  }

  await mergeV8IntoMap(absPath, entry, jsBasename);

  return true;
}

/**
 * CDP often reports inline iframe scripts with an empty URL or the parent document URL
 * (not `/local-build/html/...`). When `entry.source` matches a known frame internal on disk,
 * merge the same way as URL-based frame HTML entries.
 */
async function mergeAnonymousFrameInlineIfKnown(
  entry: V8CoverageEntry,
  mergeJsDir: string,
  internalDiskByJsBasename: Map<string, string>
): Promise<boolean> {
  if (typeof entry.source !== "string") {
    return false;
  }

  const { url } = entry;

  if (url.includes("/local-build/js/") || url.includes("/local-build/html/")) {
    return false;
  }

  const normEntry = normalizeHtmlInlineScriptForMergeCompare(entry.source);

  for (const [htmlBasename, jsBasename] of Object.entries(
    HTML_FRAME_BASENAME_TO_INTERNAL_JS
  )) {
    if (!internalDiskByJsBasename.has(jsBasename)) {
      const absPath = path.join(mergeJsDir, jsBasename);

      if (!fs.existsSync(absPath)) {
        internalDiskByJsBasename.set(jsBasename, "");
        continue;
      }

      internalDiskByJsBasename.set(
        jsBasename,
        fs.readFileSync(absPath, "utf8")
      );
    }

    const diskSource = internalDiskByJsBasename.get(jsBasename) as string;

    if (diskSource === "") {
      continue;
    }

    if (isSecondaryFrameInlineScript(entry.source.length, diskSource.length)) {
      continue;
    }

    const normDisk = normalizeHtmlInlineScriptForMergeCompare(diskSource);

    if (!htmlInlineNormalizedSourcesMatch(normEntry, normDisk)) {
      continue;
    }

    const absPath = path.join(mergeJsDir, jsBasename);

    if (
      await mergeV8IntoMap(
        absPath,
        entry,
        `${jsBasename} (anon script url, ~${htmlBasename})`
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Merge one test's V8 JS coverage (Playwright) into the global Istanbul map.
 * Includes scripts from /local-build/js/ and inlined frame bundles loaded from
 * /local-build/html/ (see HTML_FRAME_BASENAME_TO_INTERNAL_JS).
 */
export async function mergePlaywrightV8Coverage(
  entries: V8CoverageEntry[]
): Promise<void> {
  mergeV8SkipCount = 0;

  const cwd = process.cwd();
  const mergeJsDir = getMergeJsDir(cwd);
  const frameInternalDiskByJsBasename = new Map<string, string>();

  for (const entry of entries) {
    if (await mergeLocalBuildJsEntry(entry, mergeJsDir)) {
      continue;
    }

    if (await mergeLocalBuildHtmlEntry(entry, mergeJsDir)) {
      continue;
    }

    await mergeAnonymousFrameInlineIfKnown(
      entry,
      mergeJsDir,
      frameInternalDiskByJsBasename
    );
  }

  if (mergeV8SkipCount > 0) {
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] warning:",
      mergeV8SkipCount,
      "file(s) skipped due to v8-to-istanbul errors (see warnings above)"
    );
    /* eslint-enable no-console */
  }

  persistCoverageShard();
}

/**
 * Load Istanbul maps written by Playwright worker processes and replace the in-memory map.
 * Must run in global teardown (dispatcher), not in a worker.
 */
export function loadCoverageFromShards(): void {
  const shardDir = getShardDir();

  if (!fs.existsSync(shardDir)) {
    coverageMap = createCoverageMap({});

    return;
  }

  const combined = createCoverageMap({});
  const files = fs
    .readdirSync(shardDir)
    .filter((name) => name.endsWith(".json"));

  for (const name of files) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(shardDir, name), "utf8")
      ) as CoverageMapData;

      combined.merge(createCoverageMap(raw));
    } catch (err) {
      /* eslint-disable no-console */
      console.warn(
        "[integration-coverage] skipping corrupted shard:",
        name,
        err instanceof Error ? err.message : err
      );
      /* eslint-enable no-console */
    }
  }

  coverageMap = combined;

  if (files.length === 0) {
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] no shard files under",
      shardDir,
      "(workers never wrote coverage — check PLAYWRIGHT_INTEGRATION_COVERAGE and Chromium project)"
    );
    /* eslint-enable no-console */
  }

  if (Object.keys(coverageMap.toJSON()).length === 0) {
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] Istanbul map is empty after loading shards. Confirm PLAYWRIGHT_INTEGRATION_COVERAGE, Chromium project, build:coverage + storybook:copy-local-build + storybook:build, and shard dir",
      getShardDir()
    );
    /* eslint-enable no-console */
  }
}

/** Relative segments under `src/` that skip zero-fill. */
const ZERO_FILL_EXCLUDE_DIR_SEGMENTS = ["vendor"] as const;

/**
 * v8-to-istanbul resolves source-map `sources` relative to the bundle path under
 * `dist/hosted/web/{version}/js/`, so Istanbul keys look like
 * `.../dist/hosted/web/{ver}/js/src/hosted-fields/...` (note `js/src`, not repo root `src`).
 * Zero-fill uses `cwd/src/...`. Remap the former to the latter when the repo file exists.
 *
 * We intentionally match **`/js/src/`** (not the first `/src/` in the string): repos cloned
 * under a parent path such as `.../src/projects/braintree.js` would otherwise remap to the
 * wrong tail and miss real `dist/.../js/src/...` keys — then zero-fill adds an all-zero
 * parallel tree under `cwd/src`.
 *
 * Some bundles resolve sources to **`.../js/hosted-fields/...`** (no `src` between `js` and
 * `hosted-fields`). Those keys are remapped using the same `tryTail` + `existsSync` check.
 */
function remapCoverageFilePathToRepoSrc(oldKey: string, cwd: string): string {
  const norm = canonicalCoverageFileKey(oldKey, cwd);
  const srcRoot = path.join(cwd, "src");

  if (norm === srcRoot || norm.startsWith(`${srcRoot}${path.sep}`)) {
    return norm;
  }

  const tryTail = (tail: string): string | null => {
    if (!tail) {
      return null;
    }

    const candidate = path.normalize(path.join(srcRoot, tail));

    if (
      candidate.startsWith(`${srcRoot}${path.sep}`) &&
      fs.existsSync(candidate)
    ) {
      return candidate;
    }

    return null;
  };

  const jsSrcMarker = `${path.sep}js${path.sep}src${path.sep}`;
  const jsSrcIdx = norm.indexOf(jsSrcMarker);

  if (jsSrcIdx !== -1) {
    const mapped = tryTail(norm.slice(jsSrcIdx + jsSrcMarker.length));

    if (mapped) {
      return mapped;
    }
  }

  const distWeb = `${path.sep}dist${path.sep}hosted${path.sep}web${path.sep}`;
  const distIdx = norm.indexOf(distWeb);

  if (distIdx !== -1) {
    const afterDist = norm.slice(distIdx + distWeb.length);
    const bits = afterDist.split(path.sep).filter(Boolean);

    if (bits.length >= 2 && bits[1] === "src") {
      const mapped = tryTail(bits.slice(2).join(path.sep));

      if (mapped) {
        return mapped;
      }
    }
  }

  const jsHostedFieldsMarker = `${path.sep}js${path.sep}hosted-fields${path.sep}`;
  const jhfIdx = norm.indexOf(jsHostedFieldsMarker);

  if (jhfIdx !== -1) {
    const rest = norm.slice(jhfIdx + jsHostedFieldsMarker.length);
    const mapped = tryTail(path.join("hosted-fields", rest));

    if (mapped) {
      return mapped;
    }
  }

  return norm;
}

function coveragePathHasNodeModulesSegment(
  filePath: string,
  cwd: string
): boolean {
  return canonicalCoverageFileKey(filePath, cwd)
    .split(path.sep)
    .includes("node_modules");
}

/** Source maps or bad keys can point at HTML report trees; never valid SDK sources. */
function coveragePathIsStrayReportArtifact(
  filePath: string,
  cwd: string
): boolean {
  const norm = canonicalCoverageFileKey(filePath, cwd);
  const junkPrefix = path.join(cwd, "coverage", "lcov-report");

  return norm === junkPrefix || norm.startsWith(`${junkPrefix}${path.sep}`);
}

/**
 * Replace module `coverageMap` with one whose file keys prefer `cwd/src/...`
 * when a matching source file exists (see remapCoverageFilePathToRepoSrc).
 */
function statementHitTotalFromInner(inner: Record<string, unknown>): number {
  const s = inner.s;

  if (!s || typeof s !== "object") {
    return 0;
  }

  return Object.values(s as Record<string, unknown>).reduce<number>(
    (sum, v) => sum + (typeof v === "number" ? v : 0),
    0
  );
}

/** JSON.stringify(statementMap) with sorted statement indices (key order can differ). */
function normalizedStatementMapJson(inner: Record<string, unknown>): string {
  const sm = inner.statementMap;

  if (!sm || typeof sm !== "object") {
    return "";
  }

  const o = sm as Record<string, unknown>;
  const sortedKeys = Object.keys(o).sort((a, b) => Number(a) - Number(b));
  const sorted: Record<string, unknown> = {};

  for (const k of sortedKeys) {
    sorted[k] = o[k];
  }

  return JSON.stringify(sorted);
}

/**
 * When several raw Istanbul keys remap to the same repo `src/...` path (e.g. the same
 * file pulled into multiple Browserify bundles), merging `FileCoverage` with **different**
 * `statementMap` layouts can corrupt hit counts. If layouts match, merge all; otherwise
 * keep the slice with the highest statement hit total.
 */
function remapCoverageKeysToRepoSrcTree(): void {
  const cwd = process.cwd();
  const raw = coverageMap.toJSON() as Record<
    string,
    { toJSON: () => Record<string, unknown> }
  >;
  const byNewKey = new Map<string, Record<string, unknown>[]>();

  for (const [key, fileCov] of Object.entries(raw)) {
    const newKey = remapCoverageFilePathToRepoSrc(key, cwd);
    /* FileCoverage lives on the map; `{ ...fc }` only copies `data`, not statementMap/s/f/b. */
    const inner = fileCov.toJSON() as Record<string, unknown>;
    const payload = { ...inner, path: newKey };

    if (!byNewKey.has(newKey)) {
      byNewKey.set(newKey, []);
    }

    byNewKey.get(newKey)!.push(payload);
  }

  const next = createCoverageMap({});

  for (const [newKey, list] of byNewKey) {
    if (list.length === 1) {
      next.merge(
        createCoverageMap({ [newKey]: list[0] } as unknown as CoverageMapData)
      );

      continue;
    }

    const refMap = normalizedStatementMapJson(list[0]);
    const allSameStatementMap = list.every(
      (inner) => normalizedStatementMapJson(inner) === refMap
    );

    if (allSameStatementMap) {
      const ordered = [...list].sort(
        (a, b) => statementHitTotalFromInner(b) - statementHitTotalFromInner(a)
      );

      for (const inner of ordered) {
        next.merge(
          createCoverageMap({ [newKey]: inner } as unknown as CoverageMapData)
        );
      }
    } else {
      const positive = list.filter(
        (inner) => statementHitTotalFromInner(inner) > 0
      );
      const pool = positive.length > 0 ? positive : list;
      const best = pool.reduce((a, b) =>
        statementHitTotalFromInner(b) > statementHitTotalFromInner(a) ? b : a
      );

      next.merge(
        createCoverageMap({ [newKey]: best } as unknown as CoverageMapData)
      );
    }
  }

  coverageMap = next;

  coverageMap.filter(
    (filePath) =>
      !coveragePathHasNodeModulesSegment(filePath, cwd) &&
      !coveragePathIsStrayReportArtifact(filePath, cwd)
  );
}

function canonicalCoverageFileKey(filePath: string, cwd: string): string {
  let raw = filePath;

  if (typeof raw === "string" && /^file:/u.test(raw)) {
    try {
      raw = fileURLToPath(raw);
    } catch {
      /* keep raw */
    }
  }

  const abs = path.isAbsolute(raw) ? raw : path.resolve(cwd, raw);

  return path.normalize(abs);
}

function shouldSkipZeroFillForPath(absPath: string, cwd: string): boolean {
  const srcRoot = path.join(cwd, "src");
  const rel = path.relative(srcRoot, absPath);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return true;
  }

  const segments = rel.split(path.sep);

  return ZERO_FILL_EXCLUDE_DIR_SEGMENTS.some((name) => segments.includes(name));
}

function listSrcJsFilesRecursive(cwd: string): string[] {
  const srcRoot = path.join(cwd, "src");
  const out: string[] = [];

  if (!fs.existsSync(srcRoot)) {
    return out;
  }

  const walk = (dir: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);

      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith(".js")) {
        out.push(path.normalize(full));
      }
    }
  };

  walk(srcRoot);

  return out;
}

/**
 * Add Istanbul entries at 0% for every `src` tree `.js` file not already in the map.
 * Uses babel-based instrumentation (different counter layout than v8-to-istanbul); only
 * runs for paths missing from the map so FileCoverage.merge never mixes the two layouts.
 */
function mergeZeroFillFromSrcTree(map: CoverageMap): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createInstrumenter } = require("istanbul-lib-instrument") as {
    createInstrumenter: (_opts?: Record<string, unknown>) => {
      instrumentSync: (_code: string, _filename: string) => string;
      fileCoverage: Record<string, unknown> | null;
    };
  };

  const cwd = process.cwd();
  const covered = new Set<string>();

  for (const f of map.files()) {
    covered.add(canonicalCoverageFileKey(f, cwd));
  }

  const instrumenter = createInstrumenter({
    preserveComments: true,
    compact: false,
  });

  let instrumentFailures = 0;

  for (const absPath of listSrcJsFilesRecursive(cwd)) {
    if (shouldSkipZeroFillForPath(absPath, cwd)) {
      continue;
    }

    const canon = canonicalCoverageFileKey(absPath, cwd);

    if (covered.has(canon)) {
      continue;
    }

    try {
      const source = fs.readFileSync(canon, "utf8");

      instrumenter.instrumentSync(source, canon);
      const fc = instrumenter.fileCoverage;

      if (!fc) {
        instrumentFailures++;
        continue;
      }

      map.merge(
        createCoverageMap({ [canon]: fc } as unknown as CoverageMapData)
      );
      covered.add(canon);
    } catch {
      instrumentFailures++;
    }
  }

  if (instrumentFailures > 0) {
    /* eslint-disable no-console */
    console.warn(
      "[integration-coverage] zero-fill: could not instrument",
      instrumentFailures,
      "src file(s) (parse or instrument errors)."
    );
    /* eslint-enable no-console */
  }
}

/**
 * Write lcov, HTML, and text summaries under coverage/integration/.
 */
export function writeIntegrationCoverageReports(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const libReport = require("istanbul-lib-report");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reports = require("istanbul-reports");

  loadCoverageFromShards();
  remapCoverageKeysToRepoSrcTree();

  if (isIntegrationCoverageZeroFillEnabled()) {
    mergeZeroFillFromSrcTree(coverageMap);
  }

  const dir = path.resolve(process.cwd(), "coverage/integration");

  fs.mkdirSync(dir, { recursive: true });

  /* Istanbul html does not remove stale package dirs; wipe output so src/index.html matches this run's map. */
  const htmlDir = path.join(dir, "html");
  fs.rmSync(htmlDir, { recursive: true, force: true });

  const textAndLcovContext = libReport.createContext({
    dir,
    coverageMap,
    defaultSummarizer: "nested",
  });

  reports
    .create("text", { file: "coverage-summary.txt" })
    .execute(textAndLcovContext);
  reports.create("lcovonly", { file: "lcov.info" }).execute(textAndLcovContext);

  /*
   * Istanbul's SummarizerFactory strips the longest common prefix from all
   * file paths. Since every key lives under cwd/src/, the "src/" segment is
   * removed and the HTML report lands inside src/ with no aggregate view.
   *
   * Adding one empty-coverage entry *outside* src/ breaks the common prefix
   * so that src/ becomes a visible, clickable top-level directory.
   * skipEmpty hides the anchor from the summary table.
   */
  const cwd = process.cwd();
  const anchorPath = path.join(cwd, "__coverage_anchor__");

  coverageMap.addFileCoverage({
    path: anchorPath,
    statementMap: {},
    fnMap: {},
    branchMap: {},
    s: {},
    f: {},
    b: {},
  });

  const htmlContext = libReport.createContext({
    dir,
    coverageMap,
    defaultSummarizer: "nested",
    sourceFinder: (filePath: string) => {
      if (filePath === anchorPath) {
        return "";
      }

      return fs.readFileSync(filePath, "utf8");
    },
  });

  reports
    .create("html", { subdir: "html", skipEmpty: true })
    .execute(htmlContext);

  coverageMap.filter((filePath: string) => filePath !== anchorPath);
}
