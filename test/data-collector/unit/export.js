"use strict";

const dataCollector = require("../../../src/data-collector");
const { version } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(dataCollector.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(dataCollector.VERSION).toBe(version);
  });
});
