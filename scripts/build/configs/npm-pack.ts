import path from "node:path";
import components from "../../../components.json" with { type: "json" };
import {
  DEFINE_VALUES,
  NPM_DIST_DIRECTORY,
  ROOT,
  TARGET,
} from "../vite/configs/shared.ts";

const entry: Record<string, string> = {
  index: path.resolve(ROOT, "src/index.js"),
};
for (const name of components) {
  entry[name] = path.resolve(ROOT, `src/${name}/index.js`);
}

export const pack = {
  entry,
  format: ["cjs" as const],
  outDir: NPM_DIST_DIRECTORY,
  platform: "neutral" as const,
  target: TARGET,
  define: DEFINE_VALUES,
  treeshake: true,
  minify: false,
  dts: false,
  unbundle: false,
  clean: true,
};
