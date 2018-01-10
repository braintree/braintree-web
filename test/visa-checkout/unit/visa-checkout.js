'use strict';

var VisaCheckout = require('../../../src/visa-checkout/visa-checkout');
var Promise = require('../../../src/lib/promise');
var BraintreeError = require('../../../src/lib/braintree-error');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var methods = require('../../../src/lib/methods');

describe('Visa Checkout', function () {
  beforeEach(function () {
    this.sandbox.stub(analytics, 'sendEvent');
    this.configuration = fake.configuration();
    this.client = {
      request: this.sandbox.stub().resolves({
        visaCheckoutCards: []
      }),
      getConfiguration: function () {
        return this.configuration;
      }.bind(this)
    };
    this.visaCheckout = new VisaCheckout({
      client: this.client
    });
  });

  describe('createInitOptions', function () {
    it('throws an error if options is not defined', function () {
      var err;

      try {
        VisaCheckout.prototype.createInitOptions.call({
          _client: this.client,
          _transformCardTypes: VisaCheckout.prototype._transformCardTypes
        });
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.code).to.equal('VISA_CHECKOUT_INIT_OPTIONS_REQUIRED');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('initOptions requires an object.');
    });

    it('sets apikey if undefined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {});

      expect(initOptions.apikey).to.equal('gwApikey');
    });

    it('does not overwrite apikey if defined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {
        apikey: 'apikey'
      });

      expect(initOptions.apikey).to.equal('apikey');
    });

    it('sets externalClientId if undefined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {});

      expect(initOptions.externalClientId).to.equal('gwExternalClientId');
    });

    it('does not overwrite externalClientId if defined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {
        externalClientId: 'externalClientId'
      });

      expect(initOptions.externalClientId).to.equal('externalClientId');
    });

    it('sets settings.dataLevel if undefined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {});

      expect(initOptions.settings.dataLevel).to.equal('FULL');
    });

    it('overwrites settings.dataLevel if defined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {
        settings: {
          dataLevel: 'summary'
        }
      });

      expect(initOptions.settings.dataLevel).to.equal('FULL');
    });

    it('transforms gateway visaCheckout.supportedCardTypes to settings.payment.cardBrands if undefined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {});

      expect(initOptions.settings.payment.cardBrands).to.deep.equal([
        'VISA', 'MASTERCARD', 'DISCOVER', 'AMEX'
      ]);
    });

    it('does not overwrite settings.payment.cardBrands if defined', function () {
      var initOptions = VisaCheckout.prototype.createInitOptions.call({
        _client: this.client
      }, {
        settings: {
          payment: {
            cardBrands: ['CARD1', 'CARD2']
          }
        }
      });

      expect(initOptions.settings.payment.cardBrands).to.deep.equal([
        'CARD1', 'CARD2'
      ]);
    });

    it('does not mutate incoming options', function () {
      var originalOptions = {
        settings: {
          dataLevel: 'summary'
        }
      };

      VisaCheckout.prototype.createInitOptions.call({
        _client: this.client,
        _transformCardTypes: VisaCheckout.prototype._transformCardTypes
      }, originalOptions);

      expect(originalOptions).to.deep.equal({
        settings: {
          dataLevel: 'summary'
        }
      });
    });
  });

  describe('tokenize', function () {
    it('returns a promise', function () {
      var promise = this.visaCheckout.tokenize({
        callid: 'callid',
        encKey: 'encKey',
        encPaymentData: 'encPaymentData'
      });

      expect(promise).to.be.respondTo('then');
      expect(promise).to.be.respondTo('catch');
    });

    it('calls callback with error when payment.callid is undefined', function (done) {
      this.visaCheckout.tokenize({
        encKey: 'encKey',
        encPaymentdata: 'encPaymentData'
      }, function (err, paymentData) {
        expect(paymentData).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('VISA_CHECKOUT_PAYMENT_REQUIRED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('tokenize requires callid, encKey, and encPaymentData.');

        done();
      });
    });

    it('calls callback with error when payment.encKey is undefined', function (done) {
      this.visaCheckout.tokenize({
        callid: 'callId',
        encPaymentdata: 'encPaymentData'
      }, function (err, paymentData) {
        expect(paymentData).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('VISA_CHECKOUT_PAYMENT_REQUIRED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('tokenize requires callid, encKey, and encPaymentData.');

        done();
      });
    });

    it('calls callback with error when payment.encPaymentData is undefined', function (done) {
      this.visaCheckout.tokenize({
        callid: 'callId',
        encKey: 'encKey'
      }, function (err, paymentData) {
        expect(paymentData).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('VISA_CHECKOUT_PAYMENT_REQUIRED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('tokenize requires callid, encKey, and encPaymentData.');

        done();
      });
    });

    it('makes a request with the proper data', function () {
      var payment = {
        callid: 'callid',
        encKey: 'encKey',
        encPaymentData: 'encPaymentData'
      };

      this.visaCheckout.tokenize(payment, function () {});

      expect(this.client.request).to.be.calledWith(this.sandbox.match({
        method: 'post',
        endpoint: 'payment_methods/visa_checkout_cards',
        data: {
          _meta: {source: 'visa-checkout'},
          visaCheckoutCard: {
            callId: 'callid',
            encryptedKey: 'encKey',
            encryptedPaymentData: 'encPaymentData'
          }
        }
      }));
    });

    it('calls the callback if the request fails', function (done) {
      var originalError = new BraintreeError({
        type: 'NETWORK',
        code: 'CODE',
        message: 'message'
      });

      this.client.request.rejects(originalError);

      this.visaCheckout.tokenize({
        callid: 'callId',
        encKey: 'encKey',
        encPaymentData: 'encPaymentData'
      }, function (err, data) {
        expect(err.type).to.equal(BraintreeError.types.NETWORK);
        expect(err.code).to.equal('VISA_CHECKOUT_TOKENIZATION');
        expect(err.message).to.equal('A network error occurred when processing the Visa Checkout payment.');
        expect(err.details.originalError).to.equal(originalError);
        expect(data).to.not.exist;
        done();
      });
    });

    it('calls the callback with a tokenized payload when success', function () {
      var tokenizedPayload = {
        foo: 'baz'
      };

      this.client.request.resolves({
        visaCheckoutCards: [tokenizedPayload]
      });

      this.visaCheckout.tokenize({
        callid: 'callId',
        encKey: 'encKey',
        encPaymentData: 'encPaymentData'
      }, function (err, payload) {
        expect(err).to.not.exist;
        expect(payload.foo).to.equal('baz');
      });
    });
  });

  describe('analytics', function () {
    describe('tokenize', function () {
      it('submits succeeded', function (done) {
        this.client.request.resolves({
          visaCheckoutCards: [{}]
        });

        VisaCheckout.prototype.tokenize.call({
          _client: this.client
        }, {
          callid: 'callId',
          encKey: 'encKey',
          encPaymentData: 'encPaymentData'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'visacheckout.tokenize.succeeded');
          done();
        }.bind(this));
      });

      it('submits failed', function (done) {
        this.client.request.rejects(new Error());

        VisaCheckout.prototype.tokenize.call({
          _client: this.client
        }, {
          callid: 'callId',
          encKey: 'encKey',
          encPaymentData: 'encPaymentData'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'visacheckout.tokenize.failed');
          done();
        }.bind(this));
      });
    });
  });

  describe('teardown', function () {
    it('returns a promise', function () {
      var promise = this.visaCheckout.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = this.visaCheckout;

      instance.teardown(function () {
        methods(VisaCheckout.prototype).forEach(function (method) {
          var err;

          try {
            instance[method]();
          } catch (e) {
            err = e;
          }

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal(BraintreeError.types.MERCHANT);
          expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
          expect(err.message).to.equal(method + ' cannot be called after teardown.');
        });

        done();
      });
    });
  });
});
