"use strict";

const visaCheckout = require("../../../src/visa-checkout");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(visaCheckout.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(visaCheckout.VERSION).toBe(packageVersion);
  });
});
