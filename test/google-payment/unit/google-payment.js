'use strict';

var analytics = require('../../../src/lib/analytics');
var Bus = require('../../../src/lib/bus');
var BraintreeError = require('../../../src/lib/braintree-error');
var GooglePayment = require('../../../src/google-payment/google-payment');
var PaymentRequestComponent = require('../../../src/payment-request/external/payment-request');
var fake = require('../../helpers/fake');

describe('GooglePayment', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.androidPay = {
      enabled: true,
      googleAuthorizationFingerprint: 'fingerprint',
      supportedNetworks: ['visa', 'amex']
    };

    this.fakeClient = fake.client({
      configuration: configuration
    });

    this.sandbox.stub(Bus.prototype, 'on');
    this.sandbox.stub(Bus.prototype, 'emit');
    this.sandbox.stub(analytics, 'sendEvent');
  });

  it('is an instance of PaymentRequestComponent', function () {
    var googlePayment = new GooglePayment({
      client: this.fakeClient
    });

    expect(googlePayment).to.be.an.instanceof(PaymentRequestComponent);
  });

  it('only supports googlePayment', function () {
    var googlePayment = new GooglePayment({
      client: this.fakeClient
    });

    expect(googlePayment._enabledPaymentMethods.googlePay).to.equal(true);
    expect(googlePayment._enabledPaymentMethods.basicCard).to.equal(false);

    expect(googlePayment._defaultSupportedPaymentMethods.length).to.equal(1);
    expect(googlePayment._defaultSupportedPaymentMethods[0].supportedMethods).to.deep.equal(['https://google.com/pay']);
  });

  it('sends analytics as google-payment instead of payment-request', function () {
    var googlePayment = new GooglePayment({
      client: this.fakeClient
    });

    Bus.prototype.on.withArgs('payment-request:PAYMENT_REQUEST_SUCCESSFUL').yields({
      nonce: 'a-nonce',
      details: {
        rawPaymentResponse: {}
      }
    });

    return googlePayment.tokenize({
      details: {
        total: '100.00'
      }
    }).then(function () {
      expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'google-payment.tokenize.succeeded');
    }.bind(this));
  });

  it('can pass in a supportedPaymentMethods object to customize Google Payment', function () {
    var googlePayment = new GooglePayment({
      client: this.fakeClient
    });
    var configuration = {
      supportedPaymentMethods: googlePayment.createSupportedPaymentMethodsConfiguration({
        merchantName: 'Custom Name'
      }),
      details: {total: '100.00'},
      options: {}
    };

    this.sandbox.stub(PaymentRequestComponent.prototype, 'tokenize');

    googlePayment.tokenize(configuration);

    expect(PaymentRequestComponent.prototype.tokenize).to.be.calledWithMatch({
      supportedPaymentMethods: [{
        supportedMethods: ['https://google.com/pay'],
        data: this.sandbox.match({
          merchantName: 'Custom Name'
        })
      }],
      details: configuration.details,
      options: configuration.options
    });
  });

  it('cannot pass in a supportedPaymentMethods object for a non pay with google configuration', function (done) {
    var googlePayment = new GooglePayment({
      client: this.fakeClient
    });
    var configuration = {
      supportedPaymentMethods: {
        supportedMethods: ['basic-card']
      },
      details: {total: '100.00'},
      options: {}
    };

    this.sandbox.stub(PaymentRequestComponent.prototype, 'tokenize');

    googlePayment.tokenize(configuration).catch(function (err) {
      expect(PaymentRequestComponent.prototype.tokenize).to.not.be.called;
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('GOOGLE_PAYMENT_CAN_ONLY_TOKENIZE_WITH_GOOGLE_PAYMENT');
      expect(err.message).to.equal('Only Google Pay is supported in supportedPaymentMethods.');
      done();
    });
  });

  it('supports callbacks', function (done) {
    var googlePayment = new GooglePayment({
      client: this.fakeClient
    });
    var configuration = {
      details: {total: '100.00'},
      options: {}
    };
    var result = {};

    this.sandbox.stub(PaymentRequestComponent.prototype, 'tokenize').resolves(result);

    googlePayment.tokenize(configuration, function (err, data) {
      expect(data).to.equal(result);
      done();
    });
  });

  describe('createSupportedPaymentMethodsConfiguration', function () {
    it('calls Payment Request createSupportedPaymentMethodsConfiguration', function () {
      var googlePayment = new GooglePayment({
        client: this.fakeClient
      });
      var configuration = {
        merchantName: 'Foo'
      };

      this.sandbox.stub(PaymentRequestComponent.prototype, 'createSupportedPaymentMethodsConfiguration');

      googlePayment.createSupportedPaymentMethodsConfiguration(configuration);

      expect(PaymentRequestComponent.prototype.createSupportedPaymentMethodsConfiguration).to.be.calledOnce;
      expect(PaymentRequestComponent.prototype.createSupportedPaymentMethodsConfiguration).to.be.calledWith('googlePay', configuration);
    });
  });

  describe('teardown', function () {
    it('calls Payment Request teardown', function () {
      var googlePayment;

      this.sandbox.stub(PaymentRequestComponent.prototype, 'teardown');

      googlePayment = new GooglePayment({
        client: this.fakeClient
      });

      googlePayment.teardown();

      expect(PaymentRequestComponent.prototype.teardown).to.be.calledOnce;
    });
  });
});
