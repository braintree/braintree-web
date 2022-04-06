"use strict";

const applePay = require("../../../src/apple-pay");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(applePay.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(applePay.VERSION).toBe(packageVersion);
  });
});
