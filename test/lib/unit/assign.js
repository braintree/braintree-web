"use strict";

const { _assign, assign } = require("../../../src/lib/assign");

describe("assign", () => {
  describe.each([
    ["exported function", assign],
    ["polyfill", _assign],
  ])("%s", (text, assignMethod) => {
    it("does nothing to one object", () => {
      const obj = { foo: "bar" };

      expect(assignMethod(obj)).toBe(obj);
    });

    it("merges two objects", () => {
      const a = { foo: "yas", bar: "ugh" };
      const b = { foo: "nope", baz: "wow" };

      expect(assignMethod(a, b)).toEqual({
        foo: "nope",
        bar: "ugh",
        baz: "wow",
      });
    });

    it("merges three objects", () => {
      const a = { foo: "yas", bar: "ugh" };
      const b = { foo: "nope" };
      const c = { foo: "wow", baz: "cool" };

      expect(assignMethod(a, b, c)).toEqual({
        foo: "wow",
        bar: "ugh",
        baz: "cool",
      });
    });

    it("returns the first object passed", () => {
      const a = { foo: "yas", bar: "ugh" };
      const b = { foo: "nope", baz: "wow" };

      expect(assignMethod(a, b)).toBe(a);
    });

    it("doesn't take inherited properties", () => {
      let a, b;

      function Klass() {
        this.foo = "yas";
      }

      Klass.prototype.bar = "ugh";

      a = { foo: "nope", baz: "wow" };
      b = new Klass();

      expect(assignMethod(a, b)).toEqual({
        foo: "yas",
        baz: "wow",
      });
    });
  });
});
