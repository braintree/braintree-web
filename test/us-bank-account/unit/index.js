'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
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
        expect(basicComponentVerification.verify).to.be.calledWith({
          name: 'US Bank Account',
          client: client
        });
        done();
      });
    });

    it("throws an error when the client doesn't have braintreeApi gateway configuration", function (done) {
      delete this.configuration.gatewayConfiguration.braintreeApi;

      create({client: this.fakeClient}, function (err, usb) {
        expect(usb).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('BRAINTREE_API_ACCESS_RESTRICTED');
        expect(err.message).to.equal('Your access is restricted and cannot use this part of the Braintree API.');

        done();
      });
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
