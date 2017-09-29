'use strict';

var create = require('../../../src/vault-manager').create;
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var VaultManager = require('../../../src/vault-manager/vault-manager');
var fake = require('../../helpers/fake');

describe('vaultManager', function () {
  beforeEach(function () {
    this.fakeClient = fake.client();
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
  });

  describe('create', function () {
    it('supports callbacks', function (done) {
      create({client: this.fakeClient}, function (err, vaultManager) {
        expect(err).not.to.exist;

        expect(vaultManager).to.be.an.instanceof(VaultManager);

        done();
      });
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWith({
          name: 'Vault Manager',
          client: client
        });
        done();
      });
    });

    it('creates a VaultManager instance', function () {
      return create({client: this.fakeClient}).then(function (vaultManager) {
        expect(vaultManager).to.be.an.instanceof(VaultManager);
      });
    });
  });
});
