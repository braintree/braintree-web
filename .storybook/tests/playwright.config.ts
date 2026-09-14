import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({
  // eslint-disable-next-line no-undef
  path: path.resolve(__dirname, "../../.env"),
});

module.exports = defineConfig({
  testDir: "./",
  testMatch: "**/**.test.ts",
  fullyParallel: true,
  // Our GH runners have 2 logical cores, dev laptops have 16 (at time of writing)
  // either way, the only reason not to run across all logical cores is if the
  // parallel browser execution causes resource starvation, which is not the case on
  // CI (only 2 workers) or locally (more than enough RAM/CPU for 16 workers)
  workers: "100%",
  retries: 2,
  timeout: 90000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html"]],
  globalSetup: require.resolve("./global-setup.ts"),
  globalTeardown: require.resolve("./global-teardown.ts"),
  use: {
    trace: "on-first-retry",
    actionTimeout: 20000,
    launchOptions: { args: ["--deny-permission-prompts"] },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
