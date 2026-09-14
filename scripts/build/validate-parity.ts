import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";
import { DIST_DIRECTORY, FRAMES, VERSION } from "./vite/configs/shared.ts";

const VITE_PLUS_COMPONENTS = [
  "american-express",
  "apple-pay",
  "client",
  "data-collector",
  "fastlane",
  "google-payment",
  "hosted-fields",
  "instant-verification",
  "local-payment",
  "payment-ready",
  "paypal-checkout",
  "paypal-checkout-v6",
  "sepa",
  "three-d-secure",
  "us-bank-account",
  "vault-manager",
  "venmo",
];

interface LandingFrame {
  name: string;
  owner: string;
}

const LANDING_FRAMES: LandingFrame[] = [
  { name: "sepa-landing-frame", owner: "sepa" },
  { name: "local-payment-landing-frame", owner: "local-payment" },
  { name: "venmo-landing-frame", owner: "venmo" },
];

interface EmbeddedFrame {
  name: string;
  owner: string;
  namespace: string;
  methods: string[];
}

const EMBEDDED_FRAMES: EmbeddedFrame[] = [
  {
    name: "local-payment-redirect-frame",
    owner: "local-payment",
    namespace: "braintree.localPayment",
    methods: ["start"],
  },
  {
    name: "venmo-desktop-frame",
    owner: "venmo",
    namespace: "braintree.venmo",
    methods: ["create"],
  },
];

// Coverage builds preserve the standalone frame chunks under js/ so Istanbul
// has a real file to map back to. Non-coverage builds inline the chunk into
// the HTML and these files must NOT appear. Each entry pairs the chunk file
// with its owning component so the check skips on partial branches.
interface CoverageInternalJs {
  fileName: string;
  owner: string;
}

const COVERAGE_INTERNAL_JS: CoverageInternalJs[] = [
  { fileName: "hosted-fields-internal.js", owner: "hosted-fields" },
  { fileName: "local-payment-redirect-frame.js", owner: "local-payment" },
  { fileName: "venmo-desktop-frame-internal.js", owner: "venmo" },
];

const CSP_META_REGEX =
  /<meta http-equiv="Content-Security-Policy" content="(script-src(?: 'sha256-[A-Za-z0-9+/=]+')+)">/;
// Intentionally duplicated from scripts/build/vite/plugins/csp-hash-plugin.ts.
// The parity script must compute hashes independently. If it imported these
// constants from the plugin, any bug there would propagate here and silently
// mask itself. The duplication IS the double-entry check.
const CONDITIONAL_COMMENT_REGEX = /<!--\[if[^>]*\]>.*?<!\[endif\]-->/gs;
const CHEERIO_CONFIG = { xmlMode: false, decodeEntities: false };

const results = { pass: 0, fail: 0 };

function check(name: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    results.pass++;
  } else {
    console.log(`  FAIL: ${name}: ${detail}`);
    results.fail++;
  }
}

