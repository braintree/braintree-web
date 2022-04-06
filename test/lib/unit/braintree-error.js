"use strict";

const BraintreeError = require("../../../src/lib/braintree-error");

describe("BraintreeError", () => {
  it("inherits from Error", () => {
    expect(
      new BraintreeError({
        type: "CUSTOMER",
        code: "SOME_CODE",
        message: "Foo",
      })
    ).toBeInstanceOf(Error);
  });

  it("errors if type is invalid", () => {
    expect(() => {
      new BraintreeError({
        type: "INVALID",
        code: "SOME_CODE",
        message: "Foo",
      });
    }).toThrowError("INVALID is not a valid type");
  });

  it("errors if code is missing", () => {
    expect(() => {
      new BraintreeError({
        type: "CUSTOMER",
        message: "Foo",
      });
    }).toThrowError("Error code required");
  });

  it("errors if message is missing", () => {
    expect(() => {
      new BraintreeError({
        type: "CUSTOMER",
        code: "SOME_CODE",
      });
    }).toThrowError("Error message required");
  });

  it("creates a Braintree Error", () => {
    const { code, message, type } = new BraintreeError({
      type: "CUSTOMER",
      code: "SOME_CODE",
      message: "Foo",
    });

    expect(type).toBe("CUSTOMER");
    expect(code).toBe("SOME_CODE");
    expect(message).toBe("Foo");
  });

  it("can include a details object", () => {
    const details = { originalError: new Error("foo") };
    const btError = new BraintreeError({
      type: "CUSTOMER",
      code: "SOME_CODE",
      message: "Foo",
      details,
    });

    expect(btError.details).toBe(details);
  });

  describe("findRootError", () => {
    it("returns the passed in error if it is not a Braintree Error", () => {
      const error = new Error("Foo");

      expect(BraintreeError.findRootError(error)).toBe(error);
    });

    it("returns the passed in error if it does not have details", () => {
      const error = new BraintreeError({
        type: "CUSTOMER",
        code: "CODE",
        message: "Message",
      });

      expect(BraintreeError.findRootError(error)).toBe(error);
    });

    it("returns the passed in error if it does not have details.originalError", () => {
      const error = new BraintreeError({
        type: "CUSTOMER",
        code: "CODE",
        message: "Message",
        details: {},
      });

      expect(BraintreeError.findRootError(error)).toBe(error);
    });

    it("returns the error in details.originalError", () => {
      const originalError = new Error("Foo");
      const btError = new BraintreeError({
        type: "CUSTOMER",
        code: "CODE",
        message: "Message",
        details: { originalError },
      });

      expect(BraintreeError.findRootError(btError)).toBe(originalError);
    });

    it("returns the most deeply nested error", () => {
      const originalError = new Error("Foo");
      const btError = new BraintreeError({
        type: "CUSTOMER",
        code: "FIRST",
        message: "Message",
        details: {
          originalError: new BraintreeError({
            type: "CUSTOMER",
            code: "SECOND",
            message: "Message",
            details: {
              originalError: new BraintreeError({
                type: "CUSTOMER",
                code: "THIRD",
                message: "Message",
                details: { originalError },
              }),
            },
          }),
        },
      });

      expect(BraintreeError.findRootError(btError)).toBe(originalError);
    });

    it("returns the most deeply nested Braintree Error", () => {
      const originalError = new BraintreeError({
        type: "CUSTOMER",
        code: "ORIGINAL",
        message: "Message",
      });
      const btError = new BraintreeError({
        type: "CUSTOMER",
        code: "FIRST",
        message: "Message",
        details: {
          originalError: new BraintreeError({
            type: "CUSTOMER",
            code: "SECOND",
            message: "Message",
            details: {
              originalError: new BraintreeError({
                type: "CUSTOMER",
                code: "THIRD",
                message: "Message",
                details: { originalError },
              }),
            },
          }),
        },
      });

      expect(BraintreeError.findRootError(btError)).toBe(originalError);
    });
  });
});
