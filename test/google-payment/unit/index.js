'use strict';

jest.mock('../../../src/lib/basic-component-verification');
jest.mock('../../../src/lib/create-assets-url');
jest.mock('../../../src/lib/create-deferred-client');

const basicComponentVerification = require('../../../src/lib/basic-component-verification');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const BraintreeError = require('../../../src/lib/braintree-error');
const googlePayment = require('../../../src/google-payment');
const GooglePayment = require('../../../src/google-payment/google-payment');
const { fake } = require('../../helpers');

describe('googlePayment', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe('create', () => {
    beforeEach(() => {
      const configuration = fake.configuration();

      configuration.gatewayConfiguration.androidPay = {
        enabled: true,
        googleAuthorizationFingerprint: 'fingerprint',
        supportedNetworks: ['visa', 'amex']
      };

      testContext.fakeClient = fake.client({ configuration: configuration });
      testContext.fakeClient._request = () => {
      };
      jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.fakeClient);
    });

    it('returns a promise', () => googlePayment.create({
      client: testContext.fakeClient
    }));

    it('verifies with basicComponentVerification', () => {
      const client = testContext.fakeClient;

      return googlePayment.create({
        client: client
      }).then(() => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith({
          name: 'Google Pay',
          client: client
        });
      });
    });

    it('instantiates a Google Pay integration', () =>
      googlePayment.create({
        client: testContext.fakeClient
      }).then(instance => {
        expect(instance).toBeInstanceOf(GooglePayment);
      }));

    it('can create with an authorization instead of a client', () => {
      googlePayment.create({
        authorization: fake.clientToken,
        debug: true
      }).then(instance => {
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'Google Pay'
        });

        expect(instance).toBeInstanceOf(GooglePayment);
      });
    });

    it('returns error if android pay is not enabled', () => {
      const client = fake.client();

      jest.spyOn(createDeferredClient, 'create').mockResolvedValue(client);

      return googlePayment.create({
        client: client
      }).catch(err => {
        expect(err).toBeDefined();
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('GOOGLE_PAYMENT_NOT_ENABLED');
        expect(err.message).toBe('Google Pay is not enabled for this merchant.');
      });
    });

    it('passes additional googlepay configuration options through googlePayment.create', () =>
      googlePayment.create({
        client: testContext.fakeClient,
        googlePayVersion: 2,
        googleMerchantId: 'some-merchant-id'
      }).then(instance => {
        expect(instance).toBeInstanceOf(GooglePayment);
        expect(instance._googlePayVersion).toBe(2);
        expect(instance._googleMerchantId).toBe('some-merchant-id');
      }));

    it('errors if an unsupported Google Pay API version is passed', () =>
      googlePayment.create({
        client: testContext.fakeClient,
        googlePayVersion: 9001,
        googleMerchantId: 'some-merchant-id'
      }).catch(err => {
        expect(err).toBeDefined();
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe('GOOGLE_PAYMENT_UNSUPPORTED_VERSION');
        expect(err.type).toBe('MERCHANT');
        expect(err.message).toBe(
          'The Braintree SDK does not support Google Pay version 9001. Please upgrade the version of your Braintree SDK and contact support if this error persists.'
        );
      }));
  });
});
