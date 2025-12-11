/* eslint-disable no-console */
import { EventEmitter } from "events";
import browserstack from "browserstack-local";
import { loadHelpers } from "./tests/helper";

type BrowserStackCapability = {
  browserName: string;
  "bstack:options": {
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    local?: boolean;
    debug?: boolean;
    seleniumVersion?: string;
    localIdentifier?: string;
    networkLogs?: boolean;
    deviceName?: string;
    deviceOrientation?: string;
    [key: string]: unknown; // Allow additional properties
  };
  acceptInsecureCerts?: boolean;
};

// Stop node from complaining about fake memory leaks at higher concurrency
EventEmitter.defaultMaxListeners = 20;

// Module-level variables to replace exports usage
let bsLocal: browserstack.Local;
const localIdentifier = `local-${Date.now()}`;

// Common capabilities that can be merged with specific capabilities
const commonCapabilities = {
  "bstack:options": {
    projectName: "Braintree Web SDK",
    buildName: "Web SDK Storybook",
  },
};

const SELENIUM_VERSION = "4.38.0";
const WINDOWS_OS_NAME = "Windows";
const WINDOWS_OS_VERSION = "10";
const MAC_OS_NAME = "OS X";
const MAC_OS_VERSION = "Monterey";

export const config = {
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  hostname: "hub.browserstack.com",
  logLevel: "error", // set to error to reduce noise when running tests, set to info or debug for more verbose logging
  bail: 0,
  waitforTimeout: process.env.LOCAL_BUILD === "true" ? 40000 : 20000,
  connectionRetryTimeout: process.env.LOCAL_BUILD === "true" ? 120000 : 90000,
  connectionRetryCount: 1,
  framework: "mocha",
  mochaOpts: {
    timeout: 60000,
  },
  reporters: ["spec"],
  services: [
    [
      "browserstack",
      {
        runner: "local",
        browserstackLocal: true,
        disableCorsRestrictions: true,
        forcedStop: true,
      },
    ],
  ],
  specs: ["./tests/**/*.test.ts"],
  // Available browsers and versions:
  // https://www.browserstack.com/docs/automate-turboscale/getting-started/browsers-and-versions
  capabilities: [
    {
      browserName: "Chrome",
      "bstack:options": {
        browserVersion: "latest",
        os: WINDOWS_OS_NAME,
        osVersion: WINDOWS_OS_VERSION,
        local: true,
        debug: true,
        seleniumVersion: SELENIUM_VERSION,
        localIdentifier,
        networkLogs: true,
      },
      acceptInsecureCerts: true,
    },
    {
      browserName: "Safari",
      "bstack:options": {
        browserVersion: "latest",
        os: MAC_OS_NAME,
        osVersion: MAC_OS_VERSION,
        local: true,
        debug: true,
        seleniumVersion: SELENIUM_VERSION,
        localIdentifier,
        networkLogs: true,
      },
      acceptInsecureCerts: true,
    },
    {
      browserName: "Firefox",
      "bstack:options": {
        browserVersion: "latest",
        os: MAC_OS_NAME,
        osVersion: MAC_OS_VERSION,
        local: true,
        debug: true,
        seleniumVersion: SELENIUM_VERSION,
        localIdentifier,
        networkLogs: true,
      },
      acceptInsecureCerts: true,
    },
    {
      browserName: "MicrosoftEdge",
      "bstack:options": {
        browserVersion: "latest",
        os: WINDOWS_OS_NAME,
        osVersion: WINDOWS_OS_VERSION,
        local: true,
        debug: true,
        seleniumVersion: SELENIUM_VERSION,
        localIdentifier,
        networkLogs: true,
      },
      acceptInsecureCerts: true,
    },
  ],
  onPrepare() {
    console.log("Connecting to local Browserstack");

    return new Promise((resolve, reject) => {
      bsLocal = new browserstack.Local();
      bsLocal.start(
        {
          key: process.env.BROWSERSTACK_ACCESS_KEY || "",
          localIdentifier,
          verbose: true,
          forcelocal: true,
          force: true,
        },
        (error?: Error) => {
          if (error)
            return reject(
              new Error(error?.message || "BrowserStack Local Error")
            );

          console.log(`Connected with localIdentifier=${localIdentifier}`);
          console.log(
            "Testing in the following browsers:",
            (config.capabilities as BrowserStackCapability[])
              .map(
                (browserConfig: BrowserStackCapability) =>
                  `${browserConfig.browserName}@${browserConfig["bstack:options"]?.browserVersion ?? browserConfig["bstack:options"]?.osVersion}`
              )
              .join(", ")
          );

          return resolve(undefined);
        }
      );
    });
  },
  async before() {
    console.log("🔧 Environment variables:");
    console.log("  LOCAL_BUILD:", process.env.LOCAL_BUILD);
    console.log("  BRAINTREE_JS_ENV:", process.env.BRAINTREE_JS_ENV);

    loadHelpers(); // Uncomment when loadHelpers function is available

    await browser.setTimeout({
      pageLoad: 10000,
      script: 5 * 60 * 1000,
    });
  },
  onComplete() {
    return new Promise<void>((resolve) => {
      if (bsLocal) {
        bsLocal.stop(() => {
          console.log("BrowserStack Local stopped");

          resolve();
        });
      }

      setTimeout(() => resolve(), 10000); // Just resolve if Browserstack hasn't yet
    });
  },
  maxInstances: 10,
};

// Fix capabilities merging if commonCapabilities is needed
if (commonCapabilities) {
  config.capabilities.forEach((caps) => {
    for (const key in commonCapabilities) {
      if (key in caps) continue; // Skip if the key already exists in caps
      caps[key] = {
        ...caps[key],
        ...commonCapabilities[key as keyof typeof commonCapabilities],
      };
    }
  });
}
