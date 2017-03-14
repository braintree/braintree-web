'use strict';

var create = require('../../../src/vault-manager').create;
var VaultManager = require('../../../src/vault-manager/vault-manager');
var BraintreeError = require('../../../src/lib/braintree-error');
var fake = require('../../helpers/fake');
var version = require('../../../package.json').version;
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;

describe('vaultManager', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this)
    };
  });

  describe('create', function () {
    it('supports callbacks', function (done) {
      create({client: this.fakeClient}, function (err, vaultManager) {
        expect(err).not.to.exist;

        expect(vaultManager).to.be.an.instanceof(VaultManager);

        done();
      });
    });

    it('calls callback with an error when called without a client', function () {
      return create({}).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
        expect(err.message).to.equal('options.client is required when instantiating Vault Manager.');
      });
    });

    it('throws an error when called with a mismatched version', function () {
      this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

      return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
        expect(err.message).to.equal('Client (version 1.2.3) and Vault Manager (version ' + version + ') components must be from the same SDK version.');
      });
    });

    it('creates a VaultManager instance when called with a client', function () {
      return create({client: this.fakeClient}).then(function (vaultManager) {
        expect(vaultManager).to.be.an.instanceof(VaultManager);
      });
    });
  });
});
