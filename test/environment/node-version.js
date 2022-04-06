"use strict";

const fs = require("fs");
const { resolve } = require("path");

describe("current environment", () => {
  test("is set up with the correct Node version", () => {
    const nvmrcPath = resolve(__dirname, "..", "..", ".nvmrc");
    const expectedVersion = fs
      .readFileSync(nvmrcPath)
      .toString()
      .trim()
      .replace(/^v/, "^")
      .replace(/\./, "\\.");
    const actualVersion = process.versions.node;

    expect(actualVersion).toMatch(new RegExp(expectedVersion));
  });
});
