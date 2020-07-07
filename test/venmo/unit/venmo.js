'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/venmo/shared/supports-venmo');

const analytics = require('../../../src/lib/analytics');
const { fake } = require('../../helpers');
const querystring = require('../../../src/lib/querystring');
const BraintreeError = require('../../../src/lib/braintree-error');
const Venmo = require('../../../src/venmo/venmo');
const supportsVenmo = require('../../../src/venmo/shared/supports-venmo');
const { version: VERSION } = require('../../../package.json');
const methods = require('../../../src/lib/methods');

function triggerVisibilityHandler(instance) {
  // TODO we should have it trigger the actual
  // visibility event if possible, rather than
  // calling the method saved on the instance
  instance._visibilityChangeListener();

  jest.runAllTimers();
}

function triggerHashChangeHandler(instance) {
  instance._onHashChangeListener({
    newURL: window.location.href
  });

  jest.runAllTimers();
}

describe('Venmo', () => {
  let testContext, originalLocation;

  beforeAll(() => {
    window.open = jest.fn();
    originalLocation = window.location.href;
  });

  beforeEach(() => {
    testContext = {};

    testContext.location = originalLocation;
    testContext.configuration = fake.configuration();
    testContext.client = {
      request: () => Promise.resolve({}),
      getConfiguration: () => testContext.configuration
    };
    testContext.venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });

    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');

    window.location.href = originalLocation;
  });

  describe('getUrl', () => {
    afterEach(() => {
      history.replaceState({}, '', testContext.location);
    });

    it('is set to correct base URL', () =>
      testContext.venmo.getUrl().then(url => {
        expect(url.indexOf('https://venmo.com/braintree/checkout')).toBe(0);
      })
    );

    it.each([
      ['', window.location.href, false],
      ['when deepLinkReturnUrl is specified', 'com.braintreepayments.test://', true],
      ['when checkout page URL has query params', `${window.location.href}?hey=now`, false]
    ])('contains return URL %s', (s, location, deepLinked) => {
      let params;
      const expectedReturnUrls = {
        'x-success': `${location}#venmoSuccess=1`,
        'x-cancel': `${location}#venmoCancel=1`,
        'x-error': `${location}#venmoError=1`
      };

      if (deepLinked) {
        testContext.venmo = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: location
        });
      } else if (location !== testContext.location) {
        history.replaceState({}, '', location);
      }

      return testContext.venmo.getUrl().then(url => {
        params = querystring.parse(url);
        expect(params['x-success']).toBe(expectedReturnUrls['x-success']);
        expect(params['x-cancel']).toBe(expectedReturnUrls['x-cancel']);
        expect(params['x-error']).toBe(expectedReturnUrls['x-error']);
      });
    });

    it('contains user agent in query params', () => {
      let params;
      const userAgent = window.navigator.userAgent;

      return testContext.venmo.getUrl().then(url => {
        params = querystring.parse(url);
        expect(params.ua).toBe(userAgent);
      });
    });

    it.each([
      ['pwv-merchant-id'], ['pwv-profile-id']
    ])('contains correct Braintree configuration options in query params when "braintree_merchant_id" is %p', (merchantID) => {
      /* eslint-disable camelcase */
      const braintreeConfig = {
        braintree_merchant_id: merchantID,
        braintree_access_token: 'pwv-access-token',
        braintree_environment: 'sandbox'
      };

      testContext.venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        profileId: merchantID
      });

      return testContext.venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params.braintree_merchant_id).toBe(braintreeConfig.braintree_merchant_id);
        expect(params.braintree_access_token).toBe(braintreeConfig.braintree_access_token);
        expect(params.braintree_environment).toBe(braintreeConfig.braintree_environment);
      });
      /* eslint-enable camelcase */
    });

    it('contains metadata in query params to forward to Venmo', () => {
      let params, braintreeData, metadata;

      return testContext.venmo.getUrl().then(url => {
        params = querystring.parse(url);
        braintreeData = JSON.parse(atob(params.braintree_sdk_data)); // eslint-disable-line camelcase
        metadata = braintreeData._meta;

        expect(metadata.version).toBe(VERSION);
        expect(metadata.sessionId).toBe('fakeSessionId');
        expect(metadata.integration).toBe('custom');
        expect(metadata.platform).toBe('web');
        expect(Object.keys(metadata).length).toBe(4);
      });
    });

    it('rejects if client creation rejects', () =>
      expect(new Venmo({
        createPromise: Promise.reject(new Error('client error'))
      }).getUrl()).rejects.toThrow('client error'));
  });

  describe('isBrowserSupported', () => {
    beforeEach(() => {
      jest.spyOn(supportsVenmo, 'isBrowserSupported');
    });

    it('calls isBrowserSupported library', () => {
      supportsVenmo.isBrowserSupported.mockReturnValue(true);

      expect(testContext.venmo.isBrowserSupported()).toBe(true);

      supportsVenmo.isBrowserSupported.mockReturnValue(false);

      expect(testContext.venmo.isBrowserSupported()).toBe(false);
    });

    it('calls isBrowserSupported with allowNewBrowserTab: true by default', () => {
      testContext.venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith({
        allowNewBrowserTab: true
      });
    });

    it('calls isBrowserSupported with allowNewBrowserTab: false when venmo instance is configured to do so', () => {
      testContext.venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        allowNewBrowserTab: false
      });

      testContext.venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith({
        allowNewBrowserTab: false
      });
    });
  });

  describe('hasTokenizationResult', () => {
    afterEach(() => {
      history.replaceState({}, '', testContext.location);
    });

    it.each([
      ['Success'], ['Error'], ['Cancel']
    ])('returns true when URL has %p payload', (payload) => {
      history.replaceState({}, '', `${testContext.location}#venmo${payload}=1`);

      expect(testContext.venmo.hasTokenizationResult()).toBe(true);
    });

    it('returns false when URL has no Venmo payload', () => {
      expect(testContext.venmo.hasTokenizationResult()).toBe(false);
    });
  });

  describe('tokenize', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      /*
      * Some tests use replaceState to simulate app switch returns rather
      * than updating window.location manually because this causes errors.
      * The window state needs to be reset after those tests.
      * */
      history.replaceState({}, '', testContext.location);
    });

    it('errors if another tokenization request is active', () => {
      testContext.venmo.tokenize();

      return testContext.venmo.tokenize().catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('VENMO_TOKENIZATION_REQUEST_ACTIVE');
        expect(err.type).toBe('MERCHANT');
        expect(err.message).toBe('Another tokenization request is active.');
      });
    });

    it('errors if getUrl fails', () => {
      jest.spyOn(testContext.venmo, 'getUrl').mockRejectedValue(new Error('client error'));

      return expect(testContext.venmo.tokenize()).rejects.toThrow('client error');
    });

    describe('when URL has Venmo results before calling tokenize', () => {
      it('resolves with nonce payload on successful result', () => {
        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);

        return testContext.venmo.tokenize().then(payload => {
          expect(payload.nonce).toBe('abc');
          expect(payload.type).toBe('VenmoAccount');
          expect(payload.details.username).toBe('keanu');
        });
      });

      it('rejects with error for error result', () => {
        history.replaceState({}, '', `${testContext.location}#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42`);

        return testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('UNKNOWN');
          expect(err.code).toBe('VENMO_APP_FAILED');
          expect(err.message).toBe('Venmo app encountered a problem.');
          expect(err.details.originalError.message).toBe('This is an error message.');
          expect(err.details.originalError.code).toBe('42');
        });
      });

      it('rejects with cancellation error on Venmo app cancel', () => {
        history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);

        return testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('CUSTOMER');
          expect(err.code).toBe('VENMO_APP_CANCELED');
          expect(err.message).toBe('Venmo app authorization was canceled.');
        });
      });

      it('consumes URL fragment parameters on Success result', async () => {
        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);

        await testContext.venmo.tokenize();

        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      it.each([
        ['Error'],
        ['Cancel']
      ])('consumes URL fragment parameters on %p result', async (result) => {
        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);

        await expect(testContext.venmo.tokenize()).rejects.toThrow();

        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      it('does not modify history state on Success if configured', async () => {
        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);

        const venmo = new Venmo({
          client: testContext.client,
          ignoreHistoryChanges: true
        });

        await venmo.tokenize();

        expect(window.location.hash).toBe('#venmoSuccess=1');
      });

      it.each([
        ['Error'],
        ['Cancel']
      ])('does not modify history state on %p result if configured', async (result) => {
        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);

        const venmo = new Venmo({
          client: testContext.client,
          ignoreHistoryChanges: true
        });

        await expect(venmo.tokenize()).rejects.toThrow();

        expect(window.location.hash).toBe(`#venmo${result}=1`);
      });
    });

    describe('when visibility listener triggers', () => {
      it('resolves with nonce payload on success', () => {
        const promise = testContext.venmo.tokenize().then(({ details, nonce, type }) => {
          expect(nonce).toBe('abc');
          expect(type).toBe('VenmoAccount');
          expect(details.username).toBe('keanu');
        });

        expect.assertions(3);
        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);
        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('sanitizes keys pulled off of hash for non-alpha characters', () => {
        const promise = testContext.venmo.tokenize().then(({ details, nonce, type }) => {
          expect(nonce).toBe('abc');
          expect(type).toBe('VenmoAccount');
          expect(details.username).toBe('keanu');
        });

        expect.assertions(3);
        history.replaceState({}, '', `${testContext.location}#/venmoSuccess=1&paym!entMethodNonce/=abc&userna@#me=keanu`);

        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('rejects with error on Venmo app error', () => {
        const promise = testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('UNKNOWN');
          expect(err.code).toBe('VENMO_APP_FAILED');
          expect(err.message).toBe('Venmo app encountered a problem.');
          expect(err.details.originalError.message).toBe('This is an error message.');
          expect(err.details.originalError.code).toBe('42');
        });

        expect.assertions(6);
        history.replaceState({}, '', `${testContext.location}#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42`);
        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('rejects with cancellation error on Venmo app cancel', () => {
        const promise = testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('CUSTOMER');
          expect(err.code).toBe('VENMO_APP_CANCELED');
          expect(err.message).toBe('Venmo app authorization was canceled.');
        });

        history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);
        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('rejects with cancellation error when app switch result not found', () => {
        const promise = testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('CUSTOMER');
          expect(err.code).toBe('VENMO_CANCELED');
          expect(err.message).toBe('User canceled Venmo authorization, or Venmo app is not available.');
        });

        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('sets _tokenizationInProgress to false when app switch result not found', () => {
        const promise = testContext.venmo.tokenize().catch(() => {
          expect(testContext.venmo._tokenizationInProgress).toBe(false);
        });

        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('consumes URL fragment parameters on Success result', async () => {
        const promise = testContext.venmo.tokenize();

        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      it.each([
        ['Error'],
        ['Cancel']
      ])('consumes URL fragment parameters on %p result', async (result) => {
        const promise = expect(testContext.venmo.tokenize()).rejects.toThrow();

        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      it('restores the previous URL fragment after consuming Venmo results', () => {
        let promise;

        history.replaceState({}, '', `${testContext.location}#foo`);

        promise = testContext.venmo.tokenize().catch(() => {
          jest.runAllTimers();
        }).then(() => {
          expect(window.location.hash).toBe('#foo');
        });

        history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);

        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('preserves URL if fragments are never set', () => {
        const promise = testContext.venmo.tokenize().catch(() => {
          expect(window.location.href).toBe(testContext.location);
        });

        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('delays processing results by 1 second by default', () => {
        const promise = testContext.venmo.tokenize().then(() => {
          expect(setTimeout).toBeCalledTimes(2);
          // document visibility change event delay
          expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
          // process results
          expect(setTimeout).toBeCalledWith(expect.any(Function), 1000);
        });

        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });

      it('can configure processing delay', () => {
        const promise = testContext.venmo.tokenize({
          processResultsDelay: 3000
        }).then(() => {
          expect(setTimeout).toBeCalledTimes(2);
          // document visibility change event delay
          expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
          // process results
          expect(setTimeout).toBeCalledWith(expect.any(Function), 3000);
        });

        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });
    });

    describe('when hashchange listener triggers', () => {
      it('resolves with nonce payload on success', () => {
        const promise = testContext.venmo.tokenize().then(({ details, nonce, type }) => {
          expect(nonce).toBe('abc');
          expect(type).toBe('VenmoAccount');
          expect(details.username).toBe('keanu');
        });

        expect.assertions(3);
        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);
        triggerHashChangeHandler(testContext.venmo);

        return promise;
      });

      it('sanitizes keys pulled off of hash for non-alpha characters', () => {
        const promise = testContext.venmo.tokenize().then(({ details, nonce, type }) => {
          expect(nonce).toBe('abc');
          expect(type).toBe('VenmoAccount');
          expect(details.username).toBe('keanu');
        });

        expect.assertions(3);
        history.replaceState({}, '', `${testContext.location}#/venmoSuccess=1&paym!entMethodNonce/=abc&userna@me=keanu`);

        triggerHashChangeHandler(testContext.venmo);

        return promise;
      });

      it('rejects with error on Venmo app error', () => {
        const promise = testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('UNKNOWN');
          expect(err.code).toBe('VENMO_APP_FAILED');
          expect(err.message).toBe('Venmo app encountered a problem.');
          expect(err.details.originalError.message).toBe('This is an error message.');
          expect(err.details.originalError.code).toBe('42');
        });

        expect.assertions(6);
        history.replaceState({}, '', `${testContext.location}#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42`);
        triggerHashChangeHandler(testContext.venmo);

        return promise;
      });

      it('rejects with cancellation error on Venmo app cancel', () => {
        const promise = testContext.venmo.tokenize().catch(err => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe('CUSTOMER');
          expect(err.code).toBe('VENMO_APP_CANCELED');
          expect(err.message).toBe('Venmo app authorization was canceled.');
        });

        history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);
        triggerHashChangeHandler(testContext.venmo);

        return promise;
      });

      it('consumes URL fragment parameters on Success result', async () => {
        const promise = testContext.venmo.tokenize();

        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
        triggerHashChangeHandler(testContext.venmo);

        await promise;

        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      it.each([
        ['Error'],
        ['Cancel']
      ])('consumes URL fragment parameters on %p result', async (result) => {
        const promise = expect(testContext.venmo.tokenize()).rejects.toThrow();

        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
        triggerHashChangeHandler(testContext.venmo);

        await promise;

        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      it('restores the previous URL fragment after consuming Venmo results', () => {
        let promise;

        history.replaceState({}, '', `${testContext.location}#foo`);

        promise = testContext.venmo.tokenize().catch(() => {
          jest.runAllTimers();
        }).then(() => {
          expect(window.location.hash).toBe('#foo');
        });

        history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);

        triggerHashChangeHandler(testContext.venmo);

        return promise;
      });
    });

    describe('when deepLinkReturnUrl is specified', () => {
      let originalNavigator;

      beforeEach(() => {
        testContext.venmo = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: 'com.braintreepayments://'
        });

        originalNavigator = window.navigator;
        originalLocation = window.location;
        delete window.navigator;
        delete window.location;
        window.navigator = {
          platform: 'platform'
        };
        window.location = {
          href: 'old',
          hash: ''
        };
      });

      afterEach(() => {
        window.navigator = originalNavigator;
        window.location = originalLocation;
      });

      it.each([
        ['iPhone'],
        ['iPad'],
        ['iPod']
      ])('opens the app switch url by setting window.location.href when platform is %p', async (platform) => {
        window.navigator.platform = platform;

        const promise = testContext.venmo.tokenize();

        window.location.hash = '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu';
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.ios-webview');
        expect(window.open).not.toBeCalled();
        expect(window.location.href).toContain('https://venmo.com/braintree');
      });

      it('opens the app switch url by calling PopupBridge.open when available', async () => {
        window.popupBridge = {
          open: jest.fn()
        };
        const promise = testContext.venmo.tokenize();

        window.location.hash = '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu';
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.popup-bridge');
        expect(window.location.href).toContain('old');
        expect(window.open).not.toBeCalled();
        expect(window.popupBridge.open).toBeCalledWith(expect.stringContaining('https://venmo.com/braintree'));

        delete window.popupBridge;
      });

      it('opens the app switch url by calling window.open otherwise', async () => {
        const promise = testContext.venmo.tokenize();

        window.location.hash = '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu';
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.webview');
        expect(window.location.href).toContain('old');
        expect(window.open).toBeCalledWith(expect.stringContaining('https://venmo.com/braintree'));
      });
    });

    describe('analytics events', () => {
      it('sends an event on app switch starting', async () => {
        const promise = testContext.venmo.tokenize();

        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.browser');
      });

      it('sends an event on app switch return Success', async () => {
        const promise = testContext.venmo.tokenize();

        history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.handle.success');
      });

      it.each([
        ['Error'],
        ['Cancel']
      ])('sends an event on app switch return %p', async (result) => {
        const promise = expect(testContext.venmo.tokenize()).rejects.toThrow();

        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
        triggerVisibilityHandler(testContext.venmo);

        await promise;

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), `venmo.appswitch.handle.${result.toLowerCase()}`);
      });

      it('sends an event when there\'s no app switch result before timeout', () => {
        let promise;

        promise = testContext.venmo.tokenize().catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.cancel-or-unavailable');
        });

        triggerVisibilityHandler(testContext.venmo);

        return promise;
      });
    });
  });

  describe('teardown', () => {
    it('removes event listener from document body', () => {
      testContext.venmo.teardown();

      expect(document.removeEventListener).toHaveBeenCalledTimes(1);
      expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', undefined); // eslint-disable-line no-undefined
    });

    it('replaces all methods so error is thrown when methods are invoked', () => {
      const instance = testContext.venmo;

      return instance.teardown().then(() => {
        methods(Venmo.prototype).forEach(method => {
          try {
            instance[method]();
          } catch (err) {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe(BraintreeError.types.MERCHANT);
            expect(err.code).toBe('METHOD_CALLED_AFTER_TEARDOWN');
            expect(err.message).toBe(`${method} cannot be called after teardown.`);
          }
        });
      });
    });
  });
});
