"use strict";

const client = require("../../../src/client");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(client.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(client.VERSION).toBe(packageVersion);
  });
});
