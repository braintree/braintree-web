'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/us-bank-account').create;
var USBankAccount = require('../../../src/us-bank-account/us-bank-account');
var BraintreeError = require('../../../src/lib/braintree-error');
var fake = require('../../helpers/fake');

describe('usBankAccount component', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.usBankAccount = {
      plaid: {
        publicKey: 'abc123'
      }
    };

    this.fakeClient = fake.client({
      configuration: this.configuration
    });
    this.fakeClient._request = this.sandbox.stub();
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    this.sandbox.stub(createDeferredClient, 'create').resolves(this.fakeClient);
    this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
  });

  describe('create', function () {
    it('returns a promise', function () {
      var promise = create({client: this.fakeClient});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
          name: 'US Bank Account',
          client: client
        });
        done();
      });
    });

    it('can create with an authorization instead of a client', function (done) {
      create({
        authorization: fake.clientToken,
        debug: true
      }, function (err, instance) {
        expect(err).not.to.exist;

        expect(createDeferredClient.create).to.be.calledOnce;
        expect(createDeferredClient.create).to.be.calledWith({
          authorization: fake.clientToken,
          client: this.sandbox.match.typeOf('undefined'),
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'US Bank Account'
        });

        expect(instance).to.be.an.instanceof(USBankAccount);

        done();
      }.bind(this));
    });

    it('calls back with error when client does not have usBankAccount gateway configuration', function (done) {
      delete this.configuration.gatewayConfiguration.usBankAccount;

      create({client: this.fakeClient}, function (err, usb) {
        expect(usb).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('US_BANK_ACCOUNT_NOT_ENABLED');
        expect(err.message).to.equal('US bank account is not enabled.');

        done();
      });
    });

    it('creates a USBankAccount instance when called with a client', function (done) {
      create({client: this.fakeClient}, function (err, usb) {
        expect(err).not.to.exist;

        expect(usb).to.be.an.instanceof(USBankAccount);

        done();
      });
    });
  });
});
