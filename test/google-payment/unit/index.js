vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/lib/create-deferred-client");

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import googlePayment from "../../../src/google-payment";
import GooglePayment from "../../../src/google-payment/google-payment";
import { fake, wait } from "../../helpers";

describe("googlePayment", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("create", () => {
    beforeEach(() => {
      const configuration = fake.configuration();

      configuration.gatewayConfiguration.googlePay = {
        googleAuthorization: "fingerprint",
        supportedCardBrands: ["VISA", "AMERICAN_EXPRESS"],
      };

      testContext.fakeClient = fake.client({ configuration: configuration });
      testContext.fakeClient._request = () => {};
      vi.spyOn(createDeferredClient, "create").mockResolvedValue(
        testContext.fakeClient
      );
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

      vi.useFakeTimers();

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

      await vi.advanceTimersByTime(11);

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

      vi.useFakeTimers();

      const promise = googlePayment.create({
        authorization: fake.clientToken,
        debug: true,
      });

      await vi.advanceTimersByTime(1);

      expect(clientIsReady).toBe(false);
      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(createDeferredClient.create).toHaveBeenCalledWith({
        authorization: fake.clientToken,
        debug: true,
        assetsUrl: "https://example.com/assets",
        name: "Google Pay",
      });

      expect(clientIsReady).toBe(false);

      await vi.advanceTimersByTime(11);
      await promise;

      expect(clientIsReady).toBe(true);
    });

    it("returns error if android pay is not enabled", async () => {
      const client = fake.client();

      vi.spyOn(createDeferredClient, "create").mockResolvedValue(client);

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
          googleMerchantId: "some-merchant-id",
        })
        .then((instance) => {
          expect(instance).toBeInstanceOf(GooglePayment);
          expect(instance._googleMerchantId).toBe("some-merchant-id");
        }));
  });
});
