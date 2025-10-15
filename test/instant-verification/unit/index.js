"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create } = require("../../../src/instant-verification");
const { fake } = require("../../helpers");
const BraintreeError = require("../../../src/lib/braintree-error");
const InstantVerification = require("../../../src/instant-verification/instant-verification");

describe("instant-verification static methods", () => {
  describe("instantVerification.create", () => {
    let testContext;

    beforeEach(() => {
      testContext = {};
      testContext.configuration = fake.configuration();
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.client);
    });

    it("verifies with basicComponentVerification", () =>
      create({
        client: testContext.client,
      }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Instant Verification",
            client: testContext.client,
          })
        );
      }));

    xit("throws error if instantVerification is not enabled for merchant", () => {
      if (testContext.configuration.gatewayConfiguration.instantVerification) {
        delete testContext.configuration.gatewayConfiguration
          .instantVerification;
      }

      expect.assertions(4);

      create({ client: testContext.client }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("INSTANT_VERIFICATION_NOT_ENABLED");
        expect(err.message).toBe(
          "Instant Verification is not enabled for this merchant account."
        );
      });
    });

    it("resolves with instant-verification instance", () => {
      expect(create({ client: testContext.client })).resolves.toBeInstanceOf(
        InstantVerification
      );
    });

    // This is disabled because the logic to accept an authorization is missing at this time.
    // It's unclear if that is just an oversight or by design.
    // However, auth's are excepted with most other modules and will likely be part of this one
    xit("can create with an authorization instead of a client", () => {
      create({
        authorization: fake.clientToken,
        debug: true,
      }).then((instance) => {
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).toBeUndefined();
        expect(createDeferredClient.create.mock.calls[0][0]).toMatchObject({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "",
        });
        expect(instance).toBeInstanceOf(InstantVerification);
      });
    });
  });
});
