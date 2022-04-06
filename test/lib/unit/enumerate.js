"use strict";

const enumerate = require("../../../src/lib/enumerate");

describe("enumerate", () => {
  it("sets keys equal to their values", () => {
    expect(enumerate(["value1", "value2"])).toEqual({
      value1: "value1",
      value2: "value2",
    });
  });

  it("sets keys equal to their values with a prefix", () => {
    expect(enumerate(["value1", "value2"], "prefix:")).toEqual({
      value1: "prefix:value1",
      value2: "prefix:value2",
    });
  });
});
