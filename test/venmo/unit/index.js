"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");
jest.mock("../../../src/venmo/shared/supports-venmo");
jest.mock("../../../src/lib/create-assets-url");

const analytics = require("../../../src/lib/analytics");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create, isBrowserSupported } = require("../../../src/venmo");
const { fake } = require("../../helpers");
const BraintreeError = require("../../../src/lib/braintree-error");
const supportsVenmo = require("../../../src/venmo/shared/supports-venmo");
const Venmo = require("../../../src/venmo/venmo");

describe("venmo static methods", () => {
  describe("venmo.create", () => {
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
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(
          basicComponentVerification.verify.mock.calls[0][0]
        ).toMatchObject({
          name: "Venmo",
          client: testContext.client,
        });
      }));

    it("can create with an authorization instead of a client", () =>
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
          assetsUrl: "https://example.com/assets",
          name: "Venmo",
        });

        expect(instance).toBeInstanceOf(Venmo);
      }));

    it("resolves with a Venmo instance", () => {
      expect(create({ client: testContext.client })).resolves.toBeInstanceOf(
        Venmo
      );
    });

    it("errors out if Venmo is not enabled for the merchant when using client", () => {
      delete testContext.configuration.gatewayConfiguration.payWithVenmo;

      return expect(
        create({ client: testContext.client })
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "VENMO_NOT_ENABLED",
        message: "Venmo is not enabled for this merchant.",
      });
    });

    it("errors out if options.profileId is present but not a string", () =>
      create({
        client: testContext.client,
        profileId: 1234,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_INVALID_PROFILE_ID");
        expect(err.message).toBe("Venmo profile ID is invalid.");
      }));

    it("errors out if options.deepLinkReturnUrl is present but not a string", () =>
      create({
        client: testContext.client,
        deepLinkReturnUrl: 1234,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_INVALID_DEEP_LINK_RETURN_URL");
        expect(err.message).toBe("Venmo deep link return URL is invalid.");
      }));

    it("sends an analytics event when successful", () =>
      create({ client: testContext.client }).then(() => {
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "venmo.initialized"
        );
      }));
  });

  describe("venmo.isBrowserSupported", () => {
    beforeEach(() => {
      jest.spyOn(supportsVenmo, "isBrowserSupported");
    });

    it("calls isBrowserSupported library", () => {
      isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toBeCalledTimes(1);
    });

    it("can call isBrowserSupported with allowNewTab", () => {
      isBrowserSupported({ allowNewBrowserTab: true });

      expect(supportsVenmo.isBrowserSupported).toBeCalledWith({
        allowNewBrowserTab: true,
      });
    });

    it("can call isBrowserSupported with allowWebviews", () => {
      isBrowserSupported({ allowWebviews: true });

      expect(supportsVenmo.isBrowserSupported).toBeCalledWith({
        allowWebviews: true,
      });
    });
  });
});
