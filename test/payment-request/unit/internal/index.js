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

    it('listens for can make payment event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).to.be.calledWith('payment-request:CAN_MAKE_PAYMENT');
    });

    it('listens for shipping address change event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).to.be.calledWith('payment-request:UPDATE_SHIPPING_ADDRESS');
    });

    it('calls update with on shipping address change event', function () {
      var data = {};

      global.shippingAddressChangeResolveFunction = this.sandbox.stub();
      Bus.prototype.on.withArgs('payment-request:UPDATE_SHIPPING_ADDRESS').yields(data);
      paymentRequestFrame.create();

      expect(global.shippingAddressChangeResolveFunction).to.be.calledOnce;
      expect(global.shippingAddressChangeResolveFunction).to.be.calledWith(data);
    });

    it('listens for shipping option change event', function () {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).to.be.calledWith('payment-request:UPDATE_SHIPPING_OPTION');
    });

    it('calls update with on shipping option change event', function () {
      var data = {};

      global.shippingOptionChangeResolveFunction = this.sandbox.stub();
      Bus.prototype.on.withArgs('payment-request:UPDATE_SHIPPING_OPTION').yields(data);
      paymentRequestFrame.create();

      expect(global.shippingOptionChangeResolveFunction).to.be.calledOnce;
      expect(global.shippingOptionChangeResolveFunction).to.be.calledWith(data);
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
      this.replyStub = this.sandbox.stub();
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

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
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

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
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

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(this.addEventListenerStub).to.not.be.called;
      }.bind(this));
    });

    it('emits shipping address when shippingaddresschange event occurs', function () {
      var event = {
        target: {
          shippingAddress: {}
        },
        updateWith: this.sandbox.stub()
      };

      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      this.fakeDetails.options.requestShipping = true;
      this.addEventListenerStub.withArgs('shippingaddresschange').yields(event);

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(global.bus.emit).to.be.calledWith('payment-request:SHIPPING_ADDRESS_CHANGE', event.target.shippingAddress);
        expect(event.updateWith).to.be.calledOnce;
        expect(global.shippingAddressChangeResolveFunction).to.be.undefined;
      });
    });

    it('emits selected shipping option when shippingoptionchange event occurs', function () {
      var event = {
        target: {
          shippingOption: 'option'
        },
        updateWith: this.sandbox.stub()
      };

      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      this.fakeDetails.options.requestShipping = true;
      this.addEventListenerStub.withArgs('shippingoptionchange').yields(event);

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(global.bus.emit).to.be.calledWith('payment-request:SHIPPING_OPTION_CHANGE', event.target.shippingOption);
        expect(event.updateWith).to.be.calledOnce;
        expect(global.shippingOptionChangeResolveFunction).to.be.undefined;
      });
    });

    it('replies with TypeError when payment request is misconfigured', function () {
      var paymentRequestError = new Error('TypeError');

      global.PaymentRequest = function FailingPR() {
        throw paymentRequestError;
      };

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([this.sandbox.match({
          name: 'PAYMENT_REQUEST_INITIALIZATION_FAILED'
        })]);
      }.bind(this));
    });

    it('emits raw error when paymentRequest.show fails', function () {
      var showError = new Error();

      showError.name = 'AbortError';
      this.showStub.rejects(showError);

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([this.sandbox.match({
          name: 'AbortError'
        })]);
      }.bind(this));
    });

    it('completes payment request when it succeeds', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(this.completeStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([null, {
          nonce: 'a-nonce',
          details: {
            rawPaymentResponse: {
              details: {},
              methodName: 'basic-card'
            }
          }
        }]);
      }.bind(this));
    });

    it('completes payment request when it fails', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'basic-card',
        details: {}
      });
      global.client.request.rejects(new Error('some error'));

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(this.completeStub).to.be.calledOnce;
      }.bind(this));
    });

    it('emits an error when methodName in paymentResponse is unknown', function () {
      this.showStub.resolves({
        complete: this.completeStub,
        methodName: 'unknown',
        details: {}
      });

      return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([this.sandbox.match({
          name: 'UNSUPPORTED_METHOD_NAME'
        })]);
      }.bind(this));
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
        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
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

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
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

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
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

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
          expect(this.replyStub).to.be.calledOnce;
          expect(this.replyStub).to.be.calledWith([null, {
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
          }]);
        }.bind(this));
      });

      it('emits tokenization error with a payment request failed event', function () {
        var error = new BraintreeError({
          type: 'MERCHANT',
          code: 'SOME_CODE',
          message: 'a message'
        });

        global.client.request.rejects(error);

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
          expect(this.replyStub).to.be.calledOnce;
          expect(this.replyStub).to.be.calledWith([{
            code: 'SOME_CODE',
            message: 'a message',
            name: 'BraintreeError'
          }]);
        }.bind(this));
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
        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
          expect(this.replyStub).to.be.calledOnce;
          expect(this.replyStub).to.be.calledWith([null, {
            nonce: 'a-nonce',
            type: 'AndroidPay',
            details: {
              rawPaymentResponse: {
                details: {},
                methodName: 'https://google.com/pay',
                requestId: '68a2ac68-3f7e-42e4-82f9-a690d9166a16'
              }
            }
          }]);
        }.bind(this));
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

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
          expect(this.replyStub).to.be.calledOnce;
          expect(this.replyStub).to.be.calledWith([this.sandbox.match({
            name: 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR'
          })]);
        }.bind(this));
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

        return paymentRequestFrame.initializePaymentRequest(this.fakeDetails, this.replyStub).then(function () {
          expect(this.replyStub).to.be.calledOnce;
          expect(this.replyStub).to.be.calledWith([this.sandbox.match({
            name: 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR'
          })]);
        }.bind(this));
      });
    });
  });

  describe('makePaymentRequest', function () {
    beforeEach(function () {
      var canMakePaymentStub;

      this.completeStub = this.sandbox.stub();
      canMakePaymentStub = this.canMakePaymentStub = this.sandbox.stub();

      this.fakeDetails = {
        supportedPaymentMethods: ['basic-card'],
        details: {},
        options: {}
      };
      this.replyStub = this.sandbox.stub();
      global.bus = {
        on: this.sandbox.stub(),
        emit: this.sandbox.stub()
      };
      global.PaymentRequest = function PR() {
        this.canMakePayment = canMakePaymentStub;
      };
    });

    it('initializes a payment request', function () {
      this.canMakePaymentStub.resolves(true);

      return paymentRequestFrame.canMakePayment(this.fakeDetails, this.replyStub).then(function () {
        expect(this.canMakePaymentStub).to.be.calledOnce;
      }.bind(this));
    });

    it('replies with true when canMakePayment resolves with true', function () {
      this.canMakePaymentStub.resolves(true);

      return paymentRequestFrame.canMakePayment(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([null, true]);
      }.bind(this));
    });

    it('replies with false when canMakePayment resolves with false', function () {
      this.canMakePaymentStub.resolves(false);

      return paymentRequestFrame.canMakePayment(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([null, false]);
      }.bind(this));
    });

    it('replies with error when payment request initialization fails', function () {
      var paymentRequestError = new Error('TypeError');

      global.PaymentRequest = function FailingPR() {
        throw paymentRequestError;
      };

      return paymentRequestFrame.canMakePayment(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([this.sandbox.match({
          name: 'PAYMENT_REQUEST_INITIALIZATION_FAILED'
        })]);
      }.bind(this));
    });

    it('replies with error when canMakePayment fails', function () {
      var paymentRequestError = new Error('canMakePaymentError');

      paymentRequestError.name = 'CanMakePaymentError';
      this.canMakePaymentStub.rejects(paymentRequestError);

      return paymentRequestFrame.canMakePayment(this.fakeDetails, this.replyStub).then(function () {
        expect(this.replyStub).to.be.calledOnce;
        expect(this.replyStub).to.be.calledWith([this.sandbox.match({
          name: 'CanMakePaymentError'
        })]);
      }.bind(this));
    });
  });
});
