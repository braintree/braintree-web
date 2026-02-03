"use strict";

jest.mock("../../../src/lib/basic-component-verification");

var basicComponentVerification = require("../../../src/lib/basic-component-verification");
var paypalCheckoutV6 = require("../../../src/paypal-checkout-v6");
var create = paypalCheckoutV6.create;
var isSupported = paypalCheckoutV6.isSupported;
var PayPalCheckoutV6 = require("../../../src/paypal-checkout-v6/paypal-checkout-v6");

describe("paypalCheckoutV6", function () {
  describe("create", function () {
    beforeEach(function () {
      jest
        .spyOn(PayPalCheckoutV6.prototype, "_initialize")
        .mockResolvedValue(null);
    });

    it("verifies with basicComponentVerification", function () {
      return create({ client: {} }).then(function () {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith({
          name: "PayPal Checkout V6",
          client: {},
        });
      });
    });

    it("calls _initialize", function () {
      return create({ client: {} }).then(function () {
        expect(PayPalCheckoutV6.prototype._initialize).toHaveBeenCalledTimes(1);
        expect(PayPalCheckoutV6.prototype._initialize).toHaveBeenCalledWith({
          client: {},
        });
      });
    });

    it("rejects if _initialize errors", function () {
      var error = new Error("foo");

      PayPalCheckoutV6.prototype._initialize.mockRejectedValue(error);

      return create({ client: {} }).catch(function (err) {
        expect(err).toBe(error);
      });
    });
  });

  describe("isSupported", function () {
    it("returns true", function () {
      expect(isSupported()).toBe(true);
    });
  });
});
