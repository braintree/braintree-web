'use strict';

var analytics = require('../../../src/lib/analytics');
var BraintreeError = require('../../../src/lib/braintree-error');
var GooglePayment = require('../../../src/google-payment/google-payment');
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var Promise = require('../../../src/lib/promise');
var methods = require('../../../src/lib/methods');

describe('GooglePayment', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.androidPay = {
      enabled: true,
      googleAuthorizationFingerprint: 'fingerprint',
      supportedNetworks: ['visa', 'amex']
    };

    this.sandbox.stub(analytics, 'sendEvent');
    this.fakeClient = fake.client({
      configuration: configuration
    });
    this.googlePayment = new GooglePayment({
      client: this.fakeClient
    });
  });

  describe('createPaymentDataRequest', function () {
    it('returns a payment data request object', function () {
      var paymentDataRequest = this.googlePayment.createPaymentDataRequest();

      expect(paymentDataRequest.environment).to.equal('TEST');
      expect(paymentDataRequest.allowedPaymentMethods).to.deep.equal([
        'CARD',
        'TOKENIZED_CARD'
      ]);
      expect(paymentDataRequest.paymentMethodTokenizationParameters.tokenizationType).to.equal('PAYMENT_GATEWAY');
      expect(paymentDataRequest.paymentMethodTokenizationParameters.parameters.gateway).to.equal('braintree');
    });

    it('does not include a merchant id by default', function () {
      var paymentDataRequest = this.googlePayment.createPaymentDataRequest();

      expect(paymentDataRequest.merchantId).to.not.exist;
    });

    it('can override parameters', function () {
      var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
        merchantId: 'my-id',
        environment: 'PRODUCTION',
        allowedPaymentMethods: ['FOO'],
        cardRequirements: {
          allowedCardNetworks: ['foo', 'bar'],
          prop: 'value'
        }
      });

      expect(paymentDataRequest.merchantId).to.equal('my-id');
      expect(paymentDataRequest.environment).to.equal('PRODUCTION');
      expect(paymentDataRequest.allowedPaymentMethods).to.deep.equal([
        'FOO'
      ]);
      expect(paymentDataRequest.cardRequirements.allowedCardNetworks).to.deep.equal([
        'foo',
        'bar'
      ]);
      expect(paymentDataRequest.cardRequirements.prop).to.equal('value');
    });

    it('retains allowed card networks from default if not passed in', function () {
      var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
        merchantId: 'my-id',
        environment: 'PRODUCTION',
        allowedPaymentMethods: ['FOO'],
        cardRequirements: {
          prop: 'value'
        }
      });

      expect(paymentDataRequest.cardRequirements.prop).to.equal('value');
      expect(paymentDataRequest.cardRequirements.allowedCardNetworks).to.deep.equal([
        'VISA',
        'AMEX'
      ]);
    });

    it('sends an analytics event', function () {
      this.googlePayment.createPaymentDataRequest();

      expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.createPaymentDataRequest');
    });
  });

  describe('parseResponse', function () {
    it('resolves with parsed response from Google Pay tokenization', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"androidPayCards":[{"type":"AndroidPayCard","nonce":"nonce-1234","description":"Android Pay","consumed":false,"details":{"cardType":"Visa","lastTwo":"24","lastFour":"7224"},"binData":{"prepaid":"No","healthcare":"Unknown","debit":"Unknown","durbinRegulated":"Unknown","commercial":"Unknown","payroll":"Unknown","issuingBank":"Unknown","countryOfIssuance":"","productId":"Unknown"}}]}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).then(function (parsedResponse) {
        expect(parsedResponse).to.deep.equal({
          nonce: 'nonce-1234',
          type: 'AndroidPayCard',
          description: 'Android Pay',
          details: {
            cardType: 'Visa',
            lastFour: '7224',
            lastTwo: '24'
          },
          binData: {
            prepaid: 'No',
            healthcare: 'Unknown',
            debit: 'Unknown',
            durbinRegulated: 'Unknown',
            commercial: 'Unknown',
            payroll: 'Unknown',
            issuingBank: 'Unknown',
            countryOfIssuance: '',
            productId: 'Unknown'
          }
        });
      });
    });

    it('passes back Braintree error when tokenization fails', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"error":{"message":"Record not found"},"fieldErrors":[]}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('GOOGLE_PAYMENT_GATEWAY_ERROR');
        expect(err.message).to.equal('There was an error when tokenizing the Google Pay payment method.');
      });
    });

    it('passes back Braintree error when JSON parsing fails', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"foo:{}}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('GOOGLE_PAYMENT_GATEWAY_ERROR');
        expect(err.message).to.equal('There was an error when tokenizing the Google Pay payment method.');
      });
    });

    it('sends an analytics event when payment method nonce payload is parsed', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"androidPayCards":[{"type":"AndroidPayCard","nonce":"nonce-1234","description":"Android Pay","consumed":false,"details":{"cardType":"Visa","lastTwo":"24","lastFour":"7224"},"binData":{"prepaid":"No","healthcare":"Unknown","debit":"Unknown","durbinRegulated":"Unknown","commercial":"Unknown","payroll":"Unknown","issuingBank":"Unknown","countryOfIssuance":"","productId":"Unknown"}}]}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.parseResponse.succeeded');
      }.bind(this));
    });

    it('sends an analytics event when tokenization results in an error', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"foo:{}}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.parseResponse.failed');
      }.bind(this));
    });
  });

  describe('teardown', function () {
    it('returns a promise', function () {
      var promise = this.googlePayment.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = this.googlePayment;

      instance.teardown(function () {
        methods(GooglePayment.prototype).forEach(function (method) {
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
