"use strict";

const threeDSecure = require("../../../src/three-d-secure");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(threeDSecure.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(threeDSecure.VERSION).toBe(packageVersion);
  });
});
