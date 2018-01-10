'use strict';

var PayPalCheckout = require('../../../src/paypal-checkout/paypal-checkout');
var Promise = require('../../../src/lib/promise');
var BraintreeError = require('../../../src/lib/braintree-error');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var methods = require('../../../src/lib/methods');

function noop() {}

describe('PayPalCheckout', function () {
  beforeEach(function () {
    this.sandbox.stub(analytics, 'sendEvent');

    this.configuration = fake.configuration();
    this.client = {
      request: this.sandbox.stub().resolves({
        paymentResource: {paymentToken: 'token'},
        agreementSetup: {tokenId: 'id'}
      }),
      getConfiguration: this.sandbox.stub().returns(this.configuration)
    };
    this.paypalCheckout = new PayPalCheckout({
      client: this.client
    });
  });

  describe('Constructor', function () {
    it('stores its client', function () {
      var client = {};
      var options = {client: client};

      expect(new PayPalCheckout(options)._client).to.equal(client);
    });
  });

  describe('createPayment', function () {
    context('using promises', function () {
      it('returns a Promise', function () {
        var promise = this.paypalCheckout.createPayment({flow: 'vault'});

        expect(promise).to.respondTo('then');
        expect(promise).to.respondTo('catch');
      });

      it('rejects with error if options are not passed in', function () {
        return this.paypalCheckout.createPayment(null).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
          expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        });
      });

      it('rejects with error if no flow option is passed', function () {
        return this.paypalCheckout.createPayment({}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
          expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        });
      });

      it('rejects with error if invalid flow option is passed', function () {
        return this.paypalCheckout.createPayment({flow: 'bar'}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
          expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        });
      });

      it('rejects with a network BraintreeError on gateway 422 errors', function () {
        var gateway422Error = new BraintreeError({
          type: BraintreeError.types.NETWORK,
          code: 'CLIENT_REQUEST_ERROR',
          message: 'There was a problem with your request.',
          details: {httpStatus: 422}
        });

        this.client.request.rejects(gateway422Error);

        return this.paypalCheckout.createPayment({flow: 'vault'}).then(rejectIfResolves).catch(function (err) {
          expect(err.type).to.equal(BraintreeError.types.MERCHANT);
          expect(err.code).to.equal('PAYPAL_INVALID_PAYMENT_OPTION');
          expect(err.message).to.equal('PayPal payment options are invalid.');
          expect(err.details).to.deep.equal({
            originalError: gateway422Error
          });
        });
      });

      it('rejects with a network BraintreeError on other gateway errors', function () {
        var gatewayError = new Error('There was a problem with your request.');

        gatewayError.details = {httpStatus: 400};

        this.client.request.rejects(gatewayError);

        return this.paypalCheckout.createPayment({flow: 'vault'}).then(rejectIfResolves).catch(function (err) {
          expect(err.type).to.equal(BraintreeError.types.NETWORK);
          expect(err.code).to.equal('PAYPAL_FLOW_FAILED');
          expect(err.message).to.equal('Could not initialize PayPal flow.');
          expect(err.details).to.deep.equal({
            originalError: gatewayError
          });
        });
      });

      it('rejects with the Braintree error when client request returns a Braintree error', function () {
        var gatewayError = new BraintreeError({
          type: BraintreeError.types.NETWORK,
          code: 'CLIENT_REQUEST_ERROR',
          message: 'There was a problem with your request.',
          details: {httpStatus: 400}
        });

        this.client.request.rejects(gatewayError);

        return this.paypalCheckout.createPayment({flow: 'vault'}).then(rejectIfResolves).catch(function (err) {
          expect(err.type).to.equal(BraintreeError.types.NETWORK);
          expect(err.code).to.equal('CLIENT_REQUEST_ERROR');
          expect(err.message).to.equal('There was a problem with your request.');
        });
      });

      it('resolves with a paymentID for checkout flow', function () {
        var paymentId = 'PAY-XXXXXXXXXX';

        this.client.request.resolves({
          paymentResource: {
            paymentToken: paymentId
          }
        });

        return this.paypalCheckout.createPayment({flow: 'checkout'}).then(function (payload) {
          expect(payload).to.equal(paymentId);
        });
      });

      it('resolves with a billingToken for vault flow', function () {
        var billingToken = 'BA-XXXXXXXXXX';

        this.client.request.resolves({
          agreementSetup: {
            tokenId: billingToken
          }
        });

        return this.paypalCheckout.createPayment({flow: 'vault'}).then(function (payload) {
          expect(payload).to.equal(billingToken);
        });
      });

      describe('Hermes payment resource', function () {
        beforeEach(function () {
          this.options = {
            flow: 'vault'
          };
          this.client.request.resolves({
            agreementSetup: {
              tokenId: 'stub'
            },
            paymentResource: {
              paymentToken: 'stub'
            }
          });
        });

        it('contains the PayPal experience profile', function () {
          this.options.displayName = 'My Merchant';
          this.options.locale = 'th_TH';
          this.options.enableShippingAddress = true;
          this.options.shippingAddressEditable = false;

          return this.paypalCheckout.createPayment(this.options).then(function () {
            expect(this.client.request).to.be.calledWith(this.sandbox.match({
              data: {
                experienceProfile: {
                  brandName: 'My Merchant',
                  localeCode: 'th_TH',
                  noShipping: 'false',
                  addressOverride: true
                }
              }
            }));
          }.bind(this));
        });

        it('uses configuration\'s display name for PayPal brand name by default', function () {
          return this.paypalCheckout.createPayment(this.options).then(function () {
            expect(this.client.request).to.be.calledWith(this.sandbox.match({
              data: {
                experienceProfile: {
                  brandName: 'Name'
                }
              }
            }));
          }.bind(this));
        });

        it('contains landing page type when specified', function () {
          this.options.landingPageType = 'foobar';

          return this.paypalCheckout.createPayment(this.options).then(function () {
            expect(this.client.request).to.be.calledWith(this.sandbox.match({
              data: {
                experienceProfile: {
                  landingPageType: 'foobar'
                }
              }
            }));
          }.bind(this));
        });

        it('does not contain landing page type when unspecified', function () {
          return this.paypalCheckout.createPayment(this.options).then(function () {
            expect(this.client.request).to.be.calledWith(this.sandbox.match({
              data: {
                experienceProfile: this.sandbox.match(function (obj) {
                  return !obj.landingPageType;
                })
              }
            }));
          }.bind(this));
        });

        context('when using checkout flow', function () {
          beforeEach(function () {
            this.options.flow = 'checkout';
            this.options.amount = 1;
            this.options.currency = 'USD';
          });

          it('uses the correct endpoint', function () {
            return this.paypalCheckout.createPayment(this.options).then(function () {
              expect(this.client.request).to.be.calledWith(this.sandbox.match({
                endpoint: 'paypal_hermes/create_payment_resource',
                method: 'post'
              }));
            }.bind(this));
          });

          it('contains payment amount and currency', function () {
            return this.paypalCheckout.createPayment(this.options).then(function () {
              expect(this.client.request).to.be.calledWith(this.sandbox.match({
                data: {
                  amount: 1,
                  currencyIsoCode: 'USD'
                }
              }));
            }.bind(this));
          });

          it('contains other options when specified', function () {
            this.options.intent = 'sale';
            this.options.shippingAddressOverride = {
              line1: '123 Townsend St',
              line2: 'Fl 6',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94107',
              countryCode: 'USA',
              phone: '111-1111',
              recipientName: 'Joe Bloggs'
            };

            return this.paypalCheckout.createPayment(this.options).then(function () {
              expect(this.client.request).to.be.calledWith(this.sandbox.match({
                data: {
                  intent: 'sale',
                  line1: '123 Townsend St',
                  line2: 'Fl 6',
                  city: 'San Francisco',
                  state: 'CA',
                  postalCode: '94107',
                  countryCode: 'USA',
                  phone: '111-1111',
                  recipientName: 'Joe Bloggs'
                }
              }));
            }.bind(this));
          });
        });

        context('when using vault flow', function () {
          beforeEach(function () {
            this.options.flow = 'vault';
          });

          it('uses the correct endpoint', function () {
            return this.paypalCheckout.createPayment(this.options).then(function () {
              expect(this.client.request).to.be.calledWith(this.sandbox.match({
                endpoint: 'paypal_hermes/setup_billing_agreement',
                method: 'post'
              }));
            }.bind(this));
          });

          it('contains other options when specified', function () {
            this.options.billingAgreementDescription = 'Foo Bar';
            this.options.shippingAddressOverride = {
              line1: '123 Townsend St',
              line2: 'Fl 6',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94107',
              countryCode: 'USA',
              phone: '111-1111',
              recipientName: 'Joe Bloggs'
            };

            return this.paypalCheckout.createPayment(this.options).then(function () {
              expect(this.client.request).to.be.calledWith(this.sandbox.match({
                data: {
                  description: 'Foo Bar',
                  shippingAddress: this.options.shippingAddressOverride
                }
              }));
            }.bind(this));
          });
        });
      });
    });

    context('using callbacks', function () {
      it('does not return a Promise', function () {
        var returnValue = this.paypalCheckout.createPayment({flow: 'checkout'}, noop);

        expect(returnValue).to.be.undefined;
      });

      it('calls callback with error if options are not passed in', function (done) {
        this.paypalCheckout.createPayment(null, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
          expect(err.message).to.equal('PayPal flow property is invalid or missing.');

          done();
        });
      });

      it('calls callback with error if no flow option is passed', function (done) {
        this.paypalCheckout.createPayment({}, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
          expect(err.message).to.equal('PayPal flow property is invalid or missing.');

          done();
        });
      });

      it('calls callback with error if invalid flow option is passed', function (done) {
        this.paypalCheckout.createPayment({flow: 'bar'}, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
          expect(err.message).to.equal('PayPal flow property is invalid or missing.');

          done();
        });
      });

      it('calls callback with a network BraintreeError on gateway 422 errors', function (done) {
        var gateway422Error = new BraintreeError({
          type: BraintreeError.types.NETWORK,
          code: 'CLIENT_REQUEST_ERROR',
          message: 'There was a problem with your request.',
          details: {httpStatus: 422}
        });

        this.client.request.rejects(gateway422Error);

        this.paypalCheckout.createPayment({flow: 'vault'}, function (err) {
          expect(err.type).to.equal(BraintreeError.types.MERCHANT);
          expect(err.code).to.equal('PAYPAL_INVALID_PAYMENT_OPTION');
          expect(err.message).to.equal('PayPal payment options are invalid.');
          expect(err.details).to.deep.equal({
            originalError: gateway422Error
          });

          done();
        });
      });

      it('calls callback with a network BraintreeError on other gateway errors', function (done) {
        var gatewayError = new Error('There was a problem with your request.');

        gatewayError.details = {httpStatus: 400};

        this.client.request.rejects(gatewayError);

        this.paypalCheckout.createPayment({flow: 'vault'}, function (err) {
          expect(err.type).to.equal(BraintreeError.types.NETWORK);
          expect(err.code).to.equal('PAYPAL_FLOW_FAILED');
          expect(err.message).to.equal('Could not initialize PayPal flow.');
          expect(err.details).to.deep.equal({
            originalError: gatewayError
          });

          done();
        });
      });

      it('calls callback with the Braintree error when client request returns a Braintree error', function (done) {
        var gatewayError = new BraintreeError({
          type: BraintreeError.types.NETWORK,
          code: 'CLIENT_REQUEST_ERROR',
          message: 'There was a problem with your request.',
          details: {httpStatus: 400}
        });

        this.client.request.rejects(gatewayError);

        this.paypalCheckout.createPayment({flow: 'vault'}, function (err) {
          expect(err.type).to.equal(BraintreeError.types.NETWORK);
          expect(err.code).to.equal('CLIENT_REQUEST_ERROR');
          expect(err.message).to.equal('There was a problem with your request.');

          done();
        });
      });

      it('calls callback with a paymentID for checkout flow', function (done) {
        var paymentId = 'PAY-XXXXXXXXXX';

        this.client.request.resolves({
          paymentResource: {
            paymentToken: paymentId
          }
        });

        this.paypalCheckout.createPayment({flow: 'checkout'}, function (err, payload) {
          expect(payload).to.equal(paymentId);

          done();
        });
      });

      it('calls callback with a billingToken for vault flow', function (done) {
        var billingToken = 'BA-XXXXXXXXXX';

        this.client.request.resolves({
          agreementSetup: {
            tokenId: billingToken
          }
        });

        this.paypalCheckout.createPayment({flow: 'vault'}, function (err, payload) {
          expect(payload).to.equal(billingToken);

          done();
        });
      });
    });

    it('sends analytics event when createPayment is called', function () {
      this.paypalCheckout.createPayment({flow: 'vault'});

      expect(analytics.sendEvent).to.be.calledOnce;
      expect(analytics.sendEvent).to.be.calledWith(this.client, 'paypal-checkout.createPayment');
    });

    it('sends analytics event when offerCredit is true and using checkout flow', function () {
      this.paypalCheckout.createPayment({flow: 'checkout', offerCredit: true});

      expect(analytics.sendEvent).to.be.calledWith(this.client, 'paypal-checkout.credit.offered');
    });

    it('sends analytics event when offerCredit is true and using vault flow', function () {
      this.paypalCheckout.createPayment({flow: 'vault', offerCredit: true});

      expect(analytics.sendEvent).to.be.calledWith(this.client, 'paypal-checkout.credit.offered');
    });

    it('does not send analytics event when offerCredit is false and using checkout flow', function () {
      this.paypalCheckout.createPayment({flow: 'checkout'});

      expect(analytics.sendEvent).to.not.be.calledWith(this.client, 'paypal-checkout.credit.offered');
    });

    it('does not send analytics event when offerCredit is false and using vault flow', function () {
      this.paypalCheckout.createPayment({flow: 'vault'});

      expect(analytics.sendEvent).to.not.be.calledWith(this.client, 'paypal-checkout.credit.offered');
    });

    it('requests setup_billing_agreement url with vault flow', function () {
      this.paypalCheckout.createPayment({flow: 'vault'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        method: 'post',
        endpoint: 'paypal_hermes/setup_billing_agreement'
      });
    });

    it('requests create_payment_resource url with checkout flow', function () {
      this.paypalCheckout.createPayment({flow: 'checkout'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        method: 'post',
        endpoint: 'paypal_hermes/create_payment_resource'
      });
    });

    it('formats request', function () {
      this.paypalCheckout.createPayment({
        flow: 'checkout',
        locale: 'FOO',
        enableShippingAddress: true,
        shippingAddressEditable: false
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          returnUrl: 'x',
          cancelUrl: 'x',
          experienceProfile: {
            brandName: 'Name',
            localeCode: 'FOO',
            noShipping: 'false',
            addressOverride: true
          }
        }
      });
    });

    it('allows override of displayName', function () {
      this.paypalCheckout.createPayment({
        flow: 'checkout',
        displayName: 'OVERRIDE NAME'
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          experienceProfile: {
            brandName: 'OVERRIDE NAME'
          }
        }
      });
    });

    ['authorize', 'order', 'sale'].forEach(function (intent) {
      it('assigns intent "' + intent + '" for one-time checkout', function () {
        this.paypalCheckout.createPayment({
          flow: 'checkout',
          intent: intent
        });

        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWithMatch({
          data: {
            intent: intent
          }
        });
      });
    });

    it('does not assign intent for one-time checkout if not provided', function () {
      var arg;

      this.paypalCheckout.createPayment({flow: 'checkout'});

      expect(this.client.request).to.be.calledOnce;

      arg = this.client.request.args[0][0];

      expect(arg.data).to.not.have.property('intent');
    });

    it('assigns shipping address for one-time checkout', function () {
      this.paypalCheckout.createPayment({
        flow: 'checkout',
        shippingAddressOverride: {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        }
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        }
      });
    });

    it('assigns shipping address for billing agreements', function () {
      var shippingAddress = {
        line1: 'line1',
        line2: 'line2',
        city: 'city',
        state: 'state',
        countryCode: 'countryCode',
        postalCode: 'postal'
      };

      this.paypalCheckout.createPayment({
        flow: 'vault',
        shippingAddressOverride: shippingAddress
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          shippingAddress: shippingAddress
        }
      });
    });

    it('sets offerPaypalCredit to false if offerCredit is unspecified with checkout flow', function () {
      var arg;

      this.paypalCheckout.createPayment({flow: 'checkout'});

      expect(this.client.request).to.be.calledOnce;

      arg = this.client.request.args[0][0];

      expect(arg.data.offerPaypalCredit).to.equal(false);
    });

    it('sets offerPaypalCredit to false if offerCredit is unspecified with vault flow', function () {
      var arg;

      this.paypalCheckout.createPayment({flow: 'vault'});

      expect(this.client.request).to.be.calledOnce;

      arg = this.client.request.args[0][0];

      expect(arg.data.offerPaypalCredit).to.equal(false);
    });

    it('sets offerPaypalCredit to false if offerCredit is not a boolean true', function () {
      var arg;

      this.paypalCheckout.createPayment({
        flow: 'checkout',
        offerCredit: 'true'
      });

      expect(this.client.request).to.be.calledOnce;

      arg = this.client.request.args[0][0];

      expect(arg.data.offerPaypalCredit).to.equal(false);
    });

    it('sets offerPaypalCredit to true if offerCredit is true with checkout flow', function () {
      var arg;

      this.paypalCheckout.createPayment({
        flow: 'checkout',
        offerCredit: true
      });

      expect(this.client.request).to.be.calledOnce;

      arg = this.client.request.args[0][0];

      expect(arg.data.offerPaypalCredit).to.equal(true);
    });

    it('sets offerPaypalCredit to true if offerCredit is true with vault flow', function () {
      var arg;

      this.paypalCheckout.createPayment({
        flow: 'vault',
        offerCredit: true
      });

      expect(this.client.request).to.be.calledOnce;

      arg = this.client.request.args[0][0];

      expect(arg.data.offerPaypalCredit).to.equal(true);
    });

    it('sets addressOverride to true if shippingAddressEditable is false', function () {
      this.paypalCheckout.createPayment({
        flow: 'vault',
        shippingAddressOverride: {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        },
        shippingAddressEditable: false
      });

      expect(this.client.request).to.be.calledWithMatch({
        data: {
          experienceProfile: {
            addressOverride: true
          }
        }
      });
    });

    it('sets addressOverride to false if shippingAddressEditable is true', function () {
      this.paypalCheckout.createPayment({
        flow: 'vault',
        shippingAddressOverride: {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        },
        shippingAddressEditable: true
      });

      expect(this.client.request).to.be.calledWithMatch({
        data: {
          experienceProfile: {
            addressOverride: false
          }
        }
      });
    });

    it('assigns billing agreement description for billing agreements', function () {
      this.paypalCheckout.createPayment({
        flow: 'vault',
        billingAgreementDescription: 'Fancy Schmancy Description'
      });

      expect(this.client.request).to.be.calledWithMatch({
        data: {
          description: 'Fancy Schmancy Description'
        }
      });
    });

    it('does not assign billing agreement description for one-time checkout', function () {
      var arg;

      this.paypalCheckout.createPayment({
        flow: 'checkout',
        billingAgreementDescription: 'Fancy Schmancy Description'
      });

      arg = this.client.request.args[0][0];

      expect(arg.data).to.not.have.property('description');
    });
  });

  describe('tokenizePayment', function () {
    context('using promises', function () {
      it('returns a Promise', function () {
        var promise = this.paypalCheckout.tokenizePayment({});

        expect(promise).to.respondTo('then');
        expect(promise).to.respondTo('catch');
      });

      it('rejects with a BraintreeError if a non-Braintree error comes back from the client', function () {
        var error = new Error('Error');

        this.client.request.rejects(error);

        return this.paypalCheckout.tokenizePayment({}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('NETWORK');
          expect(err.code).to.equal('PAYPAL_ACCOUNT_TOKENIZATION_FAILED');
          expect(err.message).to.equal('Could not tokenize user\'s PayPal account.');
          expect(err.details.originalError).to.equal(error);
        });
      });

      it('rejects with the error if the client error is a BraintreeError', function () {
        var btError = new BraintreeError({
          type: 'MERCHANT',
          code: 'BT_CODE',
          message: 'message.'
        });

        this.client.request.rejects(btError);

        return this.paypalCheckout.tokenizePayment({}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.equal(btError);
        });
      });

      it('resolves with the back account data in response', function () {
        this.client.request.resolves({
          paypalAccounts: [{nonce: 'nonce', type: 'PayPal'}]
        });

        return this.paypalCheckout.tokenizePayment({}).then(function (res) {
          expect(res.nonce).to.equal('nonce');
          expect(res.type).to.equal('PayPal');
          expect(res.details).to.deep.equal({});
        });
      });

      it('resolves with account details if available', function () {
        var accountDetails = {
          payerInfo: {name: 'foo'}
        };

        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: accountDetails
          }]
        });

        return this.paypalCheckout.tokenizePayment({}).then(function (res) {
          expect(res.details).to.equal(accountDetails.payerInfo);
        });
      });

      it('resolves with creditFinancingOffered if available', function () {
        var accountDetails = {
          creditFinancingOffered: {foo: 'bar'}
        };

        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: accountDetails
          }]
        });

        return this.paypalCheckout.tokenizePayment({}).then(function (res) {
          expect(res.creditFinancingOffered).to.equal(accountDetails.creditFinancingOffered);
        });
      });

      it('passes along intent property', function () {
        var accountDetails = {
          creditFinancingOffered: {foo: 'bar'}
        };

        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: accountDetails
          }]
        });

        return this.paypalCheckout.tokenizePayment({
          intent: 'sale'
        }).then(function () {
          expect(this.client.request).to.be.calledWithMatch({
            data: {
              paypalAccount: {
                intent: 'sale'
              }
            }
          });
        }.bind(this));
      });

      it('does not resolve with creditFinancingOffered when not available', function () {
        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: {}
          }]
        });

        return this.paypalCheckout.tokenizePayment({}).then(function (res) {
          expect(res.creditFinancingOffered).to.not.exist;
        });
      });
    });

    context('using callbacks', function () {
      it('calls callback with a BraintreeError if a non-Braintree error comes back from the client', function (done) {
        var error = new Error('Error');

        this.client.request.rejects(error);

        this.paypalCheckout.tokenizePayment({}, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('NETWORK');
          expect(err.code).to.equal('PAYPAL_ACCOUNT_TOKENIZATION_FAILED');
          expect(err.message).to.equal('Could not tokenize user\'s PayPal account.');
          expect(err.details.originalError).to.equal(error);
          done();
        });
      });

      it('calls callback with the error if the client error is a BraintreeError', function (done) {
        var btError = new BraintreeError({
          type: 'MERCHANT',
          code: 'BT_CODE',
          message: 'message.'
        });

        this.client.request.rejects(btError);

        this.paypalCheckout.tokenizePayment({}, function (err) {
          expect(err).to.equal(btError);
          done();
        });
      });

      it('calls callback with the back account data in response', function (done) {
        this.client.request.resolves({
          paypalAccounts: [{nonce: 'nonce', type: 'PayPal'}]
        });

        this.paypalCheckout.tokenizePayment({}, function (err, res) {
          expect(err).to.not.exist;
          expect(res.nonce).to.equal('nonce');
          expect(res.type).to.equal('PayPal');
          expect(res.details).to.deep.equal({});
          done();
        });
      });

      it('includes account details if available', function (done) {
        var accountDetails = {
          payerInfo: {name: 'foo'}
        };

        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: accountDetails
          }]
        });

        this.paypalCheckout.tokenizePayment({}, function (err, res) {
          expect(err).to.not.exist;
          expect(res.details).to.equal(accountDetails.payerInfo);
          done();
        });
      });

      it('returns creditFinancingOffered if available', function (done) {
        var accountDetails = {
          creditFinancingOffered: {foo: 'bar'}
        };

        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: accountDetails
          }]
        });

        this.paypalCheckout.tokenizePayment({}, function (err, res) {
          expect(err).to.not.exist;
          expect(res.creditFinancingOffered).to.equal(accountDetails.creditFinancingOffered);
          done();
        });
      });

      it('does not return creditFinancingOffered when not available', function (done) {
        this.client.request.resolves({
          paypalAccounts: [{
            nonce: 'nonce',
            type: 'PayPal',
            details: {}
          }]
        });

        this.paypalCheckout.tokenizePayment({}, function (err, res) {
          expect(err).to.not.exist;
          expect(res.creditFinancingOffered).not.to.exist;
          done();
        });
      });
    });

    it('sends a tokenization event when tokenization starts', function () {
      return this.paypalCheckout.tokenizePayment({billingToken: 'token'}).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'paypal-checkout.tokenization.started');
      }.bind(this));
    });

    it('sends a request to payment_methods/paypal_accounts', function () {
      this.paypalCheckout.tokenizePayment({billingToken: 'token'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        endpoint: 'payment_methods/paypal_accounts',
        method: 'post'
      });
    });

    it('calls analytics event when tokenization succeeds', function () {
      var client = this.client;

      client.request.resolves({});

      return this.paypalCheckout.tokenizePayment({}).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal-checkout.tokenization.success');
      });
    });

    it('calls analytics event when credit offer is accepted', function () {
      var client = this.client;

      client.request.resolves({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: {
            creditFinancingOffered: {}
          }
        }]
      });

      return this.paypalCheckout.tokenizePayment({}).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal-checkout.credit.accepted');
      });
    });

    it('passes the BA token as the correlationId when present', function () {
      this.paypalCheckout.tokenizePayment({billingToken: 'BA-1234'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            correlationId: 'BA-1234'
          }
        }
      });
    });

    it('passes the EC token as the correlationId when present', function () {
      this.paypalCheckout.tokenizePayment({paymentToken: 'EC-1234'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            correlationId: 'EC-1234'
          }
        }
      });
    });

    it('validates if flow is vault and auth is not tokenization key', function () {
      this.configuration.authorizationType = 'CLIENT_TOKEN';
      this.paypalCheckout.tokenizePayment({billingToken: 'token'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            options: {
              validate: true
            }
          }
        }
      });
    });

    it('does not validate if flow is vault and auth is tokenization key', function () {
      this.configuration.authorizationType = 'TOKENIZATION_KEY';
      this.paypalCheckout.tokenizePayment({billingToken: 'token'});

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            options: {
              validate: false
            }
          }
        }
      });
    });

    it('sends along checkout params', function () {
      this.paypalCheckout.tokenizePayment({
        payerID: 'payer id',
        paymentID: 'payment id'
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            paymentToken: 'payment id',
            payerId: 'payer id'
          }
        }
      });
    });

    it('passes along unvettedMerchant param as true', function () {
      this.configuration.gatewayConfiguration.paypal.unvettedMerchant = true;

      this.paypalCheckout.tokenizePayment({
        payerID: 'payer id',
        paymentID: 'payment id'
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            unilateral: true
          }
        }
      });
    });

    it('passes along unvettedMerchant param as false', function () {
      this.configuration.gatewayConfiguration.paypal.unvettedMerchant = false;

      this.paypalCheckout.tokenizePayment({
        payerID: 'payer id',
        paymentID: 'payment id'
      });

      expect(this.client.request).to.be.calledOnce;
      expect(this.client.request).to.be.calledWithMatch({
        data: {
          paypalAccount: {
            unilateral: false
          }
        }
      });
    });

    it('does not send along billing token if no token is provided', function () {
      var arg;

      this.paypalCheckout.tokenizePayment({});

      arg = this.client.request.args[0][0];

      expect(arg.data.paypalAccount).to.not.have.property('billingAgreementToken');
    });

    it('sends a tokenization failure event when request fails', function () {
      var client = this.client;

      client.request.rejects(new Error('Error'));

      return this.paypalCheckout.tokenizePayment({}).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal-checkout.tokenization.failed');
      });
    });
  });

  describe('teardown', function () {
    it('returns a promise', function () {
      var promise = this.paypalCheckout.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = this.paypalCheckout;

      instance.teardown(function () {
        methods(PayPalCheckout.prototype).forEach(function (method) {
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
