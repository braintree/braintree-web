"use strict";

const comparePossibleCardTypes = require("../../../../src/hosted-fields/internal/compare-possible-card-types");

describe("comparePossibleCardTypes", () => {
  it("returns true for 2 equal lists", () => {
    const a = [{ type: "a" }];
    const b = [{ type: "a" }];

    expect(comparePossibleCardTypes(a, b)).toBe(true);
    expect(comparePossibleCardTypes(b, a)).toBe(true);
  });

  it("returns false for 2 unequal lists", () => {
    const a = [{ type: "a" }];
    const b = [{ type: "b" }];

    expect(comparePossibleCardTypes(a, b)).toBe(false);
    expect(comparePossibleCardTypes(b, a)).toBe(false);
  });

  it("returns true for 2 empty lists", () => {
    const a = [];
    const b = [];

    expect(comparePossibleCardTypes(a, b)).toBe(true);
    expect(comparePossibleCardTypes(b, a)).toBe(true);
  });

  it("returns false for 1 empty list and 1 non-empty list", () => {
    const a = [];
    const b = [{ type: "a" }];

    expect(comparePossibleCardTypes(a, b)).toBe(false);
    expect(comparePossibleCardTypes(b, a)).toBe(false);
  });

  it("returns false if one list is a subset of another", () => {
    const a = [{ type: "a" }, { type: "b" }];
    const b = [{ type: "a" }];

    expect(comparePossibleCardTypes(a, b)).toBe(false);
    expect(comparePossibleCardTypes(b, a)).toBe(false);
  });
});
