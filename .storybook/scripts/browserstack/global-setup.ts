/* eslint-disable no-console */
import {
  startBrowserStackLocal,
  getLocalIdentifier,
  isLocalConnected,
} from "./browserstack-local";

module.exports = async () => {
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
