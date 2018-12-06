'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/american-express').create;
var AmericanExpress = require('../../../src/american-express/american-express');
var fake = require('../../helpers/fake');

describe('americanExpress', function () {
  describe('create', function () {
    beforeEach(function () {
      this.fakeClient = fake.client();
      this.sandbox.stub(createDeferredClient, 'create').resolves(this.fakeClient);
      this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    });

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
          name: 'American Express',
          client: client
        });
        done();
      });
    });

    it('can create with an authorization instead of a client', function (done) {
      create({
        authorization: fake.clientToken,
        debug: true
      }, function (err, amex) {
        expect(err).not.to.exist;

        expect(createDeferredClient.create).to.be.calledOnce;
        expect(createDeferredClient.create).to.be.calledWith({
          authorization: fake.clientToken,
          client: this.sandbox.match.typeOf('undefined'),
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'American Express'
        });

        expect(amex).to.be.an.instanceof(AmericanExpress);

        done();
      }.bind(this));
    });

    it('creates an AmericanExpress instance', function (done) {
      create({client: this.fakeClient}, function (err, amex) {
        expect(err).not.to.exist;

        expect(amex).to.be.an.instanceof(AmericanExpress);

        done();
      });
    });
  });
});
