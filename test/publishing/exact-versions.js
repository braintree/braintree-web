"use strict";

const { dependencies: deps } = require("../../package.json");

describe("exact npm versions", () => {
  it.each(Object.keys(deps))("uses an exact version for %s", (depName) => {
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
