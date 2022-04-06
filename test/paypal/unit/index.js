"use strict";

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create, isSupported } = require("../../../src/paypal");
const analytics = require("../../../src/lib/analytics");
const { fake } = require("../../helpers");
const PayPal = require("../../../src/paypal/external/paypal");
const BraintreeError = require("../../../src/lib/braintree-error");

describe("paypal", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  afterEach(() => {
    delete window.popupBridge;
  });

  describe("create", () => {
    beforeEach(() => {
      testContext.configuration = fake.configuration();
      testContext.configuration.gatewayConfiguration.paypalEnabled = true;
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });

      jest.spyOn(basicComponentVerification, "verify").mockResolvedValue(null);
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.client);
    });

    it("verifies with basicComponentVerification", () => {
      const client = testContext.client;

      jest.spyOn(PayPal.prototype, "_initialize").mockResolvedValue(null);

      return create({
        client: client,
      }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith({
          name: "PayPal",
          client: client,
        });
      });
    });

    it("can create with an authorization instead of a client", () => {
      jest.spyOn(PayPal.prototype, "_initialize").mockResolvedValue(null);

      return create({
        authorization: fake.clientToken,
        debug: true,
      }).then(() => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).toBeUndefined();
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "PayPal",
        });

        expect(PayPal.prototype._initialize).toHaveBeenCalledTimes(1);
      });
    });

    it("rejects if paypal is not enabled for the merchant", () => {
      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return create({ client: testContext.client }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("PAYPAL_NOT_ENABLED");
        expect(err.message).toBe("PayPal is not enabled for this merchant.");
      });
    });

    it("sends an analytics event", () => {
      const client = testContext.client;

      jest.spyOn(PayPal.prototype, "_initialize").mockResolvedValue(null);

      return create({ client: client }).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          client,
          "paypal.initialized"
        );
      });
    });
  });

  describe("isSupported", () => {
    it("returns true", () => {
      expect(isSupported()).toBe(true);
    });
  });
});
