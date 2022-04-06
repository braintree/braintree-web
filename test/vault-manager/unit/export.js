"use strict";

const { VERSION, create } = require("../../../src/vault-manager");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(packageVersion);
  });
});
