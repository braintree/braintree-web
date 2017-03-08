'use strict';

var BraintreeError = require('../../../src/lib/braintree-error');
var Promise = require('../../../src/lib/promise');
var getConfiguration = require('../../../src/client/get-configuration').getConfiguration;
var AJAXDriver = require('../../../src/client/request/ajax-driver');
var fake = require('../../helpers/fake');

describe('getConfiguration', function () {
  it('returns a promise when no callback is passed', function () {
    var options = {authorization: 'production_abc123_prod_merchant_id'};

    this.sandbox.stub(AJAXDriver, 'request');

    expect(getConfiguration(options)).to.be.an.instanceof(Promise);
  });

  describe('tokenization key', function () {
    it('uses a production config endpoint with a production tokenization key', function () {
      var options = {authorization: 'production_abc123_prod_merchant_id'};

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(options);

      expect(AJAXDriver.request).to.be.calledWith(this.sandbox.match({
        url: 'https://api.braintreegateway.com:443/merchants/prod_merchant_id/client_api/v1/configuration'
      }));
    });

    it('uses a sandbox config endpoint with a sandbox tokenization key', function () {
      var options = {authorization: 'sandbox_abc123_sandbox_merchant_id'};

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(options);

      expect(AJAXDriver.request).to.be.calledWith(this.sandbox.match({
        url: 'https://api.sandbox.braintreegateway.com:443/merchants/sandbox_merchant_id/client_api/v1/configuration'
      }));
    });

    it('passes back configuration on succesful request', function (done) {
      var payload = {foo: 'bar'};

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(null, payload);

      getConfiguration({authorization: fake.tokenizationKey}, function (err, response) {
        expect(err).to.not.exist;
        expect(response.authorization).to.equal(fake.tokenizationKey);

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

      getConfiguration({authorization: fake.tokenizationKey}, function (err, response) {
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

      getConfiguration({authorization: fake.tokenizationKey}, function (err, response) {
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
      var options = {authorization: fake.clientToken};
      var configUrl = JSON.parse(atob(options.authorization)).configUrl;

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(options);

      expect(AJAXDriver.request).to.be.calledWith(this.sandbox.match({
        url: configUrl
      }));
    });

    it('passes back configuration on succesful request', function (done) {
      var payload = {foo: 'bar'};

      this.sandbox.stub(AJAXDriver, 'request').yieldsAsync(null, payload);

      getConfiguration({authorization: fake.clientToken}, function (err, response) {
        expect(err).to.not.exist;
        expect(response.authorization).to.equal(fake.clientToken);

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

      getConfiguration({authorization: fake.clientToken}, function (err, response) {
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

  describe('error handling', function () {
    it('returns an error with bad authorization', function (done) {
      getConfiguration({authorization: 'bogus'}, function (err, result) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('CLIENT_INVALID_AUTHORIZATION');
        expect(err.message).to.equal('Authorization is invalid. Make sure your client token or tokenization key is valid.');
        expect(result).not.to.exist;

        done();
      });
    });
  });

  describe('configVersion', function () {
    it('is set with expected value when requesting configuration over AJAX', function (done) {
      this.sandbox.stub(AJAXDriver, 'request', function (options) {
        expect(options.data.configVersion).to.equal('3');
        done();
      });

      getConfiguration({authorization: fake.clientToken});
    });
  });
});
