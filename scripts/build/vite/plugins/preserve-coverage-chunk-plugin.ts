// Under coverage builds (`BRAINTREE_JS_COVERAGE_BUILD=true`) the inlined-frame
// chunk is preserved on disk so Istanbul can map back to source. This plugin
// relocates it from html/ to js/, where integration-coverage-store
// (HTML_FRAME_BASENAME_TO_INTERNAL_JS) expects it.
//
// Runs in `writeBundle`, not `closeBundle`: writeBundle is the first hook
// guaranteed to fire after disk writes; closeBundle is final cleanup and
// not designed for filesystem mutation.
import { promises as fs } from "node:fs";
import path from "node:path";

interface PreserveCoverageChunkOptions {
  chunkFileName: string;
  coverageChunkOutputName: string;
  htmlOutDir: string;
  jsOutDir: string;
}

export default function preserveCoverageChunkPlugin(
  options: PreserveCoverageChunkOptions
) {
  const isCoverageBuild = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";
  const { chunkFileName, coverageChunkOutputName, htmlOutDir, jsOutDir } =
    options;

  return {
    name: "preserve-coverage-chunk",
    enforce: "post" as const,
    async writeBundle() {
      if (!isCoverageBuild) {
        return;
      }

      const chunkInHtml = path.resolve(htmlOutDir, chunkFileName);
      const chunkInJs = path.resolve(jsOutDir, coverageChunkOutputName);

      await fs.mkdir(path.dirname(chunkInJs), { recursive: true });

      try {
        await fs.rename(chunkInHtml, chunkInJs);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw err;
        }
      }
    },
  };
}
