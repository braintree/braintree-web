'use strict';

jest.mock('../../../../src/lib/frame-service/shared/errors');

const analytics = require('../../../../src/lib/analytics');
const frameService = require('../../../../src/lib/frame-service/external');
const frameServiceErrors = require('../../../../src/lib/frame-service/shared/errors');
const { version: VERSION } = require('../../../../package.json');
const PayPal = require('../../../../src/paypal/external/paypal');
const methods = require('../../../../src/lib/methods');
const BraintreeError = require('../../../../src/lib/braintree-error');
const { noop, yields } = require('../../../helpers');

describe('PayPal', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = {
      gatewayConfiguration: {
        paypal: { assetsUrl: 'https://example.com:9292' }
      },
      authorizationType: 'CLIENT_TOKEN'
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
      getConfiguration: () => testContext.configuration
    };
  });

  afterEach(() => {
    delete window.popupBridge;
  });

  describe('Constructor', () => {
    it('has an assetsUrl', () => {
      const pp = new PayPal({ client: testContext.client });

      expect(pp._assetsUrl).toBe(
        `${testContext.configuration.gatewayConfiguration.paypal.assetsUrl}/web/${VERSION}`
      );
    });

    it('sets a loadingFrameUrl', () => {
      const pp = new PayPal({ client: testContext.client });

      expect(pp._loadingFrameUrl).toBe(`${pp._assetsUrl}/html/paypal-landing-frame.min.html`);
    });

    it('sets a loadingFrameUrl in debug mode', () => {
      let pp;

      testContext.configuration.isDebug = true;
      pp = new PayPal({ client: testContext.client });

      expect(pp._loadingFrameUrl).toBe(`${pp._assetsUrl}/html/paypal-landing-frame.html`);
    });

    it('set up authorization state', () => {
      const pp = new PayPal({ client: testContext.client });

      expect(pp._authorizationInProgress).toBe(false);
    });
  });

  describe('_initialize', () => {
    it('instantiates FrameService', () => {
      const context = {
        _assetsUrl: 'foo/bar',
        _loadingFrameUrl: 'fake-loading-frame-url'
      };

      PayPal.prototype._initialize.call(context);

      expect(frameService.create).toHaveBeenCalledWith({
        name: expect.any(String),
        dispatchFrameUrl: `${context._assetsUrl}/html/dispatch-frame.min.html`,
        openFrameUrl: context._loadingFrameUrl
      }, expect.any(Function));
    });

    it('instantiates FrameService with unminified assets in debug mode', () => {
      const context = {
        _assetsUrl: 'foo/bar',
        _isDebug: true
      };

      PayPal.prototype._initialize.call(context);

      expect(frameService.create).toHaveBeenCalledWith({
        name: expect.any(String),
        dispatchFrameUrl: `${context._assetsUrl}/html/dispatch-frame.html`,
        openFrameUrl: context._loadingFrameUrl
      }, expect.any(Function));
    });

    it('assigns _frameService property on instance', () => {
      let pp;
      const options = { client: testContext.client };
      const frameServiceInstance = { foo: 'bar' };

      jest.spyOn(frameService, 'create').mockImplementation(yields(frameServiceInstance));

      pp = new PayPal(options);

      pp._initialize();

      expect(pp._frameService).toBe(frameServiceInstance);
    });

    it('resolves with paypal instance', () => {
      let pp;
      const frameServiceInstance = { foo: 'bar' };

      jest.spyOn(frameService, 'create').mockImplementation(yields(frameServiceInstance));

      pp = new PayPal({ client: testContext.client });

      return pp._initialize().then(res => {
        expect(res).toBe(pp);
      });
    });

    it('calls analytics with timed-out when failing to initialize', () => {
      let pp;

      frameService.create.mockReturnValue(false);

      jest.useFakeTimers();

      pp = new PayPal({ client: testContext.client });
      pp._initialize();
      jest.advanceTimersByTime(59999);
      expect(analytics.sendEvent).not.toHaveBeenCalledWith(testContext.client, 'paypal.load.timed-out');
      jest.advanceTimersByTime(1);
      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'paypal.load.timed-out');
    });
  });

  describe('_formatPaymentResourceData', () => {
    beforeEach(() => {
      testContext.frameService = { _serviceId: 'serviceId' };
      testContext.options = {
        enableShippingAddress: true,
        amount: 10.00,
        currency: 'USD',
        locale: 'en_us',
        flow: 'checkout',
        shippingAddressOverride: {
          street: '123 Townsend St'
        }
      };
      testContext.client = {
        getConfiguration: () => ({
          authorization: 'development_testing_altpay_merchant',
          gatewayConfiguration: {
            paypal: {
              assetsUrl: 'https://paypal.assets.url',
              displayName: 'my brand'
            }
          }
        })
      };
      testContext.sampleShippingAddress = {
        line1: 'line1',
        line2: 'line2',
        city: 'city',
        state: 'state',
        countryCode: 'countryCode',
        postalCode: 'postal'
      };
    });

    it('allows override of displayName', () => {
      let actual;

      testContext.options.displayName = 'Bob\'s Burgers';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.experienceProfile.brandName).toBe('Bob\'s Burgers');
    });

    it.each(['authorize', 'order', 'sale'])('assigns provided intent %p for one-time checkout', (intent) => {
      let actual;

      testContext.options.intent = intent;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.intent).toBe(intent);
    });

    it('does not assign intent for one-time checkout if not provided', () => {
      let actual;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual).not.toHaveProperty('sale');
    });

    it('assigns shipping address for one-time checkout', () => {
      let actual;

      testContext.options.shippingAddressOverride = testContext.sampleShippingAddress;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.line1).toBeDefined();
      expect(actual.line2).toBeDefined();
      expect(actual.city).toBeDefined();
      expect(actual.state).toBeDefined();
      expect(actual.countryCode).toBeDefined();
      expect(actual.postalCode).toBeDefined();
    });

    it('assigns shipping address for billing agreements', () => {
      let actual;

      testContext.options.flow = 'vault';
      testContext.options.shippingAddressOverride = testContext.sampleShippingAddress;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.shippingAddress.line1).toBeDefined();
      expect(actual.shippingAddress.line2).toBeDefined();
      expect(actual.shippingAddress.city).toBeDefined();
      expect(actual.shippingAddress.state).toBeDefined();
      expect(actual.shippingAddress.countryCode).toBeDefined();
      expect(actual.shippingAddress.postalCode).toBeDefined();
    });

    describe.each(['vault', 'checkout'])('%s flow', (flow) => {
      it.each([
        [false, undefined], // eslint-disable-line no-undefined
        [false, undefined], // eslint-disable-line no-undefined
        [false, 'true'],
        [true, true],
        [true, true]
      ])('sets offerPaypalCredit to %p if offerCredit is %p', (bool, credit) => {
        let actual;

        testContext.options.flow = flow;
        testContext.options.offerCredit = credit;
        actual = PayPal.prototype._formatPaymentResourceData.call({
          _client: testContext.client,
          _frameService: testContext.frameService
        }, testContext.options);

        expect(actual.offerPaypalCredit).toBe(bool);
      });
    });

    it.each([true, false])('sets offerPayLater flag to %s when offerPayLater option is set to %s', (bool) => {
      let actual;

      testContext.options.offerPayLater = bool;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.offerPayLater).toBe(bool);
    });

    it.each([true, false])('sets addressOverride to %s if shippingAddressEditable is the opposite of %s', (override) => {
      let actual;

      testContext.options.shippingAddressOverride = testContext.sampleShippingAddress;
      testContext.options.shippingAddressEditable = override;

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.experienceProfile.addressOverride).toBe(!override);
    });

    it('adds landing page type to the experience profile when it is present in options', () => {
      let actual;

      testContext.options.landingPageType = 'foobar';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.experienceProfile.landingPageType).toBe('foobar');
    });

    it('does not add landing page type to the experience profile when it is not present in options', () => {
      const actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.experienceProfile.landingPageType).toBeFalsy();
    });

    it('assigns billing agreement description for billing agreements', () => {
      let actual;

      testContext.options.flow = 'vault';
      testContext.options.billingAgreementDescription = 'Fancy Schmancy Description';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.description).toBe('Fancy Schmancy Description');
    });

    it('does not assign billing agreement description for one-time checkout', () => {
      let actual;

      testContext.options.flow = 'checkout';
      testContext.options.billingAgreementDescription = 'Fancy Schmancy Description';

      actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.description).toBeFalsy();
    });

    it('returns PopupBridge return and cancel urls', () => {
      window.popupBridge = {
        getReturnUrlPrefix: () => 'testscheme://'
      };
      const actual = PayPal.prototype._formatPaymentResourceData.call({
        _client: testContext.client,
        _frameService: testContext.frameService
      }, testContext.options);

      expect(actual.returnUrl).toBe('testscheme://return');
      expect(actual.cancelUrl).toBe('testscheme://cancel');
    });
  });

  describe('_navigateFrameToAuth', () => {
    beforeEach(() => {
      testContext.options = {
        flow: 'checkout'
      };
      testContext.context = {
        _client: {
          request: jest.fn().mockResolvedValue({
            paymentResource: { redirectUrl: 'url' },
            agreementSetup: { approvalUrl: 'url' }
          })
        },
        _formatPaymentResourceData: () => ({}),
        _frameService: {
          redirect: jest.fn(),
          close: jest.fn()
        }
      };
    });

    it('makes an api request for a paypal payment resource', () =>
      PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(testContext.context._client.request).toHaveBeenCalledWith({
          endpoint: 'paypal_hermes/create_payment_resource',
          method: 'post',
          data: expect.any(Object)
        });
      }));

    it('makes an api request for a billing agreement', () => {
      testContext.options.flow = 'vault';

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(testContext.context._client.request).toHaveBeenCalledWith({
          endpoint: 'paypal_hermes/setup_billing_agreement',
          method: 'post',
          data: expect.any(Object)
        });
      });
    });

    it('reports a provided request error', () => {
      const fakeError = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).catch(err => {
        expect(err).toBe(fakeError);
      });
    });

    it('closes frame if there was an error', () => {
      const fakeError = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).catch(() => {
        expect(testContext.context._frameService.close).toHaveBeenCalled();
      });
    });

    it('reports a merchant BraintreeError on gateway 422 errors', () => {
      const gateway422Error = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: 'CLIENT_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        details: { httpStatus: 422 }
      });

      testContext.context._client.request.mockRejectedValue(gateway422Error);

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options)
        .catch(({ code, details, message, type }) => {
          expect(type).toBe(BraintreeError.types.MERCHANT);
          expect(code).toBe('PAYPAL_INVALID_PAYMENT_OPTION');
          expect(message).toBe('PayPal payment options are invalid.');
          expect(details.originalError).toBe(gateway422Error);
        });
    });

    it('reports an internally constructed BraintreeError', () => {
      const fakeError = { foo: 'bar' };

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options)
        .catch(({ code, details, message, type }) => {
          expect(type).toBe(BraintreeError.types.NETWORK);
          expect(code).toBe('PAYPAL_FLOW_FAILED');
          expect(message).toBe('Could not initialize PayPal flow.');
          expect(details.originalError).toBe(fakeError);
        });
    });

    it('redirects to a redirectUrl', () => {
      testContext.context._client.request.mockResolvedValue({
        paymentResource: { redirectUrl: 'redirect-url' }
      });

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(testContext.context._frameService.redirect).toHaveBeenCalledWith('redirect-url');
      });
    });

    it('calls analytics with opened popupBridge event', () => {
      testContext.context._client.request.mockResolvedValue({
        paymentResource: {}
      });
      window.popupBridge = {};

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, 'paypal.tokenization.opened-popupbridge');
      });
    });

    it('resets authorizationInProgress when an error occurs', () => {
      testContext.context._client.request.mockRejectedValue({ fakeError: 'foo' });

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).catch(() => {
        expect(testContext.context._authorizationInProgress).toBe(false);
      });
    });

    it('redirects to an approvalUrl', () => {
      testContext.context._client.request.mockResolvedValue({
        agreementSetup: { approvalUrl: 'approval-url' }
      });

      testContext.options.flow = 'vault';

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(testContext.context._frameService.redirect).toHaveBeenCalledWith('approval-url');
      });
    });

    it('appends useraction to an approvalUrl', () => {
      testContext.context._client.request.mockResolvedValue({
        agreementSetup: { approvalUrl: 'approval-url' }
      });

      testContext.options.flow = 'vault';
      testContext.options.useraction = 'commit';

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(testContext.context._frameService.redirect).toHaveBeenCalledWith('approval-url?useraction=commit');
      });
    });

    it('appends useraction to a redirectUrl', () => {
      testContext.context._client.request.mockResolvedValue({
        paymentResource: { redirectUrl: 'redirect-url' }
      });

      testContext.options.useraction = 'commit';

      return PayPal.prototype._navigateFrameToAuth.call(testContext.context, testContext.options).then(() => {
        expect(testContext.context._frameService.redirect).toHaveBeenCalledWith('redirect-url?useraction=commit');
      });
    });
  });

  describe('teardown', () => {
    beforeEach(() => {
      const frameServiceInstance = { teardown: jest.fn() };

      testContext.pp = new PayPal({ client: testContext.client });
      testContext.frameServiceInstance = frameServiceInstance;

      jest.spyOn(frameService, 'create').mockImplementation(yields(frameServiceInstance));
    });

    it('tears down the frame service', () => {
      const pp = testContext.pp;
      const frameServiceInstance = testContext.frameServiceInstance;

      return pp._initialize().then(() => {
        pp.teardown().then(() => {
          expect(frameServiceInstance.teardown).toHaveBeenCalled();
        });
      });
    });

    it('calls teardown analytic', () => {
      const pp = testContext.pp;

      return pp._initialize().then(() => {
        pp.teardown().then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(pp._client, 'paypal.teardown-completed');
        });
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', () => {
      const pp = testContext.pp;

      return pp._initialize().then(() => {
        pp.teardown().then(() => {
          methods(PayPal.prototype).forEach(method => {
            let error;

            try {
              pp[method]();
            } catch (err) {
              error = err;
            }

            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe(BraintreeError.types.MERCHANT);
            expect(error.code).toBe('METHOD_CALLED_AFTER_TEARDOWN');
            expect(error.message).toBe(`${method} cannot be called after teardown.`);
          });
        });
      });
    });
  });

  describe('closeWindow', () => {
    it('calls frameService close', () => {
      const closeStub = jest.fn();

      PayPal.prototype.closeWindow.call({
        _client: {},
        _frameService: {
          close: closeStub
        }
      });

      expect(closeStub).toHaveBeenCalledTimes(1);
    });

    it('calls analytic if auth is in progress', () => {
      const client = {};

      PayPal.prototype.closeWindow.call({
        _authorizationInProgress: true,
        _client: client,
        _frameService: {
          close: noop
        }
      });

      expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
      expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.tokenize.closed.by-merchant');
    });

    it('does not call analytic if auth is in progress', () => {
      const client = {};

      PayPal.prototype.closeWindow.call({
        _authorizationInProgress: false,
        _client: client,
        _frameService: {
          close: noop
        }
      });

      expect(analytics.sendEvent).not.toHaveBeenCalled();
    });
  });

  describe('focusWindow', () => {
    it('calls frameService focus', () => {
      const focusStub = jest.fn();

      PayPal.prototype.focusWindow.call({
        _client: {},
        _frameService: {
          focus: focusStub
        }
      });

      expect(focusStub).toHaveBeenCalledTimes(1);
    });
  });

  describe('tokenize', () => {
    beforeEach(() => {
      testContext.context = {
        _client: testContext.client,
        _authorizationInProgress: false,
        _navigateFrameToAuth: jest.fn().mockResolvedValue(null),
        _createFrameServiceCallback: (options, callback) => () => {
          callback();
        },
        _frameService: {
          open: jest.fn(),
          createHandler: jest.fn(),
          createNoopHandler: jest.fn()
        }
      };
      testContext.tokenizeOptions = { flow: 'vault' };
    });

    it('calls the errback with an err if authorization is in progress', () => {
      testContext.context._authorizationInProgress = true;

      return PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('PAYPAL_TOKENIZATION_REQUEST_ACTIVE');
        expect(err.message).toBe('Another tokenization request is active.');
      });
    });

    it.each([
      ['no', {}],
      ['invalid', { flow: 'garbage' }]
    ])('calls errback with error if %s options are provided', (testCase, options) => {
      PayPal.prototype.tokenize.call(testContext.context, options).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('PAYPAL_FLOW_OPTION_REQUIRED');
        expect(err.message).toBe('PayPal flow property is invalid or missing.');
      });
    });

    it.each([
      ['no', {}],
      ['invalid', { flow: 'nonsense' }]
    ])('returns a frame service noop handler if %s options are provided', (s, options) => {
      const fakehandler = { close: 'foo', focus: 'bar' };
      let handler;

      testContext.context._frameService.createNoopHandler.mockReturnValue(fakehandler);

      handler = PayPal.prototype.tokenize.call(testContext.context, options, noop);

      expect(handler).toBe(fakehandler);
    });

    it('flips authorization progress state', () => {
      PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

      expect(testContext.context._authorizationInProgress).toBe(true);
    });

    it('instructs frame service to open', () => {
      PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions);

      expect(testContext.context._frameService.open).toHaveBeenCalledTimes(1);
      expect(testContext.context._frameService.open).toHaveBeenCalledWith({}, expect.any(Function));
    });

    it('returns a frame service handler', () => {
      PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

      expect(testContext.context._frameService.createHandler).toHaveBeenCalledTimes(1);
      expect(testContext.context._frameService.createHandler).toHaveBeenCalledWith({
        beforeClose: expect.any(Function)
      });
    });

    it('calls _navigateFrameToAuth', () => {
      PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

      expect(testContext.context._navigateFrameToAuth).toHaveBeenCalledWith(testContext.tokenizeOptions);
    });

    describe('analytics', () => {
      beforeEach(() => {
        testContext.context = {
          _client: testContext.client,
          _navigateFrameToAuth: jest.fn(),
          _createFrameServiceCallback: (options, callback) => () => {
            callback();
          },
          _authorizationInProgress: false,
          _frameService: {
            open: noop,
            close: noop,
            createHandler: jest.fn()
          }
        };
      });

      it('calls analytics when the frame is already opened', () => {
        const client = testContext.client;

        testContext.context._authorizationInProgress = true;
        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.tokenization.error.already-opened');
      });

      it('calls analytics when the frame is opened', () => {
        const client = testContext.client;

        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.tokenization.opened');
      });

      it('calls analytics when credit is offered and using checkout flow', () => {
        const client = testContext.client;

        testContext.tokenizeOptions.flow = 'checkout';
        testContext.tokenizeOptions.offerCredit = true;
        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.credit.offered');
      });

      it('calls analytics when credit is offered and using vault flow', () => {
        const client = testContext.client;

        testContext.tokenizeOptions.flow = 'vault';
        testContext.tokenizeOptions.offerCredit = true;
        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.credit.offered');
      });

      it('does not send credit.offered event when credit is not offered', () => {
        const client = testContext.client;

        testContext.tokenizeOptions.flow = 'checkout';
        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).not.toHaveBeenCalledWith(client, 'paypal.credit.offered');
      });

      it('calls analytics when offerPayLater is true', () => {
        const client = testContext.client;

        testContext.tokenizeOptions.offerPayLater = true;
        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.paylater.offered');
      });

      it('does not send paylater.offered event when offerPayLater is not true', () => {
        const client = testContext.client;

        PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        expect(analytics.sendEvent).not.toHaveBeenCalledWith(client, 'paypal.paylater.offered');
      });

      it('calls analytics when the frame is closed by merchant', () => {
        const client = testContext.client;
        let result;

        testContext.context._frameService.createHandler.mockReturnValue({
          close: () => {
            testContext.context._frameService.createHandler
              .mock.calls[0][0]
              .beforeClose();
          }
        });

        result = PayPal.prototype.tokenize.call(testContext.context, testContext.tokenizeOptions, noop);

        result.close();

        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'paypal.tokenization.closed.by-merchant');
      });

      it('calls analytics when tokenization result has creditFinancingOffered', () => {
        const fakeResponse = {
          creditFinancingOffered: {}
        };

        testContext.context._formatTokenizeData = noop;
        testContext.context._formatTokenizePayload = () => fakeResponse;
        testContext.context._client.request.mockResolvedValue();
        testContext.context._frameService.redirect = noop;

        return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, 'paypal.credit.accepted');
        });
      });

      it('does not send analytics when tokenization result does not have creditFinancingOffered', () => {
        const fakeResponse = {};

        testContext.context._formatTokenizeData = noop;
        testContext.context._formatTokenizePayload = () => fakeResponse;
        testContext.context._client.request.mockResolvedValue();
        testContext.context._frameService.redirect = noop;

        return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(() => {
          expect(analytics.sendEvent).not.toHaveBeenCalledWith(testContext.context._client, 'paypal.credit.accepted');
        });
      });
    });
  });

  describe('_createFrameServiceCallback', () => {
    beforeEach(() => {
      testContext.resolve = jest.fn();
      testContext.reject = jest.fn();
      testContext.context = {
        _client: { request: jest.fn().mockResolvedValue() },
        _authorizationInProgress: true,
        _tokenizePayPal: jest.fn().mockResolvedValue()
      };
    });

    it('resets authorization progress state in open callback', () => {
      const wrapped = PayPal.prototype._createFrameServiceCallback.call(testContext.context, {}, testContext.resolve, testContext.reject);

      wrapped(null, {});

      expect(testContext.context._authorizationInProgress).toBe(false);
    });

    it.each([
      ['', frameServiceErrors.FRAME_SERVICE_FRAME_OPEN_FAILED],
      ['due to ie bug', frameServiceErrors.FRAME_SERVICE_FRAME_OPEN_FAILED_IE_BUG]
    ])('calls the callback with error when frame fails to open %s', (s, error) => {
      let err;
      const wrapped = PayPal.prototype._createFrameServiceCallback.call(testContext.context, {}, testContext.resolve, testContext.reject);

      wrapped(error);

      err = testContext.reject.mock.calls[0][0];

      expect(testContext.resolve).not.toHaveBeenCalled();
      expect(testContext.reject).toHaveBeenCalledTimes(1);
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe('MERCHANT');
      expect(err.code).toBe('PAYPAL_POPUP_OPEN_FAILED');
      expect(err.message).toBe(
        'PayPal popup failed to open, make sure to tokenize in response to a user action.'
      );
      expect(err.details.originalError.code).toBe(error.code);
    });

    describe.each([
      ['', {}, '-popupbridge'],
      ['not', undefined, ''] // eslint-disable-line no-undefined
    ])('%s using popupBridge', (s, popupBridgeValue, analytic) => {
      beforeEach(() => {
        window.popupBridge = popupBridgeValue;
      });

      it('calls _tokenizePayPal with appropriate options when successful', () => {
        const wrapped = PayPal.prototype._createFrameServiceCallback.call(testContext.context, {}, testContext.resolve, testContext.reject);
        let options = {};

        if (popupBridgeValue) {
          options = {
            path: '/success/foo',
            queryItems: {
              foo: 'bar'
            }
          };
        } else {
          options = {
            foo: 'bar'
          };
        }
        wrapped(null, options);

        expect(testContext.context._tokenizePayPal).toHaveBeenCalledWith({}, { foo: 'bar' });
      });

      it(`calls the callback with error when ${popupBridgeValue ? 'canceled' : 'closed'}`, () => {
        let err, options;
        const wrapped = PayPal.prototype._createFrameServiceCallback.call(testContext.context, {}, testContext.resolve, testContext.reject);

        if (popupBridgeValue) {
          options = [null, {
            path: '/cancel/foo',
            queryItems: {
              foo: 'bar'
            }
          }];
        } else {
          options = [frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED];
        }

        wrapped.apply(null, options);

        err = testContext.reject.mock.calls[0][0];

        expect(testContext.resolve).not.toHaveBeenCalled();
        expect(testContext.reject).toHaveBeenCalledTimes(1);
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('CUSTOMER');
        expect(err.code).toBe('PAYPAL_POPUP_CLOSED');
        expect(err.message).toBe('Customer closed PayPal popup before authorizing.');
        expect(err.details).not.toBeDefined();
      });

      it(`calls analytics when ${popupBridgeValue ? 'canceled' : 'closed'} by user`, () => {
        const wrapped = PayPal.prototype._createFrameServiceCallback.call(testContext.context, {}, testContext.resolve, testContext.reject);

        wrapped(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED);

        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, `paypal.tokenization.closed${analytic}.by-user`);
      });
    });
  });

  describe('_tokenizePayPal', () => {
    beforeEach(() => {
      testContext.client = { request: jest.fn().mockResolvedValue() };
      testContext.requestPayload = {};
      testContext.responsePayload = {};
      testContext.context = {
        _client: testContext.client,
        _formatTokenizeData: () => testContext.requestPayload,
        _formatTokenizePayload: () => testContext.responsePayload,
        _frameService: {
          close: jest.fn(),
          redirect: jest.fn()
        },
        _loadingFrameUrl: 'fake-loading-frame-url'
      };
    });

    it('redirects the frame service to the loading frame URL', () => {
      PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {});

      expect(testContext.context._frameService.redirect).toHaveBeenCalledWith('fake-loading-frame-url');
    });

    it('closes the popup after tokenization success', () => {
      testContext.context._client.request({});

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(() => {
        expect(testContext.context._frameService.close).toHaveBeenCalled();
      });
    });

    it('closes the popup after tokenization failure', () => {
      const fakeError = {};

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).catch(() => {
        expect(testContext.context._frameService.close).toHaveBeenCalled();
      });
    });

    it('calls request with the proper data', () =>
      PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(() => {
        expect(testContext.context._client.request).toHaveBeenCalledWith({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post',
          data: testContext.responsePayload
        });
      }));

    it('calls analytics with failure if there was a problem', () => {
      const fakeError = {};

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).catch(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, 'paypal.tokenization.failed');
      });
    });

    it('calls analytics with popupBridge failure if there was a problem', () => {
      const fakeError = {};

      window.popupBridge = {};

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).catch(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, 'paypal.tokenization.failed-popupbridge');
      });
    });

    it('rejects with Braintree error if there was a problem', () => {
      const fakeError = {};

      testContext.context._client.request.mockRejectedValue(fakeError);

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.NETWORK);
        expect(err.code).toBe('PAYPAL_ACCOUNT_TOKENIZATION_FAILED');
        expect(err.message).toBe('Could not tokenize user\'s PayPal account.');
        expect(err.details.originalError).toBe(fakeError);
      });
    });

    it('calls analytics with success if no error', () => {
      const fakeResponse = {};

      testContext.context._formatTokenizePayload = () => fakeResponse;
      testContext.context._client.request.mockResolvedValue();

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, 'paypal.tokenization.success');
      });
    });

    it('calls popupBridge analytics with success if no error', () => {
      const fakeResponse = {};

      window.popupBridge = {};
      testContext.context._formatTokenizePayload = () => fakeResponse;
      testContext.context._client.request.mockResolvedValue();

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.context._client, 'paypal.tokenization.success-popupbridge');
      });
    });

    it('calls callback with payload if no error', () => {
      const fakeResponse = {};

      testContext.context._formatTokenizePayload = () => fakeResponse;
      testContext.context._client.request.mockResolvedValue();

      return PayPal.prototype._tokenizePayPal.call(testContext.context, {}, {}).then(res => {
        expect(res).toBe(fakeResponse);
      });
    });
  });

  describe('_formatTokenizePayload', () => {
    it('returns nonce and type', () => {
      const { nonce, type } = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPalAccount'
        }]
      });

      expect(nonce).toBe('nonce');
      expect(type).toBe('PayPalAccount');
    });

    it('returns payerInfo as details', () => {
      const payerInfo = {
        some: 'info'
      };
      const { details } = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: { payerInfo: payerInfo }
        }]
      });

      expect(details).toBe(payerInfo);
    });

    it('attaches creditFinancingOffered', () => {
      const stubCreditFinancingOffered = {
        totalCost: {
          value: '250.0',
          currency: 'USD'
        },
        other: 'terms'
      };

      const { creditFinancingOffered } = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {
            creditFinancingOffered: stubCreditFinancingOffered
          }
        }]
      });

      expect(creditFinancingOffered).toBe(stubCreditFinancingOffered);
    });

    it('doesn\'t attach creditFinancingOffered if not present', () => {
      const actual = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {}
        }]
      });

      expect(actual).not.toHaveProperty('creditFinancingOffered');
    });

    it('returns {} if no payerInfo', () => {
      let instanceOne = PayPal.prototype._formatTokenizePayload({
        paypalAccounts: [{
          details: {}
        }]
      });
      let instanceTwo;

      expect(instanceOne.details).toMatchObject({});

      instanceTwo = PayPal.prototype._formatTokenizePayload({});

      expect(instanceTwo.details).toMatchObject({});
    });
  });

  describe('_formatTokenizeData', () => {
    beforeEach(() => {
      testContext.config = { gatewayConfiguration: { paypal: {}}};
      testContext.context = {
        _frameService: { _serviceId: 'serviceId' },
        _client: {
          getConfiguration: () => testContext.config
        }
      };
    });

    it('if checkout flow, passes intent for tokenization', () => {
      let actual;

      testContext.config.gatewayConfiguration.paypal.unvettedMerchant = 'unilateral';
      actual = PayPal.prototype._formatTokenizeData.call(testContext.context, {
        intent: 'sale'
      }, {
        PayerID: 'PayerID',
        paymentId: 'paymentId'
      });

      expect(actual.paypalAccount.intent).toBe('sale');
    });

    it('if ba_token not present, passes proper data for tokenization', () => {
      let actual;

      testContext.config.gatewayConfiguration.paypal.unvettedMerchant = 'unilateral';
      actual = PayPal.prototype._formatTokenizeData.call(testContext.context, {}, {
        PayerID: 'PayerID',
        paymentId: 'paymentId',
        token: 'EC-83T8551496489354'
      });

      expect(actual.paypalAccount.correlationId).toBe('EC-83T8551496489354');
      expect(actual.paypalAccount.paymentToken).toBe('paymentId');
      expect(actual.paypalAccount.payerId).toBe('PayerID');
      expect(actual.paypalAccount.unilateral).toBe('unilateral');
    });

    it('if vault flow, ignores intent', () => {
      const actual = PayPal.prototype._formatTokenizeData.call(testContext.context, {
        intent: 'sale'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount).not.toHaveProperty('intent');
    });

    it('defaults validate option to false', () => {
      const actual = PayPal.prototype._formatTokenizeData.call(testContext.context, {
        intent: 'sale'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.options.validate).toBe(false);
    });

    it.each([
      [true, 'CLIENT_TOKEN'],
      [false, 'TOKENIZATION_KEY']
    ])('sets validate to %s when using the vault flow and %s', (validate, authType) => {
      let actual;

      testContext.config.authorizationType = authType;

      actual = PayPal.prototype._formatTokenizeData.call(testContext.context, {
        flow: 'vault'
      }, {
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.options.validate).toBe(validate);
    });

    it('if ba_token present, passes proper data for tokenization', () => {
      const actual = PayPal.prototype._formatTokenizeData.call(testContext.context, {}, {
        token: 'EC-83T8551496489354',
        ba_token: 'ba_token' // eslint-disable-line camelcase
      });

      expect(actual.paypalAccount.correlationId).toBe('ba_token');
      expect(actual.paypalAccount.billingAgreementToken).toBe('ba_token');
    });
  });
});
