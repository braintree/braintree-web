'use strict';

jest.mock('@braintree/browser-detection/is-android');
jest.mock('@braintree/browser-detection/is-ios');
jest.mock('@braintree/browser-detection/is-chrome');
jest.mock('@braintree/browser-detection/is-ios-safari');
jest.mock('@braintree/browser-detection/is-ios-webview');

const browserDetection = require('../../../src/venmo/shared/browser-detection');
const isAndroid = require('@braintree/browser-detection/is-android');
const isChrome = require('@braintree/browser-detection/is-chrome');
const isIosSafari = require('@braintree/browser-detection/is-ios-safari');
const isIos = require('@braintree/browser-detection/is-ios');
const isIosWebview = require('@braintree/browser-detection/is-ios-webview');

describe('browser detection', () => {
  beforeEach(() => {
    isAndroid.mockReturnValue(false);
    isIosWebview.mockReturnValue(false);
    isIos.mockReturnValue(false);
    isChrome.mockReturnValue(false);
    isIosSafari.mockReturnValue(false);
  });

  describe('isAndroidWebview', () => {
    let userAgentSpy;

    beforeEach(() => {
      userAgentSpy = jest.spyOn(window.navigator, 'userAgent', 'get');
    });

    it('returns false when not android', () => {
      userAgentSpy.mockReturnValue('foo wv bar');

      isAndroid.mockReturnValue(false);

      expect(browserDetection.isAndroidWebview()).toBe(false);
    });

    it('returns false when it is android, but userAgent does not contain wv', () => {
      userAgentSpy.mockReturnValue('foo bar');

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isAndroidWebview()).toBe(false);
    });

    it('returns true when it is android and userAgent contains wv', () => {
      userAgentSpy.mockReturnValue('foo wv bar');

      isAndroid.mockReturnValue(true);

      expect(browserDetection.isAndroidWebview()).toBe(true);
    });
  });

  describe('doesNotSupportWindowOpenInIos', () => {
    it('returns false when it is not iOS', () => {
      isIos.mockReturnValue(false);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(false);
    });

    it('returns true when it is an iOS webview', () => {
      isIos.mockReturnValue(true);
      isIosWebview.mockReturnValue(true);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(true);
    });

    it('returns true when it is iOS and is not iOS Safari', () => {
      isIos.mockReturnValue(true);
      isIosSafari.mockReturnValue(false);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(true);
    });

    it('returns false when it is iOS and is iOS Safari', () => {
      isIos.mockReturnValue(true);
      isIosSafari.mockReturnValue(true);

      expect(browserDetection.doesNotSupportWindowOpenInIos()).toBe(false);
    });
  });
});
