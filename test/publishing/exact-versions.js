"use strict";

const { dependencies: deps } = require("../../package.json");

// loads the Fastlane SDK for the Fastlane component
const NON_FIXED_DEPS = ["@paypal/accelerated-checkout-loader"];

describe("exact npm versions", () => {
  it.each(Object.keys(deps))("uses an exact version for %s", (depName) => {
    if (NON_FIXED_DEPS.includes(depName)) {
      // Certain packages are allowed to have a caret. Accelerated Checkout Loader is one of those.
      // We want to be able to pull the assets for this module.
      return;
    }
    const version = deps[depName];
    const firstChar = version.charAt(0);

    try {
      expect(Number(firstChar)).not.toBeNaN();
    } catch (e) {
      throw new Error(
        `Expected ${version} to be an exact version, not start with ${firstChar}`
      );
    }
  });
});
