'use strict';

var create = require('../../../src/vault-manager').create;
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var VaultManager = require('../../../src/vault-manager/vault-manager');
var fake = require('../../helpers/fake');

describe('vaultManager', function () {
  beforeEach(function () {
    this.fakeClient = fake.client();
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    this.sandbox.stub(createDeferredClient, 'create').resolves(this.fakeClient);
    this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
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
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
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

    it('can create with an authorization instead of a client', function () {
      return create({
        authorization: fake.clientToken,
        debug: true
      }).then(function (instance) {
        expect(createDeferredClient.create).to.be.calledOnce;
        expect(createDeferredClient.create).to.be.calledWith({
          authorization: fake.clientToken,
          client: this.sandbox.match.typeOf('undefined'),
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'Vault Manager'
        });

        expect(instance).to.be.an.instanceof(VaultManager);
      }.bind(this));
    });
  });
});
