'use strict';

jest.mock('../../../src/lib/basic-component-verification');
jest.mock('../../../src/lib/create-deferred-client');

const analytics = require('../../../src/lib/analytics');
const basicComponentVerification = require('../../../src/lib/basic-component-verification');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const { create } = require('../../../src/local-payment');
const { fake } = require('../../helpers');
const LocalPayment = require('../../../src/local-payment/external/local-payment');
const BraintreeError = require('../../../src/lib/braintree-error');

describe('local payment', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  afterEach(() => {
    delete window.popupBridge;
  });

  describe('create', () => {
    beforeEach(() => {
      testContext.configuration = fake.configuration();
      testContext.configuration.gatewayConfiguration.paypalEnabled = true;
      testContext.client = fake.client({
        configuration: testContext.configuration
      });
      jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.client);
      jest.spyOn(LocalPayment.prototype, '_initialize').mockResolvedValue(null);
    });

    it('returns a promise', () => {
      expect(create({ client: testContext.client })).resolves.toBeDefined();
    });

    it('verifies with basicComponentVerification', () =>
      create({
        client: testContext.client
      }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Local Payment',
          client: testContext.client
        }));
      }));

    it('can create with an authorization instead of a client', () =>
      create({
        authorization: fake.clientToken,
        debug: true
      }).then(() => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(createDeferredClient.create.mock.calls[0][0].client).toBeUndefined();
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'Local Payment'
        });

        expect(LocalPayment.prototype._initialize).toHaveBeenCalledTimes(1);
      }));

    it('rejects with an error if LocalPayment is not enabled for the merchant', () => {
      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return create({ client: testContext.client }).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('LOCAL_PAYMENT_NOT_ENABLED');
        expect(err.message).toBe('LocalPayment is not enabled for this merchant.');
      });
    });

    it('sends an analytics event', () =>
      create({ client: testContext.client }).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'local-payment.initialized');
      }));
  });
});
