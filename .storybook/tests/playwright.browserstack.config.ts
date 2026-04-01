import { defineConfig, PlaywrightTestProject } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";
import { getLocalIdentifier } from "../scripts/browserstack/browserstack-local";
import { name as projectName } from "../../package.json";
import { BASE_URL, browsers } from "../constants";
import { BrowserSpecification } from "../types/browserstack";

dotenv.config({
  // eslint-disable-next-line no-undef
  path: path.resolve(__dirname, "../../.env"),
});

const type = process.env.GITHUB_REF ? "CI" : "Local";

const build = `"Braintree.js" - ${type}-${getLocalIdentifier()}`;

const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME ?? "";
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY ?? "";

const getBrowserstackCapabilities = (
  browser: BrowserSpecification
): Record<string, string | boolean> => {
  const localId = process.env.BROWSERSTACK_LOCAL_IDENTIFIER
    ? process.env.BROWSERSTACK_LOCAL_IDENTIFIER
    : getLocalIdentifier();

  const browserstackCapabilities = {
    browser: browser.playwrightName
      ? browser.playwrightName
      : browser.browserName,
    browser_version: browser.browserVersion,
    os: browser.osName,
    os_version: browser.osVersion,
    build: build,
    project: projectName,
    "browserstack.username": BROWSERSTACK_USERNAME,
    "browserstack.accessKey": BROWSERSTACK_ACCESS_KEY,
    "browserstack.local": "true",
    "browserstack.localIdentifier": localId,
    "browserstack.debug": "true",
    "browserstack.console": "errors",
    "browserstack.networkLogs": "false",
    "client.playwrightVersion": "1.58.1",
  };

  return browserstackCapabilities;
};

module.exports = defineConfig({
  testDir: "./",
  fullyParallel: true,
  retries: process.env.BROWSERSTACK_DISABLE_RETRIES ? 0 : 3,
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
      name: `playwright-${browser.browserName}`,
      testIgnore:
        browser.browserName === "Safari"
          ? ["**/paypal-checkout-v6/**"]
          : ["**/apple-pay/**", "**/paypal-checkout-v6/**"],
      use: {
        build: build,
        project: projectName,
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(
            JSON.stringify(getBrowserstackCapabilities(browser))
          )}`,
        },
      },
    };
  }) as PlaywrightTestProject[],
});
