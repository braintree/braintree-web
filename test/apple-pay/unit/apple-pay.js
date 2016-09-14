'use strict';

var ApplePay = require('../../../src/apple-pay/apple-pay');
var BraintreeError = require('../../../src/lib/error');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');

describe('ApplePay', function () {
  beforeEach(function () {
    this.sandbox.stub(analytics, 'sendEvent');
    this.configuration = fake.configuration();
    this.client = {
      request: this.sandbox.spy(),
      _request: this.sandbox.spy(),
      getConfiguration: function () {
        return this.configuration;
      }.bind(this)
    };
    this.applePay = new ApplePay({
      client: this.client,
      displayName: 'Awesome Merchant'
    });
  });

  it('exposes a readonly merchantIdentifier property', function () {
    var err;

    expect(this.applePay.merchantIdentifier).to.equal('com.example.test-merchant-identifier');

    try {
      this.applePay.merchantIdentifier = 'something wrong';
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('Attempted to assign to readonly property.');
    expect(this.applePay.merchantIdentifier).to.equal('com.example.test-merchant-identifier');
  });

  describe('createPaymentRequest', function () {
    beforeEach(function () {
      var self = this;

      this.paymentRequest = {
        countryCode: 'defined',
        currencyCode: 'defined',
        merchantCapabilities: ['defined'],
        supportedNetworks: ['defined']
      };

      this.gatewayConfiguration = {
        applePay: {
          countryCode: 'decorated',
          currencyCode: 'decorated',
          merchantCapabilities: ['decorated'],
          supportedNetworks: ['visa', 'amex', 'mastercard']
        }
      };

      this.client.getConfiguration = function () {
        return {gatewayConfiguration: self.gatewayConfiguration};
      };
    });

    it("doesn't mutate the argument", function () {
      var arg = {foo: 'boo'};

      this.applePay.createPaymentRequest(arg);
      expect(arg).to.deep.equal({foo: 'boo'});
    });

    it('leaves properties intact', function () {
      expect(this.applePay.createPaymentRequest({foo: 'boo'}).foo).to.equal('boo');
    });

    it('applies countryCode when undefined', function () {
      expect(this.applePay.createPaymentRequest({}).countryCode).to.equal('decorated');
    });

    it('applies currencyCode when undefined', function () {
      expect(this.applePay.createPaymentRequest({}).currencyCode).to.equal('decorated');
    });

    it('applies gateway merchantCapabilities when not defined on argument but defined on gateway', function () {
      expect(this.applePay.createPaymentRequest({}).merchantCapabilities).to.deep.equal(['decorated']);
    });

    it('applies default merchantCapabilities when not defined on argument and gateway', function () {
      delete this.gatewayConfiguration.applePay.merchantCapabilities;

      expect(this.applePay.createPaymentRequest({}).merchantCapabilities).to.deep.equal(['supports3DS']);
    });

    it('applies supportedNetworks when undefined', function () {
      expect(this.applePay.createPaymentRequest({}).supportedNetworks).to.deep.equal(['visa', 'amex', 'masterCard']);
    });

    it('does not apply countryCode when defined', function () {
      expect(this.applePay.createPaymentRequest(this.paymentRequest).countryCode).to.equal('defined');
    });

    it('does not apply currencyCode when defined', function () {
      expect(this.applePay.createPaymentRequest(this.paymentRequest).currencyCode).to.equal('defined');
    });

    it('does not apply merchantCapabilities when defined', function () {
      expect(this.applePay.createPaymentRequest(this.paymentRequest).merchantCapabilities).to.deep.equal(['defined']);
    });

    it('does not apply supportedNetworks when defined', function () {
      expect(this.applePay.createPaymentRequest(this.paymentRequest).supportedNetworks).to.deep.equal(['defined']);
    });
  });

  describe('performValidation', function () {
    it('throws an error when called without a callback', function () {
      var err;

      try {
        this.applePay.performValidation();
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.code).to.equal('CALLBACK_REQUIRED');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('performValidation requires a callback.');
    });

    it('calls callback with error when event is undefined', function (done) {
      this.applePay.performValidation(false, function (err, data) {
        expect(data).not.to.exist;
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('APPLE_PAY_VALIDATION_URL_REQUIRED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('performValidation must be called with a validationURL.');

        done();
      });
    });

    it('calls callback with error when event.validationURL is undefined', function (done) {
      this.applePay.performValidation({some: 'property'}, function (err, data) {
        expect(data).not.to.exist;
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('APPLE_PAY_VALIDATION_URL_REQUIRED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('performValidation must be called with a validationURL.');

        done();
      });
    });

    it('overrides merchantIdentifier from the options', function () {
      this.applePay.performValidation({
        merchantIdentifier: 'override.merchant.identifier',
        validationURL: 'something'
      }, function () {});

      expect(this.client.request).to.have.been.calledWith(sinon.match({
        data: {
          applePayWebSession: {
            merchantIdentifier: 'override.merchant.identifier'
          }
        }
      }));
    });

    it('makes a request to the gateway and calls the callback if it fails due to an invalid request', function (done) {
      var merchantValidationError = new Error('Validation failed');
      var requestError = new BraintreeError({
        type: 'NETWORK',
        code: 'CLIENT_REQUEST_ERROR',
        message: 'This is a fake client error',
        details: {
          originalError: merchantValidationError
        }
      });

      var validationOptions = {
        validationURL: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession',
        displayName: 'Awesome Merchant'
      };

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('post');
        expect(options.endpoint).to.equal('apple_pay_web/sessions');
        expect(options.data._meta.source).to.equal('apple-pay');
        expect(options.data.applePayWebSession.merchantIdentifier).to.equal('com.example.test-merchant-identifier');
        expect(options.data.applePayWebSession.domainName).to.equal('localhost');
        expect(options.data.applePayWebSession.displayName).to.equal('Awesome Merchant');
        expect(options.data.applePayWebSession.validationUrl).to.equal('https://apple-pay-gateway-cert.apple.com/paymentservices/startSession');
        callback(requestError);
      };

      this.applePay.performValidation(validationOptions, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('APPLE_PAY_MERCHANT_VALIDATION_FAILED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('Make sure you have registered your domain name in the Braintree Control Panel.');
        expect(err.details.originalError.message).to.equal('Validation failed');

        done();
      });
    });

    it('makes a request to the gateway and calls the callback if it fails due to a network error', function (done) {
      var requestError = new BraintreeError({
        type: 'NETWORK',
        code: 'CLIENT_REQUEST_TIMEOUT',
        message: 'This is a fake client error'
      });

      var validationOptions = {
        validationURL: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession',
        displayName: 'Awesome Merchant'
      };

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('post');
        expect(options.endpoint).to.equal('apple_pay_web/sessions');
        expect(options.data._meta.source).to.equal('apple-pay');
        expect(options.data.applePayWebSession.merchantIdentifier).to.equal('com.example.test-merchant-identifier');
        expect(options.data.applePayWebSession.domainName).to.equal('localhost');
        expect(options.data.applePayWebSession.displayName).to.equal('Awesome Merchant');
        expect(options.data.applePayWebSession.validationUrl).to.equal('https://apple-pay-gateway-cert.apple.com/paymentservices/startSession');
        callback(requestError);
      };

      this.applePay.performValidation(validationOptions, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('APPLE_PAY_MERCHANT_VALIDATION_NETWORK');
        expect(err.type).to.equal('NETWORK');
        expect(err.message).to.equal('A network error occurred when validating the Apple Pay merchant.');
        expect(err.details.originalError.message).to.equal('This is a fake client error');

        done();
      });
    });

    it('makes a request to the gateway and calls the callback if it succeeds', function (done) {
      var fakeResponseData = {foo: 'boo'};
      var validationOptions = {
        validationURL: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession',
        displayName: 'Awesome Merchant'
      };

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('post');
        expect(options.endpoint).to.equal('apple_pay_web/sessions');
        expect(options.endpoint).to.equal('apple_pay_web/sessions');
        expect(options.data._meta.source).to.equal('apple-pay');
        expect(options.data.applePayWebSession.merchantIdentifier).to.equal('com.example.test-merchant-identifier');
        expect(options.data.applePayWebSession.domainName).to.equal('localhost');
        expect(options.data.applePayWebSession.displayName).to.equal('Awesome Merchant');
        expect(options.data.applePayWebSession.validationUrl).to.equal('https://apple-pay-gateway-cert.apple.com/paymentservices/startSession');
        callback(null, fakeResponseData);
      };

      this.applePay.performValidation(validationOptions, function (err, response) {
        expect(err).to.equal(null);

        expect(response).to.equal(fakeResponseData);

        done();
      });
    });
  });

  describe('tokenize', function () {
    it('throws an error when called without a callback', function () {
      var err;

      try {
        this.applePay.tokenize({});
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.code).to.equal('CALLBACK_REQUIRED');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('tokenize requires a callback.');
    });

    it('calls callback with error when token is undefined', function (done) {
      this.applePay.tokenize(false, function (err, paymentData) {
        expect(paymentData).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('APPLE_PAY_PAYMENT_TOKEN_REQUIRED');
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('tokenize must be called with a payment token.');

        done();
      });
    });

    it('makes a request to the gateway and calls the callback if it fails', function (done) {
      var fakeResponseError = 'error';
      var token = {
        foo: 'boo',
        paymentData: {
          bar: 'yar'
        }
      };

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('post');
        expect(options.endpoint).to.equal('payment_methods/apple_payment_tokens');
        expect(options.data).to.deep.equal({
          _meta: {
            source: 'apple-pay'
          },
          applePaymentToken: {
            foo: 'boo',
            paymentData: btoa('{"bar":"yar"}')
          }
        });

        callback(fakeResponseError);
      };

      this.applePay.tokenize({token: token}, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('APPLE_PAY_TOKENIZATION');
        expect(err.type).to.equal('NETWORK');
        expect(err.message).to.equal('A network error occurred when processing the Apple Pay payment.');

        done();
      });
    });

    it('makes a request to the gateway and calls the callback if it succeeds', function (done) {
      var fakeResponseData = {applePayCards: [{}]};
      var token = {
        foo: 'boo',
        paymentData: {
          data: 'encrypted-payment-data',
          signature: 'cryptographic-signature',
          header: {},
          version: 'EC_v1'
        }
      };
      var payment = {
        token: token,
        shippingContact: {
          locality: 'Test',
          country: 'United States',
          postalCode: 'Test',
          administrativeArea: 'Test',
          familyName: 'Tree',
          addressLines: ['Test', 'Test'],
          givenName: 'Brian',
          countryCode: 'US'
        }
      };

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('post');
        expect(options.endpoint).to.equal('payment_methods/apple_payment_tokens');
        expect(options.data).to.deep.equal({
          _meta: {
            source: 'apple-pay'
          },
          applePaymentToken: {
            foo: 'boo',
            paymentData: btoa(JSON.stringify(token.paymentData))
          }
        });

        callback(null, fakeResponseData);
      };

      this.applePay.tokenize({
        token: payment.token
      }, function (err, response) {
        expect(err).to.equal(null);

        expect(response).to.equal(fakeResponseData.applePayCards[0]);

        done();
      });
    });
  });

  describe('analytics', function () {
    describe('performValidation', function () {
      it('submits succeeded', function () {
        this.client.request = function (_, cb) {
          cb(null, {});
        };

        ApplePay.prototype.performValidation.call({
          _client: this.client
        }, {
          validationURL: 'validationURL',
          displayName: 'JS SDK Integration'
        }, function () {});

        expect(analytics.sendEvent).to.have.been.calledWith(this.client, 'web.applepay.performValidation.succeeded');
      });

      it('submits failed', function () {
        this.client.request = function (_, cb) {
          cb({}, null);
        };

        ApplePay.prototype.performValidation.call({
          _client: this.client
        }, {
          validationURL: 'validationURL',
          displayName: 'JS SDK Integration'
        }, function () {});

        expect(analytics.sendEvent).to.have.been.calledWith(this.client, 'web.applepay.performValidation.failed');
      });
    });

    describe('tokenize', function () {
      it('submits succeeded', function () {
        this.client.request = function (_, cb) {
          cb(null, {
            applePayCards: []
          });
        };

        ApplePay.prototype.tokenize.call({
          _client: this.client
        }, {
          token: 'token'
        }, function () {});

        expect(analytics.sendEvent).to.have.been.calledWith(this.client, 'web.applepay.tokenize.succeeded');
      });

      it('submits failed', function () {
        this.client.request = function (_, cb) {
          cb({}, null);
        };

        ApplePay.prototype.tokenize.call({
          _client: this.client
        }, {
          token: 'token'
        }, function () {});

        expect(analytics.sendEvent).to.have.been.calledWith(this.client, 'web.applepay.tokenize.failed');
      });
    });
  });
});
