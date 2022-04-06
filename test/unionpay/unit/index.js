"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");

const analytics = require("../../../src/lib/analytics");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create } = require("../../../src/unionpay");
const {
  fake: { client: fakeClient, clientToken, configuration },
} = require("../../helpers");
const BraintreeError = require("../../../src/lib/braintree-error");
const UnionPay = require("../../../src/unionpay/shared/unionpay");

describe("unionPay.create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.configuration.gatewayConfiguration.unionPay = {
      enabled: true,
    };
    testContext.client = fakeClient({
      configuration: testContext.configuration,
    });
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.client);
  });

  it("verifies with basicComponentVerification", (done) => {
    const client = testContext.client;

    create(
      {
        client,
      },
      () => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(basicComponentVerification.verify).toBeCalledWith(
          expect.objectContaining({
            name: "UnionPay",
            client,
          })
        );
        done();
      }
    );
  });

  it("can create with an authorization instead of a client", (done) => {
    create(
      {
        authorization: clientToken,
        debug: true,
      },
      (err, instance) => {
        expect(err).toBeFalsy();

        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toBeCalledWith({
          authorization: clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "UnionPay",
        });

        expect(instance).toBeInstanceOf(UnionPay);

        done();
      }
    );
  });

  it("returns a promise", () => {
    const promise = create({ client: testContext.client });

    expect(promise.then).toStrictEqual(expect.any(Function));
    expect(promise.catch).toStrictEqual(expect.any(Function));
  });

  it("errors out if unionpay is not enabled for the merchant", (done) => {
    testContext.configuration.gatewayConfiguration.unionPay.enabled = false;

    create({ client: testContext.client }, (err, thingy) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("MERCHANT");
      expect(err.code).toBe("UNIONPAY_NOT_ENABLED");
      expect(err.message).toBe("UnionPay is not enabled for this merchant.");
      expect(thingy).toBeFalsy();
      done();
    });
  });

  it("errors out if no unionpay configuration exists", (done) => {
    delete testContext.configuration.gatewayConfiguration.unionPay;

    create({ client: testContext.client }, (err, thingy) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("MERCHANT");
      expect(err.code).toBe("UNIONPAY_NOT_ENABLED");
      expect(err.message).toBe("UnionPay is not enabled for this merchant.");
      expect(thingy).toBeFalsy();
      done();
    });
  });

  it("sends an analytics event", (done) => {
    const client = testContext.client;

    create({ client }, (err) => {
      expect(err).toBeFalsy();
      expect(analytics.sendEvent).toBeCalledWith(
        client,
        "unionpay.initialized"
      );

      done();
    });
  });

  it("creates a UnionPay instance", (done) => {
    create({ client: testContext.client }, (err, unionpay) => {
      expect(err).toBeFalsy();
      expect(unionpay).toBeInstanceOf(UnionPay);

      done();
    });
  });
});
