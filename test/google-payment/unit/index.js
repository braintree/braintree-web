"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const googlePayment = require("../../../src/google-payment");
const GooglePayment = require("../../../src/google-payment/google-payment");
const { fake, wait } = require("../../helpers");

describe("googlePayment", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("create", () => {
    beforeEach(() => {
      const configuration = fake.configuration();

      configuration.gatewayConfiguration.androidPay = {
        enabled: true,
        googleAuthorizationFingerprint: "fingerprint",
        supportedNetworks: ["visa", "amex"],
      };

      testContext.fakeClient = fake.client({ configuration: configuration });
      testContext.fakeClient._request = () => {};
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.fakeClient);
    });

    it("verifies with basicComponentVerification", async () => {
      const client = testContext.fakeClient;

      await googlePayment.create({
        client: client,
      });

      expect(basicComponentVerification.verify).toBeCalledTimes(1);
      expect(basicComponentVerification.verify).toHaveBeenCalledWith({
        name: "Google Pay",
        client,
      });
    });

    it("instantiates a Google Pay integration", () =>
      googlePayment
        .create({
          client: testContext.fakeClient,
        })
        .then((instance) => {
          expect(instance).toBeInstanceOf(GooglePayment);
        }));

    it("can create with an authorization instead of a client", async () => {
      let clientIsReady = false;

      createDeferredClient.create.mockImplementation(() => {
        return wait(10).then(() => {
          clientIsReady = true;

          return testContext.fakeClient;
        });
      });

      jest.useFakeTimers();

      const instance = await googlePayment.create({
        authorization: fake.clientToken,
        useDeferredClient: true,
        debug: true,
      });

      expect(clientIsReady).toBe(false);
      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(createDeferredClient.create).toHaveBeenCalledWith({
        authorization: fake.clientToken,
        debug: true,
        assetsUrl: "https://example.com/assets",
        name: "Google Pay",
      });

      expect(instance).toBeInstanceOf(GooglePayment);

      await jest.advanceTimersByTime(11);

      expect(clientIsReady).toBe(true);
    });

    it("waits for client before resolving when not passing `useDeferredClient`", async () => {
      let clientIsReady = false;

      createDeferredClient.create.mockImplementation(() => {
        return wait(10).then(() => {
          clientIsReady = true;

          return testContext.fakeClient;
        });
      });

      jest.useFakeTimers();

      const promise = googlePayment.create({
        authorization: fake.clientToken,
        debug: true,
      });

      await jest.advanceTimersByTime(1);

      expect(clientIsReady).toBe(false);
      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(createDeferredClient.create).toHaveBeenCalledWith({
        authorization: fake.clientToken,
        debug: true,
        assetsUrl: "https://example.com/assets",
        name: "Google Pay",
      });

      expect(clientIsReady).toBe(false);

      await jest.advanceTimersByTime(11);
      await promise;

      expect(clientIsReady).toBe(true);
    });

    it("returns error if android pay is not enabled", async () => {
      const client = fake.client();

      jest.spyOn(createDeferredClient, "create").mockResolvedValue(client);

      await expect(
        googlePayment.create({
          client,
        })
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "GOOGLE_PAYMENT_NOT_ENABLED",
        message: "Google Pay is not enabled for this merchant.",
      });
    });

    it("passes additional googlepay configuration options through googlePayment.create", () =>
      googlePayment
        .create({
          client: testContext.fakeClient,
          googlePayVersion: 2,
          googleMerchantId: "some-merchant-id",
        })
        .then((instance) => {
          expect(instance).toBeInstanceOf(GooglePayment);
          expect(instance._googlePayVersion).toBe(2);
          expect(instance._googleMerchantId).toBe("some-merchant-id");
        }));

    it("errors if an unsupported Google Pay API version is passed", () =>
      expect(
        googlePayment.create({
          client: testContext.fakeClient,
          googlePayVersion: 9001,
          googleMerchantId: "some-merchant-id",
        })
      ).rejects.toMatchObject({
        code: "GOOGLE_PAYMENT_UNSUPPORTED_VERSION",
        type: "MERCHANT",
        message:
          "The Braintree SDK does not support Google Pay version 9001. Please upgrade the version of your Braintree SDK and contact support if this error persists.",
      }));
  });
});
