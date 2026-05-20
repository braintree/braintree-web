import { defineConfig, devices, PlaywrightTestProject } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";
import { BASE_URL, browsers } from "../constants";
import { BrowserSpecification } from "../types/browserstack";

dotenv.config({
  // eslint-disable-next-line no-undef
  path: path.resolve(__dirname, "../../.env"),
});

module.exports = defineConfig({
  testDir: "./",
  testMatch: "**/**.test.ts",
  fullyParallel: true,
  retries: process.env.BROWSERSTACK_DISABLE_RETRIES ? 0 : 4,
  workers: 4,
  reporter: [["list"], ["html"]],
  timeout: 90000,
  globalSetup: "../scripts/browserstack/global-setup",
  globalTeardown: "../scripts/browserstack/global-teardown",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    actionTimeout: 20000,
  },
  projects: browsers.map((browser: BrowserSpecification) => {
    return {
      name: browser.browserName,
      testIgnore: browser.browserName === "Safari" ? [] : ["**/apple-pay/**"],
      use: {
        ...devices[browser.deviceName],
      },
    };
  }) as PlaywrightTestProject[],
});
