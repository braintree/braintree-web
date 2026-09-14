import path from "node:path";
import type { InlineConfig } from "vite-plus";
import {
  DEFINE_VALUES,
  DIST_DIRECTORY,
  ROOT,
  TARGET,
} from "../vite/configs/shared.ts";

export const DIST_JS = path.resolve(DIST_DIRECTORY, "js");

export const baseConfig: Partial<InlineConfig> = {
  root: ROOT,
  logLevel: "warn",
  define: DEFINE_VALUES,
  build: {
    write: true,
    emptyOutDir: false,
    target: TARGET,
  },
};
