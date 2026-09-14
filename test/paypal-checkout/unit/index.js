vi.mock("../../../src/lib/basic-component-verification");

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import _e12 from "../../../src/paypal-checkout";

const { create } = _e12;

import PayPalCheckout from "../../../src/paypal-checkout/paypal-checkout";

describe("paypalCheckout", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.spyOn(PayPalCheckout.prototype, "_initialize").mockResolvedValue(null);
    });

    it("verifies with basicComponentVerification", () =>
      create({ client: {} }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith({
          name: "PayPal Checkout",
          client: {},
        });
      }));

    it("calls _initialize", () =>
      create({ client: {} }).then(() => {
        expect(PayPalCheckout.prototype._initialize).toHaveBeenCalledTimes(1);
        expect(PayPalCheckout.prototype._initialize).toHaveBeenCalledWith({
          client: {},
        });
      }));

    it("rejects if _initialize errors", () => {
      const error = new Error("foo");

      PayPalCheckout.prototype._initialize.mockRejectedValue(error);

      return create({ client: {} }).catch((err) => {
        expect(err).toBe(error);
      });
    });
  });
});
