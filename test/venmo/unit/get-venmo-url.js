"use strict";

const {
  VENMO_MOBILE_APP_AUTH_ONLY_URL,
  VENMO_WEB_LOGIN_SANDBOX_URL,
  VENMO_WEB_LOGIN_URL,
  VENMO_APP_OR_MOBILE_AUTH_URL,
} = require("../../../src/venmo/shared/constants");
const getVenmoUrl = require("../../../src/venmo/shared/get-venmo-url");

jest.mock("../../../src/venmo/shared/browser-detection");
const browserDetection = require("../../../src/venmo/shared/browser-detection");

function makeConfig(overrides = {}) {
  return {
    useAllowDesktopWebLogin: false,
    enableVenmoSandbox: false,
    mobileWebFallBack: false,
    environment: undefined,
    ...overrides,
  };
}

describe("utils", () => {
  describe("getVenmoUrl()", () => {
    it("returns the default url", () => {
      const url = getVenmoUrl({});

      expect(url).toBe(VENMO_MOBILE_APP_AUTH_ONLY_URL);
    });

    it("returns correct url when using desktop web login flow", () => {
      browserDetection.isAndroid = jest.fn().mockReturnValue(true);
      const url = getVenmoUrl(makeConfig({ useAllowDesktopWebLogin: true }));

      expect(url).toEqual(VENMO_WEB_LOGIN_URL);
    });

    it("returns correct url when using desktop web login flow with new sandbox experience", () => {
      browserDetection.isAndroid = jest.fn().mockReturnValue(true);
      const url = getVenmoUrl(
        makeConfig({
          useAllowDesktopWebLogin: true,
          enableVenmoSandbox: true,
          environment: "sandbox",
        })
      );

      expect(url).toEqual(VENMO_WEB_LOGIN_SANDBOX_URL);
    });

    it("returns the correct url when mobileWebFallBack is true", () => {
      const url = getVenmoUrl(makeConfig({ mobileWebFallBack: true }));

      expect(url).toBe(VENMO_APP_OR_MOBILE_AUTH_URL);
    });

    it("returns production url when enableVenmoSandbox is true but environment is production", () => {
      const url = getVenmoUrl(
        makeConfig({
          useAllowDesktopWebLogin: true,
          enableVenmoSandbox: true,
          environment: "production",
        })
      );

      expect(url).toEqual(VENMO_WEB_LOGIN_URL);
    });

    it("returns production url when enableVenmoSandbox is true but environment is not provided", () => {
      const url = getVenmoUrl(
        makeConfig({
          useAllowDesktopWebLogin: true,
          enableVenmoSandbox: true,
        })
      );

      expect(url).toEqual(VENMO_WEB_LOGIN_URL);
    });

    it("ignores enableVenmoSandbox for mobile web fallback flow", () => {
      const url = getVenmoUrl(
        makeConfig({
          mobileWebFallBack: true,
          enableVenmoSandbox: true,
          environment: "sandbox",
        })
      );

      expect(url).toBe(VENMO_APP_OR_MOBILE_AUTH_URL);
    });

    it("ignores enableVenmoSandbox for default mobile app auth flow", () => {
      const url = getVenmoUrl(
        makeConfig({
          enableVenmoSandbox: true,
          environment: "sandbox",
        })
      );

      expect(url).toBe(VENMO_MOBILE_APP_AUTH_ONLY_URL);
    });

    it("returns production url when enableVenmoSandbox is explicitly false", () => {
      const url = getVenmoUrl(
        makeConfig({
          useAllowDesktopWebLogin: true,
          enableVenmoSandbox: false,
          environment: "sandbox",
        })
      );

      expect(url).toEqual(VENMO_WEB_LOGIN_URL);
    });
  });
});
