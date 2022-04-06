"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const analytics = require("../../../src/lib/analytics");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const BraintreeError = require("../../../src/lib/braintree-error");
const { create } = require("../../../src/visa-checkout");
const VisaCheckout = require("../../../src/visa-checkout/visa-checkout");
const {
  fake: { client: fakeClient, clientToken, configuration: fakeConfiguration },
} = require("../../helpers");

describe("visaCheckout.create", () => {
  let testContext;

  beforeEach(() => {
    const configuration = fakeConfiguration();

    testContext = {};
    configuration.gatewayConfiguration.visaCheckout = {};

    testContext.configuration = configuration;
    testContext.client = fakeClient({
      configuration: configuration,
    });
    createDeferredClient.create.mockResolvedValue(testContext.client);
  });

  it("verifies with basicComponentVerification", () =>
    create({ client: testContext.client }).then(() => {
      expect(basicComponentVerification.verify).toBeCalledTimes(1);
      expect(basicComponentVerification.verify).toBeCalledWith({
        name: "Visa Checkout",
        client: testContext.client,
      });
    }));

  it("resolves with a VisaCheckout instance when successful", () => {
    expect(create({ client: testContext.client })).resolves.toBeInstanceOf(
      VisaCheckout
    );
  });

  it("can create with an authorization instead of a client", () =>
    create({ authorization: clientToken, debug: true }).then(() => {
      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(createDeferredClient.create).toBeCalledWith({
        authorization: clientToken,
        debug: true,
        assetsUrl: "https://example.com/assets",
        name: "Visa Checkout",
      });
    }));

  it("rejects with an error when visa checkout is not enabled in configuration", () => {
    delete testContext.configuration.gatewayConfiguration.visaCheckout;

    return create({ client: testContext.client }).catch((err) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.code).toBe("VISA_CHECKOUT_NOT_ENABLED");
      expect(err.type).toBe("MERCHANT");
      expect(err.message).toBe(
        "Visa Checkout is not enabled for this merchant."
      );
    });
  });

  it("sends an analytics event", () =>
    create({ client: testContext.client }).then(() => {
      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "visacheckout.initialized"
      );
    }));
});
