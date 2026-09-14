import path from "node:path";
import { build } from "vite-plus";
import inlineHtmlEntryPlugin from "./vite/plugins/inline-html-entry-plugin.ts";
import emitMinHtmlPlugin from "./vite/plugins/emit-min-html-plugin.ts";
import {
  DEFINE_VALUES,
  DIST_DIRECTORY,
  FRAMES,
  ROOT,
  TARGET,
} from "./vite/configs/shared.ts";

const DIST_HTML = path.resolve(DIST_DIRECTORY, "html");
const FRAME_INTERNAL = path.resolve(ROOT, "src/lib/frame-service/internal");
const isCoverage = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";

for (const frame of FRAMES) {
  const outputName = `${frame}-frame`;
  await build({
    root: ROOT,
    logLevel: "warn",
    define: DEFINE_VALUES,
    plugins: [
      inlineHtmlEntryPlugin({
        entries: {
          [outputName]: path.resolve(FRAME_INTERNAL, `${outputName}.html`),
        },
      }),
      emitMinHtmlPlugin(),
    ],
    build: {
      write: true,
      emptyOutDir: false,
      target: TARGET,
      sourcemap: isCoverage ? ("inline" as const) : false,
      lib: {
        entry: path.resolve(FRAME_INTERNAL, `${outputName}.js`),
        name: "frameService",
        formats: ["iife"],
        fileName: () => `${outputName}.js`,
      },
      outDir: DIST_HTML,
      rolldownOptions: { output: { exports: "default" } },
      minify: false,
    },
  });
}
