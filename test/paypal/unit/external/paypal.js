'use strict';

var frameService = require('../../../../src/lib/frame-service/external');
var frameServiceErrors = require('../../../../src/lib/frame-service/shared/errors');
var VERSION = require('../../../../package.json').version;
var PayPal = require('../../../../src/paypal/external/paypal');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var BraintreeError = require('../../../../src/lib/braintree-error');
var rejectIfResolves = require('../../../helpers/promise-helper').rejectIfResolves;
var Promise = require('../../../../src/lib/promise');

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
      request: this.sandbox.stub().resolves(),
      getConfiguration: function () { return self.configuration; }
    };
  });

  afterEach(function () {
    delete global.popupBridge;
  });

  describe('Constructor', function () {
    it('has an assetsUrl', function () {
      var pp = new PayPal({client: this.client});

      expect(pp._assetsUrl).to.equal(this.configuration.gatewayConfiguration.paypal.assetsUrl + '/web/' + VERSION);
    });

    it('sets a loadingFrameUrl', function () {
      var pp = new PayPal({client: this.client});

      expect(pp._loadingFrameUrl).to.equal(pp._assetsUrl + '/html/paypal-landing-frame.min.html');
    });

    it('sets a loadingFrameUrl in debug mode', function () {
      var pp;

      this.configuration.isDebug = true;
      pp = new PayPal({client: this.client});

      expect(pp._loadingFrameUrl).to.equal(pp._assetsUrl + '/html/paypal-landing-frame.html');
    });

    it('set up authorization state', function () {
      var pp = new PayPal({client: this.client});

      expect(pp._authorizationInProgress).to.equal(false);
    });
  });

  describe('_initialize', function () {
    it('instantiates FrameService', function () {
      var context = {
        _assetsUrl: 'foo/bar',
        _loadingFrameUrl: 'fake-loading-frame-url'
      };

      this.sandbox.stub(frameService, 'create');

      PayPal.prototype._initialize.call(context);

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

      PayPal.prototype._initialize.call(context);

      expect(frameService.create).to.be.calledWith({
        name: this.sandbox.match.string,
        dispatchFrameUrl: context._assetsUrl + '/html/dispatch-frame.html',
        openFrameUrl: context._loadingFrameUrl
      }, this.sandbox.match.func);
    });

    it('assigns _frameService property on instance', function () {
      var pp;
      var options = {client: this.client};
      var frameServiceInstance = {foo: 'bar'};

      this.sandbox.stub(frameService, 'create').yields(frameServiceInstance);

      pp = new PayPal(options);

      pp._initialize();

      expect(pp._frameService).to.equal(frameServiceInstance);
    });

    it('resolves with paypal instance', function () {
      var pp;
      var frameServiceInstance = {foo: 'bar'};

      this.sandbox.stub(frameService, 'create').yields(frameServiceInstance);

      pp = new PayPal({client: this.client});
      return pp._initialize().then(function (res) {
        expect(res).to.equal(pp);
      });
    });

    it('calls analytics with timed-out when failing to initialize', function () {
      var pp;
      var clock = this.sandbox.useFakeTimers();

      this.sandbox.stub(frameService, 'create');

      pp = new PayPal({client: this.client});
      pp._initialize();
      clock.tick(59999);
      expect(analytics.sendEvent).not.to.be.calledWith(this.client, 'paypal.load.timed-out');
      clock.tick(1);
      expect(analytics.sendEvent).to.be.calledWith(this.client, 'paypal.load.timed-out');
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

    it('sets offerPaypalCredit to false if offerCredit is unspecified with vault flow', function () {
      var actual;

      this.options.flow = 'vault';
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

    it('sets offerPaypalCredit to true if offerCredit is true with vault flow', function () {
      var actual;

      this.options.flow = 'vault';
      this.options.offerCredit = true;
      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.offerPaypalCredit).to.equal(true);
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

    it('adds landing page type to the experience profile when it is present in options', function () {
      var actual;

      this.options.landingPageType = 'foobar';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.experienceProfile.landingPageType).to.equal('foobar');
    });

    it('does not add landing page type to the experience profile when it is not present in options', function () {
      var actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: this.client,
        _frameService: this.frameService
      }, this.options);

      expect(actual.experienceProfile.landingPageType).to.not.exist;
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

    describe('PopupBridge exists', function () {
      beforeEach(function () {
        global.popupBridge = {
          getReturnUrlPrefix: function () {
            return 'testscheme://';
          }
        };
      });

      it('returns PopupBridge return and cancel urls', function () {
        var actual = PayPal.prototype._formatPaymentResourceData.call({
          _client: this.client,
          _frameService: this.frameService
        }, this.options);

        expect(actual.returnUrl).to.equal('testscheme://return');
        expect(actual.cancelUrl).to.equal('testscheme://cancel');
      });
    });
  });

  describe('_navigateFrameToAuth', function () {
    beforeEach(function () {
      this.options = {
        flow: 'checkout'
      };
      this.context = {
        _client: {request: this.sandbox.stub().resolves({
          paymentResource: {redirectUrl: 'url'},
          agreementSetup: {approvalUrl: 'url'}
        })},
        _formatPaymentResourceData: function () {
          return {};
        },
        _frameService: {
          redirect: this.sandbox.stub(),
          close: this.sandbox.stub()
        }
      };
    });

    it('makes an api request for a paypal payment resource', function () {
      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(this.context._client.request).to.be.calledWith({
          endpoint: 'paypal_hermes/create_payment_resource',
          method: 'post',
          data: this.sandbox.match.object
        });
      }.bind(this));
    });

    it('makes an api request for a billing agreement', function () {
      this.options.flow = 'vault';

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(this.context._client.request).to.be.calledWith({
          endpoint: 'paypal_hermes/setup_billing_agreement',
          method: 'post',
          data: this.sandbox.match.object
        });
      }.bind(this));
    });

    it('reports a provided request error', function () {
      var fakeError = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });

      this.context._client.request.rejects(fakeError);

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(rejectIfResolves).catch(function (err) {
        expect(err).to.equal(fakeError);
      });
    });

    it('closes frame if there was an error', function () {
      var fakeError = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });

      this.context._client.request.rejects(fakeError);

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(rejectIfResolves).catch(function () {
        expect(this.context._frameService.close).to.be.called;
      }.bind(this));
    });

    it('reports a merchant BraintreeError on gateway 422 errors', function () {
      var gateway422Error = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: 'CLIENT_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        details: {httpStatus: 422}
      });

      this.context._client.request.rejects(gateway422Error);

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.type).to.equal(BraintreeError.types.MERCHANT);
        expect(err.code).to.equal('PAYPAL_INVALID_PAYMENT_OPTION');
        expect(err.message).to.equal('PayPal payment options are invalid.');
        expect(err.details.originalError).to.equal(gateway422Error);
      });
    });

    it('reports an internally constructed BraintreeError', function () {
      var fakeError = {foo: 'bar'};

      this.context._client.request.rejects(fakeError);

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(rejectIfResolves).catch(function (err) {
        expect(err.type).to.equal(BraintreeError.types.NETWORK);
        expect(err.code).to.equal('PAYPAL_FLOW_FAILED');
        expect(err.message).to.equal('Could not initialize PayPal flow.');
        expect(err.details.originalError).to.equal(fakeError);
      });
    });

    it('redirects to a redirectUrl', function () {
      this.context._client.request.resolves({
        paymentResource: {redirectUrl: 'redirect-url'}
      });

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(this.context._frameService.redirect).to.be.calledWith('redirect-url');
      }.bind(this));
    });

    it('calls analytics with opened popupBridge event', function () {
      this.context._client.request.resolves({
        paymentResource: {}
      });
      global.popupBridge = {};

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.opened-popupbridge');
      }.bind(this));
    });

    it('resets authorizationInProgress when an error occurs', function () {
      this.context._client.request.rejects({fakeError: 'foo'});

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(rejectIfResolves).catch(function () {
        expect(this.context._authorizationInProgress).to.be.false;
      }.bind(this));
    });

    it('redirects to an approvalUrl', function () {
      this.context._client.request.resolves({
        agreementSetup: {approvalUrl: 'approval-url'}
      });

      this.options.flow = 'vault';
      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(this.context._frameService.redirect).to.be.calledWith('approval-url');
      }.bind(this));
    });

    it('appends useraction to an approvalUrl', function () {
      this.context._client.request.resolves({
        agreementSetup: {approvalUrl: 'approval-url'}
      });

      this.options.flow = 'vault';
      this.options.useraction = 'commit';

      return PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(this.context._frameService.redirect).to.be.calledWith('approval-url?useraction=commit');
      }.bind(this));
    });

    it('appends useraction to a redirectUrl', function () {
      this.context._client.request.resolves({
        paymentResource: {redirectUrl: 'redirect-url'}
      });

      this.options.useraction = 'commit';
      PayPal.prototype._navigateFrameToAuth.call(this.context, this.options).then(function () {
        expect(this.context._frameService.redirect).to.be.calledWith('redirect-url?useraction=commit');
      }.bind(this));
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      var frameServiceInstance = {teardown: this.sandbox.stub()};

      this.pp = new PayPal({client: this.client});
      this.frameServiceInstance = frameServiceInstance;

      this.sandbox.stub(frameService, 'create').yields(frameServiceInstance);
    });

    it('tearsdown the frame service', function (done) {
      var pp = this.pp;
      var frameServiceInstance = this.frameServiceInstance;

      pp._initialize().then(function () {
        pp.teardown(function () {
          expect(frameServiceInstance.teardown).to.be.called;
          done();
        });
      });
    });

    it('calls teardown analytic', function (done) {
      var pp = this.pp;

      pp._initialize().then(function () {
        pp.teardown(function () {
          expect(analytics.sendEvent).to.be.calledWith(pp._client, 'paypal.teardown-completed');
          done();
        });
      });
    });

    it('returns a promise if no callback is provided', function (done) {
      var pp = this.pp;

      pp._initialize().then(function () {
        var promise = pp.teardown();

        expect(promise).to.be.an.instanceof(Promise);
        done();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var pp = this.pp;

      pp._initialize().then(function () {
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

  describe('closeWindow', function () {
    it('calls frameService close', function () {
      var closeStub = this.sandbox.stub();

      PayPal.prototype.closeWindow.call({
        _client: {},
        _frameService: {
          close: closeStub
        }
      });

      expect(closeStub).to.be.calledOnce;
    });

    it('calls analytic if auth is in progress', function () {
      var client = {};

      PayPal.prototype.closeWindow.call({
        _authorizationInProgress: true,
        _client: client,
        _frameService: {
          close: noop
        }
      });

      expect(analytics.sendEvent).to.be.calledOnce;
      expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.tokenize.closed.by-merchant');
    });

    it('does not call analytic if auth is in progress', function () {
      var client = {};

      PayPal.prototype.closeWindow.call({
        _authorizationInProgress: false,
        _client: client,
        _frameService: {
          close: noop
        }
      });

      expect(analytics.sendEvent).to.not.be.called;
    });
  });

  describe('focusWindow', function () {
    it('calls frameService focus', function () {
      var focusStub = this.sandbox.stub();

      PayPal.prototype.focusWindow.call({
        _client: {},
        _frameService: {
          focus: focusStub
        }
      });

      expect(focusStub).to.be.calledOnce;
    });
  });

  describe('tokenize', function () {
    beforeEach(function () {
      this.context = {
        _client: this.client,
        _authorizationInProgress: false,
        _navigateFrameToAuth: this.sandbox.stub().resolves(),
        _createFrameServiceCallback: function (options, callback) {
          return function () { callback(); };
        },
        _frameService: {
          open: this.sandbox.stub(),
          createHandler: this.sandbox.stub(),
          createNoopHandler: this.sandbox.stub()
        }
      };
      this.tokenizeOptions = {flow: 'vault'};
    });

    it('calls the errback with an err if authorization is in progress', function (done) {
      this.context._authorizationInProgress = true;

      PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, function (err, data) {
        expect(data).not.to.exist;
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('PAYPAL_TOKENIZATION_REQUEST_ACTIVE');
        expect(err.message).to.equal('Another tokenization request is active.');

        done();
      });
    });

    it('calls errback with error if no options are provided', function (done) {
      PayPal.prototype.tokenize.call(this.context, {}, function (err, payload) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
        expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        expect(payload).to.not.exist;
        done();
      });
    });

    it('returns a frame service noop handler no options are provided', function () {
      var fakehandler = {close: 'foo', focus: 'bar'};
      var handler;

      this.context._frameService.createNoopHandler.returns(fakehandler);

      handler = PayPal.prototype.tokenize.call(this.context, {}, noop);

      expect(handler).to.equal(fakehandler);
    });

    it('calls errback with error if an invalid flow option is provided', function (done) {
      PayPal.prototype.tokenize.call(this.context, {flow: 'garbage'}, function (err, payload) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('PAYPAL_FLOW_OPTION_REQUIRED');
        expect(err.message).to.equal('PayPal flow property is invalid or missing.');
        expect(payload).to.not.exist;
        done();
      });
    });

    it('returns a frame service noop handler if an invalid flow option is provided', function () {
      var fakehandler = {close: 'foo', focus: 'bar'};
      var handler;

      this.context._frameService.createNoopHandler.returns(fakehandler);

      handler = PayPal.prototype.tokenize.call(this.context, {flow: 'garbage'}, noop);

      expect(handler).to.equal(fakehandler);
    });

    it('flips authorization progress state', function () {
      PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

      expect(this.context._authorizationInProgress).to.equal(true);
    });

    it('instructs frame service to open', function () {
      PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions);

      expect(this.context._frameService.open).to.be.calledOnce;
      expect(this.context._frameService.open).to.be.calledWith(this.sandbox.match.func);
    });

    it('returns a frame service handler', function () {
      PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

      expect(this.context._frameService.createHandler).to.be.calledOnce;
      expect(this.context._frameService.createHandler).to.be.calledWith({
        beforeClose: this.sandbox.match.func
      });
    });

    it('calls _navigateFrameToAuth', function () {
      PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

      expect(this.context._navigateFrameToAuth).to.be.calledWith(this.tokenizeOptions);
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
            close: noop,
            createHandler: this.sandbox.stub()
          }
        };
      });

      it('calls analytics when the frame is already opened', function () {
        var client = this.client;

        this.context._authorizationInProgress = true;
        PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.tokenization.error.already-opened');
      });

      it('calls analytics when the frame is opened', function () {
        var client = this.client;

        PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.tokenization.opened');
      });

      it('calls analytics when credit is offered and using checkout flow', function () {
        var client = this.client;

        this.tokenizeOptions.flow = 'checkout';
        this.tokenizeOptions.offerCredit = true;
        PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.credit.offered');
      });

      it('calls analytics when credit is offered and using vault flow', function () {
        var client = this.client;

        this.tokenizeOptions.flow = 'vault';
        this.tokenizeOptions.offerCredit = true;
        PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.credit.offered');
      });

      it('does not send credit.offered event when credit is not offered', function () {
        var client = this.client;

        this.tokenizeOptions.flow = 'checkout';
        PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

        expect(analytics.sendEvent).to.not.be.calledWith(client, 'paypal.credit.offered');
      });

      it('calls analytics when the frame is closed by merchant', function () {
        var client = this.client;
        var result;

        this.context._frameService.createHandler.returns({
          close: function () {
            this.context._frameService.createHandler
              .getCall(0)
              .args[0]
              .beforeClose();
          }.bind(this)
        });

        result = PayPal.prototype.tokenize.call(this.context, this.tokenizeOptions, noop);

        result.close();

        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.tokenization.closed.by-merchant');
      });

      it('calls analytics when tokenization result has creditFinancingOffered', function () {
        var fakeResponse = {
          creditFinancingOffered: {}
        };

        this.context._formatTokenizeData = noop;
        this.context._formatTokenizePayload = function () {
          return fakeResponse;
        };
        this.context._client.request.resolves();
        this.context._frameService.redirect = noop;

        return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.credit.accepted');
        }.bind(this));
      });

      it('does not send analytics when tokenization result does not have creditFinancingOffered', function () {
        var fakeResponse = {};

        this.context._formatTokenizeData = noop;
        this.context._formatTokenizePayload = function () {
          return fakeResponse;
        };
        this.context._client.request.resolves();
        this.context._frameService.redirect = noop;

        return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function () {
          expect(analytics.sendEvent).not.to.be.calledWith(this.context._client, 'paypal.credit.accepted');
        }.bind(this));
      });
    });
  });

  describe('_createFrameServiceCallback', function () {
    beforeEach(function () {
      this.resolve = this.sandbox.stub();
      this.reject = this.sandbox.stub();
      this.context = {
        _client: {request: this.sandbox.stub().resolves()},
        _authorizationInProgress: true,
        _tokenizePayPal: this.sandbox.stub().resolves()
      };
    });

    it('resets authorization progress state in open callback', function () {
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

      wrapped(null, {});

      expect(this.context._authorizationInProgress).to.equal(false);
    });

    it('calls analytics when the frame is closed by user', function () {
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

      wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

      expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.closed.by-user');
    });

    it('calls the callback with error when frame is closed', function () {
      var err;
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

      wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

      err = this.reject.getCall(0).args[0];

      expect(this.resolve).to.not.be.called;
      expect(this.reject).to.be.calledOnce;
      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.type).to.equal('CUSTOMER');
      expect(err.code).to.equal('PAYPAL_POPUP_CLOSED');
      expect(err.message).to.equal('Customer closed PayPal popup before authorizing.');
      expect(err.details).not.to.exist;
    });

    it('calls the callback with error when frame fails to open', function () {
      var err;
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

      wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_OPEN_FAILED);

      err = this.reject.getCall(0).args[0];

      expect(this.resolve).to.not.be.called;
      expect(this.reject).to.be.calledOnce;
      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('PAYPAL_POPUP_OPEN_FAILED');
      expect(err.message).to.equal('PayPal popup failed to open, make sure to tokenize in response to a user action.');
      expect(err.details).not.to.exist;
    });

    it('calls _tokenizePayPal when successful', function () {
      var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

      wrapped(null, {
        foo: 'bar'
      });

      expect(this.context._tokenizePayPal).to.be.calledWith({}, {
        foo: 'bar'
      });
    });

    describe('using popupBridge', function () {
      beforeEach(function () {
        global.popupBridge = {};
      });

      it('calls analytics when the popupBridge is closed by user', function () {
        var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

        wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.closed-popupbridge.by-user');
      });

      it('calls analytics when popupBridge payload.path starts with /cancel', function () {
        var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

        wrapped(null, {path: '/cancel/foo'});

        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.closed-popupbridge.by-user');
      });

      it('calls _tokenizePayPal with payload.queryItems', function () {
        var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

        wrapped(null, {
          path: '/success/foo',
          queryItems: {
            foo: 'bar'
          }
        });

        expect(this.context._tokenizePayPal).to.be.calledWith({}, {
          foo: 'bar'
        });
      });

      it('calls the callback with error when the user clicks Done', function () {
        var err;
        var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

        wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

        err = this.reject.getCall(0).args[0];

        expect(this.resolve).to.not.be.called;
        expect(this.reject).to.be.calledOnce;
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('PAYPAL_POPUP_CLOSED');
        expect(err.message).to.equal('Customer closed PayPal popup before authorizing.');
        expect(err.details).not.to.exist;
      });

      it('calls the callback with error when the redirect url has a path starting with /cancel', function () {
        var err;
        var wrapped = PayPal.prototype._createFrameServiceCallback.call(this.context, {}, this.resolve, this.reject);

        wrapped(null, {
          path: '/cancel/foo',
          queryItems: {
            foo: 'bar'
          }
        });

        err = this.reject.getCall(0).args[0];

        expect(this.resolve).to.not.be.called;
        expect(this.reject).to.be.calledOnce;
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('PAYPAL_POPUP_CLOSED');
        expect(err.message).to.equal('Customer closed PayPal popup before authorizing.');
        expect(err.details).not.to.exist;
      });
    });
  });

  describe('_tokenizePayPal', function () {
    beforeEach(function () {
      this.client = {request: this.sandbox.stub().resolves()};
      this.requestPayload = {};
      this.responsePayload = {};
      this.context = {
        _client: this.client,
        _formatTokenizeData: function () { return this.requestPayload; }.bind(this),
        _formatTokenizePayload: function () { return this.responsePayload; }.bind(this),
        _frameService: {
          close: this.sandbox.stub(),
          redirect: this.sandbox.stub()
        },
        _loadingFrameUrl: 'fake-loading-frame-url'
      };
    });

    it('redirects the frame service to the loading frame URL', function () {
      PayPal.prototype._tokenizePayPal.call(this.context, {}, {});

      expect(this.context._frameService.redirect).to.be.calledWith('fake-loading-frame-url');
    });

    it('closes the popup after tokenization success', function () {
      this.context._client.request({});

      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function () {
        expect(this.context._frameService.close).to.be.called;
      }.bind(this));
    });

    it('closes the popup after tokenization failure', function () {
      var fakeError = {};

      this.context._client.request.rejects(fakeError);

      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(rejectIfResolves).catch(function () {
        expect(this.context._frameService.close).to.be.called;
      }.bind(this));
    });

    it('calls request with the proper data', function () {
      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function () {
        expect(this.context._client.request).to.be.calledWith({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post',
          data: this.responsePayload
        });
      }.bind(this));
    });

    it('calls analytics with failure if there was a problem', function () {
      var fakeError = {};

      this.context._client.request.rejects(fakeError);
      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.failed');
      }.bind(this));
    });

    it('calls analytics with popupBridge failure if there was a problem', function () {
      var fakeError = {};

      global.popupBridge = {};

      this.context._client.request.rejects(fakeError);
      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.failed-popupbridge');
      }.bind(this));
    });

    it('rejects with Braintree error if there was a problem', function () {
      var fakeError = {};

      this.context._client.request.rejects(fakeError);

      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.NETWORK);
        expect(err.code).to.equal('PAYPAL_ACCOUNT_TOKENIZATION_FAILED');
        expect(err.message).to.equal('Could not tokenize user\'s PayPal account.');
        expect(err.details.originalError).to.equal(fakeError);
      });
    });

    it('calls analytics with success if no error', function () {
      var fakeResponse = {};

      this.context._formatTokenizePayload = function () {
        return fakeResponse;
      };
      this.context._client.request.resolves();

      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.success');
      }.bind(this));
    });

    it('calls popupBridge analytics with success if no error', function () {
      var fakeResponse = {};

      global.popupBridge = {};
      this.context._formatTokenizePayload = function () {
        return fakeResponse;
      };
      this.context._client.request.resolves();

      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.context._client, 'paypal.tokenization.success-popupbridge');
      }.bind(this));
    });

    it('calls callback with payload if no error', function () {
      var fakeResponse = {};

      this.context._formatTokenizePayload = function () {
        return fakeResponse;
      };
      this.context._client.request.resolves();

      return PayPal.prototype._tokenizePayPal.call(this.context, {}, {}).then(function (res) {
        expect(res).to.equal(fakeResponse);
      });
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

    it('attaches creditFinancingOffered', function () {
      var stubCreditFinancingOffered = {
        totalCost: {
          value: '250.0',
          currency: 'USD'
        },
        other: 'terms'
      };

      var actual = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {
            creditFinancingOffered: stubCreditFinancingOffered
          }
        }]
      });

      expect(actual.creditFinancingOffered).to.equal(stubCreditFinancingOffered);
    });

    it("doesn't attach creditFinancingOffered if not present", function () {
      var actual = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {}
        }]
      });

      expect(actual).not.to.have.property('creditFinancingOffered');
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
        paymentId: 'paymentId'
      });

      expect(actual.paypalAccount.intent).to.equal('sale');
    });

    it('if ba_token not present, passes proper data for tokenization', function () {
      var actual;

      this.config.gatewayConfiguration.paypal.unvettedMerchant = 'unilateral';
      actual = PayPal.prototype._formatTokenizeData.call(this.context, {}, {
        PayerID: 'PayerID',
        paymentId: 'paymentId',
        token: 'EC-83T8551496489354'
      });

      expect(actual.paypalAccount.correlationId).to.equal('EC-83T8551496489354');
      expect(actual.paypalAccount.paymentToken).to.equal('paymentId');
      expect(actual.paypalAccount.payerId).to.equal('PayerID');
      expect(actual.paypalAccount.unilateral).to.equal('unilateral');
    });

    it('if vault flow, ignores intent', function () {
      var actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        intent: 'sale'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount).to.not.have.property('intent');
    });

    it('defaults validate option to false', function () {
      var actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        intent: 'sale'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.options.validate).to.be.false;
    });

    it('sets validate to true when using the vault flow and a client token', function () {
      var actual;

      this.config.authorizationType = 'CLIENT_TOKEN';

      actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        flow: 'vault'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.options.validate).to.be.true;
    });

    it('sets validate to false when using the vault flow and a tokenization key', function () {
      var actual;

      this.config.authorizationType = 'TOKENIZATION_KEY';

      actual = PayPal.prototype._formatTokenizeData.call(this.context, {
        flow: 'vault'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.options.validate).to.be.false;
    });

    it('if ba_token present, passes proper data for tokenization', function () {
      var actual = PayPal.prototype._formatTokenizeData.call(this.context, {}, {
        token: 'EC-83T8551496489354',
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.correlationId).to.equal('ba_token');
      expect(actual.paypalAccount.billingAgreementToken).to.equal('ba_token');
    });
  });
});
