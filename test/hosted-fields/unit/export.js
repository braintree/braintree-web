"use strict";

const hostedFields = require("../../../src/hosted-fields");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(hostedFields.create).toEqual(expect.any(Function));
  });

  it("sets the version", () => {
    expect(hostedFields.VERSION).toBe(packageVersion);
  });
});
