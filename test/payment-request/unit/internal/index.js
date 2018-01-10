'use strict';

var Bus = require('../../../../src/lib/bus');
var BraintreeError = require('../../../../src/lib/braintree-error');
var paymentRequestFrame = require('../../../../src/payment-request/internal/');
var fake = require('../../../helpers/fake');
var Client = require('../../../../src/client/client');

describe('Payment Request Frame', function () {
  beforeEach(function () {
    this.fakeClient = fake.client();
    this.fakeClient.gatewayConfiguration = {};
    this.sandbox.stub(Bus.prototype, 'emit');
    this.sandbox.stub(Bus.prototype, 'on');
  });

  describe('create', function () {
    it('gets channel id from window hash', function () {
      global.location.hash = '123';

      paymentRequestFrame.create();

      expect(global.bus.channel).to.equal('123');
    });

    it('emits a FRAME_READY event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.emit).to.be.calledWith('payment-request:FRAME_READY');
    });

    it('emits a FRAME_CAN_MAKE_REQUESTS event', function (done) {
      var frameReadyHandler;

      paymentRequestFrame.create();

      frameReadyHandler = Bus.prototype.emit.args[0][1];
      frameReadyHandler(this.fakeClient);

      setTimeout(function () {
        expect(Bus.prototype.emit).to.be.calledWith('payment-request:FRAME_CAN_MAKE_REQUESTS');
        done();
      }, 100);
    });

    it('adds client to the global object', function (done) {
      var frameReadyHandler;

      paymentRequestFrame.create();

      frameReadyHandler = Bus.prototype.emit.args[0][1];

      frameReadyHandler(this.fakeClient);

      setTimeout(function () {
        expect(global.client).to.be.an.instanceof(Client);

        delete global.client;
        done();
      }, 100);
    });

    it('listens for initialize payment request event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).to.be.calledWith('payment-request:PAYMENT_REQUEST_INITIALIZED');
    });

    it('listens for shipping address change event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).to.be.calledWith('payment-request:UPDATE_SHIPPING_ADDRESS');
    });

    it('calls update with on shipping address change event', function () {
      var data = {};

      global.shippingAddressChangeEvent = {
        updateWith: this.sandbox.stub()
      };
      Bus.prototype.on.withArgs('payment-request:UPDATE_SHIPPING_ADDRESS').yields(data);
      paymentRequestFrame.create();

      expect(global.shippingAddressChangeEvent.updateWith).to.be.calledOnce;
      expect(global.shippingAddressChangeEvent.updateWith).to.be.calledWith(data);
    });

    it('listens for shipping option change event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).to.be.calledWith('payment-request:UPDATE_SHIPPING_OPTION');
    });

    it('calls update with on shipping option change event', function () {
      var data = {};

      global.shippingOptionChangeEvent = {
        updateWith: this.sandbox.stub()
      };
      Bus.prototype.on.withArgs('payment-request:UPDATE_SHIPPING_OPTION').yields(data);
      paymentRequestFrame.create();

      expect(global.shippingOptionChangeEvent.updateWith).to.be.calledOnce;
      expect(global.shippingOptionChangeEvent.updateWith).to.be.calledWith(data);
    });
  });

  describe('initializePaymentRequest', function () {
    beforeEach(function () {
      var showStub, addEventListenerStub;

      this.completeStub = this.sandbox.stub();
      showStub = this.showStub = this.sandbox.stub();
      addEventListenerStub = this.addEventListenerStub = this.sandbox.stub();

      this.fakeDetails = {
        supportedPaymentMethods: ['basic-card'],
        details: {},
        options: {}
      };
      global.bus = {
        on: this.sandbox.stub(),
        emit: this.sandbox.stub()
      };
      global.client = {
        request: this.sandbox.stub().resolves({
          creditCards: [{
            nonce: 'a-nonce',
            details: {}
          }]
        })
      };
      global.PaymentRequest = function PR() {
        this.show = showStub;
        this.addEventListener = addEventListenerStub;
      };
    });

    afterEach(function () {
      delete global.bus;
      delete global.PaymentRequest;
      delete global.client;
    });

    it('initializes a payment request', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(this.showStub).to.be.calledOnce;
      }.bind(this));
    });

    it('creates listeners for shipping events when request shipping is passed', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      this.fakeDetails.options.requestShipping = true;

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(this.addEventListenerStub).to.be.calledTwice;
        expect(this.addEventListenerStub).to.be.calledWith('shippingaddresschange');
        expect(this.addEventListenerStub).to.be.calledWith('shippingoptionchange');
      }.bind(this));
    });

    it('does not create listeners for shipping events when request shipping is not passed', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      this.fakeDetails.options.requestShipping = false;

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(this.addEventListenerStub).to.not.be.called;
      }.bind(this));
    });

    it('emits shiping address when shippingaddresschange event occurs', function () {
      var event = {
        target: {
          shippingAddress: {}
        }
      };

      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      this.fakeDetails.options.requestShipping = true;
      this.addEventListenerStub.withArgs('shippingaddresschange').yields(event);

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(global.bus.emit).to.be.calledWith('payment-request:SHIPPING_ADDRESS_CHANGE', event.target.shippingAddress);
      });
    });

    it('emits selected shipping option when shippinoptionchange event occurs', function () {
      var event = {
        target: {
          shippingOption: 'option'
        }
      };

      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      this.fakeDetails.options.requestShipping = true;
      this.addEventListenerStub.withArgs('shippingoptionchange').yields(event);

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(global.bus.emit).to.be.calledWith('payment-request:SHIPPING_OPTION_CHANGE', event.target.shippingOption);
      });
    });

    it('emits payment request failed event with TypeError when payment request is misconfigured', function () {
      var paymentRequestError = new Error('TypeError');

      global.PaymentRequest = function FailingPR() {
        throw paymentRequestError;
      };

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        var error = global.bus.emit.args[0][1];

        expect(global.bus.emit).to.be.calledOnce;
        expect(global.bus.emit).to.be.calledWith('payment-request:PAYMENT_REQUEST_FAILED');

        expect(error.name).to.equal('PAYMENT_REQUEST_INITIALIZATION_FAILED');
      });
    });

    it('emits raw error when paymentRequest.show fails', function () {
      var showError = new Error('DomException');

      showError.name = 'AbortError';
      this.showStub.rejects(showError);

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        var error = global.bus.emit.args[0][1];

        expect(global.bus.emit).to.be.calledOnce;
        expect(global.bus.emit).to.be.calledWith('payment-request:PAYMENT_REQUEST_FAILED');

        expect(error).to.equal(showError);
      });
    });

    it('completes payment request when it succeeds', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(this.completeStub).to.be.calledOnce;
      }.bind(this));
    });

    it('completes payment request when it fails', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      global.client.request.rejects(new Error('some error'));

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(this.completeStub).to.be.calledOnce;
      }.bind(this));
    });

    it('emits an error when methodName in paymentResponse is unknown', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'unknown',
        details: {}
      });

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
        expect(global.bus.emit).to.be.calledOnce;
        expect(global.bus.emit).to.be.calledWith('payment-request:PAYMENT_REQUEST_FAILED', {
          name: 'UNSUPPORTED_METHOD_NAME'
        });
      });
    });

    context('basic-card', function () {
      beforeEach(function () {
        this.showStub.resolves({
          complete: this.completeStub,
          methodName: 'basic-card',
          details: {
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2034',
            cardSecurityCode: '123'
          }
        });
      });

      it('tokenizes result of payment request', function () {
        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.client.request).to.be.calledOnce;
          expect(global.client.request).to.be.calledWith({
            endpoint: 'payment_methods/credit_cards',
            method: 'post',
            data: {
              creditCard: this.sandbox.match({
                number: '4111111111111111',
                expirationMonth: '12',
                expirationYear: '2034',
                cvv: '123'
              })
            }
          });
        }.bind(this));
      });

      it('tokenizes billing address if included in payment request', function () {
        var billingAddress = {
          addressLine: ['First line', 'Second line'],
          city: 'Chicago',
          country: 'US',
          dependentLocality: '',
          languageCode: '',
          organization: 'Scruff McGruff Payments',
          phone: '+123456789',
          postalCode: '60188',
          recipient: 'Scruff McGruff',
          region: 'IL',
          sortingCode: ''
        };

        this.showStub.resolves({
          complete: this.sandbox.stub(),
          methodName: 'basic-card',
          details: {
            billingAddress: billingAddress,
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2034',
            cardSecurityCode: '123'
          }
        });

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.client.request).to.be.calledOnce;
          expect(global.client.request).to.be.calledWith({
            endpoint: 'payment_methods/credit_cards',
            method: 'post',
            data: {
              creditCard: this.sandbox.match({
                billingAddress: {
                  company: 'Scruff McGruff Payments',
                  locality: 'Chicago',
                  region: 'IL',
                  postalCode: '60188',
                  streetAddress: 'First line',
                  extendedAddress: 'Second line',
                  countryCodeAlpha2: 'US'
                }
              })
            }
          });
        }.bind(this));
      });

      it('includes cardholder name if provided', function () {
        this.showStub.resolves({
          complete: this.sandbox.stub(),
          methodName: 'basic-card',
          details: {
            cardNumber: '4111111111111111',
            cardholderName: 'First Last',
            expiryMonth: '12',
            expiryYear: '2034',
            cardSecurityCode: '123'
          }
        });

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.client.request).to.be.calledOnce;
          expect(global.client.request).to.be.calledWith({
            endpoint: 'payment_methods/credit_cards',
            method: 'post',
            data: {
              creditCard: this.sandbox.match({
                cardholderName: 'First Last'
              })
            }
          });
        }.bind(this));
      });

      it('emits tokenized payload with a payment request successful event', function () {
        this.showStub.resolves({
          complete: this.sandbox.stub(),
          methodName: 'basic-card',
          payerEmail: 'asdf@example.com',
          payerName: 'First Last',
          payerPhone: '+123457890',
          requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16',
          shippingAddress: {},
          shippingOption: null,
          details: {
            billingAddress: {
              addressLine: ['foo', 'bar']
            },
            cardNumber: '4111111111111111',
            cardholderName: 'First Last',
            expiryMonth: '12',
            expiryYear: '2034',
            cardSecurityCode: '123'
          }
        });

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.bus.emit).to.be.calledOnce;
          expect(global.bus.emit).to.be.calledWith('payment-request:PAYMENT_REQUEST_SUCCESSFUL', {
            nonce: 'a-nonce',
            details: {
              rawPaymentResponse: {
                details: {
                  billingAddress: {
                    addressLine: ['foo', 'bar']
                  },
                  cardholderName: 'First Last'
                },
                methodName: 'basic-card',
                payerEmail: 'asdf@example.com',
                payerName: 'First Last',
                payerPhone: '+123457890',
                requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16',
                shippingAddress: {},
                shippingOption: null
              }
            }
          });
        });
      });

      it('emits tokenization error with a payment request failed event', function () {
        var error = new BraintreeError({
          type: 'MERCHANT',
          code: 'SOME_CODE',
          message: 'a message'
        });

        global.client.request.rejects(error);

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.bus.emit).to.be.calledOnce;
          expect(global.bus.emit).to.be.calledWith('payment-request:PAYMENT_REQUEST_FAILED', error);
        });
      });
    });

    context('pay with google', function () {
      beforeEach(function () {
        this.showStub.resolves({
          complete: this.completeStub,
          methodName: 'https://google.com/pay',
          requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16',
          details: {
            paymentMethodToken: {
              token: JSON.stringify({
                androidPayCards: [{
                  type: 'AndroidPay',
                  nonce: 'a-nonce',
                  details: {}
                }]
              })
            }
          }
        });
      });

      it('emits tokenized payload with a payment request successful event', function () {
        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.bus.emit).to.be.calledOnce;
          expect(global.bus.emit).to.be.calledWith('payment-request:PAYMENT_REQUEST_SUCCESSFUL', {
            nonce: 'a-nonce',
            type: 'AndroidPay',
            details: {
              rawPaymentResponse: {
                details: {},
                methodName: 'https://google.com/pay',
                requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16'
              }
            }
          });
        });
      });

      it('emits an error when gateway returns an error', function () {
        this.showStub.resolves({
          complete: this.completeStub,
          methodName: 'https://google.com/pay',
          requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16',
          details: {
            paymentMethodToken: {
              token: JSON.stringify({
                error: 'some-error'
              })
            }
          }
        });

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.bus.emit).to.be.calledOnce;
          expect(global.bus.emit).to.be.calledWithMatch('payment-request:PAYMENT_REQUEST_FAILED', {
            name: 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR'
          });
        });
      });

      it('emits an error when Gateway response is not parsable', function () {
        this.showStub.resolves({
          complete: this.completeStub,
          methodName: 'https://google.com/pay',
          requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16',
          details: {
            paymentMethodToken: {
              token: '{foo:"bar'
            }
          }
        });

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails).then(function () {
          expect(global.bus.emit).to.be.calledOnce;
          expect(global.bus.emit).to.be.calledWithMatch('payment-request:PAYMENT_REQUEST_FAILED', {
            name: 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR'
          });
        });
      });
    });
  });
});
