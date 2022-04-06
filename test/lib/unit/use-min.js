"use strict";

const useMin = require("../../../src/lib/use-min");

describe("useMin", () => {
  it('returns "" when isDebug is true', () => {
    expect(useMin(true)).toBe("");
  });

  it('returns ".min" when isDebug is false', () => {
    expect(useMin(false)).toBe(".min");
  });
});
