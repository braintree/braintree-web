'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/venmo/shared/supports-venmo');

const analytics = require('../../../src/lib/analytics');
const { fake, rejectIfResolves } = require('../../helpers');
const querystring = require('../../../src/lib/querystring');
const BraintreeError = require('../../../src/lib/braintree-error');
const Venmo = require('../../../src/venmo/venmo');
const supportsVenmo = require('../../../src/venmo/shared/supports-venmo');
const { version: VERSION } = require('../../../package.json');
const methods = require('../../../src/lib/methods');

function triggerAppSwitchReturnEvents(instance) {
  instance._visibilityChangeListener();

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
    testContext.venmo = new Venmo({ client: testContext.client });

    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');

    window.location.href = originalLocation;
  });

  describe('_initialize', () => {
    afterEach(() => {
      history.replaceState({}, '', testContext.location);
    });

    it('resolves with the Venmo instance', () => {
      expect(testContext.venmo._initialize()).resolves.toBeInstanceOf(Venmo);
    });

    describe('_url', () => {
      it('is set to correct base URL', () =>
        testContext.venmo._initialize().then(venmoInstance => {
          expect(venmoInstance._url.indexOf('https://venmo.com/braintree/checkout')).toBe(0);
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
            client: testContext.client,
            deepLinkReturnUrl: location
          });
        } else if (location !== testContext.location) {
          history.replaceState({}, '', location);
        }

        return testContext.venmo._initialize().then(venmoInstance => {
          params = querystring.parse(venmoInstance._url);
          expect(params['x-success']).toBe(expectedReturnUrls['x-success']);
          expect(params['x-cancel']).toBe(expectedReturnUrls['x-cancel']);
          expect(params['x-error']).toBe(expectedReturnUrls['x-error']);
        });
      });

      it('contains user agent in query params', () => {
        let params;
        const userAgent = window.navigator.userAgent;

        return testContext.venmo._initialize().then(venmoInstance => {
          params = querystring.parse(venmoInstance._url);
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
          client: testContext.client,
          profileId: merchantID
        });

        return testContext.venmo._initialize().then(venmoInstance => {
          const params = querystring.parse(venmoInstance._url);

          expect(params.braintree_merchant_id).toBe(braintreeConfig.braintree_merchant_id);
          expect(params.braintree_access_token).toBe(braintreeConfig.braintree_access_token);
          expect(params.braintree_environment).toBe(braintreeConfig.braintree_environment);
        });
        /* eslint-enable camelcase */
      });

      it('contains metadata in query params to forward to Venmo', () => {
        let params, braintreeData, metadata;

        return testContext.venmo._initialize().then(venmoInstance => {
          params = querystring.parse(venmoInstance._url);
          braintreeData = JSON.parse(atob(params.braintree_sdk_data)); // eslint-disable-line camelcase
          metadata = braintreeData._meta;

          expect(metadata.version).toBe(VERSION);
          expect(metadata.sessionId).toBe('fakeSessionId');
          expect(metadata.integration).toBe('custom');
          expect(metadata.platform).toBe('web');
          expect(Object.keys(metadata).length).toBe(4);
        });
      });
    });
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
        client: testContext.client,
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

      it.each([
        ['Success'],
        ['Error'],
        ['Cancel']
      ])('consumes URL fragment parameters on %p result', result => {
        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);

        return testContext.venmo.tokenize().then(rejectIfResolves).catch(() => {
          expect(window.location.href.indexOf('#')).toBe(-1);
        });
      });
    });

    it('resolves with nonce payload on success', () => {
      const promise = testContext.venmo.tokenize().then(({ details, nonce, type }) => {
        expect(nonce).toBe('abc');
        expect(type).toBe('VenmoAccount');
        expect(details.username).toBe('keanu');
      });

      expect.assertions(3);
      history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);
      triggerAppSwitchReturnEvents(testContext.venmo);

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

      triggerAppSwitchReturnEvents(testContext.venmo);

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
      triggerAppSwitchReturnEvents(testContext.venmo);

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
      triggerAppSwitchReturnEvents(testContext.venmo);

      return promise;
    });

    it('rejects with cancellation error when app switch result not found', () => {
      const promise = testContext.venmo.tokenize().catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('CUSTOMER');
        expect(err.code).toBe('VENMO_CANCELED');
        expect(err.message).toBe('User canceled Venmo authorization, or Venmo app is not available.');
      });

      triggerAppSwitchReturnEvents(testContext.venmo);

      return promise;
    });

    it('sets _tokenizationInProgress to false when app switch result not found', () => {
      const promise = testContext.venmo.tokenize().catch(() => {
        expect(testContext.venmo._tokenizationInProgress).toBe(false);
      });

      triggerAppSwitchReturnEvents(testContext.venmo);

      return promise;
    });

    it.each([
      ['Success'],
      ['Error'],
      ['Cancel']
    ])('consumes URL fragment parameters on %p result', result => {
      const promise = testContext.venmo.tokenize().then(rejectIfResolves).catch(() => {
        expect(window.location.href.indexOf('#')).toBe(-1);
      });

      history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
      triggerAppSwitchReturnEvents(testContext.venmo);

      return promise;
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

      triggerAppSwitchReturnEvents(testContext.venmo);

      return promise;
    });

    it('preserves URL if fragments are never set', () => {
      const promise = testContext.venmo.tokenize().catch(() => {
        expect(window.location.href).toBe(testContext.location);
      });

      triggerAppSwitchReturnEvents(testContext.venmo);

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
      triggerAppSwitchReturnEvents(testContext.venmo);

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
      triggerAppSwitchReturnEvents(testContext.venmo);

      return promise;
    });

    describe('analytics events', () => {
      it.each([
        ['Success'],
        ['Error'],
        ['Cancel']
      ])('sends an event on app switch return %p', (result) => {
        const promise = testContext.venmo.tokenize().then(rejectIfResolves).catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, `venmo.appswitch.handle.${result.toLowerCase()}`);
        });

        history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
        triggerAppSwitchReturnEvents(testContext.venmo);

        return promise;
      });

      it('sends an event when there\'s no app switch result before timeout', () => {
        let promise;
        const client = testContext.client;

        promise = testContext.venmo.tokenize().catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'venmo.appswitch.cancel-or-unavailable');
        });

        triggerAppSwitchReturnEvents(testContext.venmo);

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
