import BraintreeError from "../../../src/lib/braintree-error";
import convertToBraintreeError from "../../../src/lib/convert-to-braintree-error";

describe("convertToBraintreeError", () => {
  it("returns original error if it is a Braintree Error", () => {
    const originalError = new BraintreeError({
      type: "MERCHANT",
      code: "A_CODE",
      message: "My Message",
    });

    const btError = convertToBraintreeError(originalError, {
      type: "NETWORK",
      code: "ANOTHER_CODE",
      message: "Another message",
    });

    expect(btError.code).toBe("A_CODE");
    expect(btError.type).toBe("MERCHANT");
    expect(btError.message).toBe("My Message");
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
