"use strict";

const {
  VENMO_MOBILE_APP_AUTH_ONLY_URL,
  VENMO_WEB_LOGIN_URL,
  VENMO_APP_OR_MOBILE_AUTH_URL,
} = require("../../../src/venmo/shared/constants");
const getVenmoUrl = require("../../../src/venmo/shared/get-venmo-url");

jest.mock("../../../src/venmo/shared/browser-detection");
const browserDetection = require("../../../src/venmo/shared/browser-detection");

describe("utils", () => {
  describe("getVenmoUrl()", () => {
    it("returns the default url", () => {
      const url = getVenmoUrl({});

      expect(url).toBe(VENMO_MOBILE_APP_AUTH_ONLY_URL);
    });

    it("returns correct url when using desktop web login flow", () => {
      browserDetection.isAndroid = jest.fn().mockReturnValue(true);
      const config = { useAllowDesktopWebLogin: true };
      const url = getVenmoUrl(config);

      expect(url).toEqual(VENMO_WEB_LOGIN_URL);
    });

    it("returns the correct url when mobileWebFallBack is true", () => {
      const config = { mobileWebFallBack: true };
      const url = getVenmoUrl(config);

      expect(url).toBe(VENMO_APP_OR_MOBILE_AUTH_URL);
    });
  });
});
