"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const analytics = require("../../../src/lib/analytics");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create } = require("../../../src/apple-pay");
const ApplePay = require("../../../src/apple-pay/apple-pay");
const {
  wait,
  fake: { client: fakeClient, clientToken, configuration },
} = require("../../helpers");

describe("applePay.create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.configuration.gatewayConfiguration.applePayWeb = {};

    testContext.client = fakeClient({
      configuration: testContext.configuration,
    });

    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.client);
    jest.spyOn(basicComponentVerification, "verify").mockResolvedValue(null);
  });

  it("verifies with basicComponentVerification", () => {
    const client = testContext.client;

    return create({
      client,
    }).then(() => {
      expect(basicComponentVerification.verify).toBeCalledTimes(1);
      expect(basicComponentVerification.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Apple Pay",
          client,
        })
      );
    });
  });

  it("can create with an authorization instead of a client", () => {
    let clientIsReady = false;

    createDeferredClient.create.mockImplementation(() => {
      return wait(10).then(() => {
        clientIsReady = true;

        return testContext.client;
      });
    });

    jest.useFakeTimers();

    return create({
      authorization: clientToken,
      useDeferredClient: true,
      debug: true,
    })
      .then((applePayInstance) => {
        expect(clientIsReady).toBe(false);
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authorization: clientToken,
            debug: true,
            assetsUrl: "https://example.com/assets",
            name: "Apple Pay",
          })
        );

        expect(applePayInstance).toBeInstanceOf(ApplePay);

        jest.advanceTimersByTime(11);
      })
      .then(() => {
        expect(clientIsReady).toBe(true);
      });
  });

  it("rejects with an error when apple pay is not enabled in configuration", () => {
    delete testContext.configuration.gatewayConfiguration.applePayWeb;

    return expect(create({ client: testContext.client })).rejects.toMatchObject(
      {
        code: "APPLE_PAY_NOT_ENABLED",
        type: "MERCHANT",
        message: "Apple Pay is not enabled for this merchant.",
      }
    );
  });

  it("sends an analytics event", () => {
    const client = testContext.client;

    return create({
      client,
      displayName: "Awesome Merchant",
    }).then(() => {
      expect(analytics.sendEvent).toHaveBeenCalledWith(
        client,
        "applepay.initialized"
      );
    });
  });
});
