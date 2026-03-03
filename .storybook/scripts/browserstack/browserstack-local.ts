/* eslint-disable no-console */
import browserstack from "browserstack-local";
import uuid from "@braintree/uuid";

// Generate a consistent local identifier, or use environment variable if set
const localIdentifier =
  process.env.BROWSERSTACK_LOCAL_IDENTIFIER || (uuid() as string);
let bsLocal: browserstack.Local | null = null;
let isConnected = false;

export function startBrowserStackLocal(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isConnected) {
      console.log("BrowserStack Local already connected");
      resolve();
      return;
    }

    bsLocal = new browserstack.Local();

    const bsLocalArgs = {
      key: process.env.BROWSERSTACK_ACCESS_KEY ?? "",
      localIdentifier,
      verbose: true,
      forcelocal: true,
      force: true,
    };
    bsLocal.start(bsLocalArgs, (error) => {
      if (error) {
        console.error("Error starting BrowserStack Local:", error);
        reject(error);
        return;
      }

      // Verify the connection is actually running
      if (bsLocal && bsLocal.isRunning()) {
        isConnected = true;
        console.log(
          `BrowserStack Local connected with localIdentifier=${localIdentifier}`
        );
        resolve();
      } else {
        console.error("BrowserStack Local started but is not running");
        reject(new Error("BrowserStack Local is not running"));
      }
    });
  });
}

export function stopBrowserStackLocal(): Promise<void> {
  return new Promise((resolve) => {
    if (bsLocal && isConnected) {
      console.log("Stopping BrowserStack Local...");
      bsLocal.stop(() => {
        console.log("BrowserStack Local stopped");
        isConnected = false;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getLocalIdentifier(): string {
  return localIdentifier;
}

export function isLocalConnected(): boolean {
  return isConnected;
}
