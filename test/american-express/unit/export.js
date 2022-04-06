"use strict";

const americanExpress = require("../../../src/american-express");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(americanExpress.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(americanExpress.VERSION).toBe(packageVersion);
  });
});
