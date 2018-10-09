'use strict';

var Client = require('../../../src/client/client');
var client = require('../../../src/client');
var BraintreeError = require('../../../src/lib/braintree-error');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var fake = require('../../helpers/fake');

describe('client.create', function () {
  beforeEach(function () {
    this.initializeSpy = this.sandbox.stub(Client, 'initialize').resolves(fake.client());
  });

  it('supports a callback', function (done) {
    var self = this;

    client.create({authorization: fake.tokenizationKey}, function () {
      expect(self.initializeSpy).to.be.calledOnce;
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

    return client.create({authorization: fake.tokenizationKey}).then(function () {
      expect(self.initializeSpy).to.be.calledOnce;
      expect(self.initializeSpy).to.be.calledWith(self.sandbox.match({
        authorization: fake.tokenizationKey
      }));
    });
  });

  it('accepts a clientToken', function () {
    var self = this;

    return client.create({authorization: fake.clientToken}).then(function () {
      expect(self.initializeSpy).to.be.calledOnce;
      expect(self.initializeSpy).to.be.calledWith(self.sandbox.match({
        authorization: fake.clientToken
      }));
    });
  });
});
