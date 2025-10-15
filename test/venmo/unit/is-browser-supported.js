"use strict";

jest.mock("../../../src/venmo/shared/browser-detection");
jest.mock("../../../src/lib/in-iframe");

const browserDetection = require("../../../src/venmo/shared/browser-detection");
const inIframe = require("../../../src/lib/in-iframe");
const {
  isBrowserSupported,
  isNonDefaultBrowser,
} = require("../../../src/venmo/shared/supports-venmo");

describe("isBrowserSupported", () => {
  beforeEach(() => {
    browserDetection.isAndroid.mockReturnValue(false);
    browserDetection.isIos.mockReturnValue(false);

    browserDetection.isChrome.mockReturnValue(false);
    browserDetection.isIosChrome.mockReturnValue(false);
    browserDetection.isIosSafari.mockReturnValue(false);
    browserDetection.isIosWebview.mockReturnValue(false);
    browserDetection.isAndroidWebview.mockReturnValue(false);
    browserDetection.isFacebookOwnedBrowserOnAndroid.mockReturnValue(false);
    inIframe.mockReturnValue(false);
  });

  describe("defaults", () => {
    it("returns true for iOS Safari", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(true);
    });

    it("returns true for iOS webview", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);
      browserDetection.isIosWebview.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(true);
    });

    it("returns true for iOS Chrome when not in an iFrame and allowNewBrowserTab is not false.", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: true,
          allowNonDefaultBrowsers: true,
        })
      ).toBe(true);
    });

    it("returns true for iOS Chrome when not in an iFrame and allowNewBrowserTab is false but allowNonDefaultBrowsers is true.", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: false,
          allowNonDefaultBrowsers: true,
        })
      ).toBe(true);
    });

    it("returns false for iOS Chrome in an iFrame", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosChrome.mockReturnValue(true);
      inIframe.mockReturnValue(true);

      expect(isBrowserSupported({ allowNewBrowserTab: false })).toBe(false);
    });

    it("returns true for Android Chrome", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(true);
    });

    it("returns true for Android webview", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);
      browserDetection.isAndroidWebview.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(true);
    });

    it("returns false for Facebook on Android when allowNonDefaultBrowsers is false", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isFacebookOwnedBrowserOnAndroid.mockReturnValue(true);

      expect(isBrowserSupported({ allowNonDefaultBrowsers: false })).toBe(
        false
      );
    });

    it("returns true for other iOS browsers", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(false);

      expect(isBrowserSupported()).toBe(true);
    });

    it("returns true for other Android browsers", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(false);

      expect(isBrowserSupported()).toBe(true);
    });
  });

  describe("allowWebviews: false", () => {
    it("returns true for iOS Safari when webviews are dissallowed", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowWebviews: false,
        })
      ).toBe(true);
    });

    it("returns true for Android Chrome when webviews are disallowed", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowWebviews: false,
        })
      ).toBe(true);
    });

    it("returns false for iOS webview when configured to disallow webviews", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);
      browserDetection.isIosWebview.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowWebviews: false,
        })
      ).toBe(false);
    });

    it("returns false for Android webview when configured", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);
      browserDetection.isAndroidWebview.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowWebviews: false,
        })
      ).toBe(false);
    });
  });

  describe("allowNewBrowserTab: false", () => {
    it("returns false for iOS Chrome when configured to only return to same tab", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: false,
          allowNonDefaultBrowsers: false,
        })
      ).toBe(false);
    });

    it("returns true for iOS Safari when configured to only return to same tab", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: false,
          allowNonDefaultBrowsers: false,
        })
      ).toBe(true);
    });

    it("returns true for Android Chrome when configured to only return to same tab", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: false,
          allowNonDefaultBrowsers: false,
        })
      ).toBe(true);
    });
  });

  describe("allowDesktop: true", () => {
    it("returns true for non-mobile browsers configured to allow desktop", () => {
      browserDetection.isIos.mockReturnValue(false);
      browserDetection.isAndroid.mockReturnValue(false);

      expect(
        isBrowserSupported({
          allowDesktop: true,
        })
      ).toBe(true);
    });
  });

  describe("allowDesktop: true, allowNewBrowserTab: false", () => {
    it("returns true for non-mobile browsers when configured to only return to same tab and desktop is allowed", () => {
      browserDetection.isIos.mockReturnValue(false);
      browserDetection.isAndroid.mockReturnValue(false);
      browserDetection.isIosSafari.mockReturnValue(false);
      browserDetection.isChrome.mockReturnValue(false);

      expect(
        isBrowserSupported({
          allowDesktop: true,
          allowNewBrowserTab: false,
        })
      ).toBe(true);
    });

    it("returns true for iOS Safari when configured to only return to same tab and desktop is allowed", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowDesktop: true,
          allowNewBrowserTab: false,
        })
      ).toBe(true);
    });

    it("returns true for Android Chrome when configured to only return to same tab and desktop is allowed", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowDesktop: true,
          allowNewBrowserTab: false,
        })
      ).toBe(true);
    });

    it("returns false for ios browsers that are not Safari when configured to only return to same tab and desktop is allowed", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(false);

      expect(
        isBrowserSupported({
          allowDesktop: true,
          allowNewBrowserTab: false,
        })
      ).toBe(false);
    });

    it("returns false for android browsers that are not chrome when configured to only return to same tab and desktop is allowed", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(false);

      expect(
        isBrowserSupported({
          allowDesktop: true,
          allowNewBrowserTab: false,
        })
      ).toBe(false);
    });
  });

  describe("allowDesktopWebLogin: true", () => {
    it("returns true for non-mobile browsers configured to allow desktop web login", () => {
      browserDetection.isIos.mockReturnValue(false);
      browserDetection.isAndroid.mockReturnValue(false);

      expect(
        isBrowserSupported({
          allowDesktop: false,
          allowDesktopWebLogin: true,
        })
      ).toBe(true);
    });
  });

  describe("isNonDefaultBrowser", function () {
    beforeEach(function () {
      browserDetection.isAndroid.mockReturnValue(false);
      browserDetection.isIos.mockReturnValue(false);
      browserDetection.isChrome.mockReturnValue(false);
      browserDetection.isIosSafari.mockReturnValue(false);
    });

    it("returns false for iOS Safari (default browser)", function () {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);

      expect(isNonDefaultBrowser()).toBe(false);
    });

    it("returns false for Android Chrome (default browser)", function () {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(isNonDefaultBrowser()).toBe(false);
    });

    it("returns true for iOS Chrome (non-default browser)", function () {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(false);

      expect(isNonDefaultBrowser()).toBe(true);
    });

    it("returns true for Android non-Chrome browsers", function () {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(false);

      expect(isNonDefaultBrowser()).toBe(true);
    });

    it("returns false for desktop browsers", function () {
      browserDetection.isIos.mockReturnValue(false);
      browserDetection.isAndroid.mockReturnValue(false);

      expect(isNonDefaultBrowser()).toBe(false);
    });
  });
});
