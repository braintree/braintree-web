"use strict";

const AmericanExpress = require("../../../src/american-express/american-express");
const BraintreeError = require("../../../src/lib/braintree-error");
const methods = require("../../../src/lib/methods");

describe("AmericanExpress", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.NONCE = "ed1704dc-e98c-427f-9836-0f1933755b6a";
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
    };
    testContext.amex = new AmericanExpress({ client: testContext.client });
  });

  describe("getRewardsBalance", () => {
    it("returns a promise", () => {
      const promise = testContext.amex.getRewardsBalance({
        nonce: testContext.NONCE,
      });

      expect(promise).resolves.toBeNull();
    });

    it("calls the callback with an error if called without a nonce", () =>
      testContext.amex.getRewardsBalance({}).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("AMEX_NONCE_REQUIRED");
        expect(err.message).toBe(
          "getRewardsBalance must be called with a nonce."
        );

        expect(testContext.client.request).not.toHaveBeenCalled();
      }));

    it("makes a request to the gateway and rejects if it fails", () => {
      const requestError = new Error("something went wrong");

      testContext.client.request.mockRejectedValue(requestError);

      return testContext.amex
        .getRewardsBalance({ nonce: testContext.NONCE })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("AMEX_NETWORK_ERROR");
          expect(err.message).toBe(
            "A network error occurred when getting the American Express rewards balance."
          );
          expect(err.details).toEqual({ originalError: requestError });
        });
    });

    it("makes a request to the gateway and resolves if it succeeds", () => {
      const fakeResponseData = { foo: "boo" };

      testContext.client.request.mockResolvedValue(fakeResponseData);

      return testContext.amex
        .getRewardsBalance({ nonce: testContext.NONCE })
        .then((response) => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              method: "get",
              endpoint: "payment_methods/amex_rewards_balance",
              data: {
                _meta: {
                  source: "american-express",
                },
                paymentMethodNonce: testContext.NONCE,
              },
            })
          );

          expect(response).toBe(fakeResponseData);
        });
    });

    it("passes along options to gateway", () => {
      testContext.client.request.mockResolvedValue(null);

      return testContext.amex
        .getRewardsBalance({ nonce: testContext.NONCE, foo: "bar" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: {
                _meta: { source: "american-express" },
                paymentMethodNonce: testContext.NONCE,
                foo: "bar",
              },
            })
          );
        });
    });

    it("does not modify the options that are passed in", () => {
      const options = {
        nonce: testContext.NONCE,
        foo: "boo",
      };

      testContext.client.request.mockResolvedValue(null);

      return testContext.amex.getRewardsBalance(options).then(() => {
        expect(options).toEqual({
          nonce: testContext.NONCE,
          foo: "boo",
        });
      });
    });
  });

  describe("getExpressCheckoutProfile", () => {
    it("returns a promise", () => {
      const promise = testContext.amex.getExpressCheckoutProfile({
        nonce: testContext.NONCE,
      });

      expect(promise).resolves.toBeNull();
    });

    it("rejects with an error if called without a nonce", () =>
      testContext.amex.getExpressCheckoutProfile({}).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("AMEX_NONCE_REQUIRED");
        expect(err.message).toBe(
          "getExpressCheckoutProfile must be called with a nonce."
        );

        expect(testContext.client.request).not.toHaveBeenCalled();
      }));

    it("makes a request to the gateway and calls the callback if it fails", () => {
      const requestError = new Error("something went wrong");

      testContext.client.request.mockRejectedValue(requestError);

      return testContext.amex
        .getExpressCheckoutProfile({ nonce: testContext.NONCE })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("AMEX_NETWORK_ERROR");
          expect(err.message).toBe(
            "A network error occurred when getting the American Express Checkout nonce profile."
          );
          expect(err.details).toEqual({ originalError: requestError });
        });
    });

    it("makes a request to the gateway and calls the callback if it succeeds", () => {
      const fakeResponseData = { foo: "boo" };

      testContext.client.request.mockResolvedValue(fakeResponseData);

      return testContext.amex
        .getExpressCheckoutProfile({ nonce: testContext.NONCE })
        .then((response) => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              method: "get",
              endpoint:
                "payment_methods/amex_express_checkout_cards/" +
                testContext.NONCE,
              data: {
                _meta: {
                  source: "american-express",
                },
                paymentMethodNonce: testContext.NONCE,
              },
            })
          );

          expect(response).toBe(fakeResponseData);
        });
    });
  });

  describe("teardown", () => {
    it("returns a promise", () => testContext.amex.teardown());

    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      const instance = testContext.amex;

      instance.teardown(() => {
        methods(AmericanExpress.prototype).forEach((method) => {
          let err;

          try {
            instance[method]();
          } catch (e) {
            err = e;
          }

          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe(BraintreeError.types.MERCHANT);
          expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
          expect(err.message).toBe(
            method + " cannot be called after teardown."
          );
        });

        done();
      });
    });
  });
});
