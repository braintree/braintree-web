import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { minify } from "html-minifier-terser";
import { DIST_DIRECTORY, ROOT } from "./vite/configs/shared.ts";

const DIST_HTML = path.resolve(DIST_DIRECTORY, "html");
const isCoverage = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";
mkdirSync(DIST_HTML, { recursive: true });

for (const component of ["sepa", "local-payment", "venmo"]) {
  const src = path.resolve(
    ROOT,
    `src/${component}/internal/landing-frame.html`
  );
  const stem = `${component}-landing-frame`;
  copyFileSync(src, path.resolve(DIST_HTML, `${stem}.html`));
  const min = await minify(readFileSync(src, "utf-8"), {
    collapseWhitespace: true,
    minifyJS: !isCoverage,
    minifyCSS: true,
    removeComments: true,
  });
  writeFileSync(path.resolve(DIST_HTML, `${stem}.min.html`), min);
}
