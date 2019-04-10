'use strict';

var analytics = require('../../../src/lib/analytics');
var BraintreeError = require('../../../src/lib/braintree-error');
var GooglePayment = require('../../../src/google-payment/google-payment');
var fake = require('../../helpers/fake');
var find = require('../../../src/lib/find');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var Promise = require('../../../src/lib/promise');
var methods = require('../../../src/lib/methods');
var VERSION = process.env.npm_package_version;

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
    context('GooglePay v1 schema', function () {
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

      it('can override parameters with v1 schema overrides and return a v1 schema config', function () {
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

      it('can override existing parameters with v1 schema overrides and return a v1 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          merchantId: 'my-id',
          environment: 'PRODUCTION',
          allowedPaymentMethods: ['CARD'],
          cardRequirements: {
            allowedCardNetworks: ['foo', 'bar']
          }
        });

        expect(paymentDataRequest.merchantId).to.equal('my-id');
        expect(paymentDataRequest.environment).to.equal('PRODUCTION');
        expect(paymentDataRequest.allowedPaymentMethods).to.deep.equal(['CARD']);
        expect(paymentDataRequest.cardRequirements.allowedCardNetworks).to.deep.equal([
          'foo',
          'bar'
        ]);
      });

      it('retains allowed card networks from default if not passed in with v1 schema', function () {
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

      it('overrides shipping address info with v1 params and returns a v1 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          shippingAddressRequired: false,
          shippingAddressRequirements: {
            allowedCountryCodes: [
              'US',
              'CA'
            ]
          }
        });

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(2);
        expect(paymentDataRequest.shippingAddressRequired).to.be.false;
        expect(paymentDataRequest.shippingAddressRequirements).to.deep.equal({
          allowedCountryCodes: [
            'US',
            'CA'
          ]
        });
      });

      it('overrides paymentMethodTokenizationParameters info with v1 params and returns a v1 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          paymentMethodTokenizationParameters: {
            tokenizationType: 'TEST_GATEWAY',
            parameters: {
              gateway: 'test-gateway',
              gatewayMerchantId: 'test-merchant-id'
            }
          }
        });

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(2);
        expect(paymentDataRequest.paymentMethodTokenizationParameters.tokenizationType).to.equal('TEST_GATEWAY');
        expect(paymentDataRequest.paymentMethodTokenizationParameters.parameters.gateway).to.equal('test-gateway');
        expect(paymentDataRequest.paymentMethodTokenizationParameters.parameters.gatewayMerchantId).to.equal('test-merchant-id');
      });

      it('overrides billing address info with v1 params and returns a v1 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          cardRequirements: {
            billingAddressRequired: true,
            billingAddressFormat: 'FULL'
          },
          phoneNumberRequired: true
        });

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(2);
        expect(paymentDataRequest.cardRequirements.billingAddressRequired).to.be.true;
        expect(paymentDataRequest.cardRequirements.billingAddressFormat).to.equal('FULL');
        expect(paymentDataRequest.phoneNumberRequired).to.be.true;
      });

      it('does not include a merchant id by default', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest();

        expect(paymentDataRequest.merchantId).to.not.exist;
      });

      it('sends an analytics event', function () {
        this.googlePayment.createPaymentDataRequest();

        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.v1.createPaymentDataRequest');
      });
    });

    context('GooglePay v2 schema', function () {
      beforeEach(function () {
        this.googlePayment = new GooglePayment({
          client: this.fakeClient,
          googlePayVersion: 2
        });
      });

      it('returns a v2 payment data request object when v2 is specified', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest();
        var cardPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'CARD');

        expect(paymentDataRequest.environment).to.equal('TEST');
        expect(cardPaymentMethod.type).to.equal('CARD');
        expect(cardPaymentMethod.tokenizationSpecification.type).to.equal('PAYMENT_GATEWAY');
        expect(cardPaymentMethod.tokenizationSpecification.parameters.gateway).to.equal('braintree');
      });

      it('can override existing parameters with v2 schema overrides and return a v2 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          apiVersion: 2,
          merchantInfo: {
            merchantId: 'my-id'
          },
          environment: 'PRODUCTION',
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['foo', 'bar'],
              billingAddressRequired: true
            }
          }]
        });
        var cardPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'CARD');

        expect(paymentDataRequest.merchantInfo.merchantId).to.equal('my-id');
        expect(paymentDataRequest.environment).to.equal('PRODUCTION');
        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(1);
        expect(cardPaymentMethod.type).to.equal('CARD');
        expect(cardPaymentMethod.parameters.allowedAuthMethods).to.deep.equal([
          'foo',
          'bar'
        ]);
        expect(cardPaymentMethod.parameters.billingAddressRequired).to.equal(true);
        expect(cardPaymentMethod.parameters.allowedCardNetworks).to.deep.equal([
          'VISA',
          'AMEX'
        ]);
        expect(cardPaymentMethod.tokenizationSpecification).to.exist;
      });

      it('can add new parameters with v2 schema overrides and return a v2 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          apiVersion: 2,
          merchantInfo: {
            merchantId: 'my-id'
          },
          environment: 'PRODUCTION',
          allowedPaymentMethods: [{
            type: 'FOO',
            parameters: {
              allowedCardNetworks: ['foo', 'bar']
            }
          }]
        });
        var fooPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'FOO');

        expect(paymentDataRequest.merchantInfo.merchantId).to.equal('my-id');
        expect(paymentDataRequest.environment).to.equal('PRODUCTION');
        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(1);
        expect(fooPaymentMethod.type).to.equal('FOO');
        expect(fooPaymentMethod.parameters.allowedCardNetworks).to.deep.equal([
          'foo',
          'bar'
        ]);
      });

      it('transfers allowed card networks from default to new CARD but not others if not passed in with v2 schema', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          apiVersion: 2,
          merchantInfo: {
            merchantId: 'my-id'
          },
          environment: 'PRODUCTION',
          allowedPaymentMethods: [{
            type: 'CARD'
          }, {
            type: 'FOO'
          }]
        });
        var fooPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'FOO');
        var cardPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'CARD');

        expect(fooPaymentMethod.type).to.equal('FOO');
        expect(fooPaymentMethod.parameters).to.be.undefined;
        expect(cardPaymentMethod.type).to.equal('CARD');
        expect(cardPaymentMethod.parameters.allowedCardNetworks).to.deep.equal([
          'VISA',
          'AMEX'
        ]);
      });

      it('overrides shipping address info with v2 params and returns a v2 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          apiVersion: 2,
          shippingAddressRequired: false,
          shippingAddressParameters: {
            allowedCountryCodes: [
              'US',
              'CA'
            ]
          }
        });

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(1);
        expect(paymentDataRequest.shippingAddressRequired).to.be.false;
        expect(paymentDataRequest.shippingAddressParameters).to.deep.equal({
          allowedCountryCodes: [
            'US',
            'CA'
          ]
        });
      });

      it('overrides tokenizationSpecification info with v2 params and returns a v2 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          apiVersion: 2,
          allowedPaymentMethods: [{
            type: 'CARD',
            tokenizationSpecification: {
              type: 'TEST_GATEWAY',
              parameters: {
                gateway: 'test-gateway',
                gatewayMerchantId: 'test-merchant-id'
              }
            }
          }]
        });
        var cardPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'CARD');

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(1);
        expect(cardPaymentMethod.tokenizationSpecification.type).to.equal('TEST_GATEWAY');
        expect(cardPaymentMethod.tokenizationSpecification.parameters.gateway).to.equal('test-gateway');
        expect(cardPaymentMethod.tokenizationSpecification.parameters.gatewayMerchantId).to.equal('test-merchant-id');
      });

      it('overrides billing address info with v2 params and returns a v2 schema config', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({
          apiVersion: 2,
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              billingAddressRequired: true,
              billingAddressParameters: {
                phoneNumberRequired: true,
                format: 'FULL'
              }
            }
          }]
        });
        var cardPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'CARD');

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(1);
        expect(cardPaymentMethod.parameters.billingAddressRequired).to.be.true;
        expect(cardPaymentMethod.parameters.billingAddressParameters).to.deep.equal({
          format: 'FULL',
          phoneNumberRequired: true
        });
      });

      it('includes a PAYPAL allowedPaymentMethod in v2 if paypal is enabled', function () {
        var paymentDataRequest, paypalPaymentMethod, client, googlePayment;

        var configuration = fake.configuration();

        configuration.gatewayConfiguration.androidPay = {
          enabled: true,
          googleAuthorizationFingerprint: 'fingerprint',
          supportedNetworks: ['visa', 'amex']
        };
        configuration.gatewayConfiguration.paypalEnabled = true;
        configuration.gatewayConfiguration.paypal = {};
        configuration.gatewayConfiguration.paypal.clientId = 'paypal_client_id';
        configuration.gatewayConfiguration.paypal.environmentNoNetwork = false;

        client = fake.client({
          configuration: configuration
        });
        googlePayment = new GooglePayment({
          client: client,
          googlePayVersion: 2
        });

        paymentDataRequest = googlePayment.createPaymentDataRequest();
        paypalPaymentMethod = find(paymentDataRequest.allowedPaymentMethods, 'type', 'PAYPAL');

        expect(paymentDataRequest.allowedPaymentMethods.length).to.equal(2);
        expect(paypalPaymentMethod.type).to.equal('PAYPAL');
        expect(paypalPaymentMethod.parameters.purchase_context).to.deep.equal({
          purchase_units: [{ // eslint-disable-line camelcase
            payee: {
              client_id: 'paypal_client_id' // eslint-disable-line camelcase
            },
            recurring_payment: true // eslint-disable-line camelcase
          }]
        });
        expect(paypalPaymentMethod.tokenizationSpecification.type).to.equal('PAYMENT_GATEWAY');
        expect(paypalPaymentMethod.tokenizationSpecification.parameters).to.contain({
          gateway: 'braintree',
          'braintree:merchantId': 'merchant-id',
          'braintree:apiVersion': 'v1',
          'braintree:sdkVersion': VERSION,
          'braintree:paypalClientId': 'paypal_client_id'
        });
        expect(paypalPaymentMethod.tokenizationSpecification.parameters['braintree:metadata']).to.be.a('string');
      });

      it('does not include a merchant id by default', function () {
        var paymentDataRequest = this.googlePayment.createPaymentDataRequest({apiVersion: 2});

        expect(paymentDataRequest.merchantInfo).to.not.exist;
      });

      it('sends an analytics event', function () {
        this.googlePayment.createPaymentDataRequest({apiVersion: 2});

        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.v2.createPaymentDataRequest');
      });
    });

    context('when using options during instance construction', function () {
      it('preserves options in a GooglePayment instance', function () {
        var googlePayment = new GooglePayment({
          client: this.fakeClient,
          googlePayVersion: 2
        });
        var paymentDataRequest = googlePayment.createPaymentDataRequest();

        expect(paymentDataRequest.apiVersion).to.equal(2);
      });

      it('overrides instantiation options if both are specified', function () {
        var googlePayment = new GooglePayment({
          client: this.fakeClient,
          googlePayVersion: 2,
          googleNerchantId: 'some-merchant-id'
        });
        var paymentDataRequest = googlePayment.createPaymentDataRequest({
          merchantInfo: {
            merchantName: 'merchantName',
            merchantId: 'some-other-merchant-id'
          }
        });

        expect(paymentDataRequest.merchantInfo).to.deep.equal({
          merchantName: 'merchantName',
          merchantId: 'some-other-merchant-id'
        });
      });
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

    it('sends analytics events when google-payment payment method nonce payload is parsed', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"androidPayCards":[{"type":"AndroidPayCard","nonce":"nonce-1234","description":"Android Pay","consumed":false,"details":{"cardType":"Visa","lastTwo":"24","lastFour":"7224"},"binData":{"prepaid":"No","healthcare":"Unknown","debit":"Unknown","durbinRegulated":"Unknown","commercial":"Unknown","payroll":"Unknown","issuingBank":"Unknown","countryOfIssuance":"","productId":"Unknown"}}]}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.parseResponse.succeeded');
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.parseResponse.succeeded.google-payment');
      }.bind(this));
    });

    it('sends analytics events when paypal payment method nonce payload is parsed', function () {
      var rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"paypalAccounts":[{"type":"PayPalAccount","nonce":"nonce-1234","description":"PayPal","consumed":false,"details":{"correlationId":null}}]}',
          tokenizationType: 'PAYMENT_GATEWAY'
        }
      };

      return this.googlePayment.parseResponse(rawResponse).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.parseResponse.succeeded');
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.parseResponse.succeeded.paypal');
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
