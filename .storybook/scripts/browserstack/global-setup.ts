/* eslint-disable no-console */
import {
  startBrowserStackLocal,
  getLocalIdentifier,
  isLocalConnected,
} from "./browserstack-local";

const requiredEnvVars = [
  "BROWSERSTACK_USERNAME",
  "BROWSERSTACK_ACCESS_KEY",
  "PAYPAL_SANDBOX_BUYER_EMAIL",
  "PAYPAL_SANDBOX_BUYER_PASSWORD",
  "STORYBOOK_BRAINTREE_MERCHANT_ID",
  "STORYBOOK_BRAINTREE_PUBLIC_KEY",
  "STORYBOOK_BRAINTREE_PRIVATE_KEY",
  "STORYBOOK_BRAINTREE_CUSTOMER_ID",
];

module.exports = async () => {
  if (process.env.CI === "true") {
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      console.error(
        `Missing env vars required for CI to run:\n${missingVars.join(", ")}`
      );
      process.exit(1);
    }
  }

  if (
    process.env.BROWSERSTACK_USERNAME &&
    process.env.BROWSERSTACK_ACCESS_KEY
  ) {
    const localId = getLocalIdentifier();
    process.env.BROWSERSTACK_LOCAL_IDENTIFIER = localId;

    await startBrowserStackLocal();

    if (!isLocalConnected()) {
      console.error("✗ BrowserStack Local failed to connect properly");
      throw new Error("BrowserStack Local is not connected");
    }
  } else {
    console.log("Skipping BrowserStack Local - credentials not set");
  }
};
