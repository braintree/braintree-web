'use strict';

jest.mock('../../../src/lib/basic-component-verification');
jest.mock('../../../src/lib/create-deferred-client');
jest.mock('../../../src/lib/create-assets-url');

const analytics = require('../../../src/lib/analytics');
const basicComponentVerification = require('../../../src/lib/basic-component-verification');
const isHTTPS = require('../../../src/lib/is-https');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const threeDSecure = require('../../../src/three-d-secure');
const ThreeDSecure = require('../../../src/three-d-secure/external/three-d-secure');
const BraintreeError = require('../../../src/lib/braintree-error');
const { fake } = require('../../helpers');

describe('three-d-secure.create', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    const configuration = fake.configuration();

    configuration.gatewayConfiguration.threeDSecureEnabled = true;
    testContext.configuration = configuration;
    testContext.client = fake.client({
      configuration: testContext.configuration
    });

    jest.spyOn(isHTTPS, 'isHTTPS').mockReturnValue(true);
    jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.client);
  });

  it('verifies with basicComponentVerification', () => {
    const client = testContext.client;

    expect.assertions(2);

    return threeDSecure.create({
      client: client
    }).then(() => {
      expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
      expect(basicComponentVerification.verify.mock.calls[0][0]).toMatchObject({
        name: '3D Secure',
        client: client
      });
    });
  });

  it('errors if merchant passes in unrecognized version', () =>
    threeDSecure.create({
      client: testContext.client,
      version: 'unknown'
    }).catch(err => {
      expect(err.code).toBe('THREEDS_UNRECOGNIZED_VERSION');
      expect(err.message).toBe(
        'Version `unknown` is not a recognized version. You may need to update the version of your Braintree SDK to support this version.'
      );
    }));

  it.each([
    '1',
    '2',
    '2-cardinal-modal',
    '2-bootstrap3-modal',
    '2-inline-iframe'
  ])('does not error if merchant passes in %s versionEnum', versionEnum => {
    testContext.configuration.gatewayConfiguration.threeDSecure = {
      cardinalAuthenticationJWT: 'jwt'
    };

    return threeDSecure.create({
      client: testContext.client,
      version: versionEnum
    });
  });

  describe.each([
    '2',
    '2-cardinal-modal',
    '2-bootstrap3-modal',
    '2-inline-iframe'
  ])('version-related errors', versionEnum => {
    it(`errors if merchant does not have a 3ds object when ${versionEnum} version is specified`, () => {
      const client = testContext.client;

      expect.assertions(2);
      delete testContext.configuration.gatewayConfiguration.threeDSecure;

      return threeDSecure.create({
        client: client,
        version: versionEnum
      }).catch(({ code }) => {
        expect(code).toBe('THREEDS_NOT_ENABLED_FOR_V2');
        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT');
      });
    });

    it(`errors if merchant does not have a jwt to setup songbird when ${versionEnum} version is specified`, () => {
      const client = testContext.client;

      expect.assertions(2);
      testContext.configuration.gatewayConfiguration.threeDSecure = {};

      return threeDSecure.create({
        client: client,
        version: versionEnum
      }).catch(({ code }) => {
        expect(code).toBe('THREEDS_NOT_ENABLED_FOR_V2');
        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT');
      });
    });
  });

  it('can create with an authorization instead of a client', () =>
    threeDSecure.create({
      authorization: fake.clientToken,
      debug: true
    }).then((instance) => {
      expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
      expect(createDeferredClient.create.client).toBeUndefined();
      expect(createDeferredClient.create).toHaveBeenCalledWith({
        authorization: fake.clientToken,
        debug: true,
        assetsUrl: 'https://example.com/assets',
        name: '3D Secure'
      });

      expect(instance).toBeInstanceOf(ThreeDSecure);
    }));

  it('errors out if three-d-secure is not enabled', () => {
    testContext.configuration.gatewayConfiguration.threeDSecureEnabled = false;

    expect.assertions(4);

    return threeDSecure.create({ client: testContext.client }).catch(err => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe('MERCHANT');
      expect(err.code).toBe('THREEDS_NOT_ENABLED');
      expect(err.message).toBe('3D Secure is not enabled for this merchant.');
    });
  });

  it('errors out if tokenization key is used', () => {
    testContext.configuration.authorizationType = 'TOKENIZATION_KEY';

    expect.assertions(4);

    return threeDSecure.create({ client: testContext.client }).catch(err => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe('MERCHANT');
      expect(err.code).toBe('THREEDS_CAN_NOT_USE_TOKENIZATION_KEY');
      expect(err.message).toBe('3D Secure can not use a tokenization key for authorization.');
    });
  });

  it('errors out if browser is not https and environment is production', () => {
    isHTTPS.isHTTPS.mockClear();

    testContext.configuration.gatewayConfiguration.environment = 'production';
    jest.spyOn(isHTTPS, 'isHTTPS').mockReturnValue(false);

    expect.assertions(4);

    return threeDSecure.create({ client: testContext.client }).catch(err => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe('MERCHANT');
      expect(err.code).toBe('THREEDS_HTTPS_REQUIRED');
      expect(err.message).toBe('3D Secure requires HTTPS.');
    });
  });

  it('allows http connections when not in production', () => {
    isHTTPS.isHTTPS.mockClear();
    testContext.configuration.gatewayConfiguration.environment = 'sandbox';
    jest.spyOn(isHTTPS, 'isHTTPS').mockReturnValue(false);

    expect.assertions(1);

    return threeDSecure.create({ client: testContext.client }).then(foo => {
      expect(foo).toBeInstanceOf(ThreeDSecure);
    });
  });

  it('sends an analytics event', () => {
    const client = testContext.client;

    expect.assertions(1);

    return threeDSecure.create({ client: client }).then(() => {
      expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'three-d-secure.initialized');
    });
  });

  it('resolves with a three-d-secure instance', () =>
    threeDSecure.create({ client: testContext.client }).then(foo => {
      expect(foo).toBeInstanceOf(ThreeDSecure);
    }));
});
