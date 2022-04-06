"use strict";

jest.mock("../../../src/lib/basic-component-verification");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const { create, isSupported } = require("../../../src/paypal-checkout");
const PayPalCheckout = require("../../../src/paypal-checkout/paypal-checkout");

describe("paypalCheckout", () => {
  describe("create", () => {
    beforeEach(() => {
      jest
        .spyOn(PayPalCheckout.prototype, "_initialize")
        .mockResolvedValue(null);
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

  describe("isSupported", () => {
    it("returns true", () => {
      expect(isSupported()).toBe(true);
    });
  });
});
