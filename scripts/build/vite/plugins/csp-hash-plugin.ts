// SHA-256 hashes every inline script in each HTML bundle asset and injects
// a `Content-Security-Policy` meta tag.
import crypto from "node:crypto";
import { type HtmlAsset, loadHtml } from "./shared.ts";

function calculateHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("base64");
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export default function cspHashPlugin() {
  return {
    name: "csp-hash",
    enforce: "post" as const,
    generateBundle(_outputOptions: unknown, bundle: Record<string, HtmlAsset>) {
      for (const key of Object.keys(bundle)) {
        const asset = bundle[key];

        if (
          asset.type !== "asset" ||
          !key.endsWith(".html") ||
          typeof asset.source !== "string"
        ) {
          continue;
        }

        const $ = loadHtml(asset.source);

        // Skip if a CSP meta tag is already present. Browsers honor the first
        // <meta http-equiv="Content-Security-Policy"> they see and ignore
        // subsequent ones, so appending a second tag would silently leave the
        // page with the wrong (earlier) policy.
        if ($('meta[http-equiv="Content-Security-Policy"]').length > 0) {
          continue;
        }

        const hashes: string[] = [];

        $("script:not([src])").each(function () {
          const body = $(this).html();

          if (body && body.trim()) {
            hashes.push(
              `'sha256-${calculateHash(normalizeLineEndings(body))}'`
            );
          }
        });

        if (hashes.length === 0) continue;

        $("head").append(
          `<meta http-equiv="Content-Security-Policy" content="script-src ${hashes.join(" ")}">`
        );

        asset.source = $.html();
      }
    },
  };
}
