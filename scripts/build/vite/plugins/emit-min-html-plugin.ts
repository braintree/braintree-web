// Emits a `.min.html` companion for every `.html` bundle asset.
import { minify } from "html-minifier-terser";
import type { EmittedFile, HtmlAsset } from "./shared.ts";

export default function emitMinHtmlPlugin() {
  const isCoverageBuild = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";

  return {
    name: "emit-min-html",
    enforce: "post" as const,
    async generateBundle(
      this: { emitFile: (file: EmittedFile) => void },
      _outputOptions: unknown,
      bundle: Record<string, HtmlAsset>
    ) {
      for (const key of Object.keys(bundle)) {
        const asset = bundle[key];

        if (
          asset.type !== "asset" ||
          !key.endsWith(".html") ||
          key.endsWith(".min.html") ||
          typeof asset.source !== "string"
        ) {
          continue;
        }

        const minified = await minify(asset.source, {
          collapseWhitespace: true,
          minifyJS: !isCoverageBuild,
          minifyCSS: true,
          removeComments: true,
        });

        this.emitFile({
          type: "asset",
          fileName: key.replace(/\.html$/, ".min.html"),
          source: minified,
        });
      }
    },
  };
}
