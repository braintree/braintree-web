"use strict";

const snakeToCamel = require("../../../src/lib/snake-case-to-camel-case");

describe("snake-case-to-camel-case.js", () => {
  it("should camel case the input", function () {
    const input = "some_snake_string";
    const expectedOutput = "someSnakeString";
    const result = snakeToCamel(input);

    expect(result).toBe(expectedOutput);
  });
});
