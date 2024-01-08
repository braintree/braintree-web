"use strict";

jest.mock("../../../src/venmo/shared/browser-detection");
jest.mock("../../../src/lib/in-iframe");

const browserDetection = require("../../../src/venmo/shared/browser-detection");
const inIframe = require("../../../src/lib/in-iframe");
const {
  isBrowserSupported,
} = require("../../../src/venmo/shared/supports-venmo");

describe("isBrowserSupported", () => {
  beforeEach(() => {
    browserDetection.isAndroid.mockReturnValue(false);
    browserDetection.isIos.mockReturnValue(false);

    browserDetection.isChrome.mockReturnValue(false);
    browserDetection.isIosChrome.mockReturnValue(false);
    browserDetection.isIosSafari.mockReturnValue(false);
    browserDetection.isSamsung.mockReturnValue(false);
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

      expect(isBrowserSupported()).toBe(true);
    });

    it("returns false for iOS Chrome in an iFrame", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosChrome.mockReturnValue(true);
      inIframe.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(false);
    });

    it("returns false for Samsung Browser", () => {
      browserDetection.isSamsung.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(false);
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

    it("returns false for Facebook on Android", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isFacebookOwnedBrowserOnAndroid.mockReturnValue(true);

      expect(isBrowserSupported()).toBe(false);
    });

    it("returns false for other browsers", () => {
      browserDetection.isIos.mockReturnValue(false);
      browserDetection.isAndroid.mockReturnValue(false);
      browserDetection.isIosSafari.mockReturnValue(false);
      browserDetection.isChrome.mockReturnValue(false);

      expect(isBrowserSupported()).toBe(false);
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

    it("returns true for Android Chrome when webviews are dissallowed", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowWebviews: false,
        })
      ).toBe(true);
    });

    it("returns false for iOS webview when configured to dissallow webviews", () => {
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
        })
      ).toBe(false);
    });

    it("returns true for iOS Safari when configured to only return to same tab", () => {
      browserDetection.isIos.mockReturnValue(true);
      browserDetection.isIosSafari.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: false,
        })
      ).toBe(true);
    });

    it("returns true for Android Chrome when configured to only return to same tab", () => {
      browserDetection.isAndroid.mockReturnValue(true);
      browserDetection.isChrome.mockReturnValue(true);

      expect(
        isBrowserSupported({
          allowNewBrowserTab: false,
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
});
