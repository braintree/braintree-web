'use strict';

var Promise = require('../../../src/lib/promise');
var create = require('../../../src/american-express').create;
var AmericanExpress = require('../../../src/american-express/american-express');
var BraintreeError = require('../../../src/lib/braintree-error');
var fake = require('../../helpers/fake');
var version = require('../../../package.json').version;

describe('americanExpress', function () {
  describe('create', function () {
    beforeEach(function () {
      this.fakeClient = fake.client();
    });

    it('returns a promise', function () {
      var promise = create({client: this.fakeClient});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('calls callback with an error when called without a client', function (done) {
      create({}, function (err, amex) {
        expect(amex).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
        expect(err.message).to.equal('options.client is required when instantiating American Express.');

        done();
      });
    });

    it('throws an error when called with a mismatched version', function (done) {
      var client = fake.client({
        version: '1.2.3'
      });

      create({client: client}, function (err, amex) {
        expect(amex).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
        expect(err.message).to.equal('Client (version 1.2.3) and American Express (version ' + version + ') components must be from the same SDK version.');

        done();
      });
    });

    it('creates an AmericanExpress instance when called with a client', function (done) {
      create({client: this.fakeClient}, function (err, amex) {
        expect(err).not.to.exist;

        expect(amex).to.be.an.instanceof(AmericanExpress);

        done();
      });
    });
  });
});
