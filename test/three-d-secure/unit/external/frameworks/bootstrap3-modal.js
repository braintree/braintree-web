"use strict";

const Bootstrap3ModalFramework = require("../../../../../src/three-d-secure/external/frameworks/bootstrap3-modal");
const { fake, wait, yieldsByEventAsync } = require("../../../../helpers");
const assets = require("../../../../../src/lib/assets");

describe("Bootstrap3ModalFramework", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    jest.spyOn(Bootstrap3ModalFramework.prototype, "setupSongbird");

    testContext.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: "encoded_auth_fingerprint",
      gatewayConfiguration: {
        assetsUrl: "http://example.com/assets",
        threeDSecure: {
          cardinalAuthenticationJWT: "jwt",
          cardinalSongbirdUrl:
            "https://songbirdstag.cardinalcommerce.com/edge/v1/songbird.js",
        },
      },
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
      getConfiguration: () => testContext.configuration,
    };
    testContext.fakeCardinal = {
      configure: jest.fn(),
      setup: jest.fn(),
      on: jest.fn(),
      trigger: jest.fn().mockResolvedValue({ Status: false }),
      continue: jest.fn(),
    };
  });

  describe("setupSongbird", () => {
    beforeEach(() => {
      const fakeCardinal = testContext.fakeCardinal;

      testContext.fakeCardinal.on.mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {})
      );

      testContext.tds = new Bootstrap3ModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });
      Bootstrap3ModalFramework.prototype.setupSongbird.mockClear();

      jest.spyOn(assets, "loadScript").mockImplementation(() => {
        window.Cardinal = fakeCardinal;

        // allow a slight delay so timing tests can run
        return wait(5);
      });
    });

    afterEach(() => {
      delete window.Cardinal;
    });

    it("configures Cardinal to use bootstrap3 framework", () => {
      const framework = new Bootstrap3ModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          payment: {
            framework: "bootstrap3",
          },
        });
      });
    });

    it("configures Cardinal to use verbose logging and the bootstrap3 framework", () => {
      const framework = new Bootstrap3ModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
        loggingEnabled: true,
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          payment: {
            framework: "bootstrap3",
          },
          logging: {
            level: "verbose",
          },
        });
      });
    });

    describe("when loadscript throws", () => {
      beforeEach(() => {
        jest.spyOn(assets, "loadScript").mockRejectedValue(new Error("failed"));
      });

      it("creates a bootstrap modal for v1 fallback", () => {
        const framework = new Bootstrap3ModalFramework({
          createPromise: Promise.resolve(testContext.client),
          client: testContext.client,
        });

        return framework.setupSongbird().then(() => {
          const iframe = document.createElement("iframe");
          const modal = framework._createV1IframeModal(iframe);

          expect(modal.querySelector(".modal.fade.in")).toBeTruthy();
          expect(modal.querySelector(".modal-content")).toBeTruthy();
          expect(modal.querySelector(".modal-body iframe")).toBe(iframe);
        });
      });

      it("closes the modal when close button is clicked", () => {
        const framework = new Bootstrap3ModalFramework({
          createPromise: Promise.resolve(testContext.client),
          client: testContext.client,
        });

        jest.spyOn(framework, "cancelVerifyCard").mockReturnValue(null);

        return framework.setupSongbird().then(() => {
          const iframe = document.createElement("iframe");
          const modal = framework._createV1IframeModal(iframe);
          const btn = modal.querySelector(
            "[data-braintree-v1-fallback-close-button]"
          );

          document.body.appendChild(modal);

          btn.click();

          expect(framework.cancelVerifyCard).toHaveBeenCalledTimes(1);
          expect(framework.cancelVerifyCard).toHaveBeenCalledWith({
            code: "THREEDS_CARDINAL_SDK_CANCELED",
            message: expect.any(String),
            type: expect.any(String),
          });
          expect(document.body.querySelector(".modal.fade.in")).toBeFalsy();
        });
      });

      it("closes the modal when backdrop is clicked", () => {
        const framework = new Bootstrap3ModalFramework({
          createPromise: Promise.resolve(testContext.client),
          client: testContext.client,
        });

        jest.spyOn(framework, "cancelVerifyCard").mockReturnValue(null);

        return framework.setupSongbird().then(() => {
          const iframe = document.createElement("iframe");
          const modal = framework._createV1IframeModal(iframe);
          const backdrop = modal.querySelector(
            "[data-braintree-v1-fallback-backdrop]"
          );

          document.body.appendChild(modal);

          backdrop.click();

          expect(framework.cancelVerifyCard).toHaveBeenCalledTimes(1);
          expect(framework.cancelVerifyCard).toHaveBeenCalledWith({
            code: "THREEDS_CARDINAL_SDK_CANCELED",
            message: expect.any(String),
            type: expect.any(String),
          });
          expect(document.body.querySelector(".modal.fade.in")).toBeFalsy();
        });
      });

      it("pressing escape key closes the modal", () => {
        const framework = new Bootstrap3ModalFramework({
          createPromise: Promise.resolve(testContext.client),
          client: testContext.client,
        });

        jest.spyOn(framework, "cancelVerifyCard").mockReturnValue(null);

        return framework.setupSongbird().then(() => {
          const iframe = document.createElement("iframe");
          const modal = framework._createV1IframeModal(iframe);

          document.body.appendChild(modal);

          document.dispatchEvent(
            new KeyboardEvent("keyup", {
              key: "Escape",
            })
          );

          expect(framework.cancelVerifyCard).toHaveBeenCalledTimes(1);
          expect(framework.cancelVerifyCard).toHaveBeenCalledWith({
            code: "THREEDS_CARDINAL_SDK_CANCELED",
            message: expect.any(String),
            type: expect.any(String),
          });
          expect(document.body.querySelector(".modal.fade.in")).toBeFalsy();
        });
      });
    });
  });
});
