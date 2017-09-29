'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var create = require('../../../src/american-express').create;
var AmericanExpress = require('../../../src/american-express/american-express');
var fake = require('../../helpers/fake');

describe('americanExpress', function () {
  describe('create', function () {
    beforeEach(function () {
      this.fakeClient = fake.client();
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
        expect(basicComponentVerification.verify).to.be.calledWith({
          name: 'American Express',
          client: client
        });
        done();
      });
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
