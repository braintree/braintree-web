'use strict';

var Promise = require('../../../src/lib/promise');
var create = require('../../../src/us-bank-account').create;
var USBankAccount = require('../../../src/us-bank-account/us-bank-account');
var BraintreeError = require('../../../src/lib/braintree-error');
var fake = require('../../helpers/fake');
var version = require('../../../package.json').version;

describe('usBankAccount component', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.usBankAccount = {
      plaid: {
        publicKey: 'abc123'
      }
    };

    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this),
      _request: this.sandbox.stub()
    };
  });

  describe('create', function () {
    it('returns a promise', function () {
      var promise = create({client: this.fakeClient});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('calls callback with an error when called without a client', function (done) {
      create({}, function (err, usb) {
        expect(usb).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
        expect(err.message).to.equal('options.client is required when instantiating US Bank Account.');

        done();
      });
    });

    it('throws an error when called with a mismatched version', function (done) {
      this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

      create({client: this.fakeClient}, function (err, usb) {
        expect(usb).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
        expect(err.message).to.equal('Client (version 1.2.3) and US Bank Account (version ' + version + ') components must be from the same SDK version.');

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
