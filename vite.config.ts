import { defineConfig } from "vite-plus";
import { fmt } from "./scripts/build/fmt.config.ts";
import { lint } from "./scripts/build/lint.config.ts";
import { pack } from "./scripts/build/configs/npm-pack.ts";
import { run } from "./scripts/build/run.config.ts";
import { test } from "./scripts/build/test.config.ts";

export default defineConfig({ run, fmt, lint, test, pack });
