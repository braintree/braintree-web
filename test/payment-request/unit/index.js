"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const paymentRequest = require("../../../src/payment-request");
const PaymentRequestComponent = require("../../../src/payment-request/external/payment-request");
const { fake } = require("../../helpers");

describe("paymentRequest", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("create", () => {
    beforeEach(() => {
      testContext.fakeClient = fake.client();
      testContext.fakeClient._request = jest.fn();
      jest
        .spyOn(PaymentRequestComponent.prototype, "initialize")
        .mockResolvedValue({});
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.fakeClient);
    });

    it("returns a promise", () =>
      paymentRequest.create({ client: testContext.fakeClient }));

    it("verifies with basicComponentVerification", () =>
      paymentRequest
        .create({
          client: testContext.fakeClient,
        })
        .then(() => {
          expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
          expect(basicComponentVerification.verify).toHaveBeenCalledWith({
            name: "Payment Request",
            client: testContext.fakeClient,
          });
        }));

    it("can create with an authorization instead of a client", () =>
      paymentRequest
        .create({
          authorization: fake.clientToken,
          debug: true,
        })
        .then((instance) => {
          expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
          expect(
            createDeferredClient.create.mock.calls[0][0].client
          ).toBeUndefined();
          expect(createDeferredClient.create).toHaveBeenCalledWith({
            authorization: fake.clientToken,
            debug: true,
            assetsUrl: "https://example.com/assets",
            name: "Payment Request",
          });

          expect(instance).toBeDefined();
        }));

    it("instantiates a Payment Request integration", () =>
      paymentRequest
        .create({
          client: testContext.fakeClient,
        })
        .then((instance) => {
          expect(instance).toBeDefined();
        }));

    it("returns error if payment request integration throws an error", () => {
      const error = new Error("Failed");

      PaymentRequestComponent.prototype.initialize.mockRejectedValue(error);

      return paymentRequest
        .create({
          client: testContext.fakeClient,
        })
        .catch((err) => {
          expect(err).toBeDefined();
          expect(err).toBe(error);
        });
    });
  });
});
