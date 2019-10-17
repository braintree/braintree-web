'use strict';

var BraintreeError = require('../../../src/lib/braintree-error');
var Promise = require('../../../src/lib/promise');
var getConfiguration = require('../../../src/client/get-configuration').getConfiguration;
var createAuthorizationData = require('../../../src/lib/create-authorization-data');
var AJAXDriver = require('../../../src/client/request/ajax-driver');
var fake = require('../../helpers/fake');
var GraphQL = require('../../../src/client/request/graphql');

describe('getConfiguration', function () {
  it('returns a promise when no callback is passed', function () {
    var authData = createAuthorizationData('production_abc123_prod_merchant_id');

    this.sandbox.stub(AJAXDriver, 'request');

    expect(getConfiguration(authData)).to.be.an.instanceof(Promise);
  });

  describe('tokenization key', function () {
    it('uses a production config endpoint with a production tokenization key', function () {
      var authData = createAuthorizationData('production_abc123_prod_merchant_id');

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(authData);

      expect(AJAXDriver.request).to.be.calledWith(this.sandbox.match({
        url: 'https://api.braintreegateway.com:443/merchants/prod_merchant_id/client_api/v1/configuration'
      }));
    });

    it('uses a sandbox config endpoint with a sandbox tokenization key', function () {
      var authData = createAuthorizationData('sandbox_abc123_sandbox_merchant_id');

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(authData);

      expect(AJAXDriver.request).to.be.calledWith(this.sandbox.match({
        url: 'https://api.sandbox.braintreegateway.com:443/merchants/sandbox_merchant_id/client_api/v1/configuration'
      }));
    });

    it('passes back configuration on succesful request', function (done) {
      var payload = {foo: 'bar'};

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(null, payload);

      getConfiguration(createAuthorizationData(fake.tokenizationKey), function (err, response) {
        expect(err).to.not.exist;

        expect(response.analyticsMetadata).to.have.all.keys('merchantAppId', 'platform', 'sdkVersion', 'source', 'integration', 'integrationType', 'sessionId');
        Object.keys(response.analyticsMetadata).forEach(function (key) {
          expect(response.analyticsMetadata[key]).to.be.a('string');
        });

        expect(response.gatewayConfiguration).to.equal(payload);
        expect(response.authorizationType).to.equal('TOKENIZATION_KEY');

        done();
      });
    });

    it('calls the callback with a CLIENT_AUTHORIZATION_INSUFFICIENT error if request 403s', function (done) {
      var fakeErr = new Error('you goofed!');

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(fakeErr, null, 403);

      getConfiguration(createAuthorizationData(fake.tokenizationKey), function (err, response) {
        expect(response).to.not.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('CLIENT_AUTHORIZATION_INSUFFICIENT');
        expect(err.message).to.equal('The authorization used has insufficient privileges.');
        expect(err.details.originalError).to.equal(fakeErr);

        done();
      });
    });

    it('calls the callback with a CLIENT_GATEWAY_NETWORK error if request fails', function (done) {
      var fakeErr = new Error('you goofed!');

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(fakeErr, null);

      getConfiguration(createAuthorizationData(fake.tokenizationKey), function (err, response) {
        expect(response).to.not.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('CLIENT_GATEWAY_NETWORK');
        expect(err.message).to.equal('Cannot contact the gateway at this time.');
        expect(err.details.originalError).to.equal(fakeErr);

        done();
      });
    });
  });

  describe('client token', function () {
    it('uses the config endpoint from the client token', function () {
      var authData = createAuthorizationData(fake.clientToken);
      var configUrl = JSON.parse(atob(fake.clientToken)).configUrl;

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(authData);

      expect(AJAXDriver.request).to.be.calledWith(this.sandbox.match({
        url: configUrl
      }));
    });

    it('passes back configuration on succesful request', function (done) {
      var payload = {foo: 'bar'};

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(null, payload);

      getConfiguration(createAuthorizationData(fake.clientToken), function (err, response) {
        expect(err).to.not.exist;

        expect(response.analyticsMetadata).to.have.all.keys('merchantAppId', 'platform', 'sdkVersion', 'source', 'integration', 'integrationType', 'sessionId');
        Object.keys(response.analyticsMetadata).forEach(function (key) {
          expect(response.analyticsMetadata[key]).to.be.a('string');
        });

        expect(response.gatewayConfiguration).to.equal(payload);
        expect(response.authorizationType).to.equal('CLIENT_TOKEN');

        done();
      });
    });

    it('calls the callback with a CLIENT_GATEWAY_NETWORK error if request fails', function (done) {
      var fakeErr = new Error('you goofed!');

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(fakeErr, null);

      getConfiguration(createAuthorizationData(fake.clientToken), function (err, response) {
        expect(response).to.not.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('CLIENT_GATEWAY_NETWORK');
        expect(err.message).to.equal('Cannot contact the gateway at this time.');
        expect(err.details.originalError).to.equal(fakeErr);

        done();
      });
    });
  });

  describe('configVersion', function () {
    it('is set with expected value when requesting configuration over AJAX', function (done) {
      this.sandbox.stub(AJAXDriver, 'request').callsFake(function (authorization) {
        expect(authorization.data.configVersion).to.equal('3');
        done();
      });

      getConfiguration(createAuthorizationData(fake.clientToken));
    });
  });

  describe('GraphQL configuration', function () {
    describe('client token', function () {
      it('creates a GraphQL instance when GraphQLConfiguration is present', function (done) {
        this.sandbox.stub(AJAXDriver, 'request').callsFake(function (authorization) {
          expect(authorization.graphQL).to.be.instanceof(GraphQL);
          done();
        });

        getConfiguration(createAuthorizationData(fake.clientTokenWithGraphQL));
      });

      it('does not create a GraphQL instance when GraphQLConfiguration is not present', function (done) {
        this.sandbox.stub(AJAXDriver, 'request').callsFake(function (authorization) {
          expect(authorization.graphQL).not.to.exist;
          done();
        });

        getConfiguration(createAuthorizationData(fake.clientToken));
      });
    });

    describe('tokenization key', function () {
      it('creates a GraphQL instance', function (done) {
        this.sandbox.stub(AJAXDriver, 'request').callsFake(function (authorization) {
          expect(authorization.graphQL).to.be.instanceof(GraphQL);
          done();
        });

        getConfiguration(createAuthorizationData(fake.tokenizationKey));
      });
    });
  });
});
