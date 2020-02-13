'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/lib/create-assets-url');
jest.mock('../../../src/lib/create-deferred-client');

const analytics = require('../../../src/lib/analytics');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const PreferredPaymentMethods = require('../../../src/preferred-payment-methods/preferred-payment-methods');

describe('PreferredPaymentMethods', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.fakeClient = {};
    jest.spyOn(createDeferredClient, 'create').mockImplementation(() => new Promise(resolve => {
      process.nextTick(() => {
        resolve(testContext.fakeClient);
      });
    }));
  });

  describe('initialize', () => {
    it('creates a deferred client', () => {
      testContext.instance = new PreferredPaymentMethods();
      testContext.fakeClient = {};

      return testContext.instance.initialize({
        authorization: 'fake-auth'
      }).then(() => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: 'fake-auth',
          assetsUrl: 'https://example.com/assets',
          name: 'PreferredPaymentMethods'
        });
      });
    });

    it('resolves with self', () => {
      expect(new PreferredPaymentMethods().initialize({ client: testContext.fakeClient }))
        .resolves.toBeInstanceOf(PreferredPaymentMethods);
    });

    it('sends an initialized analytics event', () =>
      new PreferredPaymentMethods().initialize({ client: {}}).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(expect.anything(), 'preferred-payment-methods.initialized');
      }));
  });

  describe('fetchPreferredPaymentMethods', () => {
    beforeEach(() => {
      testContext.fakeClient = {
        request: jest.fn().mockResolvedValue(null)
      };

      testContext.instance = new PreferredPaymentMethods();

      return testContext.instance.initialize({ client: testContext.fakeClient }).then(() => {
        analytics.sendEvent.mockClear();
      });
    });

    it('sends a GraphQL request for preferred payment methods', () => {
      testContext.fakeClient.request.mockResolvedValue({
        data: {
          clientConfiguration: {
            paypal: {
              paymentMethodAvailableOnDevice: true
            }
          }
        }
      });

      return testContext.instance.fetchPreferredPaymentMethods().then(() => {
        expect(testContext.fakeClient.request).toHaveBeenCalledTimes(1);
        expect(testContext.fakeClient.request).toHaveBeenCalledWith({
          api: 'graphQLApi',
          data: {
            query: 'query ClientConfiguration { clientConfiguration { paypal { paymentMethodAvailableOnDevice } } }'
          }
        });
      });
    });

    it('returns a promise with PayPal preferred true when GraphQL returns true', () => {
      testContext.fakeClient.request.mockResolvedValue({
        data: {
          clientConfiguration: {
            paypal: { paymentMethodAvailableOnDevice: true }
          }
        }
      });

      return testContext.instance.fetchPreferredPaymentMethods().then(({ paypalPreferred }) => {
        expect(paypalPreferred).toBe(true);
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.fakeClient, 'preferred-payment-methods.paypal.api-detected.true');
      });
    });

    it('returns a promise with PayPal preferred false when GraphQL returns false', () => {
      testContext.fakeClient.request.mockResolvedValue({
        data: {
          clientConfiguration: {
            paypal: { paymentMethodAvailableOnDevice: false }
          }
        }
      });

      return testContext.instance.fetchPreferredPaymentMethods().then(({ paypalPreferred }) => {
        expect(paypalPreferred).toBe(false);
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.fakeClient, 'preferred-payment-methods.paypal.api-detected.false');
      });
    });

    it('returns a promise with PayPal preferred false when an error occurs', () => {
      testContext.fakeClient.request.mockRejectedValue(new Error('No preferred PayPal for you!'));

      return testContext.instance.fetchPreferredPaymentMethods().then(({ paypalPreferred }) => {
        expect(paypalPreferred).toBe(false);
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.fakeClient, 'preferred-payment-methods.api-error');
      });
    });

    it('waits for deferred client to complete before making a request', () => {
      let clientFinished = false;
      const fakeClient = testContext.fakeClient;
      const instance = new PreferredPaymentMethods();

      fakeClient.request.mockResolvedValue({
        data: {
          clientConfiguration: {
            paypal: { isPaymentMethodAvailableOnDevice: true }
          }
        }
      });
      jest.spyOn(createDeferredClient, 'create').mockImplementation(() => new Promise(resolve => {
        process.nextTick(() => {
          clientFinished = true;
          resolve(fakeClient);
        });
      }));

      return instance.initialize({ authorization: 'fake-auth' }).then(() => {
        expect(clientFinished).toBe(false);

        return instance.fetchPreferredPaymentMethods();
      }).then(() => {
        expect(clientFinished).toBe(true);
      });
    });

    it('rejects if a setup error occurs creating the deferred client', () => {
      let didNotErrorOnInitialize = true;
      const setupError = new Error('setup');
      const instance = new PreferredPaymentMethods();

      jest.spyOn(createDeferredClient, 'create').mockRejectedValue(setupError);

      return instance.initialize({ authorization: 'fake-auth' }).catch(() => {
        // should not get here
        didNotErrorOnInitialize = false;
      }).then(() => instance.fetchPreferredPaymentMethods()).catch(err => {
        expect(didNotErrorOnInitialize).toBe(true);
        expect(err).toBe(setupError);
      });
    });
  });
});
