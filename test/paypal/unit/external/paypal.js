'use strict';

var frameService = require('../../../../src/lib/frame-service/external');
var frameServiceErrors = require('../../../../src/lib/frame-service/shared/errors');
var VERSION = require('../../../../package.json').version;
var PayPal = require('../../../../src/paypal/external/paypal');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var BraintreeError = require('../../../../src/lib/error');

function noop() {}

describe('PayPal', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');

    this.configuration = {
      gatewayConfiguration: {
        paypal: {assetsUrl: 'https://example.com:9292'}
      },
      authorizationType: 'CLIENT_TOKEN'
    };
    this.client = {
      request: this.sandbox.stub(),
      getConfiguration: function () { return self.configuration; }
    };
  });

  describe('Constructor', function () {
    it('has an assetsUrl', function () {
      var pp = new PayPal({client: this.client});

      expect(pp._assetsUrl).to.equal(this.configuration.gatewayConfiguration.paypal.assetsUrl + '/web/' + VERSION);
    });

    it('setup up authorization state', function () {
      var pp = new PayPal({client: this.client});

      expect(pp._authorizationInProgress).to.equal(false);
    });
  });

  describe('_initialize', function () {
    it('instantiates FrameService', function () {
      var context = {
        _assetsUrl: 'foo/bar'
      };
      var callback = this.sandbox.stub();

      this.sandbox.stub(frameService, 'create');

      PayPal.prototype._initialize.call(context, callback);

      expect(frameService.create).to.have.been.calledWith({
        name: sinon.match.string,
        dispatchFrameUrl: context._assetsUrl + '/html/dispatch-frame@DOT_MIN.html',
        openFrameUrl: context._assetsUrl + '/html/paypal-landing-frame@DOT_MIN.html'
      }, sinon.match.func);
    });

    it('assigns _frameService property on instance', function () {
      var pp;
      var options = {client: this.client};
      var frameServiceInstance = {foo: 'bar'};

      this.sandbox.stub(frameService, 'create', function (opts, callback) {
        callback(frameServiceInstance);
      });

      pp = new PayPal(options);

      pp._initialize(noop);

      expect(pp._frameService).to.equal(frameServiceInstance);
    });

    it('invokes provided callback', function () {
      var pp;
      var callback = this.sandbox.stub();
      var frameServiceInstance = {foo: 'bar'};

      this.sandbox.stub(frameService, 'create', function (opts, cb) {
        cb(frameServiceInstance);
      });

      pp = new PayPal({client: this.client});
      pp._initialize(callback);

      expect(callback).to.have.been.called;
    });

    it('calls analytics with timed-out when failing to initialize', function () {
      var pp;
      var callback = this.sandbox.stub();
      var clock = this.sandbox.useFakeTimers();

      this.sandbox.stub(frameService, 'create');

      pp = new PayPal({client: this.client});
      pp._initialize(callback);
      clock.tick(59999);
      expect(analytics.sendEvent).not.to.have.been.calledWith(this.client, 'web.paypal.load.timed-out');
      clock.tick(1);
      expect(analytics.sendEvent).to.have.been.calledWith(this.client, 'web.paypal.load.timed-out');
    });
  });

  describe('_formatPaymentResourceData', function () {
    beforeEach(function () {
      this.frameService = {_serviceId: 'serviceId'};
      this.options = {
        enableShippingAddress: true,
        amount: 10.00,
        currency: 'USD',
        locale: 'en_us',
        flow: 'checkout',
        shippingAddressOverride: {
          street: '123 Townsend St'
        }
      };
      this.client = {
        getConfiguration: function () {
          return {
            authorization: 'development_testing_altpay_merchant',
            gatewayConfiguration: {
              paypal: {
                assetsUrl: 'https://paypal.assets.url',
                displayName: 'my brand'
              }
            }
          };
        }
      };
    });

    it('allows override of displayName', function () {
      var actual;

      this.options.displayName = 'Bob\'s Burgers';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.experienceProfile.brandName).to.equal("Bob's Burgers");
    });

    it('assigns provided intent for one-time checkout', function () {
      var actual;

      this.options.intent = 'sale';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.intent).to.equal('sale');
    });

    it('does not assign intent for one-time checkout if not provided', function () {
      var actual;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual).not.to.have.property('sale');
    });

    it('assigns shipping address for one-time checkout', function () {
      var actual;

      this.options.shippingAddressOverride = {
        line1: 'line1',
        line2: 'line2',
        city: 'city',
        state: 'state',
        countryCode: 'countryCode',
        postalCode: 'postal'
      };

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.line1).to.exist;
      expect(actual.line2).to.exist;
      expect(actual.city).to.exist;
      expect(actual.state).to.exist;
      expect(actual.countryCode).to.exist;
      expect(actual.postalCode).to.exist;
    });

    it('assigns shipping address for billing agreements', function () {
      var actual;

      this.options.flow = 'vault';
      this.options.shippingAddressOverride = {
        line1: 'line1',
        line2: 'line2',
        city: 'city',
        state: 'state',
        countryCode: 'countryCode',
        postalCode: 'postal'
      };

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.shippingAddress.line1).to.exist;
      expect(actual.shippingAddress.line2).to.exist;
      expect(actual.shippingAddress.city).to.exist;
      expect(actual.shippingAddress.state).to.exist;
      expect(actual.shippingAddress.countryCode).to.exist;
      expect(actual.shippingAddress.postalCode).to.exist;
    });

    it('sets offerPaypalCredit to false if offerCredit is unspecified with checkout flow', function () {
      var actual;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.offerPaypalCredit).to.equal(false);
    });

    it('sets offerPaypalCredit to false if offerCredit is not a boolean true', function () {
      var actual;

      this.options.offerCredit = 'true';
      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.offerPaypalCredit).to.equal(false);
    });

    it('sets offerPaypalCredit to true if offerCredit is true with checkout flow', function () {
      var actual;

      this.options.offerCredit = true;
      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.offerPaypalCredit).to.equal(true);
    });

    it('does not set offerPaypalCredit for vault flow', function () {
      var actual;

      this.options.offerCredit = true;
      this.options.flow = 'vault';
      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual).not.to.include.keys('offerPaypalCredit');
    });

    it('sets addressOverride to true if shippingAddressEditable is false', function () {
      var actual;

      this.options.shippingAddressOverride = {
        line1: 'line1',
        line2: 'line2',
        city: 'city',
        state: 'state',
        countryCode: 'countryCode',
        postalCode: 'postal'
      };
      this.options.shippingAddressEditable = false;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.experienceProfile.addressOverride).to.equal(true);
    });

    it('sets addressOverride to false if shippingAddressEditable is true', function () {
      var actual;

      this.options.shippingAddressOverride = {
        line1: 'line1',
        line2: 'line2',
        city: 'city',
        state: 'state',
        countryCode: 'countryCode',
        postalCode: 'postal'
      };
      this.options.shippingAddressEditable = true;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.experienceProfile.addressOverride).to.equal(false);
    });

    it('assigns billing agreement description for billing agreements', function () {
      var actual;

      this.options.flow = 'vault';
      this.options.billingAgreementDescription = 'Fancy Schmancy Description';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.description).to.equal('Fancy Schmancy Description');
    });

    it('does not assign billing agreement description for one-time checkout', function () {
      var actual;

      this.options.flow = 'checkout';
      this.options.billingAgreementDescription = 'Fancy Schmancy Description';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.description).to.not.exist;
    });
  });

  describe('_navigateFrameToAuth', function () {
    beforeEach(function () {
      this.options = {
        flow: 'checkout'
      };
      this.context = {
        _client: {request: this.sandbox.stub()},
        _formatPaymentResourceData: function () {
          return {};
        },
        _frameService: {
          redirect: this.sandbox.stub(),
          close: this.sandbox.stub()
        }
      };
    });

    it('calls the callback with error if no flow is provided', function (done) {
      PayPal.prototype._navigateFrameToAuth.call(this.context, {}, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.MERCHANT);
        expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
        expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        done();
      });
    });

    it('calls the callback with error if invalid flow is provided', function (done) {
      PayPal.prototype._navigateFrameToAuth.call(this.context, {flow: 'garbage'}, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.MERCHANT);
        expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
        expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        done();
      });
    });

    it('makes an api request for a paypal payment resource', function () {
      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, function () {});

      expect(this.context._client.request).to.have.been.calledWith({
        endpoint: 'paypal_hermes/create_payment_resource',
        method: 'post',
        data: sinon.match.object
      }, sinon.match.func);
    });

    it('makes an api request for a billing agreement', function () {
      this.options.flow = 'vault';
      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, function () {});

      expect(this.context._client.request).to.have.been.calledWith({
        endpoint: 'paypal_hermes/setup_billing_agreement',
        method: 'post',
        data: sinon.match.object
      }, sinon.match.func);
    });

    it('reports a provided request error', function () {
      var callbackSpy = this.sandbox.stub();
      var fakeError = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });

      this.context._client.request = function (config, callback) {
        callback(fakeError);
      };

      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, callbackSpy);

      expect(callbackSpy).to.have.been.calledWith(fakeError);
    });

    it('closes frame if there was an error', function () {
      var callbackSpy = this.sandbox.stub();
      var fakeError = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });

      this.context._client.request = function (config, callback) {
        callback(fakeError);
      };

      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, callbackSpy);

      expect(this.context._frameService.close).to.have.been.called;
    });

    it('reports a merchant BraintreeError on gateway 422 errors', function () {
      var callbackSpy = this.sandbox.stub();
      var gateway422Error = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: 'CLIENT_REQUEST_ERROR',
        message: 'There was a problem with your request.'
      });

      this.context._client.request = function (config, callback) {
        callback(gateway422Error, null, 422);
      };

      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, callbackSpy);

      expect(callbackSpy).to.have.been.calledWith(sinon.match({
        type: BraintreeError.types.MERCHANT,
        code: 'PAYPAL_INVALID_PAYMENT_OPTION',
        message: 'PayPal payment options are invalid.',
        details: {
          originalError: gateway422Error
        }
      }));
    });

    it('reports an internally constructed BraintreeError', function () {
      var callbackSpy = this.sandbox.stub();
      var fakeError = {foo: 'bar'};

      this.context._client.request = function (config, callback) {
        callback(fakeError);
      };

      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, callbackSpy);

      expect(callbackSpy).to.have.been.calledWith(sinon.match({
        type: BraintreeError.types.NETWORK,
        code: 'PAYPAL_FLOW_FAILED',
        message: 'Could not initialize PayPal flow.',
        details: {
          originalError: fakeError
        }
      }));
    });

    it('redirects to a redirectUrl', function () {
      this.context._client.request = function (config, callback) {
        callback(null, {
          paymentResource: {redirectUrl: 'redirect-url'}
        });
      };

      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, function () {});

      expect(this.context._frameService.redirect).to.have.been.calledWith('redirect-url');
    });

    it('redirects to an approvalUrl', function () {
      this.context._client.request = function (config, callback) {
        callback(null, {
          agreementSetup: {approvalUrl: 'approval-url'}
        });
      };

      this.options.flow = 'vault';
      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, function () {});

      expect(this.context._frameService.redirect).to.have.been.calledWith('approval-url');
    });

    it('appends useraction to an approvalUrl', function () {
      this.context._client.request = function (config, callback) {
        callback(null, {
          agreementSetup: {approvalUrl: 'approval-url'}
        });
      };

      this.options.flow = 'vault';
      this.options.useraction = 'commit';
      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, function () {});

      expect(this.context._frameService.redirect).to.have.been.calledWith('approval-url?useraction=commit');
    });

    it('appends useraction to a redirectUrl', function () {
      this.context._client.request = function (config, callback) {
        callback(null, {
          paymentResource: {redirectUrl: 'redirect-url'}
        });
      };

      this.options.useraction = 'commit';
      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options, function () {});

      expect(this.context._frameService.redirect).to.have.been.calledWith('redirect-url?useraction=commit');
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      var frameServiceInstance = {teardown: this.sandbox.stub()};

      this.pp = new PayPal({client: this.client});
      this.frameServiceInstance = frameServiceInstance;

      this.sandbox.stub(frameService, 'create', function (opts, callback) {
        callback(frameServiceInstance);
      });
    });

    it('tearsdown the frame service', function (done) {
      var pp = this.pp;
      var frameServiceInstance = this.frameServiceInstance;

      pp._initialize(function () {
        pp.teardown(function () {
          expect(frameServiceInstance.teardown).to.have.been.called;
          done();
        });
      });
    });

    it('calls teardown analytic', function (done) {
      var pp = this.pp;

      pp._initialize(function () {
        pp.teardown(function () {
          expect(analytics.sendEvent).to.have.been.calledWith(pp._client, 'web.paypal.teardown-completed');
          done();
        });
      });
    });

    it('does not require a callback', function (done) {
      var pp = this.pp;

      pp._initialize(function () {
        expect(function () {
          pp.teardown();
        }).to.not.throw();
        done();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var pp = this.pp;

      pp._initialize(function () {
        pp.teardown(function () {
          methods(PayPal.prototype).forEach(function (method) {
            try {
              pp[method]();
            } catch (err) {
              expect(err).to.be.an.instanceof(BraintreeError);
              expect(err.type).to.equal(BraintreeError.types.MERCHANT);
              expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
              expect(err.message).to.equal(method + ' cannot be called after teardown.');
            }
          });

          done();
        });
      });
    });
  });

  describe('tokenize', function () {
    beforeEach(function () {
      this.context = {
        _client: this.client,
        _authorizationInProgress: false,
        _navigateFrameToAuth: this.sandbox.stub(),
        _createFrameServiceCallback: function (options, callback) {
          return function () { callback(); };
        },
        _frameService: {
          open: this.sandbox.stub(),
          close: this.sandbox.stub()
        }
      };
    });

    it('calls the errback with an err if authorization is in progress', function (done) {
      this.context._authorizationInProgress = true;

      PayPal.prototype.tokenize.call(this.context, {}, function (err, data) {
        expect(data).not.to.exist;
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('PAYPAL_TOKENIZATION_REQUEST_ACTIVE');
        expect(err.message).to.equal('Another tokenization request is active.');

        done();
      });
    });

    it('requires an errback', function () {
      var err;

      try {
        PayPal.prototype.tokenize.call(this.context, {});
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('CALLBACK_REQUIRED');
      expect(err.message).to.equal('tokenize must include a callback function.');
    });

    it('flips authorization progress state', function () {
      PayPal.prototype.tokenize.call(this.context, {}, noop);

      expect(this.context._authorizationInProgress).to.equal(true);
    });

    it('instructs frame service to open', function () {
      PayPal.prototype.tokenize.call(this.context, {}, noop);

      expect(this.context._frameService.open).to.have.been.calledWith(sinon.match.func);
    });

    it('returns a close method', function () {
      var result = PayPal.prototype.tokenize.call(this.context, {}, noop);

      expect(result.close).to.be.a('function');
    });

    it('instructs frame service to close', function () {
      var result = PayPal.prototype.tokenize.call(this.context, {}, noop);

      result.close();

      expect(this.context._frameService.close).to.have.been.called;
    });

    it('calls _navigateFrameToAuth', function () {
      var options = {foo: 'boo'};

      PayPal.prototype.tokenize.call(this.context, options, noop);

      expect(this.context._navigateFrameToAuth).to.have.been.calledWith(options);
    });

    describe('analytics', function () {
      beforeEach(function () {
        this.context = {
          _client: this.client,
          _navigateFrameToAuth: this.sandbox.stub(),
          _createFrameServiceCallback: function (options, callback) {
            return function () { callback(); };
          },
          _authorizationInProgress: false,
          _frameService: {
            open: noop,
            close: noop
          }
        };
      });

      it('calls analytics when the frame is already opened', function () {
        var client = this.client;

        this.context._authorizationInProgress = true;
        PayPal.prototype.tokenize.call(this.context, {}, noop);

        expect(analytics.sendEvent).to.be.calledWith(client, 'web.paypal.tokenization.error.already-opened');
      });

      it('calls analytics when the frame is opened', function () {
        var client = this.client;

        PayPal.prototype.tokenize.call(this.context, {}, noop);

        expect(analytics.sendEvent).to.be.calledWith(client, 'web.paypal.tokenization.opened');
      });

      it('calls analytics when the frame is closed by merchant', function () {
        var client = this.client;
        var result = PayPal.prototype.tokenize.call(this.context, {}, noop);

        result.close();

        expect(analytics.sendEvent).to.be.calledWith(client, 'web.paypal.tokenization.closed.by-merchant');
      });
    });
  });

  describe('_createFrameServiceCallback', function () {
    beforeEach(function () {
      this.callback = this.sandbox.stub();
      this.context = {
        _client: {request: this.sandbox.stub()},
        _authorizationInProgress: true,
        _tokenizePayPal: this.sandbox.stub()
      };
    });

    it('resets authorization progress state in open callback', function () {
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.callback);

      wrapped(null, {});

      expect(this.context._authorizationInProgress).to.equal(false);
    });

    it('calls analytics when the frame is closed by user', function () {
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.callback);

      wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

      expect(analytics.sendEvent).to.be.called; // With(this.context._client, 'web.paypal.tokenization.closed.by-user');
    });

    it('calls the callback with an error', function () {
      var err;
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.callback);

      wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

      err = this.callback.getCall(0).args[0];

      expect(this.callback).to.be.calledOnce;
      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.type).to.equal('CUSTOMER');
      expect(err.code).to.equal('PAYPAL_POPUP_CLOSED');
      expect(err.message).to.equal('Customer closed PayPal popup before authorizing.');
      expect(err.details).not.to.exist;
    });
  });

  describe('_tokenizePayPal', function () {
    beforeEach(function () {
      this.client = {request: this.sandbox.stub()};
      this.requestPayload = {};
      this.responsePayload = {};
      this.context = {
        _client: this.client,
        _formatTokenizeData: function () { return this.requestPayload; }.bind(this),
        _formatTokenizePayload: function () { return this.responsePayload; }.bind(this)
      };
    });

    it('calls request with the proper data', function () {
      PayPal.prototype._tokenizePayPal.call(this.context, {}, {}, function () {});

      expect(this.context._client.request).to.have.been.calledWith({
        endpoint: 'payment_methods/paypal_accounts',
        method: 'post',
        data: this.responsePayload
      });
    });

    it('calls analytics with failure if there was a problem', function () {
      var fakeError = {};
      var callbackSpy = this.sandbox.stub();

      this.context._client.request = function (stuff, callback) {
        callback(fakeError);
      };
      PayPal.prototype._tokenizePayPal.call(this.context, {}, {}, callbackSpy);

      expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'web.paypal.tokenization.failed');
    });

    it('calls callback with Braintree error if there was a problem', function (done) {
      var fakeError = {};

      this.context._client.request = function (stuff, callback) {
        callback(fakeError);
      };

      PayPal.prototype._tokenizePayPal.call(this.context, {}, {}, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.NETWORK);
        expect(err.code).to.equal('PAYPAL_ACCOUNT_TOKENIZATION_FAILED');
        expect(err.message).to.equal('Could not tokenize user\'s PayPal account.');
        expect(err.details.originalError).to.equal(fakeError);
        done();
      });
    });

    it('calls callback with payload if no error', function () {
      var fakeResponse = {};
      var callbackSpy = this.sandbox.stub();

      this.context._formatTokenizePayload = function () {
        return fakeResponse;
      };
      this.context._client.request = function (stuff, callback) {
        callback(null);
      };
      PayPal.prototype._tokenizePayPal.call(this.context, {}, {}, callbackSpy);

      expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'web.paypal.tokenization.success');
    });

    it('calls callback with payload if no error', function () {
      var fakeResponse = {};
      var callbackSpy = this.sandbox.stub();

      this.context._formatTokenizePayload = function () {
        return fakeResponse;
      };
      this.context._client.request = function (stuff, callback) {
        callback(null);
      };
      PayPal.prototype._tokenizePayPal.call(this.context, {}, {}, callbackSpy);

      expect(callbackSpy).to.have.been.calledWith(null, fakeResponse);
    });
  });

  describe('_formatTokenizePayload', function () {
    it('returns nonce and type', function () {
      var actual = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPalAccount'
        }]
      });

      expect(actual.nonce).to.equal('nonce');
      expect(actual.type).to.equal('PayPalAccount');
    });

    it('returns payerInfo as details', function () {
      var payerInfo = {
        some: 'info'
      };
      var actual = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {payerInfo: payerInfo}
        }]
      });

      expect(actual.details).to.equal(payerInfo);
    });

    it('returns {} if no payerInfo', function () {
      var actual = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {}
        }]
      });

      expect(actual.details).to.be.empty;

      actual = PayPal.prototype._formatTokenizePayload({});

      expect(actual.details).to.be.empty;
    });
  });

  describe('_formatTokenizeData', function () {
    beforeEach(function () {
      this.config = {gatewayConfiguration: {paypal: {}}};
      this.context = {
        _frameService: {_serviceId: 'serviceId'},
        _client: {
          getConfiguration: function () {
            return this.config;
          }.bind(this)
        }
      };
    });

    it('if checkout flow, passes intent for tokenization', function () {
      var actual;

      this.config.gatewayConfiguration.paypal.unvettedMerchant = 'unilateral';
      actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        intent: 'sale'
      }, {
        PayerID: 'PayerID',
        paymentId: 'paymentId',
        correlationId: self.id
      });

      expect(actual.paypalAccount.intent).to.equal('sale');
    });

    it('if ba_token not preset, passes proper data for tokenization', function () {
      var actual;

      this.config.gatewayConfiguration.paypal.unvettedMerchant = 'unilateral';
      actual = PayPal.prototype._formatTokenizeData.call(this.context, {}, {
        PayerID: 'PayerID',
        paymentId: 'paymentId',
        correlationId: self.id
      });

      expect(actual.paypalAccount.correlationId).to.equal(this.context._frameService._serviceId);
      expect(actual.paypalAccount.paymentToken).to.equal('paymentId');
      expect(actual.paypalAccount.payerId).to.equal('PayerID');
      expect(actual.paypalAccount.unilateral).to.equal('unilateral');
    });

    it('if vault flow, ignores intent', function () {
      var actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        intent: 'sale'
      }, {
        ba_token: 'ba_token' // eslint-disable-line
      });

      expect(actual.paypalAccount).to.not.have.property('intent');
    });

    it('defaults validate option to false', function () {
      var actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        intent: 'sale'
      }, {
        ba_token: 'ba_token' // eslint-disable-line
      });

      expect(actual.paypalAccount.options.validate).to.be.false;
    });

    it('sets validate to true when using the vault flow and a client token', function () {
      var actual;

      this.config.authorizationType = 'CLIENT_TOKEN';

      actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        flow: 'vault'
      }, {
        ba_token: 'ba_token' // eslint-disable-line
      });

      expect(actual.paypalAccount.options.validate).to.be.true;
    });

    it('sets validate to false when using the vault flow and a tokenization key', function () {
      var actual;

      this.config.authorizationType = 'TOKENIZATION_KEY';

      actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        flow: 'vault'
      }, {
        ba_token: 'ba_token' // eslint-disable-line
      });

      expect(actual.paypalAccount.options.validate).to.be.false;
    });

    it('if ba_token present, passes proper data for tokenization', function () {
      var actual = PayPal.prototype._formatTokenizeData.call(this.context, {}, {
        ba_token: 'ba_token' // eslint-disable-line
      });

      expect(actual.paypalAccount.correlationId).to.equal(this.context._frameService._serviceId);
      expect(actual.paypalAccount.billingAgreementToken).to.equal('ba_token');
    });
  });
});
