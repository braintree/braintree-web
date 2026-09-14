import path from "node:path";
import { build } from "vite-plus";
import cspHashPlugin from "./vite/plugins/csp-hash-plugin.ts";
import emitMinHtmlPlugin from "./vite/plugins/emit-min-html-plugin.ts";
import inlineHtmlEntryPlugin from "./vite/plugins/inline-html-entry-plugin.ts";
import preserveCoverageChunkPlugin from "./vite/plugins/preserve-coverage-chunk-plugin.ts";
import {
  DEFINE_VALUES,
  DIST_DIRECTORY,
  ROOT,
  TARGET,
} from "./vite/configs/shared.ts";

const DIST_HTML = path.resolve(DIST_DIRECTORY, "html");
const DIST_JS = path.resolve(DIST_DIRECTORY, "js");
const isCoverage = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";

const frames = [
  {
    namespace: "braintree.hostedFields",
    html: "src/hosted-fields/internal/hosted-fields-frame.html",
    entry: "src/hosted-fields/internal/index.js",
    outputName: "hosted-fields-frame",
    chunk: "index.js",
    coverageChunk: "hosted-fields-internal.js",
    csp: true,
  },
  {
    namespace: "braintree.localPayment",
    html: "src/local-payment/internal/redirect-frame.html",
    entry: "src/local-payment/internal/redirect-frame.js",
    outputName: "local-payment-redirect-frame",
    chunk: "redirect-frame.js",
    coverageChunk: "local-payment-redirect-frame.js",
    csp: false,
  },
  {
    namespace: "braintree.venmo",
    html: "src/venmo/internal/venmo-desktop-frame.html",
    entry: "src/venmo/internal/venmo-desktop-frame.js",
    outputName: "venmo-desktop-frame",
    chunk: "venmo-desktop-frame.js",
    coverageChunk: "venmo-desktop-frame-internal.js",
    csp: false,
  },
];

for (const f of frames) {
  await build({
    root: ROOT,
    logLevel: "warn",
    define: DEFINE_VALUES,
    plugins: [
      inlineHtmlEntryPlugin({
        entries: { [f.outputName]: path.resolve(ROOT, f.html) },
        preserveChunk: isCoverage,
      }),
      emitMinHtmlPlugin(),
      ...(f.csp ? [cspHashPlugin()] : []),
      preserveCoverageChunkPlugin({
        chunkFileName: f.chunk,
        coverageChunkOutputName: f.coverageChunk,
        htmlOutDir: DIST_HTML,
        jsOutDir: DIST_JS,
      }),
    ],
    build: {
      write: true,
      emptyOutDir: false,
      target: TARGET,
      sourcemap: isCoverage ? ("inline" as const) : false,
      lib: {
        entry: path.resolve(ROOT, f.entry),
        name: f.namespace,
        formats: ["iife"],
        fileName: () => f.chunk,
      },
      outDir: DIST_HTML,
      rolldownOptions: { output: { extend: true, exports: "default" } },
      minify: false,
    },
  });
}
