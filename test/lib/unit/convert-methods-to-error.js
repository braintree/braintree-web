"use strict";

const convertMethodsToError = require("../../../src/lib/convert-methods-to-error");
const BraintreeError = require("../../../src/lib/braintree-error");
const { noop } = require("../../helpers");

describe("convertMethodsToError", () => {
  it("can convert an array of methods to throw an error", () => {
    const originalMethods = { foo: noop, boo: noop, baz: noop };
    const obj = { ...originalMethods };

    expect.assertions(11);

    convertMethodsToError(obj, ["boo", "baz"]);

    expect(obj.foo).toBe(originalMethods.foo);
    expect(obj.boo).not.toBe(originalMethods.boo);

    try {
      obj.boo();
    } catch (err) {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("MERCHANT");
      expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
      expect(err.message).toBe("boo cannot be called after teardown.");
    }

    expect(obj.baz).not.toBe(originalMethods.baz);

    try {
      obj.baz();
    } catch (err) {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("MERCHANT");
      expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
      expect(err.message).toBe("baz cannot be called after teardown.");
    }
  });
});
