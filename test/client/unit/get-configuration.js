'use strict';

const BraintreeError = require('../../../src/lib/braintree-error');
const { getConfiguration } = require('../../../src/client/get-configuration');
const createAuthorizationData = require('../../../src/lib/create-authorization-data');
const AJAXDriver = require('../../../src/client/request/ajax-driver');
const { fake: { clientToken, clientTokenWithGraphQL, tokenizationKey }, yieldsAsync } = require('../../helpers');
const GraphQL = require('../../../src/client/request/graphql');

describe('getConfiguration', () => {
  beforeEach(() => {
    jest.spyOn(AJAXDriver, 'request').mockReturnValue(null);
  });

  it('returns a promise when no callback is passed', () => {
    const authData = createAuthorizationData('production_abc123_prod_merchant_id');

    expect(getConfiguration(authData)).toBeInstanceOf(Promise);
  });

  describe('tokenization key', () => {
    it('uses a production config endpoint with a production tokenization key', () => {
      const authData = createAuthorizationData('production_abc123_prod_merchant_id');

      getConfiguration(authData);

      expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
        url: 'https://api.braintreegateway.com:443/merchants/prod_merchant_id/client_api/v1/configuration'
      });
    });

    it('uses a sandbox config endpoint with a sandbox tokenization key', () => {
      const authData = createAuthorizationData('sandbox_abc123_sandbox_merchant_id');

      getConfiguration(authData);

      expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
        url: 'https://api.sandbox.braintreegateway.com:443/merchants/sandbox_merchant_id/client_api/v1/configuration'
      });
    });

    it('passes back configuration on successful request', done => {
      const payload = { foo: 'bar' };

      jest.spyOn(AJAXDriver, 'request').mockImplementation(yieldsAsync(null, payload));

      getConfiguration(createAuthorizationData(tokenizationKey), (err, response) => {
        expect(err).toBeFalsy();

        expect(Object.keys(response.analyticsMetadata)).toEqual([
          'merchantAppId',
          'platform',
          'sdkVersion',
          'source',
          'integration',
          'integrationType',
          'sessionId'
        ]);

        expect(response.gatewayConfiguration).toBe(payload);
        expect(response.authorizationType).toBe('TOKENIZATION_KEY');

        done();
      });
    });

    it('calls the callback with a CLIENT_AUTHORIZATION_INVALID error if request 401s', done => {
      const fakeErr = new Error('you goofed!');

      jest.spyOn(AJAXDriver, 'request').mockImplementation(yieldsAsync(fakeErr, null, 401));

      getConfiguration(createAuthorizationData(tokenizationKey), (err, response) => {
        expect(response).toBeFalsy();

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('CLIENT_AUTHORIZATION_INVALID');
        expect(err.message).toBe('Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted.');
        expect(err.details.originalError).toBe(fakeErr);

        done();
      });
    });

    it('calls the callback with a CLIENT_AUTHORIZATION_INSUFFICIENT error if request 403s', done => {
      const fakeErr = new Error('you goofed!');

      jest.spyOn(AJAXDriver, 'request').mockImplementation(yieldsAsync(fakeErr, null, 403));

      getConfiguration(createAuthorizationData(tokenizationKey), (err, response) => {
        expect(response).toBeFalsy();

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('CLIENT_AUTHORIZATION_INSUFFICIENT');
        expect(err.message).toBe('The authorization used has insufficient privileges.');
        expect(err.details.originalError).toBe(fakeErr);

        done();
      });
    });

    it('calls the callback with a CLIENT_GATEWAY_NETWORK error if request fails', done => {
      const fakeErr = new Error('you goofed!');

      jest.spyOn(AJAXDriver, 'request').mockImplementation(yieldsAsync(fakeErr, null));

      getConfiguration(createAuthorizationData(tokenizationKey), (err, response) => {
        expect(response).toBeFalsy();

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('NETWORK');
        expect(err.code).toBe('CLIENT_GATEWAY_NETWORK');
        expect(err.message).toBe('Cannot contact the gateway at this time.');
        expect(err.details.originalError).toBe(fakeErr);

        done();
      });
    });
  });

  describe('client token', () => {
    it('uses the config endpoint from the client token', () => {
      const authData = createAuthorizationData(clientToken);
      const configUrl = JSON.parse(atob(clientToken)).configUrl;

      jest.spyOn(AJAXDriver, 'request').mockReturnValue(null);
      getConfiguration(authData);

      expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
        url: configUrl
      });
    });

    it('passes back configuration on successful request', done => {
      const payload = { foo: 'bar' };

      jest.spyOn(AJAXDriver, 'request').mockImplementation(yieldsAsync(null, payload));

      getConfiguration(createAuthorizationData(clientToken), (err, response) => {
        expect(err).toBeFalsy();

        expect(Object.keys(response.analyticsMetadata)).toEqual(expect.arrayContaining([
          'merchantAppId',
          'platform',
          'sdkVersion',
          'source',
          'integration',
          'integrationType',
          'sessionId'
        ]));

        expect(response.gatewayConfiguration).toBe(payload);
        expect(response.authorizationType).toBe('CLIENT_TOKEN');

        done();
      });
    });

    it('calls the callback with a CLIENT_GATEWAY_NETWORK error if request fails', done => {
      const fakeErr = new Error('you goofed!');

      jest.spyOn(AJAXDriver, 'request').mockImplementation(yieldsAsync(fakeErr, null));

      getConfiguration(createAuthorizationData(clientToken), (err, response) => {
        expect(response).toBeFalsy();

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('NETWORK');
        expect(err.code).toBe('CLIENT_GATEWAY_NETWORK');
        expect(err.message).toBe('Cannot contact the gateway at this time.');
        expect(err.details.originalError).toBe(fakeErr);

        done();
      });
    });
  });

  describe('configVersion', () => {
    it('is set with expected value when requesting configuration over AJAX', done => {
      jest.spyOn(AJAXDriver, 'request').mockImplementation(options => {
        expect(options.data.configVersion).toBe('3');
        done();
      });

      getConfiguration(createAuthorizationData(clientToken));
    });
  });

  describe('GraphQL configuration', () => {
    describe('client token', () => {
      it('creates a GraphQL instance when GraphQLConfiguration is present', done => {
        jest.spyOn(AJAXDriver, 'request').mockImplementation(authorization => {
          expect(authorization.graphQL).toBeInstanceOf(GraphQL);
          done();
        });

        getConfiguration(createAuthorizationData(clientTokenWithGraphQL));
      });

      it('does not create a GraphQL instance when GraphQLConfiguration is not present', done => {
        jest.spyOn(AJAXDriver, 'request').mockImplementation(authorization => {
          expect(authorization.graphQL).toBeFalsy();
          done();
        });

        getConfiguration(createAuthorizationData(clientToken));
      });
    });

    describe('tokenization key', () => {
      it('creates a GraphQL instance', done => {
        jest.spyOn(AJAXDriver, 'request').mockImplementation(authorization => {
          expect(authorization.graphQL).toBeInstanceOf(GraphQL);
          done();
        });

        getConfiguration(createAuthorizationData(tokenizationKey));
      });
    });
  });
});
