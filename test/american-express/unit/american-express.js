import AmericanExpress from "../../../src/american-express/american-express";
import BraintreeError from "../../../src/lib/braintree-error";
import methods from "../../../src/lib/methods";

describe("AmericanExpress", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.NONCE = "ed1704dc-e98c-427f-9836-0f1933755b6a";
    testContext.client = {
      request: vi.fn().mockResolvedValue(null),
    };
    testContext.amex = new AmericanExpress({ client: testContext.client });
  });

  describe("getRewardsBalance", () => {
    it("returns a promise", () => {
      const promise = testContext.amex.getRewardsBalance({
        nonce: testContext.NONCE,
      });

      return expect(promise).resolves.toBeNull();
    });

    it("rejects with an error if called without a nonce", async () => {
      await expect(
        testContext.amex.getRewardsBalance({})
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "AMEX_NONCE_REQUIRED",
        message: "getRewardsBalance must be called with a nonce.",
      });
      expect(testContext.client.request).not.toHaveBeenCalled();
    });

    it("makes a request to the gateway and rejects if it fails", async () => {
      const requestError = new Error("something went wrong");

      testContext.client.request.mockRejectedValue(requestError);

      await expect(
        testContext.amex.getRewardsBalance({ nonce: testContext.NONCE })
      ).rejects.toMatchObject({
        type: "NETWORK",
        code: "AMEX_NETWORK_ERROR",
        message:
          "A network error occurred when getting the American Express rewards balance.",
        details: { originalError: requestError },
      });
    });

    it("makes a request to the gateway and resolves if it succeeds", async () => {
      const fakeResponseData = { foo: "boo" };

      testContext.client.request.mockResolvedValue(fakeResponseData);

      const response = await testContext.amex.getRewardsBalance({
        nonce: testContext.NONCE,
      });

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

    it("passes along options to gateway", async () => {
      testContext.client.request.mockResolvedValue(null);

      await testContext.amex.getRewardsBalance({
        nonce: testContext.NONCE,
        foo: "bar",
      });

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

    it("does not modify the options that are passed in", async () => {
      const options = {
        nonce: testContext.NONCE,
        foo: "boo",
      };

      testContext.client.request.mockResolvedValue(null);

      await testContext.amex.getRewardsBalance(options);

      expect(options).toEqual({
        nonce: testContext.NONCE,
        foo: "boo",
      });
    });
  });

  describe("getExpressCheckoutProfile", () => {
    it("returns a promise", () => {
      const promise = testContext.amex.getExpressCheckoutProfile({
        nonce: testContext.NONCE,
      });

      return expect(promise).resolves.toBeNull();
    });

    it("rejects with an error if called without a nonce", async () => {
      await expect(
        testContext.amex.getExpressCheckoutProfile({})
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "AMEX_NONCE_REQUIRED",
        message: "getExpressCheckoutProfile must be called with a nonce.",
      });
      expect(testContext.client.request).not.toHaveBeenCalled();
    });

    it("makes a request to the gateway and rejects if it fails", async () => {
      const requestError = new Error("something went wrong");

      testContext.client.request.mockRejectedValue(requestError);

      await expect(
        testContext.amex.getExpressCheckoutProfile({
          nonce: testContext.NONCE,
        })
      ).rejects.toMatchObject({
        type: "NETWORK",
        code: "AMEX_NETWORK_ERROR",
        message:
          "A network error occurred when getting the American Express Checkout nonce profile.",
        details: { originalError: requestError },
      });
    });

    it("makes a request to the gateway and resolves if it succeeds", async () => {
      const fakeResponseData = { foo: "boo" };

      testContext.client.request.mockResolvedValue(fakeResponseData);

      const response = await testContext.amex.getExpressCheckoutProfile({
        nonce: testContext.NONCE,
      });

      expect(testContext.client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "get",
          endpoint:
            "payment_methods/amex_express_checkout_cards/" + testContext.NONCE,
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

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", async () => {
      const instance = testContext.amex;

      await instance.teardown();

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
        expect(err.message).toBe(method + " cannot be called after teardown.");
      });
    });
  });
});
