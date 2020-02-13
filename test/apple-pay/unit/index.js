'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/lib/basic-component-verification');
jest.mock('../../../src/lib/create-assets-url');
jest.mock('../../../src/lib/create-deferred-client');

const analytics = require('../../../src/lib/analytics');
const basicComponentVerification = require('../../../src/lib/basic-component-verification');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const BraintreeError = require('../../../src/lib/braintree-error');
const { create } = require('../../../src/apple-pay');
const ApplePay = require('../../../src/apple-pay/apple-pay');
const { fake: { client: fakeClient, clientToken, configuration }} = require('../../helpers');

describe('applePay.create', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.configuration.gatewayConfiguration.applePayWeb = {};

    testContext.client = fakeClient({
      configuration: testContext.configuration
    });

    jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.client);
    jest.spyOn(analytics, 'sendEvent').mockReturnValue(null);
    jest.spyOn(basicComponentVerification, 'verify').mockResolvedValue(null);
  });

  it('returns a promise', async () => {
    await expect(create({ client: testContext.client })).resolves.toBeDefined();
  });

  it('verifies with basicComponentVerification', () => {
    const client = testContext.client;

    return create({
      client
    }).then(() => {
      expect(basicComponentVerification.verify).toBeCalledTimes(1);
      expect(basicComponentVerification.verify).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Apple Pay',
        client
      }));
    });
  });

  it('can create with an authorization instead of a client', () =>
    create({
      authorization: clientToken,
      debug: true
    }).then(applePayInstance => {
      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(createDeferredClient.create).toHaveBeenCalledWith(expect.objectContaining({
        authorization: clientToken,
        debug: true,
        assetsUrl: 'https://example.com/assets',
        name: 'Apple Pay'
      }));

      expect(applePayInstance).toBeInstanceOf(ApplePay);
    }));

  it('rejects with an error when apple pay is not enabled in configuration', () => {
    delete testContext.configuration.gatewayConfiguration.applePayWeb;

    return create({ client: testContext.client }).catch(err => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.code).toBe('APPLE_PAY_NOT_ENABLED');
      expect(err.type).toBe('MERCHANT');
      expect(err.message).toBe('Apple Pay is not enabled for this merchant.');
    });
  });

  it('sends an analytics event', () => {
    const client = testContext.client;

    return create({
      client,
      displayName: 'Awesome Merchant'
    }).then(() => {
      expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'applepay.initialized');
    });
  });
});
