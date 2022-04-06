"use strict";

const BraintreeError = require("../../../src/lib/braintree-error");
const convertToBraintreeError = require("../../../src/lib/convert-to-braintree-error");

describe("convertToBraintreeError", () => {
  it("returns original error if it is a Braintree Error", () => {
    const originalError = new BraintreeError({
      type: "MERCHANT",
      code: "A_CODE",
      message: "My Message",
    });

    expect(
      convertToBraintreeError(originalError, {
        type: "NETWORK",
        code: "ANOTHER_CODE",
        message: "Another message",
      })
    ).toBe(originalError);
  });

  it("wraps error when it is not a Braintree Error", () => {
    const originalError = new Error("An Error");
    const btError = convertToBraintreeError(originalError, {
      type: "NETWORK",
      code: "A_CODE",
      message: "message",
    });

    expect(btError).toBeInstanceOf(BraintreeError);
    expect(btError.type).toBe("NETWORK");
    expect(btError.code).toBe("A_CODE");
    expect(btError.message).toBe("message");
    expect(btError.details.originalError).toBe(originalError);
  });
});
