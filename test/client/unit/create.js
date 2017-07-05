'use strict';

var Client = require('../../../src/client/client');
var client = require('../../../src/client');
var AJAXDriver = require('../../../src/client/request/ajax-driver');
var BraintreeError = require('../../../src/lib/braintree-error');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var fake = require('../../helpers/fake');

describe('client.create', function () {
  beforeEach(function () {
    client._clearCache();
    this.getSpy = this.sandbox.stub(AJAXDriver, 'request').yields(null, fake.configuration().gatewayConfiguration);
  });

  it('supports a callback', function (done) {
    var self = this;

    client.create({authorization: fake.tokenizationKey}, function () {
      expect(self.getSpy).to.be.calledWith(self.sandbox.match({
        url: self.sandbox.match(/client_api\/v1\/configuration$/)
      }));
      done();
    });
  });

  it('rejcts if no authorization given', function () {
    return client.create({}).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
      expect(err.message).to.equal('options.authorization is required when instantiating a client.');
    });
  });

  it('accepts a tokenizationKey', function () {
    var self = this;

    return client.create({authorization: fake.tokenizationKey}).then(function (thingy) {
      expect(thingy).to.be.an.instanceof(Client);
      expect(self.getSpy).to.be.calledWith(self.sandbox.match({
        data: {tokenizationKey: fake.tokenizationKey}
      }));
    });
  });

  it('accepts a clientToken', function () {
    var self = this;
    var fingerprint = JSON.parse(atob(fake.clientToken)).authorizationFingerprint;

    return client.create({authorization: fake.clientToken}).then(function (thingy) {
      expect(thingy).to.be.an.instanceof(Client);
      expect(self.getSpy).to.be.calledWith(self.sandbox.match({
        data: {authorizationFingerprint: fingerprint}
      }));
    });
  });

  it('gets the configuration from the gateway', function () {
    var self = this;

    return client.create({authorization: fake.tokenizationKey}).then(function () {
      expect(self.getSpy).to.be.calledWith(self.sandbox.match({
        url: self.sandbox.match(/client_api\/v1\/configuration$/)
      }));
    });
  });

  it('caches client when created with the same authorization', function () {
    var getSpy = this.getSpy;

    return client.create({authorization: fake.tokenizationKey}).then(function (firstFakeClient) {
      return client.create({authorization: fake.clientToken}).then(function (secondFakeClient) {
        expect(firstFakeClient).to.not.equal(secondFakeClient);

        expect(getSpy).to.be.calledTwice;
        getSpy.reset();

        return client.create({authorization: fake.tokenizationKey});
      }).then(function (thirdFakeClient) {
        expect(getSpy).to.not.be.called;
        expect(firstFakeClient).to.equal(thirdFakeClient);
      });
    });
  });

  it('errors out when configuration endpoint is not reachable', function () {
    this.getSpy.restore();
    this.getSpy = this.sandbox.stub(AJAXDriver, 'request').yields({errors: 'Unknown error'});

    return client.create({authorization: fake.tokenizationKey}).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('NETWORK');
      expect(err.code).to.equal('CLIENT_GATEWAY_NETWORK');
      expect(err.message).to.equal('Cannot contact the gateway at this time.');
    });
  });

  it('errors out when the Client fails to initialize', function () {
    this.getSpy.restore();
    this.getSpy = this.sandbox.stub(AJAXDriver, 'request').yields(null, null);

    return client.create({authorization: fake.tokenizationKey}).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('INTERNAL');
      expect(err.code).to.equal('CLIENT_MISSING_GATEWAY_CONFIGURATION');
      expect(err.message).to.equal('Missing gatewayConfiguration.');
    });
  });

  it('can pass debug: true onto configuration', function () {
    return client.create({authorization: fake.clientToken, debug: true}).then(function (thingy) {
      expect(thingy).to.be.an.instanceof(Client);
      expect(thingy.getConfiguration().isDebug).to.be.true;
    });
  });
});
