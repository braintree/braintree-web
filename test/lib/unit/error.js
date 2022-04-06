"use strict";

const BraintreeError = require("../../../src/lib/braintree-error");

describe("BraintreeError", () => {
  it("returns a properly formatted error", () => {
    const options = {
      type: BraintreeError.types.UNKNOWN,
      code: "YOU_GOOFED",
      message: "yep it's an error",
    };

    const { code, message, name, type } = new BraintreeError(options);

    expect(name).toBe("BraintreeError");
    expect(type).toBe(options.type);
    expect(code).toBe(options.code);
    expect(message).toBe(options.message);
  });

  it("BraintreeError expects a non-empty message", () => {
    expect.assertions(4);

    try {
      new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: "YOU_GOOFED",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("Error message required.");
    }

    try {
      new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: "YOU_GOOFED",
        message: "",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("Error message required.");
    }
  });

  it("BraintreeError expects a non-empty code", () => {
    let err;

    try {
      new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        message: "You goofed",
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Error code required.");
    err = null;

    try {
      new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: "",
        message: "You goofed",
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Error code required.");
  });

  it("BraintreeError type can only accept a value from the defined error types", () => {
    expect.assertions(8);

    try {
      new BraintreeError({
        message: "you goofed",
        code: "YOU_GOOFED",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("undefined is not a valid type.");
    }

    try {
      new BraintreeError({
        type: "",
        code: "YOU_GOOFED",
        message: "you goofed",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe(" is not a valid type.");
    }

    try {
      new BraintreeError({
        type: "NOPE",
        code: "YOU_GOOFED",
        message: "I should fail",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("NOPE is not a valid type.");
    }

    try {
      new BraintreeError({
        type: "hasOwnProperty",
        code: "YOU_GOOFED",
        message: "I should fail",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("hasOwnProperty is not a valid type.");
    }
  });

  it("BraintreeError.type is an enum of error types", () => {
    expect(BraintreeError.types).toEqual({
      CUSTOMER: "CUSTOMER",
      MERCHANT: "MERCHANT",
      NETWORK: "NETWORK",
      INTERNAL: "INTERNAL",
      UNKNOWN: "UNKNOWN",
    });
  });
});
