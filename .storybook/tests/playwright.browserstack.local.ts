import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";
import { BASE_URL } from "../constants";

dotenv.config({
  // eslint-disable-next-line no-undef
  path: path.resolve(__dirname, "../../.env"),
});

module.exports = defineConfig({
  testDir: "./",
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
  projects: [
    {
      name: "chrome",
      testIgnore: ["**/paypal-checkout-v6/**", "**/apple-pay/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: ["**/paypal-checkout-v6/**", "**/apple-pay/**"],
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "edge",
      testIgnore: ["**/paypal-checkout-v6/**", "**/apple-pay/**"],
      use: {
        ...devices["Desktop Edge"],
      },
    },
    {
      name: "safari",
      testIgnore: "**/paypal-checkout-v6/**",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
});
