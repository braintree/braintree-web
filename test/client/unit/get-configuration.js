'use strict';

var BraintreeError = require('../../../src/lib/error');
var getConfiguration = require('../../../src/client/get-configuration').getConfiguration;
var AJAXDriver = require('../../../src/client/request/ajax-driver');
var fake = require('../../helpers/fake');

describe('getConfiguration', function () {
  describe('tokenization key', function () {
    it('uses a production config endpoint with a production tokenization key', function () {
      var options = {authorization: 'production_abc123_prod_merchant_id'};

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(options);

      expect(AJAXDriver.request).to.have.been.calledWith(sinon.match({
        url: 'https://api.braintreegateway.com:443/merchants/prod_merchant_id/client_api/v1/configuration'
      }));
    });

    it('uses a sandbox config endpoint with a sandbox tokenization key', function () {
      var options = {authorization: 'sandbox_abc123_sandbox_merchant_id'};

      this.sandbox.stub(AJAXDriver, 'request');
      getConfiguration(options);

      expect(AJAXDriver.request).to.have.been.calledWith(sinon.match({
        url: 'https://api.sandbox.braintreegateway.com:443/merchants/sandbox_merchant_id/client_api/v1/configuration'
      }));
    });

    it('passes back configuration on succesful request', function (done) {
      var payload = {foo: 'bar'};

      this.sandbox.stub(AJAXDriver, 'request').yields(null, payload);

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

    it('calls the callback with a CLIENT_GATEWAY_NETWORK error if request fails', function (done) {
      var fakeErr = new Error('you goofed!');

      this.sandbox.stub(AJAXDriver, 'request').yields(fakeErr, null);

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

      expect(AJAXDriver.request).to.have.been.calledWith(sinon.match({
        url: configUrl
      }));
    });

    it('passes back configuration on succesful request', function (done) {
      var payload = {foo: 'bar'};

      this.sandbox.stub(AJAXDriver, 'request').yields(null, payload);

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

      this.sandbox.stub(AJAXDriver, 'request').yields(fakeErr, null);

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
});
