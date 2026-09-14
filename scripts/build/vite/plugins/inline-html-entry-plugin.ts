// Inlines each bundle chunk's JS into its `<script type="module" src>` tag
// so the emitted HTML is self-contained (no external chunk dependency).
import fs from "node:fs";
import { type BundleChunk, type EmittedFile, loadHtml } from "./shared.ts";

interface InlineHtmlEntryOptions {
  entries: { [outputName: string]: string };
  // Coverage builds need the standalone chunk on disk so Istanbul can map
  // back to original source.
  preserveChunk?: boolean;
}

type Bundle = Record<string, BundleChunk>;

function resolveChunkKey(bundle: Bundle, scriptName: string): string | null {
  const direct = bundle[scriptName];

  if (direct && direct.type === "chunk") {
    return scriptName;
  }

  return (
    Object.keys(bundle).find((key) => {
      const chunk = bundle[key];

      return chunk.type === "chunk" && key.endsWith(`/${scriptName}`);
    }) ?? null
  );
}

interface PluginContext {
  emitFile: (file: EmittedFile) => void;
  error: (message: string) => never;
}

function inlineOneEntry(
  pluginContext: PluginContext,
  bundle: Bundle,
  outputName: string,
  htmlPath: string,
  preserveChunk: boolean
): void {
  const template = fs.readFileSync(htmlPath, "utf8");
  const $ = loadHtml(template);

  $('script[type="module"][src^="./"]').each(function () {
    const scriptName = $(this).attr("src")!.slice(2);
    const chunkKey = resolveChunkKey(bundle, scriptName);

    if (chunkKey === null) {
      const available = Object.keys(bundle).slice(0, 5).join(", ");

      pluginContext.error(
        `inline-html-entry-plugin: no chunk matching "${scriptName}" for ${outputName}. Available bundle keys: [${available}]`
      );
    }

    const code = bundle[chunkKey].code;

    if (typeof code !== "string") {
      pluginContext.error(
        `inline-html-entry-plugin: chunk "${chunkKey}" has no code for ${outputName}`
      );
    }

    if (!preserveChunk) {
      delete bundle[chunkKey];
    }

    // Literal `</script` in the bundled JS would close the inline tag early
    // when the browser parses it.
    const escapedCode = code.replace(/<\/script/gi, "<\\/script");

    $(this).replaceWith(`<script>${escapedCode}</script>`);
  });

  pluginContext.emitFile({
    type: "asset",
    fileName: `${outputName}.html`,
    source: $.html(),
  });
}

export default function inlineHtmlEntryPlugin(options: InlineHtmlEntryOptions) {
  const { entries, preserveChunk = false } = options;

  return {
    name: "inline-html-entry",
    generateBundle(
      this: PluginContext,
      _outputOptions: unknown,
      bundle: Bundle
    ) {
      for (const [outputName, htmlPath] of Object.entries(entries)) {
        inlineOneEntry(this, bundle, outputName, htmlPath, preserveChunk);
      }
    },
  };
}