function readIfExists(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function extractInlineScripts(html: string): string[] {
  const cleaned = html.replace(CONDITIONAL_COMMENT_REGEX, "");
  const $ = cheerio.load(cleaned, CHEERIO_CONFIG);
  const scripts: string[] = [];

  $("script:not([src])").each(function () {
    const content = $(this).html();

    if (content && content.trim()) {
      scripts.push(content);
    }
  });

  return scripts;
}

function hashScriptBody(body: string): string {
  const normalized = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return (
    "sha256-" +
    crypto.createHash("sha256").update(normalized, "utf8").digest("base64")
  );
}

function extractDeclaredCspHashes(html: string): string[] {
  const meta = html.match(
    /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/
  );

  return meta?.[1].match(/sha256-[A-Za-z0-9+/=]+/g) ?? [];
}

function isParseable(code: string): boolean {
  try {
    // Compile-only parse probe (does not invoke the function).
    // eslint-disable-next-line no-new-func
    new Function(code);

    return true;
  } catch {
    return false;
  }
}

function browserSandbox(): vm.Context {
  const noop = () => {};

  return vm.createContext({
    window: { name: "braintree-hosted-field", addEventListener: noop },
    document: {
      addEventListener: noop,
      createElement: () => ({ style: {}, addEventListener: noop }),
      body: { appendChild: noop },
      getElementsByTagName: () => [],
    },
    navigator: { userAgent: "" },
    HTMLInputElement: function HTMLInputElement() {},
    Element: function Element() {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    console: { log: noop, warn: noop, error: noop },
  });
}

function resolveNamespace(sandbox: vm.Context, dottedPath: string): unknown {
  return dottedPath
    .split(".")
    .reduce<any>(
      (current, key) => (current == null ? current : current[key]),
      sandbox
    );
}

function validateIIFENamespace(
  html: string,
  namespace: string,
  expectedMethods: string[]
): { ok: boolean; detail: string } {
  const iife = extractInlineScripts(html)[0] ?? "";

  if (!iife) {
    return { ok: false, detail: "no inline script found" };
  }

  const sandbox = browserSandbox();

  try {
    vm.runInContext(iife, sandbox);
  } catch (error) {
    return {
      ok: false,
      detail: `IIFE eval threw: ${(error as Error).message.split("\n")[0]}`,
    };
  }

  const exported = resolveNamespace(sandbox, namespace);

  if (exported == null || typeof exported !== "object") {
    return {
      ok: false,
      detail: `namespace "${namespace}" not assigned (got ${typeof exported})`,
    };
  }

  const missing = expectedMethods.filter(
    (methodName) =>
      typeof (exported as Record<string, unknown>)[methodName] !== "function"
  );

  if (missing.length > 0) {
    return {
      ok: false,
      detail: `${namespace} missing methods: ${missing.join(", ")}`,
    };
  }

  return { ok: true, detail: "" };
}

function validateComponent(name: string) {
  console.log(`\n--- ${name} ---`);

  const mjsFile = path.join(DIST_DIRECTORY, "js", `${name}.mjs`);
  const minMjsFile = path.join(DIST_DIRECTORY, "js", `${name}.min.mjs`);
  const iifeFile = path.join(DIST_DIRECTORY, "js", `${name}.js`);
  const minIifeFile = path.join(DIST_DIRECTORY, "js", `${name}.min.js`);

  const mjsContent = readIfExists(mjsFile);
  const iifeContent = readIfExists(iifeFile);
  const minIifeContent = readIfExists(minIifeFile);

  // ESM bundle checks
  check(`${name}.mjs exists`, mjsContent !== null, "File not found");
  check(`${name}.min.mjs exists`, fs.existsSync(minMjsFile), "File not found");

  if (mjsContent) {
    check(
      `${name}.mjs no process.env leaks`,
      !mjsContent.includes("process.env."),
      "Found process.env"
    );
    check(
      `${name}.mjs no BRAINTREE_JS_ASSET_URL refs`,
      !mjsContent.includes("BRAINTREE_JS_ASSET_URL"),
      "Dev env var leaked into prod bundle"
    );
  }

  // IIFE bundle checks — .js / .min.js must be self-contained IIFE bundles
  // serving classic <script> (assign to the braintree global). The critical
  // regression guard is "no top-level import keyword" — that was the previous
  // shim bug.
  check(`${name}.js IIFE exists`, iifeContent !== null, "File not found");
  check(
    `${name}.min.js IIFE exists`,
    minIifeContent !== null,
    "File not found"
  );

  for (const [label, content] of [
    [`${name}.js`, iifeContent],
    [`${name}.min.js`, minIifeContent],
  ] as const) {
    if (!content) continue;

    check(
      `${label} has no top-level ESM import`,
      !/^\s*(?:"use strict";\s*)?import\s/m.test(content.slice(0, 200)),
      "Found `import` near top of file — would fail in classic <script>"
    );
    check(
      `${label} assigns to braintree global`,
      content.includes("braintree"),
      "Missing `braintree` namespace literal in IIFE bundle"
    );
    check(
      `${label} is self-contained (>500B)`,
      content.length > 500,
      `Too small at ${content.length}B — expected full IIFE bundle, not a shim`
    );
  }

  const mjsSize = fs.existsSync(mjsFile) ? fs.statSync(mjsFile).size : 0;
  const minMjsSize = fs.existsSync(minMjsFile)
    ? fs.statSync(minMjsFile).size
    : 0;
  const iifeSize = fs.existsSync(iifeFile) ? fs.statSync(iifeFile).size : 0;
  const minIifeSize = fs.existsSync(minIifeFile)
    ? fs.statSync(minIifeFile).size
    : 0;

  console.log(
    `  INFO: ${name}.mjs=${(mjsSize / 1024).toFixed(1)}KB .min.mjs=${(minMjsSize / 1024).toFixed(1)}KB .js=${(iifeSize / 1024).toFixed(1)}KB .min.js=${(minIifeSize / 1024).toFixed(1)}KB`
  );
}

function validateFrameService() {
  console.log("\n--- frame-service ---");

  const frameContents: Record<string, string> = {};

  for (const frame of FRAMES) {
    const htmlFile = path.join(DIST_DIRECTORY, "html", `${frame}-frame.html`);
    const minFile = path.join(
      DIST_DIRECTORY,
      "html",
      `${frame}-frame.min.html`
    );
    const content = readIfExists(htmlFile);

    check(`${frame}-frame.html exists`, content !== null, "File not found");
    check(
      `${frame}-frame.min.html exists`,
      fs.existsSync(minFile),
      "File not found"
    );

    if (content) {
      frameContents[frame] = content;
      check(
        `${frame} exposes frameService global`,
        content.includes("var frameService"),
        "IIFE did not assign frameService global"
      );

      const inlineScripts = extractInlineScripts(content);

      check(
        `${frame}-frame all inline scripts parseable`,
        inlineScripts.every(isParseable),
        "One or more inline <script> bodies failed to parse"
      );

      const namespaceCheck = validateIIFENamespace(content, "frameService", [
        "start",
      ]);

      check(
        `${frame}-frame IIFE exposes frameService.start`,
        namespaceCheck.ok,
        namespaceCheck.detail
      );
    }

    const minContent = readIfExists(minFile);

    if (minContent) {
      const minScripts = extractInlineScripts(minContent);

      check(
        `${frame}-frame.min all inline scripts parseable`,
        minScripts.every(isParseable),
        "One or more minified inline <script> bodies failed to parse"
      );

      const minNamespaceCheck = validateIIFENamespace(
        minContent,
        "frameService",
        ["start"]
      );

      check(
        `${frame}-frame.min IIFE exposes frameService.start`,
        minNamespaceCheck.ok,
        minNamespaceCheck.detail
      );
    }
  }

  // Hardcoded canaries: one unique identifier per frame that proves cross-pollination
  // would be loud. Update if the underlying frame removes/renames the symbol.
  const sentinels: Record<string, string> = {
    dispatch: "BUS_CONFIGURATION_REQUEST_EVENT",
    cancel: "FRAME_SERVICE_FRAME_CLOSED",
    redirect: "closeTimer",
  };

  for (const sourceFrame of FRAMES) {
    for (const targetFrame of FRAMES) {
      if (sourceFrame === targetFrame) continue;
      const sentinel = sentinels[sourceFrame];
      const targetContent = frameContents[targetFrame];
      if (!targetContent || !sentinel) continue;
      check(
        `${targetFrame}-frame does not contain ${sourceFrame} sentinel "${sentinel}"`,
        !targetContent.includes(sentinel),
        `Cross-pollination: ${sourceFrame} code in ${targetFrame}`
      );
    }
  }
}

function validateHostedFieldsFrame() {
  console.log("\n--- hosted-fields-frame ---");

  const htmlFile = path.join(
    DIST_DIRECTORY,
    "html",
    "hosted-fields-frame.html"
  );
  const minFile = path.join(
    DIST_DIRECTORY,
    "html",
    "hosted-fields-frame.min.html"
  );

  for (const file of [
    { path: htmlFile, label: "HTML" },
    { path: minFile, label: "Minified HTML" },
  ]) {
    const content = readIfExists(file.path);

    check(`${file.label} exists`, content !== null, "File not found");

    if (!content) continue;

    check(
      `${file.label} CSP placeholder removed`,
      !content.includes("CSP_PLACEHOLDER"),
      "Placeholder remaining"
    );

    const metaMatch = content.match(CSP_META_REGEX);
    check(
      `${file.label} CSP meta matches exact format`,
      metaMatch !== null,
      `Expected single script-src directive; got: ${content.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)?.[0] ?? "<none>"}`
    );

    const declaredHashes = extractDeclaredCspHashes(content);
    const inlineScripts = extractInlineScripts(content);
    const actualHashes = inlineScripts.map(hashScriptBody);

    check(
      `${file.label} CSP hashes match actual inline <script> bodies`,
      JSON.stringify(declaredHashes) === JSON.stringify(actualHashes),
      `declared=${JSON.stringify(declaredHashes)} actual=${JSON.stringify(actualHashes)}`
    );

    check(
      `${file.label} all inline scripts parseable`,
      inlineScripts.every(isParseable),
      "One or more inline <script> bodies failed to parse"
    );

    const namespaceCheck = validateIIFENamespace(
      content,
      "braintree.hostedFields",
      ["create", "initialize"]
    );

    check(
      `${file.label} IIFE exposes braintree.hostedFields with create/initialize`,
      namespaceCheck.ok,
      namespaceCheck.detail
    );

    check(
      `${file.label} no style-src directive`,
      !content.includes("style-src"),
      "style-src directive leaked from old CSP format"
    );
  }
}

function validateLandingFrames() {
  console.log("\n--- landing frames (static passthrough) ---");

  for (const { name, owner } of LANDING_FRAMES) {
    if (!componentBuilt(owner)) continue;

    const htmlFile = path.join(DIST_DIRECTORY, "html", `${name}.html`);
    const minFile = path.join(DIST_DIRECTORY, "html", `${name}.min.html`);
    const content = readIfExists(htmlFile);
    const minContent = readIfExists(minFile);

    check(`${name}.html exists`, content !== null, "File not found");
    check(`${name}.min.html exists`, minContent !== null, "File not found");

    if (content === null || minContent === null) continue;

    const $ = cheerio.load(content, CHEERIO_CONFIG);

    check(
      `${name}.html has no <script> tags`,
      $("script").length === 0,
      `Found ${$("script").length} <script> tag(s) — landing frames must not embed JS`
    );

    check(
      `${name}.min.html is smaller than .html`,
      minContent.length < content.length,
      `min=${minContent.length}B unmin=${content.length}B — minification produced no savings`
    );
  }
}

function validateEmbeddedFrames() {
  console.log("\n--- embedded frames (inlined IIFE in HTML) ---");

  for (const { name, owner, namespace, methods } of EMBEDDED_FRAMES) {
    if (!componentBuilt(owner)) continue;

    const htmlFile = path.join(DIST_DIRECTORY, "html", `${name}.html`);
    const minFile = path.join(DIST_DIRECTORY, "html", `${name}.min.html`);

    for (const file of [
      { path: htmlFile, label: `${name}.html` },
      { path: minFile, label: `${name}.min.html` },
    ]) {
      const content = readIfExists(file.path);

      check(`${file.label} exists`, content !== null, "File not found");

      if (!content) continue;

      const inlineScripts = extractInlineScripts(content);

      check(
        `${file.label} first inline <script> is parseable`,
        inlineScripts.length > 0 && isParseable(inlineScripts[0]),
        "First inline script body failed to parse"
      );

      const namespaceCheck = validateIIFENamespace(content, namespace, methods);

      check(
        `${file.label} IIFE exposes ${namespace}.{${methods.join(",")}}`,
        namespaceCheck.ok,
        namespaceCheck.detail
      );
    }
  }
}

function validateVenmoQrcode() {
  console.log("\n--- venmo qrcode bundling ---");

  const desktopFrame = path.join(
    DIST_DIRECTORY,
    "html",
    "venmo-desktop-frame.html"
  );
  const content = readIfExists(desktopFrame);

  if (content === null) {
    // Venmo desktop frame not built on this branch — skip silently.
    return;
  }

  check(
    "qrcode library is bundled into the desktop frame",
    content.includes("getCharCountIndicator"),
    "qrcode library not bundled"
  );

  check(
    'venmo-desktop-frame.html has no require("fs") literal',
    !content.includes('require("fs")'),
    "qrcode pulled in its Node fs dependency — browser field map failed"
  );
}

function validateCoverageMode() {
  const isCoverageBuild = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";

  console.log(
    `\n--- coverage mode (BRAINTREE_JS_COVERAGE_BUILD=${isCoverageBuild ? "true" : "<unset>"}) ---`
  );

  for (const { fileName, owner } of COVERAGE_INTERNAL_JS) {
    if (!componentBuilt(owner)) continue;

    const filePath = path.join(DIST_DIRECTORY, "js", fileName);
    const exists = fs.existsSync(filePath);

    if (isCoverageBuild) {
      check(
        `${fileName} present in js/ (coverage mode on)`,
        exists,
        "Intermediate frame JS missing — preserveChunk did not flow"
      );
    } else {
      check(
        `${fileName} absent from js/ (coverage mode off)`,
        !exists,
        "Intermediate frame JS leaked into non-coverage build"
      );
    }
  }
}

console.log("=== Vite+ Build Parity Validation ===");
console.log(`Version: ${VERSION}`);

// Skip components not built on this branch. The Vite+ stack is split across
// multiple PRs and each branch only builds its own component. The full stack
// (all PRs merged) validates everything.
function componentBuilt(name: string): boolean {
  return fs.existsSync(path.join(DIST_DIRECTORY, "js", `${name}.js`));
}

function frameServiceBuilt(): boolean {
  return FRAMES.some((frame) =>
    fs.existsSync(path.join(DIST_DIRECTORY, "html", `${frame}-frame.html`))
  );
}

function hostedFieldsFrameBuilt(): boolean {
  return fs.existsSync(
    path.join(DIST_DIRECTORY, "html", "hosted-fields-frame.html")
  );
}

VITE_PLUS_COMPONENTS.filter(componentBuilt).forEach(validateComponent);
if (frameServiceBuilt()) validateFrameService();
if (hostedFieldsFrameBuilt()) validateHostedFieldsFrame();
validateLandingFrames();
validateEmbeddedFrames();
validateVenmoQrcode();
validateCoverageMode();

console.log("\n=== Summary ===");
console.log(`Pass: ${results.pass}`);
console.log(`Fail: ${results.fail}`);

if (results.fail > 0) {
  process.exit(1);
}
