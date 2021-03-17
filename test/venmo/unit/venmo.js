'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/venmo/shared/supports-venmo');
jest.mock('../../../src/venmo/external');
jest.mock('../../../src/lib/in-iframe');

const analytics = require('../../../src/lib/analytics');
const { fake } = require('../../helpers');
const querystring = require('../../../src/lib/querystring');
const BraintreeError = require('../../../src/lib/braintree-error');
const Venmo = require('../../../src/venmo/venmo');
const browserDetection = require('../../../src/venmo/shared/browser-detection');
const supportsVenmo = require('../../../src/venmo/shared/supports-venmo');
const inIframe = require('../../../src/lib/in-iframe');
const { version: VERSION } = require('../../../package.json');
const methods = require('../../../src/lib/methods');
const createVenmoDesktop = require('../../../src/venmo/external');

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
    inIframe.mockReturnValue(false);

    testContext.location = originalLocation;
    testContext.configuration = fake.configuration();
    testContext.client = {
      request: jest.fn().mockResolvedValue({}),
      getConfiguration: () => testContext.configuration
    };

    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');

    window.location.href = originalLocation;
  });

  it('sends analytics events when venmo is not configured for desktop', async () => {
    new Venmo({
      createPromise: Promise.resolve(testContext.client)
    });

    await new Promise((resolve) => {
      window.setImmediate(resolve);
    });

    expect(analytics.sendEvent).not.toBeCalledWith(expect.anything(), 'venmo.desktop-flow.configured.true');
    expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.desktop-flow.configured.false');
    expect(analytics.sendEvent).not.toBeCalledWith(expect.anything(), 'venmo.desktop-flow.presented');
  });

  it('sends analytics events for configuring venmo for desktop', async () => {
    // pass a stub so create methods don't hang
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: Promise.resolve(testContext.client)
    });

    await new Promise((resolve) => {
      window.setImmediate(resolve);
    });

    expect(analytics.sendEvent).not.toBeCalledWith(expect.anything(), 'venmo.desktop-flow.configured.false');
    expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.desktop-flow.configured.true');
    expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.desktop-flow.presented');
  });

  it('sends analytics events for when venmo desktop setup fails', async () => {
    // pass a stub so create methods don't hang
    createVenmoDesktop.mockRejectedValue(new Error('foo'));
    new Venmo({
      allowDesktop: true,
      createPromise: Promise.resolve(testContext.client)
    });

    await new Promise((resolve) => {
      window.setImmediate(resolve);
    });

    expect(analytics.sendEvent).not.toBeCalledWith(expect.anything(), 'venmo.desktop-flow.presented');
    expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.desktop-flow.setup-failed');
  });

  it('sets up a payment context when mobile polling flow is used', async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: 'CREATED',
            id: 'context-id',
            createdAt: '2021-01-20T03:25:37.522000Z',
            expiresAt: '2021-01-20T03:30:37.522000Z'
          }
        }
      }
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: Promise.resolve(testContext.client)
    });

    await new Promise((resolve) => {
      window.setImmediate(resolve);
    });

    expect(testContext.client.request).toBeCalledWith({
      api: 'graphQLApi',
      data: {
        query: expect.stringMatching('mutation CreateVenmoQRCodePaymentContext'),
        variables: {
          input: {
            environment: 'SANDBOX',
            intent: 'PAY_FROM_APP'
          }
        }
      }
    });
    expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.mobile-polling.presented');

    expect(venmo._mobilePollingContextStatus).toBe('CREATED');
    expect(venmo._mobilePollingContextId).toBe('context-id');
  });

  it('errors when payment context fails to set up', async () => {
    expect.assertions(4);

    const networkError = new Error('some network error');

    testContext.client.request.mockRejectedValue(networkError);
    inIframe.mockResolvedValue(true);
    const venmo = new Venmo({
      createPromise: Promise.resolve(testContext.client)
    });

    await venmo.getUrl().catch((err) => {
      expect(err.code).toBe('VENMO_MOBILE_POLLING_SETUP_FAILED');
      expect(err.details.originalError).toBe(networkError);

      expect(analytics.sendEvent).not.toBeCalledWith(expect.anything(), 'venmo.mobile-polling.presented');
      expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.mobile-polling.setup-failed');
    });
  });

  describe('getUrl', () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });
    });

    afterEach(() => {
      history.replaceState({}, '', testContext.location);
    });

    it('is set to correct base URL', () =>
      venmo.getUrl().then(url => {
        expect(url.indexOf('https://venmo.com/braintree/checkout')).toBe(0);
      })
    );

    it('removes hash from parent page url for use with return urls', () => {
      const pageUrlWithoutHash = window.location.href;

      window.location.hash = '#bar';

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params['x-success']).toBe(`${pageUrlWithoutHash}#venmoSuccess=1`);
        expect(params['x-cancel']).toBe(`${pageUrlWithoutHash}#venmoCancel=1`);
        expect(params['x-error']).toBe(`${pageUrlWithoutHash}#venmoError=1`);
      });
    });

    it('removes hash with no value from parent page url', () => {
      const pageUrlWithoutHash = window.location.href;

      window.location.hash = '#';

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params['x-success']).toBe(`${pageUrlWithoutHash}#venmoSuccess=1`);
        expect(params['x-cancel']).toBe(`${pageUrlWithoutHash}#venmoCancel=1`);
        expect(params['x-error']).toBe(`${pageUrlWithoutHash}#venmoError=1`);
      });
    });

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
        venmo = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: location
        });
      } else if (location !== testContext.location) {
        history.replaceState({}, '', location);
      }

      return venmo.getUrl().then(url => {
        params = querystring.parse(url);
        expect(params['x-success']).toBe(expectedReturnUrls['x-success']);
        expect(params['x-cancel']).toBe(expectedReturnUrls['x-cancel']);
        expect(params['x-error']).toBe(expectedReturnUrls['x-error']);
      });
    });

    it('omits return urls when using polling flow without a deep link return url', () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: 'CREATED',
              id: 'context-id',
              createdAt: '2021-01-20T03:25:37.522000Z',
              expiresAt: '2021-01-20T03:30:37.522000Z'
            }
          }
        }
      });
      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client)
      });

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params['x-success']).toBe('NOOP');
        expect(params['x-cancel']).toBe('NOOP');
        expect(params['x-error']).toBe('NOOP');
      });
    });

    it('includes return urls when using polling flow with a deep link return url', () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: 'CREATED',
              id: 'context-id',
              createdAt: '2021-01-20T03:25:37.522000Z',
              expiresAt: '2021-01-20T03:30:37.522000Z'
            }
          }
        }
      });
      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        deepLinkReturnUrl: 'https://example.com/top-level-page',
        createPromise: Promise.resolve(testContext.client)
      });

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params['x-success']).toBe('https://example.com/top-level-page#venmoSuccess=1');
        expect(params['x-cancel']).toBe('https://example.com/top-level-page#venmoCancel=1');
        expect(params['x-error']).toBe('https://example.com/top-level-page#venmoError=1');
      });
    });

    it('omits return urls when configured to require manual return', () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: 'CREATED',
              id: 'context-id',
              createdAt: '2021-01-20T03:25:37.522000Z',
              expiresAt: '2021-01-20T03:30:37.522000Z'
            }
          }
        }
      });
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        requireManualReturn: true
      });

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params['x-success']).toBe('NOOP');
        expect(params['x-cancel']).toBe('NOOP');
        expect(params['x-error']).toBe('NOOP');
      });
    });

    it('contains user agent in query params', () => {
      let params;
      const userAgent = window.navigator.userAgent;

      return venmo.getUrl().then(url => {
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

      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        profileId: merchantID
      });

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params.braintree_merchant_id).toBe(braintreeConfig.braintree_merchant_id);
        expect(params.braintree_access_token).toBe(braintreeConfig.braintree_access_token);
        expect(params.braintree_environment).toBe(braintreeConfig.braintree_environment);
      });
      /* eslint-enable camelcase */
    });

    it('uses mobile polling context id when it is present', () => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client)
      });

      venmo._mobilePollingContextId = 'context-id';

      return venmo.getUrl().then(url => {
        const params = querystring.parse(url);

        expect(params.braintree_access_token).toBe('pwv-access-token|pcid:context-id');
      });
    });

    it('contains metadata in query params to forward to Venmo', () => {
      let params, braintreeData, metadata;

      return venmo.getUrl().then(url => {
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
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });
      jest.spyOn(supportsVenmo, 'isBrowserSupported');
    });

    it('calls isBrowserSupported library', () => {
      supportsVenmo.isBrowserSupported.mockReturnValue(true);

      expect(venmo.isBrowserSupported()).toBe(true);

      supportsVenmo.isBrowserSupported.mockReturnValue(false);

      expect(venmo.isBrowserSupported()).toBe(false);
    });

    it('calls isBrowserSupported with allowNewBrowserTab: true by default', () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(expect.objectContaining({
        allowNewBrowserTab: true
      }));
    });

    it('calls isBrowserSupported with allowWebviews: true by default', () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(expect.objectContaining({
        allowWebviews: true
      }));
    });

    it('calls isBrowserSupported with allowDesktop: false by default', () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(expect.objectContaining({
        allowDesktop: false
      }));
    });

    it('calls isBrowserSupported with allowNewBrowserTab: false when venmo instance is configured to do so', () => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        allowNewBrowserTab: false
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(expect.objectContaining({
        allowNewBrowserTab: false
      }));
    });

    it('calls isBrowserSupported with allowWebviews: false when venmo instance is configured to do so', () => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        allowWebviews: false
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(expect.objectContaining({
        allowWebviews: false
      }));
    });

    it('calls isBrowserSupported with allowDesktop: true when venmo instance is configured to do so', () => {
      // pass a stub so create methods don't hang
      createVenmoDesktop.mockResolvedValue({});
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        allowDesktop: true
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(expect.objectContaining({
        allowDesktop: true
      }));
    });
  });

  describe('hasTokenizationResult', () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });
    });

    afterEach(() => {
      history.replaceState({}, '', testContext.location);
    });

    it.each([
      ['Success'], ['Error'], ['Cancel']
    ])('returns true when URL has %p payload', (payload) => {
      history.replaceState({}, '', `${testContext.location}#venmo${payload}=1`);

      expect(venmo.hasTokenizationResult()).toBe(true);
    });

    it('returns false when URL has no Venmo payload', () => {
      expect(venmo.hasTokenizationResult()).toBe(false);
    });
  });

  describe('tokenize', () => {
    it('errors if another tokenization request is active', () => {
      const venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });

      venmo.tokenize();

      return venmo.tokenize().catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('VENMO_TOKENIZATION_REQUEST_ACTIVE');
        expect(err.type).toBe('MERCHANT');
        expect(err.message).toBe('Another tokenization request is active.');
      });
    });

    describe('mobile flow with hash change listeners', () => {
      let venmo;

      beforeEach(() => {
        jest.useFakeTimers();

        venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });
      });

      afterEach(() => {
        /*
         * Some tests use replaceState to simulate app switch returns rather
         * than updating window.location manually because this causes errors.
         * The window state needs to be reset after those tests.
         * */
        history.replaceState({}, '', testContext.location);
      });

      it('errors if getUrl fails', () => {
        jest.spyOn(venmo, 'getUrl').mockRejectedValue(new Error('client error'));

        return expect(venmo.tokenize()).rejects.toThrow('client error');
      });

      describe('when URL has Venmo results before calling tokenize', () => {
        it('resolves with nonce payload on successful result', () => {
          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);

          return venmo.tokenize().then(payload => {
            expect(payload.nonce).toBe('abc');
            expect(payload.type).toBe('VenmoAccount');
            expect(payload.details.username).toBe('keanu');
          });
        });

        it('rejects with error for error result', () => {
          history.replaceState({}, '', `${testContext.location}#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42`);

          return venmo.tokenize().catch(err => {
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

          return venmo.tokenize().catch(err => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe('CUSTOMER');
            expect(err.code).toBe('VENMO_APP_CANCELED');
            expect(err.message).toBe('Venmo app authorization was canceled.');
          });
        });

        it('consumes URL fragment parameters on Success result', async () => {
          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);

          await venmo.tokenize();

          expect(window.location.href.indexOf('#')).toBe(-1);
        });

        it.each([
          ['Error'],
          ['Cancel']
        ])('consumes URL fragment parameters on %p result', async (result) => {
          history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);

          await expect(venmo.tokenize()).rejects.toThrow();

          expect(window.location.href.indexOf('#')).toBe(-1);
        });

        it('does not modify history state on Success if configured', async () => {
          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);

          venmo = new Venmo({
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

          venmo = new Venmo({
            client: testContext.client,
            ignoreHistoryChanges: true
          });

          await expect(venmo.tokenize()).rejects.toThrow();

          expect(window.location.hash).toBe(`#venmo${result}=1`);
        });
      });

      describe('when visibility listener triggers', () => {
        it('resolves with nonce payload on success', () => {
          const promise = venmo.tokenize().then(({ details, nonce, type }) => {
            expect(nonce).toBe('abc');
            expect(type).toBe('VenmoAccount');
            expect(details.username).toBe('keanu');
          });

          expect.assertions(3);
          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('sanitizes keys pulled off of hash for non-alpha characters', () => {
          const promise = venmo.tokenize().then(({ details, nonce, type }) => {
            expect(nonce).toBe('abc');
            expect(type).toBe('VenmoAccount');
            expect(details.username).toBe('keanu');
          });

          expect.assertions(3);
          history.replaceState({}, '', `${testContext.location}#/venmoSuccess=1&paym!entMethodNonce/=abc&userna@#me=keanu`);

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('rejects with error on Venmo app error', () => {
          const promise = venmo.tokenize().catch(err => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe('UNKNOWN');
            expect(err.code).toBe('VENMO_APP_FAILED');
            expect(err.message).toBe('Venmo app encountered a problem.');
            expect(err.details.originalError.message).toBe('This is an error message.');
            expect(err.details.originalError.code).toBe('42');
          });

          expect.assertions(6);
          history.replaceState({}, '', `${testContext.location}#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42`);
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('rejects with cancellation error on Venmo app cancel', () => {
          const promise = venmo.tokenize().catch(err => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe('CUSTOMER');
            expect(err.code).toBe('VENMO_APP_CANCELED');
            expect(err.message).toBe('Venmo app authorization was canceled.');
          });

          history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('rejects with cancellation error when app switch result not found', () => {
          const promise = venmo.tokenize().catch(err => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe('CUSTOMER');
            expect(err.code).toBe('VENMO_CANCELED');
            expect(err.message).toBe('User canceled Venmo authorization, or Venmo app is not available.');
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('sets _tokenizationInProgress to false when app switch result not found', () => {
          const promise = venmo.tokenize().catch(() => {
            expect(venmo._tokenizationInProgress).toBe(false);
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('consumes URL fragment parameters on Success result', async () => {
          const promise = venmo.tokenize();

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerVisibilityHandler(venmo);

          await promise;

          expect(window.location.href.indexOf('#')).toBe(-1);
        });

        it.each([
          ['Error'],
          ['Cancel']
        ])('consumes URL fragment parameters on %p result', async (result) => {
          const promise = expect(venmo.tokenize()).rejects.toThrow();

          history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
          triggerVisibilityHandler(venmo);

          await promise;

          expect(window.location.href.indexOf('#')).toBe(-1);
        });

        it('restores the previous URL fragment after consuming Venmo results', () => {
          let promise;

          history.replaceState({}, '', `${testContext.location}#foo`);

          promise = venmo.tokenize().catch(() => {
            jest.runAllTimers();
          }).then(() => {
            expect(window.location.hash).toBe('#foo');
          });

          history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('preserves URL if fragments are never set', () => {
          const promise = venmo.tokenize().catch(() => {
            expect(window.location.href).toBe(testContext.location);
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('delays processing results by 1 second by default', () => {
          const promise = venmo.tokenize().then(() => {
            expect(setTimeout).toBeCalledTimes(2);
            // document visibility change event delay
            expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
            // process results
            expect(setTimeout).toBeCalledWith(expect.any(Function), 1000);
          });

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it('can configure processing delay', () => {
          const promise = venmo.tokenize({
            processResultsDelay: 3000
          }).then(() => {
            expect(setTimeout).toBeCalledTimes(2);
            // document visibility change event delay
            expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
            // process results
            expect(setTimeout).toBeCalledWith(expect.any(Function), 3000);
          });

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerVisibilityHandler(venmo);

          return promise;
        });
      });

      describe('when hashchange listener triggers', () => {
        it('resolves with nonce payload on success', () => {
          const promise = venmo.tokenize().then(({ details, nonce, type }) => {
            expect(nonce).toBe('abc');
            expect(type).toBe('VenmoAccount');
            expect(details.username).toBe('keanu');
          });

          expect.assertions(3);
          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`);
          triggerHashChangeHandler(venmo);

          return promise;
        });

        it('sanitizes keys pulled off of hash for non-alpha characters', () => {
          const promise = venmo.tokenize().then(({ details, nonce, type }) => {
            expect(nonce).toBe('abc');
            expect(type).toBe('VenmoAccount');
            expect(details.username).toBe('keanu');
          });

          expect.assertions(3);
          history.replaceState({}, '', `${testContext.location}#/venmoSuccess=1&paym!entMethodNonce/=abc&userna@me=keanu`);

          triggerHashChangeHandler(venmo);

          return promise;
        });

        it('rejects with error on Venmo app error', () => {
          const promise = venmo.tokenize().catch(err => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe('UNKNOWN');
            expect(err.code).toBe('VENMO_APP_FAILED');
            expect(err.message).toBe('Venmo app encountered a problem.');
            expect(err.details.originalError.message).toBe('This is an error message.');
            expect(err.details.originalError.code).toBe('42');
          });

          expect.assertions(6);
          history.replaceState({}, '', `${testContext.location}#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42`);
          triggerHashChangeHandler(venmo);

          return promise;
        });

        it('rejects with cancellation error on Venmo app cancel', () => {
          const promise = venmo.tokenize().catch(err => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe('CUSTOMER');
            expect(err.code).toBe('VENMO_APP_CANCELED');
            expect(err.message).toBe('Venmo app authorization was canceled.');
          });

          history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);
          triggerHashChangeHandler(venmo);

          return promise;
        });

        it('consumes URL fragment parameters on Success result', async () => {
          const promise = venmo.tokenize();

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerHashChangeHandler(venmo);

          await promise;

          expect(window.location.href.indexOf('#')).toBe(-1);
        });

        it.each([
          ['Error'],
          ['Cancel']
        ])('consumes URL fragment parameters on %p result', async (result) => {
          const promise = expect(venmo.tokenize()).rejects.toThrow();

          history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
          triggerHashChangeHandler(venmo);

          await promise;

          expect(window.location.href.indexOf('#')).toBe(-1);
        });

        it('restores the previous URL fragment after consuming Venmo results', () => {
          let promise;

          history.replaceState({}, '', `${testContext.location}#foo`);

          promise = venmo.tokenize().catch(() => {
            jest.runAllTimers();
          }).then(() => {
            expect(window.location.hash).toBe('#foo');
          });

          history.replaceState({}, '', `${testContext.location}#venmoCancel=1`);

          triggerHashChangeHandler(venmo);

          return promise;
        });
      });

      describe('when deepLinkReturnUrl is specified', () => {
        let originalNavigator;

        beforeEach(() => {
          venmo = new Venmo({
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

          const promise = venmo.tokenize();

          window.location.hash = '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu';
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.ios-webview');
          expect(window.open).not.toBeCalled();
          expect(window.location.href).toContain('https://venmo.com/braintree');
        });

        it('opens the app switch url by calling PopupBridge.open when available', async () => {
          window.popupBridge = {
            open: jest.fn()
          };
          const promise = venmo.tokenize();

          window.location.hash = '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu';
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.popup-bridge');
          expect(window.location.href).toContain('old');
          expect(window.open).not.toBeCalled();
          expect(window.popupBridge.open).toBeCalledWith(expect.stringContaining('https://venmo.com/braintree'));

          delete window.popupBridge;
        });

        it('opens the app switch url by calling window.open otherwise', async () => {
          const promise = venmo.tokenize();

          window.location.hash = '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu';
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.webview');
          expect(window.location.href).toContain('old');
          expect(window.open).toBeCalledWith(expect.stringContaining('https://venmo.com/braintree'));
        });
      });

      describe('analytics events', () => {
        it('sends an event that the mobile flow is used', async () => {
          const promise = venmo.tokenize();

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.tokenize.mobile.start');
        });

        it('sends an event on app switch starting', async () => {
          const promise = venmo.tokenize();

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.start.browser');
        });

        it('sends an event on app switch return Success', async () => {
          const promise = venmo.tokenize();

          history.replaceState({}, '', `${testContext.location}#venmoSuccess=1`);
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.handle.success');
        });

        it.each([
          ['Error'],
          ['Cancel']
        ])('sends an event on app switch return %p', async (result) => {
          const promise = expect(venmo.tokenize()).rejects.toThrow();

          history.replaceState({}, '', `${testContext.location}#venmo${result}=1`);
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), `venmo.appswitch.handle.${result.toLowerCase()}`);
        });

        it('sends an event when there\'s no app switch result before timeout', () => {
          expect.assertions(1);

          const promise = venmo.tokenize().catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.appswitch.cancel-or-unavailable');
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });
      });
    });

    describe('mobile flow with polling', () => {
      let venmo;

      beforeEach(() => {
        jest.useRealTimers();

        testContext.client.request.mockResolvedValueOnce({
          data: {
            createVenmoQRCodePaymentContext: {
              venmoQRCodePaymentContext: {
                status: 'CREATED',
                id: 'context-id',
                createdAt: new Date().toString(),
                expiresAt: new Date(Date.now() + 30000000).toString()
              }
            }
          }
        });

        inIframe.mockReturnValue(true);
        venmo = new Venmo({
          createPromise: Promise.resolve(testContext.client)
        });
        venmo._mobilePollingInterval = 10;
        venmo._mobilePollingExpiresThreshold = 50;
      });

      it('resolves when polling concludes', async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: 'APPROVED',
              paymentMethodId: 'fake-nonce',
              userName: 'some-name'
            }
          }
        });

        const payload = await venmo.tokenize();

        expect(window.open).toBeCalledTimes(1);
        expect(window.open).toBeCalledWith(expect.stringContaining('braintree_access_token=pwv-access-token%7Cpcid%3Acontext-id'));

        expect(payload.nonce).toBe('fake-nonce');
        expect(payload.type).toBe('VenmoAccount');
        expect(payload.details.username).toBe('@some-name');

        expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.start');
        expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.success');
        expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.appswitch.start.browser');
      });

      it('uses window.location.href when in an ios webview', async () => {
        const locationGlobal = window.location;

        delete window.location;
        window.location = {
          href: 'old'
        };
        jest.spyOn(browserDetection, 'isIosWebview').mockReturnValue(true);

        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: 'APPROVED',
              paymentMethodId: 'fake-nonce',
              userName: 'some-name'
            }
          }
        });

        await venmo.tokenize();

        expect(window.open).not.toBeCalled();
        expect(window.location.href).toEqual(expect.stringContaining('braintree_access_token=pwv-access-token%7Cpcid%3Acontext-id'));

        window.location = locationGlobal;
      });

      it('rejects when a network error occurs', async () => {
        expect.assertions(4);

        const networkError = new Error('network error');

        testContext.client.request.mockRejectedValueOnce(networkError);

        await venmo.tokenize().catch((err) => {
          expect(analytics.sendEvent).not.toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.success');
          expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.failure');

          expect(err.code).toBe('VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR');
          expect(err.details.originalError).toBe(networkError);
        });
      });

      it.each([
        'EXPIRED',
        'FAILED',
        'CANCELED'
      ])('rejects for %s status', async (status) => {
        expect.assertions(2);

        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status
            }
          }
        });

        await venmo.tokenize().catch((err) => {
          expect(err.code).toBe(`VENMO_MOBILE_POLLING_TOKENIZATION_${status}`);
          expect(analytics.sendEvent).toBeCalledWith(expect.anything(),
            `venmo.tokenize.mobile-polling.status-change.${status.toLowerCase()}`
          );
        });
      });

      it('sends an analytics event for each status change', async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: 'SCANNED'
            }
          }
        });
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: 'UNKNOWN_STATUS_WE_DO_NOT_ACCOUNT_FOR'
            }
          }
        });
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: 'APPROVED',
              paymentMethodId: 'fake-nonce',
              username: 'some-name'
            }
          }
        });

        await venmo.tokenize();

        expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.status-change.scanned');
        expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.status-change.unknown_status_we_do_not_account_for');
        expect(analytics.sendEvent).toBeCalledWith(expect.anything(), 'venmo.tokenize.mobile-polling.status-change.approved');

        expect(testContext.client.request).toBeCalledTimes(4);
      });

      it('rejects if polling lasts for 5 minutes with no results', async () => {
        testContext.client.request.mockResolvedValue({
          data: {
            node: {
              status: 'SCANNED'
            }
          }
        });

        const promise = venmo.tokenize().catch((err) => {
          expect(err.code).toBe('VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT');
        });

        await promise;
      });
    });

    describe('desktop flow', () => {
      let venmo, fakeVenmoDesktop;

      beforeEach(() => {
        jest.useRealTimers();

        fakeVenmoDesktop = {
          hideDesktopFlow: jest.fn().mockResolvedValue(),
          launchDesktopFlow: jest.fn().mockResolvedValue({
            paymentMethodNonce: 'fake-venmo-account-nonce',
            username: '@username'
          })
        };
        createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);
        venmo = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          allowDesktop: true
        });
      });

      it('launches the venmo desktop flow', async () => {
        await venmo.tokenize();

        expect(fakeVenmoDesktop.launchDesktopFlow).toBeCalledTimes(1);
      });

      it('sends an event that the desktop flow is started', async () => {
        await venmo.tokenize();

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.tokenize.desktop.start');
      });

      it('resolves with the nonce payload', async () => {
        const result = await venmo.tokenize();

        expect(result).toEqual({
          nonce: 'fake-venmo-account-nonce',
          type: 'VenmoAccount',
          details: {
            username: '@username'
          }
        });
      });

      it('sends an event when the desktop flow succeeds', async () => {
        await venmo.tokenize();

        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.tokenize.desktop.success');
      });

      it('rejects when venmo desktop flow rejects', async () => {
        expect.assertions(2);

        const error = new Error('fail');

        fakeVenmoDesktop.launchDesktopFlow.mockRejectedValue(error);

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(err.code).toBe('VENMO_DESKTOP_UNKNOWN_ERROR');
          expect(err.details.originalError).toBe(error);
        }
      });

      it('passes on specific desktop canceled event when customer cancels the modal', async () => {
        expect.assertions(1);

        const error = new Error('fail');

        error.reason = 'CUSTOMER_CANCELED';

        fakeVenmoDesktop.launchDesktopFlow.mockRejectedValue(error);

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(err.code).toBe('VENMO_DESKTOP_CANCELED');
        }
      });

      it('sends an event when the desktop flow fails', async () => {
        expect.assertions(1);

        fakeVenmoDesktop.launchDesktopFlow.mockRejectedValue(new Error('fail'));

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'venmo.tokenize.desktop.failure');
        }
      });
    });
  });

  describe('cancelTokenization', () => {
    it('errors if no tokenization is in process', () => {
      const venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });

      expect.assertions(1);

      return venmo.cancelTokenization().catch((err) => {
        expect(err.code).toBe('VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE');
      });
    });

    it('rejects tokenize with an error indicating that the merchant canceled the flow', () => {
      expect.assertions(1);

      const venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });

      jest.spyOn(window, 'addEventListener').mockImplementation();
      jest.spyOn(window.document, 'addEventListener').mockImplementation();
      jest.spyOn(window, 'open').mockImplementation();

      const promise = venmo.tokenize().catch((err) => {
        expect(err.code).toBe('VENMO_TOKENIZATION_CANCELED_BY_MERCHANT');
      });

      jest.spyOn(window, 'removeEventListener').mockImplementation();
      jest.spyOn(window.document, 'removeEventListener').mockImplementation();

      return venmo.cancelTokenization().then(() => {
        return promise;
      });
    });

    it('removes event listeners for event listener mobile flow', () => {
      const venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });

      jest.spyOn(window, 'addEventListener').mockImplementation();
      jest.spyOn(window.document, 'addEventListener').mockImplementation();
      jest.spyOn(window, 'open').mockImplementation();

      venmo.tokenize().catch(() => {
        // noop
      });

      jest.spyOn(window, 'removeEventListener').mockImplementation();
      jest.spyOn(window.document, 'removeEventListener').mockImplementation();

      return venmo.cancelTokenization().then(() => {
        expect(window.removeEventListener).toBeCalledTimes(1);
        expect(window.removeEventListener).toBeCalledWith('hashchange', expect.any(Function));
        expect(window.document.removeEventListener).toBeCalledTimes(1);
        expect(window.document.removeEventListener).toBeCalledWith('visibilitychange', expect.any(Function));
      });
    });

    it('cancels the payment context in mobile polling flow', () => {
      testContext.client.request.mockResolvedValueOnce({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: 'CREATED',
              id: 'context-id',
              createdAt: new Date().toString(),
              expiresAt: new Date(Date.now() + 30000000).toString()
            }
          }
        }
      });

      inIframe.mockReturnValue(true);

      const venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client)
      });

      venmo.tokenize().catch(() => {
        // noop
      });

      return venmo.cancelTokenization().then(() => {
        expect(testContext.client.request).toBeCalledWith({
          api: 'graphQLApi',
          data: {
            query: expect.stringMatching('mutation UpdateVenmoQRCodePaymentContext'),
            variables: {
              input: {
                id: 'context-id',
                status: 'CANCELED'
              }
            }
          }
        });
      });
    });

    it('cancels the venmo desktop flow', () => {
      const fakeVenmoDesktop = {
        hideDesktopFlow: jest.fn().mockResolvedValue(),
        updateVenmoDesktopPaymentContext: jest.fn().mockResolvedValue(),
        launchDesktopFlow: jest.fn().mockResolvedValue({
          paymentMethodNonce: 'fake-venmo-account-nonce',
          username: '@username'
        })
      };

      createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);

      const venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        allowDesktop: true
      });

      venmo.tokenize().catch(() => {
        // noop
      });

      return venmo.cancelTokenization().then(() => {
        expect(fakeVenmoDesktop.updateVenmoDesktopPaymentContext).toBeCalledTimes(1);
        expect(fakeVenmoDesktop.updateVenmoDesktopPaymentContext).toBeCalledWith('CANCELED');
      });
    });
  });

  describe('teardown', () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({ createPromise: Promise.resolve(testContext.client) });
    });

    it('removes event listener from document body', () => {
      venmo.teardown();

      expect(document.removeEventListener).toHaveBeenCalledTimes(1);
      expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', undefined); // eslint-disable-line no-undefined
    });

    it('replaces all methods so error is thrown when methods are invoked', () => {
      const instance = venmo;

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

    it('tears down venmo desktop instance if it exists', () => {
      const fakeVenmoDesktop = {
        teardown: jest.fn().mockResolvedValue()
      };

      createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        allowDesktop: true
      });

      return venmo.teardown().then(() => {
        expect(fakeVenmoDesktop.teardown).toBeCalledTimes(1);
      });
    });

    it('cancels mobile polling venmo payment context if it exists', async () => {
      testContext.client.request.mockResolvedValueOnce({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: 'CREATED',
              id: 'context-id',
              createdAt: new Date().toString(),
              expiresAt: new Date(Date.now() + 30000000).toString()
            }
          }
        }
      });

      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client)
      });

      await new Promise((resolve) => {
        window.setImmediate(resolve);
      });

      return venmo.teardown().then(() => {
        expect(testContext.client.request).toBeCalledWith({
          api: 'graphQLApi',
          data: {
            query: expect.stringMatching('mutation UpdateVenmoQRCodePaymentContext'),
            variables: {
              input: {
                id: 'context-id',
                status: 'CANCELED'
              }
            }
          }
        });
      });
    });
  });
});
