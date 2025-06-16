"use strict";

jest.mock("../../../../../src/lib/assets");

const CardinalModalFramework = require("../../../../../src/three-d-secure/external/frameworks/cardinal-modal");
const { fake, yieldsAsync } = require("../../../../helpers");
const assets = require("../../../../../src/lib/assets");

describe("CardinalModalFramework", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

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
      request: jest.fn().mockResolvedValue({}),
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
      testContext.fakeCardinal.on.mockImplementation(
        yieldsAsync("payments.setupComplete", {})
      );
      jest.spyOn(assets, "loadScript").mockRejectedValue(new Error("failed"));
    });

    afterEach(() => {
      delete window.Cardinal;
    });

    it("creates a cardinal style modal for v1 fallback", () => {
      let framework;

      framework = new CardinalModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return framework.setupSongbird().then(() => {
        const iframe = document.createElement("iframe");
        const modal = framework._createV1IframeModal(iframe);

        expect(
          modal.querySelector("[data-braintree-v1-fallback-iframe-container]")
        ).toBeDefined();
        expect(
          modal.querySelector(
            "[data-braintree-v1-fallback-iframe-container] iframe"
          )
        ).toBe(iframe);
      });
    });

    it("closes the modal when close button is clicked", () => {
      let framework;

      framework = new CardinalModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      jest.spyOn(framework, "cancelVerifyCard").mockImplementation();

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
        expect(
          document.body.querySelector(
            "[data-braintree-v1-fallback-iframe-container]"
          )
        ).toBeFalsy();
      });
    });

    it("closes the modal when backdrop is clicked", () => {
      let framework;

      framework = new CardinalModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      jest.spyOn(framework, "cancelVerifyCard").mockImplementation();

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
        expect(
          document.body.querySelector(
            "[data-braintree-v1-fallback-iframe-container]"
          )
        ).toBeFalsy();
      });
    });

    it("pressing escape key closes the modal", () => {
      let framework;

      framework = new CardinalModalFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      jest.spyOn(framework, "cancelVerifyCard").mockImplementation();

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
        expect(
          document.body.querySelector(
            "[data-braintree-v1-fallback-iframe-container]"
          )
        ).toBeFalsy();
      });
    });
  });
});
