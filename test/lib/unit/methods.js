"use strict";

const methods = require("../../../src/lib/methods");
const { noop } = require("../../helpers");

describe("methods", () => {
  it("extracts all methods from an object", () => {
    const obj = {
      fnOne: noop,
      fnTwo: noop,
      property1: "I am a property",
    };

    expect(methods(obj)).toEqual(expect.arrayContaining(["fnOne", "fnTwo"]));
  });

  it("extracts all methods from an object with a superclass", () => {
    let obj;

    function Klass() {
      this.childFn = noop;
      this.childProperty = "I am a property";
    }

    Klass.prototype.parentFn = noop;

    obj = new Klass();

    expect(methods(obj)).toEqual(["childFn"]);
  });

  it("returns [] with empty object", () => {
    const obj = {};

    expect(methods(obj)).toEqual([]);
  });
});
