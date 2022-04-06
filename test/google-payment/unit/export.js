"use strict";

const { VERSION, create } = require("../../../src/google-payment");
const { version } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(version);
  });
});
