"use strict";

const jsonClone = require("../../../src/lib/json-clone");

describe("jsonClone", () => {
  it("properly clones an empty object", () => {
    const obj = {};

    expect(jsonClone(obj)).toEqual(obj);
    expect(jsonClone(obj)).not.toBe(obj);
  });

  it("properly clones an object with properties", () => {
    const obj = {
      foo: "boo",
      bar: ["car"],
      baz: {
        caz: "daz",
      },
    };

    expect(jsonClone(obj)).toEqual(obj);
    expect(jsonClone(obj)).not.toBe(obj);
  });

  it("does a deep clone", () => {
    const obj = {
      foo: "boo",
      bar: ["car"],
      baz: {
        caz: "daz",
      },
    };

    expect(jsonClone(obj).bar).not.toBe(obj.bar);
    expect(jsonClone(obj).baz).not.toBe(obj.baz);
  });
});
