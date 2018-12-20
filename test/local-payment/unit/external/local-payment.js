'use strict';

var frameService = require('../../../../src/lib/frame-service/external');
var VERSION = require('../../../../package.json').version;
var LocalPayment = require('../../../../src/local-payment/external/local-payment');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var BraintreeError = require('../../../../src/lib/braintree-error');
var Promise = require('../../../../src/lib/promise');
var querystring = require('../../../../src/lib/querystring');
var rejectIfResolves = require('../../../helpers/promise-helper').rejectIfResolves;

describe('LocalPayment', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');

    this.configuration = {
      gatewayConfiguration: {
        assetsUrl: 'https://example.com:9292',
        paypal: {
          unvettedMerchant: 'unvetted-merchant'
        }
      },
      authorizationType: 'CLIENT_TOKEN'
    };
    this.client = {
      request: this.sandbox.stub().resolves(),
      getConfiguration: function () { return self.configuration; }
    };
  });

  afterEach(function () {
    delete global.popupBridge;
  });

  describe('Constructor', function () {
    it('sets a loadingFrameUrl', function () {
      var localPayment = new LocalPayment({client: this.client});

      expect(localPayment._loadingFrameUrl).to.equal(localPayment._assetsUrl + '/html/local-payment-landing-frame.min.html');
    });

    it('sets a loadingFrameUrl in debug mode', function () {
      var localPayment;

      this.configuration.isDebug = true;
      localPayment = new LocalPayment({client: this.client});

      expect(localPayment._loadingFrameUrl).to.equal(localPayment._assetsUrl + '/html/local-payment-landing-frame.html');
    });

    it('set up authorization state', function () {
      var localPayment = new LocalPayment({client: this.client});

      expect(localPayment._authorizationInProgress).to.equal(false);
    });
  });

  describe('_initialize', function () {
    it('instantiates FrameService', function () {
      var context = {
        _assetsUrl: 'foo/bar',
        _loadingFrameUrl: 'fake-loading-frame-url'
      };

      this.sandbox.stub(frameService, 'create');

      LocalPayment.prototype._initialize.call(context);

      expect(frameService.create).to.be.calledWith({
        name: this.sandbox.match.string,
        dispatchFrameUrl: context._assetsUrl + '/html/dispatch-frame.min.html',
        openFrameUrl: context._loadingFrameUrl
      }, this.sandbox.match.func);
    });

    it('instantiates FrameService with unminified assets in debug mode', function () {
      var context = {
        _assetsUrl: 'foo/bar',
        _isDebug: true
      };

      this.sandbox.stub(frameService, 'create');

      LocalPayment.prototype._initialize.call(context);

      expect(frameService.create).to.be.calledWith({
        name: this.sandbox.match.string,
        dispatchFrameUrl: context._assetsUrl + '/html/dispatch-frame.html',
        openFrameUrl: context._loadingFrameUrl
      }, this.sandbox.match.func);
    });

    it('assigns _frameService property on instance', function () {
      var localPayment;
      var options = {client: this.client};
      var frameServiceInstance = {foo: 'bar'};

      this.sandbox.stub(frameService, 'create').yields(frameServiceInstance);

      localPayment = new LocalPayment(options);

      localPayment._initialize();

      expect(localPayment._frameService).to.equal(frameServiceInstance);
    });

    it('resolves with local payment instance', function () {
      var localPayment;
      var frameServiceInstance = {foo: 'bar'};

      this.sandbox.stub(frameService, 'create').yields(frameServiceInstance);

      localPayment = new LocalPayment({client: this.client});

      return localPayment._initialize().then(function (res) {
        expect(res).to.equal(localPayment);
      });
    });

    it('calls analytics with timed-out when failing to initialize', function () {
      var localPayment;
      var clock = this.sandbox.useFakeTimers();

      this.sandbox.stub(frameService, 'create');

      localPayment = new LocalPayment({client: this.client});
      localPayment._initialize();
      clock.tick(59999);
      expect(analytics.sendEvent).not.to.be.calledWith(this.client, 'local-payment.load.timed-out');
      clock.tick(1);
      expect(analytics.sendEvent).to.be.calledWith(this.client, 'local-payment.load.timed-out');
    });
  });

  describe('startPayment', function () {
    beforeEach(function () {
      this.localPayment = new LocalPayment({
        client: this.client,
        merchantAccountId: 'merchant-account-id'
      });
      this.frameServiceInstance = {
        _serviceId: 'service-id',
        close: this.sandbox.stub(),
        open: this.sandbox.stub().yieldsAsync(null, {
          token: 'token',
          paymentId: 'payment-id',
          PayerID: 'PayerId'
        }),
        redirect: this.sandbox.stub()
      };

      this.options = {
        onPaymentStart: function (data, start) {
          start();
        },
        paymentType: 'ideal',
        amount: '10.00',
        fallback: {
          url: 'https://example.com/fallback',
          buttonText: 'Button Text'
        },
        shippingAddressRequired: true,
        currencyCode: 'USD',
        givenName: 'First',
        surname: 'Last',
        email: 'email@example.com',
        phone: '1234',
        address: {
          streetAddress: '123 Address',
          extendedAddress: 'Unit 1',
          locality: 'Chicago',
          region: 'IL',
          postalCode: '60654',
          countryCode: 'US'
        }
      };

      this.client.request.resolves({
        paymentResource: {
          redirectUrl: 'https://example.com/redirect-url',
          paymentToken: 'payment-token'
        }
      });
      this.sandbox.stub(this.localPayment, 'tokenize').resolves({
        nonce: 'a-nonce',
        type: 'PayPalAccount',
        details: {
          payerInfo: 'payer-info',
          correlationId: 'correlation-id'
        }
      });

      this.sandbox.stub(frameService, 'create').yields(this.frameServiceInstance);

      return this.localPayment._initialize();
    });

    ['onPaymentStart', 'paymentType', 'amount', 'fallback'].forEach(function (requiredParam) {
      it('errors when no ' + requiredParam + ' param is provided', function () {
        delete this.options[requiredParam];

        return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
          expect(err.code).to.equal('LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION');
        });
      });
    });

    it('errors when no fallback.url param is provided', function () {
      delete this.options.fallback.url;

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION');
      });
    });

    it('errors when no fallback.buttonText param is provided', function () {
      delete this.options.fallback.buttonText;

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION');
      });
    });

    it('errors when authorization is already in progress', function () {
      this.localPayment._authorizationInProgress = true;

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('LOCAL_PAYMENT_ALREADY_IN_PROGRESS');
      });
    });

    it('creates a payment resource', function () {
      var client = this.client;

      return this.localPayment.startPayment(this.options).then(function () {
        expect(client.request).to.be.calledWith({
          method: 'post',
          endpoint: 'paypal_hermes/create_payment_resource',
          data: {
            cancelUrl: 'https://example.com:9292/web/' + VERSION + '/html/local-payment-cancel-frame.min.html?channel=service-id',
            returnUrl: 'https://example.com:9292/web/' + VERSION + '/html/local-payment-redirect-frame.min.html?channel=service-id&r=https%3A%2F%2Fexample.com%2Ffallback&t=Button%20Text',
            fundingSource: 'ideal',
            amount: '10.00',
            intent: 'sale',
            experienceProfile: {
              noShipping: false
            },
            currencyIsoCode: 'USD',
            firstName: 'First',
            lastName: 'Last',
            payerEmail: 'email@example.com',
            phone: '1234',
            line1: '123 Address',
            line2: 'Unit 1',
            city: 'Chicago',
            state: 'IL',
            postalCode: '60654',
            countryCode: 'US',
            merchantAccountId: 'merchant-account-id'
          }
        });
      });
    });

    it('redirects frame to payment resouce redirect url', function () {
      var fs = this.frameServiceInstance;

      return this.localPayment.startPayment(this.options).then(function () {
        expect(fs.redirect).to.be.calledWith('https://example.com/redirect-url');
      });
    });

    it('errors when payment resource call fails', function () {
      var requestError = {
        message: 'Failed',
        details: {
          httpStatus: 400
        }
      };

      this.frameServiceInstance.open.reset();
      this.client.request.reset();
      this.client.request.withArgs(this.sandbox.match({endpoint: 'paypal_hermes/create_payment_resource'})).rejects(requestError);

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('LOCAL_PAYMENT_START_PAYMENT_FAILED');
        expect(err.details.originalError.message).to.equal('Failed');
      });
    });

    it('errors with validation error when create payment resource fails with 422', function () {
      var requestError = {
        message: 'Failed',
        details: {
          httpStatus: 422
        }
      };

      this.frameServiceInstance.open.reset();
      this.client.request.rejects(requestError);

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('LOCAL_PAYMENT_INVALID_PAYMENT_OPTION');
        expect(err.details.originalError.message).to.equal('Failed');
      });
    });

    it('cleans up state when payment resource request fails', function () {
      var requestError = {
        message: 'Failed',
        details: {
          httpStatus: 400
        }
      };

      this.frameServiceInstance.open.reset();
      this.client.request.rejects(requestError);

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function () {
        expect(this.frameServiceInstance.close).to.be.calledOnce;
        expect(this.localPayment._authorizationInProgress).to.equal(false);
      }.bind(this));
    });

    it('errors when frame service is closed', function () {
      var frameError = {
        code: 'FRAME_SERVICE_FRAME_CLOSED'
      };

      this.frameServiceInstance.open.yieldsAsync(frameError);

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(this.localPayment._authorizationInProgress).to.equal(false);
        expect(err.code).to.equal('LOCAL_PAYMENT_WINDOW_CLOSED');
      }.bind(this));
    });

    it('errors when frame service fails to open', function () {
      var frameError = {
        code: 'FRAME_SERVICE_FRAME_OPEN_FAILED_ABC'
      };

      this.frameServiceInstance.open.yieldsAsync(frameError);

      return this.localPayment.startPayment(this.options).then(rejectIfResolves).catch(function (err) {
        expect(this.localPayment._authorizationInProgress).to.equal(false);
        expect(err.code).to.equal('LOCAL_PAYMENT_WINDOW_OPEN_FAILED');
      }.bind(this));
    });

    it('tokenizes when frame service give params back', function () {
      this.frameServiceInstance.open.yieldsAsync(null, {
        foo: 'bar'
      });

      return this.localPayment.startPayment(this.options).then(function (result) {
        expect(this.localPayment._authorizationInProgress).to.equal(false);
        expect(this.localPayment.tokenize).to.be.calledWith({
          foo: 'bar'
        });
        expect(result).to.deep.equal({
          nonce: 'a-nonce',
          type: 'PayPalAccount',
          details: {
            payerInfo: 'payer-info',
            correlationId: 'correlation-id'
          }
        });
      }.bind(this));
    });
  });

  describe('tokenize', function () {
    beforeEach(function () {
      this.client.request.resolves({
        paypalAccounts: [{
          nonce: 'a-nonce',
          type: 'PayPalAccount',
          details: {
            payerInfo: 'payer-info',
            correlationId: 'correlation-id'
          }
        }]
      });

      this.options = {
        btLpToken: 'token',
        btLpPaymentId: 'payment-token',
        btLpPayerId: 'payer-id'
      };
      this.localPayment = new LocalPayment({
        client: this.client,
        merchantAccountId: 'merchant-account-id'
      });
      this.localPayment._paymentType = 'ideal';
    });

    it('tokenizes paypal account', function () {
      return this.localPayment.tokenize(this.options).then(function (payload) {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post',
          data: {
            merchantAccountId: 'merchant-account-id',
            paypalAccount: {
              correlationId: 'token',
              paymentToken: 'payment-token',
              payerId: 'payer-id',
              unilateral: 'unvetted-merchant',
              intent: 'sale'
            }
          }
        });

        expect(payload.nonce).to.equal('a-nonce');
      }.bind(this));
    });

    it('can use alternative param names', function () {
      var options = {
        token: 'token',
        paymentId: 'payment-token',
        PayerID: 'payer-id'
      };

      return this.localPayment.tokenize(options).then(function (payload) {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post',
          data: {
            merchantAccountId: 'merchant-account-id',
            paypalAccount: {
              correlationId: 'token',
              paymentToken: 'payment-token',
              payerId: 'payer-id',
              unilateral: 'unvetted-merchant',
              intent: 'sale'
            }
          }
        });

        expect(payload.nonce).to.equal('a-nonce');
      }.bind(this));
    });

    it('prefers more specific param names', function () {
      this.options.token = 'other-token';
      this.options.paymentId = 'other-payment-token';
      this.options.PayerId = 'other-payer-id';

      return this.localPayment.tokenize(this.options).then(function (payload) {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post',
          data: {
            merchantAccountId: 'merchant-account-id',
            paypalAccount: {
              correlationId: 'token',
              paymentToken: 'payment-token',
              payerId: 'payer-id',
              unilateral: 'unvetted-merchant',
              intent: 'sale'
            }
          }
        });

        expect(payload.nonce).to.equal('a-nonce');
      }.bind(this));
    });

    it('uses query params when no params are sent in', function () {
      this.sandbox.stub(querystring, 'parse').returns({
        btLpToken: 'token',
        btLpPaymentId: 'payment-token',
        btLpPayerId: 'payer-id'
      });

      return this.localPayment.tokenize().then(function (payload) {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post',
          data: {
            merchantAccountId: 'merchant-account-id',
            paypalAccount: {
              correlationId: 'token',
              paymentToken: 'payment-token',
              payerId: 'payer-id',
              unilateral: 'unvetted-merchant',
              intent: 'sale'
            }
          }
        });

        expect(payload.nonce).to.equal('a-nonce');
      }.bind(this));
    });

    it('rejects when tokenization fails', function () {
      var error = new Error('failed');

      this.client.request.rejects(error);

      return this.localPayment.tokenize(this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('LOCAL_PAYMENT_TOKENIZATION_FAILED');
        expect(err.details.originalError.message).to.equal('failed');
      });
    });

    it('sends analytics event for successful tokenizations', function () {
      return this.localPayment.tokenize(this.options).then(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'ideal.local-payment.tokenization.success');
      }.bind(this));
    });

    it('sends analytics event for successful tokenizations with popupbridge', function () {
      global.popupBridge = {};

      return this.localPayment.tokenize(this.options).then(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'ideal.local-payment.tokenization.success-popupbridge');

        delete global.popupBridge;
      }.bind(this));
    });

    it('sends analytics event for failed tokenizations', function () {
      this.client.request.rejects(new Error('failed'));

      return this.localPayment.tokenize(this.options).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'ideal.local-payment.tokenization.failed');
      }.bind(this));
    });
  });

  describe('hasTokenizationParams', function () {
    beforeEach(function () {
      this.sandbox.stub(querystring, 'parse');
      this.localPayment = new LocalPayment({client: this.client});
    });

    it('returns true if all necessary toeknization params are provided', function () {
      querystring.parse.returns({
        btLpToken: 'token',
        btLpPaymentId: 'payment-id',
        btLpPayerId: 'payer-id'
      });

      expect(this.localPayment.hasTokenizationParams()).to.equal(true);
    });

    it('returns false if no query params', function () {
      querystring.parse.returns({});

      expect(this.localPayment.hasTokenizationParams()).to.equal(false);
    });

    ['Token', 'PaymentId', 'PayerId'].forEach(function (param) {
      it('returns false if btLp' + param + ' is missing', function () {
        var params = {
          btLpToken: 'token',
          btLpPaymentId: 'payment-id',
          btLpPayerId: 'payer-id'
        };

        delete params['btLp' + param];

        querystring.parse.returns(params);

        expect(this.localPayment.hasTokenizationParams()).to.equal(false);
      });
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      var frameServiceInstance = {teardown: this.sandbox.stub()};

      this.localPayment = new LocalPayment({client: this.client});
      this.frameServiceInstance = frameServiceInstance;

      this.sandbox.stub(frameService, 'create').yields(frameServiceInstance);
    });

    it('tearsdown the frame service', function (done) {
      var localPayment = this.localPayment;
      var frameServiceInstance = this.frameServiceInstance;

      localPayment._initialize().then(function () {
        localPayment.teardown(function () {
          expect(frameServiceInstance.teardown).to.be.called;
          done();
        });
      });
    });

    it('calls teardown analytic', function (done) {
      var localPayment = this.localPayment;

      localPayment._initialize().then(function () {
        localPayment.teardown(function () {
          expect(analytics.sendEvent).to.be.calledWith(localPayment._client, 'local-payment.teardown-completed');
          done();
        });
      });
    });

    it('returns a promise if no callback is provided', function (done) {
      var localPayment = this.localPayment;

      localPayment._initialize().then(function () {
        var promise = localPayment.teardown();

        expect(promise).to.be.an.instanceof(Promise);
        done();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var localPayment = this.localPayment;

      localPayment._initialize().then(function () {
        localPayment.teardown(function () {
          methods(LocalPayment.prototype).forEach(function (method) {
            var error;

            try {
              localPayment[method]();
            } catch (err) {
              error = err;
            }

            expect(error).to.be.an.instanceof(BraintreeError);
            expect(error.type).to.equal(BraintreeError.types.MERCHANT);
            expect(error.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
            expect(error.message).to.equal(method + ' cannot be called after teardown.');
          });

          done();
        });
      });
    });
  });
});
