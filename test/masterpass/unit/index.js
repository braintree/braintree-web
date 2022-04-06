"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");
jest.mock("../../../src/lib/create-assets-url");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create, isSupported } = require("../../../src/masterpass");
const browserDetection = require("../../../src/masterpass/shared/browser-detection");
const Masterpass = require("../../../src/masterpass/external/masterpass");
const BraintreeError = require("../../../src/lib/braintree-error");
const { fake } = require("../../helpers");

describe("masterpass", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.configuration.gatewayConfiguration.masterpass = {};
    testContext.fakeClient = fake.client({
      configuration: testContext.configuration,
    });
    testContext.masterpassInstance = new Masterpass({
      client: testContext.fakeClient,
    });
    jest
      .spyOn(Masterpass.prototype, "_initialize")
      .mockResolvedValue(testContext.masterpassInstance);
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.fakeClient);
  });

  describe("create", () => {
    it("verifies with basicComponentVerification", () =>
      create({
        client: testContext.fakeClient,
      }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(
          basicComponentVerification.verify.mock.calls[0][0]
        ).toMatchObject({
          name: "Masterpass",
          client: testContext.fakeClient,
        });
      }));

    it("can create with an authorization instead of a client", () =>
      create({
        authorization: fake.clientToken,
        debug: true,
      }).then((instance) => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).toBeUndefined();
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "Masterpass",
        });

        expect(instance).toBeInstanceOf(Masterpass);
      }));

    it("rejects with an error when merchant is not enabled for masterpass", () => {
      delete testContext.configuration.gatewayConfiguration.masterpass;

      return create({ client: testContext.fakeClient }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("MASTERPASS_NOT_ENABLED");
        expect(err.message).toBe(
          "Masterpass is not enabled for this merchant."
        );
      });
    });

    it("rejects with an error if browser does not support popups", () => {
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);

      return create({ client: testContext.fakeClient }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("CUSTOMER");
        expect(err.code).toBe("MASTERPASS_BROWSER_NOT_SUPPORTED");
        expect(err.message).toBe("Browser is not supported.");
      });
    });

    it("resolves with a Masterpass instance when called with a client", () => {
      return create({ client: testContext.fakeClient }).then((masterpass) => {
        expect(masterpass).toBeInstanceOf(Masterpass);
      });
    });

    describe("with popupbridge", () => {
      beforeEach(() => {
        window.popupBridge = {};
      });

      afterEach(() => {
        delete window.popupBridge;
      });

      it("allows unsupported browser when PopupBridge is defined", () => {
        jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);

        return create({ client: testContext.fakeClient }).then((data) => {
          expect(data).toBeInstanceOf(Masterpass);
        });
      });
    });
  });

  describe("isSupported", () => {
    afterEach(() => {
      delete window.popupBridge;
    });

    it("returns true if popupBridge exists", () => {
      window.popupBridge = {};

      expect(isSupported()).toBe(true);
    });

    it("returns true if browser supports popups", () => {
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(true);

      expect(isSupported()).toBe(true);
    });

    it("returns false if popupBridge is not defined and browser does not support popups", () => {
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);

      expect(isSupported()).toBe(false);
    });

    it("returns true if popupBridge exists and browser does not support popups", () => {
      window.popupBridge = {};
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);

      expect(isSupported()).toBe(true);
    });
  });
});
