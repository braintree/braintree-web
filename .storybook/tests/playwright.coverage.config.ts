import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({
  // eslint-disable-next-line no-undef
  path: path.resolve(__dirname, "../../.env"),
});

/**
 * Chromium-only Playwright config for integration test coverage (V8 → Istanbul).
 * Requires SDK built with BRAINTREE_JS_COVERAGE_BUILD=true, Storybook static, and HTTPS server.
 *
 * @see .storybook/CLAUDE.md "Integration Test Coverage (Playwright + V8)" section
 */
module.exports = defineConfig({
  testDir: "./",
  testMatch: "**/**.test.ts",
  fullyParallel: false,
  workers: 1,
  retries: 2,
  timeout: 90000,
  reporter: [["list"], ["html"]],
  globalSetup: require.resolve("./global-setup-coverage.ts"),
  globalTeardown: require.resolve("./global-teardown-coverage.ts"),
  use: {
    trace: "on-first-retry",
    actionTimeout: 20000,
    launchOptions: { args: ["--deny-permission-prompts"] },
  },
  projects: [
    {
      name: "chromium-coverage",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
