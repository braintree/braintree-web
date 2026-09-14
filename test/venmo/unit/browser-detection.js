vi.mock("@braintree/browser-detection/is-android");
vi.mock("@braintree/browser-detection/is-ios");
vi.mock("@braintree/browser-detection/is-chrome");
vi.mock("@braintree/browser-detection/is-ios-safari");
vi.mock("@braintree/browser-detection/is-ios-webview");

import browserDetection from "../../../src/venmo/shared/browser-detection";
import isAndroid from "@braintree/browser-detection/is-android";
import isChrome from "@braintree/browser-detection/is-chrome";
import isIosSafari from "@braintree/browser-detection/is-ios-safari";
import isIos from "@braintree/browser-detection/is-ios";
import isIosWebview from "@braintree/browser-detection/is-ios-webview";

describe("browser detection", () => {
  beforeEach(() => {
    isAndroid.mockReturnValue(false);
    isIosWebview.mockReturnValue(false);
    isIos.mockReturnValue(false);
    isChrome.mockReturnValue(false);
    isIosSafari.mockReturnValue(false);
  });

  describe("isAndroidWebview", () => {
    let userAgentSpy;

    beforeEach(() => {
      userAgentSpy = vi.spyOn(window.navigator, "userAgent", "get");
    });

    it("returns false when not android", () => {
      userAgentSpy.mockReturnValue("foo wv bar");

      isAndroid.mockReturnValue(false);

      expect(browserDetection.isAndroidWebview()).toBe(false);
    });

    it("returns false when it is android, but userAgent does not contain wv", () => {
      userAgentSpy.mockReturnValue("foo bar");

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isAndroidWebview()).toBe(false);
    });

    it("returns true when it is android and userAgent contains wv", () => {
      userAgentSpy.mockReturnValue("foo wv bar");

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isAndroidWebview()).toBe(true);
    });
  });

  describe("isIosChrome", () => {
    it("returns true when isIos and isChrome return true", () => {
      isChrome.mockReturnValue(true);
      isIos.mockReturnValue(true);

      expect(browserDetection.isIosChrome()).toBe(true);
    });

    it("returns false when either isIos or isChrome do not return true", () => {
      isChrome.mockReturnValue(false);
      isIos.mockReturnValue(true);

      expect(browserDetection.isIosChrome()).toBe(false);

      isChrome.mockReturnValue(true);
      isIos.mockReturnValue(false);

      expect(browserDetection.isIosChrome()).toBe(false);
    });
  });

  describe("isFacebookOwnedBrowserOnAndroid", () => {
    let userAgentSpy;

    beforeEach(() => {
      userAgentSpy = vi.spyOn(window.navigator, "userAgent", "get");
    });

    it("returns false when not android", () => {
      userAgentSpy.mockReturnValue("Instagram");

      isAndroid.mockReturnValue(false);

      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(false);
    });

    it("returns false when it is android, but userAgent does not contain FB_IAB or Instagram", () => {
      userAgentSpy.mockReturnValue("foo bar");

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(false);
    });

    it("returns true when it is android and userAgent contains FB_IAB", () => {
      userAgentSpy.mockReturnValue("foo FB_IAB bar");

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(true);
    });

    it("returns true when it is not Android, but userAgent contains HUAWEI and FBAN", () => {
      isAndroid.mockReturnValue(false);

      userAgentSpy.mockReturnValue("HUAWEI foo");
      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(false);

      userAgentSpy.mockReturnValue("FBAN foo");
      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(false);

      userAgentSpy.mockReturnValue("HUAWEI foo FBAN bar");
      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(true);
    });

    it("returns true when it is android and userAgent contains Instagram", () => {
      userAgentSpy.mockReturnValue("foo Instagram bar");

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isFacebookOwnedBrowserOnAndroid()).toBe(true);
    });
  });

  describe("doesNotSupportWindowOpenInIos", () => {
    it("returns false when it is not iOS", () => {
      isIos.mockReturnValue(false);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(false);
    });

    it("returns true when it is an iOS webview", () => {
      isIos.mockReturnValue(true);
      isIosWebview.mockReturnValue(true);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(true);
    });

    it("returns true when it is iOS and is not iOS Safari", () => {
      isIos.mockReturnValue(true);
      isIosSafari.mockReturnValue(false);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(true);
    });

    it("returns false when it is iOS and is iOS Safari", () => {
      isIos.mockReturnValue(true);
      isIosSafari.mockReturnValue(true);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(false);
    });
  });
});
