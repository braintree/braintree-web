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
  fullyParallel: false,
  workers: 1,
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
