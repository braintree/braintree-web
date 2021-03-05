'use strict';

jest.mock('../../../../src/lib/frame-service/external');

const { version: VERSION } = require('../../../../package.json');
const LocalPayment = require('../../../../src/local-payment/external/local-payment');
const analytics = require('../../../../src/lib/analytics');
const frameService = require('../../../../src/lib/frame-service/external');
const methods = require('../../../../src/lib/methods');
const BraintreeError = require('../../../../src/lib/braintree-error');
const querystring = require('../../../../src/lib/querystring');
const { yields, yieldsAsync } = require('../../../helpers');

describe('LocalPayment', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.configuration = {
      gatewayConfiguration: {
        assetsUrl: 'https://example.com:9292',
        paypal: {
          unvettedMerchant: 'unvetted-merchant'
        }
      },
      authorizationType: 'CLIENT_TOKEN'
    };
    testContext.client = {
      request: () => Promise.resolve(),
      getConfiguration: () => testContext.configuration
    };
  });

  afterEach(() => {
    delete window.popupBridge;
  });

  describe('Constructor', () => {
    it('sets a loadingFrameUrl', () => {
      const localPayment = new LocalPayment({ client: testContext.client });

      expect(localPayment._loadingFrameUrl).toBe(`${localPayment._assetsUrl}/html/local-payment-landing-frame.min.html`);
    });

    it('sets a loadingFrameUrl in debug mode', () => {
      let localPayment;

      testContext.configuration.isDebug = true;
      localPayment = new LocalPayment({ client: testContext.client });

      expect(localPayment._loadingFrameUrl).toBe(`${localPayment._assetsUrl}/html/local-payment-landing-frame.html`);
    });

    it('set up authorization state', () => {
      const localPayment = new LocalPayment({ client: testContext.client });

      expect(localPayment._authorizationInProgress).toBe(false);
    });
  });

  describe('_initialize', () => {
    beforeEach(() => {
      jest.spyOn(frameService, 'create');
    });

    it('instantiates FrameService', () => {
      const context = {
        _assetsUrl: 'foo/bar',
        _loadingFrameUrl: 'fake-loading-frame-url'
      };

      LocalPayment.prototype._initialize.call(context);

      expect(frameService.create).toBeCalledWith({
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

      LocalPayment.prototype._initialize.call(context);

      expect(frameService.create).toHaveBeenCalledWith({
        name: expect.any(String),
        dispatchFrameUrl: `${context._assetsUrl}/html/dispatch-frame.html`,
        openFrameUrl: context._loadingFrameUrl
      }, expect.any(Function));
    });

    it('assigns _frameService property on instance', () => {
      let localPayment;
      const options = { client: testContext.client };
      const frameServiceInstance = { foo: 'bar' };

      frameService.create.mockImplementation(yields(frameServiceInstance));

      localPayment = new LocalPayment(options);

      localPayment._initialize();

      expect(localPayment._frameService).toBe(frameServiceInstance);
    });

    it('resolves with local payment instance', () => {
      let localPayment;
      const frameServiceInstance = { foo: 'bar' };

      frameService.create.mockImplementation(yields(frameServiceInstance));

      localPayment = new LocalPayment({ client: testContext.client });

      return localPayment._initialize().then(res => {
        expect(res).toBe(localPayment);
      });
    });

    it('calls analytics with timed-out when failing to initialize', () => {
      jest.useFakeTimers();
      frameService.create.mockReturnValue(false);

      let localPayment;

      localPayment = new LocalPayment({ client: testContext.client });
      localPayment._initialize();

      jest.advanceTimersByTime(59999);
      expect(analytics.sendEvent).not.toHaveBeenCalledWith(testContext.client, 'local-payment.load.timed-out');

      jest.advanceTimersByTime(1);
      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'local-payment.load.timed-out');

      jest.useRealTimers();
    });
  });

  describe('startPayment', () => {
    beforeEach(() => {
      testContext.localPayment = new LocalPayment({
        client: testContext.client,
        merchantAccountId: 'merchant-account-id'
      });
      testContext.frameServiceInstance = {
        _serviceId: 'service-id',
        close: jest.fn(),
        open: jest.fn(yieldsAsync(null, {
          token: 'token',
          paymentId: 'payment-id',
          PayerID: 'PayerId'
        })),
        redirect: jest.fn()
      };

      testContext.options = {
        onPaymentStart: (data, start) => {
          start();
        },
        paymentType: 'ideal',
        paymentTypeCountryCode: 'NL',
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
        bic: 'ABGANL6A',
        address: {
          streetAddress: '123 Address',
          extendedAddress: 'Unit 1',
          locality: 'Chicago',
          region: 'IL',
          postalCode: '60654',
          countryCode: 'US'
        }
      };

      jest.spyOn(testContext.client, 'request').mockResolvedValue({
        paymentResource: {
          redirectUrl: 'https://example.com/redirect-url',
          paymentToken: 'payment-token'
        }
      });
      jest.spyOn(testContext.localPayment, 'tokenize').mockResolvedValue({
        nonce: 'a-nonce',
        type: 'PayPalAccount',
        details: {
          payerInfo: 'payer-info',
          correlationId: 'correlation-id'
        }
      });

      jest.spyOn(frameService, 'create').mockImplementation(yields(testContext.frameServiceInstance));

      return testContext.localPayment._initialize();
    });

    it.each([['onPaymentStart'], ['paymentType'], ['amount'], ['fallback']])(
      'errors when no %s param is provided', (requiredParam) => {
        delete testContext.options[requiredParam];

        return testContext.localPayment.startPayment(testContext.options).catch(({ code }) => {
          expect(code).toBe('LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION');
        });
      });

    it('errors when no fallback.url param is provided', () => {
      delete testContext.options.fallback.url;

      return testContext.localPayment.startPayment(testContext.options).catch(({ code }) => {
        expect(code).toBe('LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION');
      });
    });

    it('errors when no fallback.buttonText param is provided', () => {
      delete testContext.options.fallback.buttonText;

      return testContext.localPayment.startPayment(testContext.options).catch(({ code }) => {
        expect(code).toBe('LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION');
      });
    });

    it('errors when authorization is already in progress', () => {
      testContext.localPayment._authorizationInProgress = true;

      return testContext.localPayment.startPayment(testContext.options).catch(({ code }) => {
        expect(code).toBe('LOCAL_PAYMENT_ALREADY_IN_PROGRESS');
      });
    });

    it('creates a payment resource', () => {
      const client = testContext.client;

      testContext.frameServiceInstance.open.mockImplementation(yields(null, { foo: 'bar' }));

      return testContext.localPayment.startPayment(testContext.options).then(() => {
        expect(client.request).toHaveBeenCalledWith({
          method: 'post',
          endpoint: 'local_payments/create',
          data: {
            cancelUrl: `https://example.com:9292/web/${VERSION}/html/cancel-frame.min.html?channel=service-id`,
            returnUrl: `https://example.com:9292/web/${VERSION}/html/local-payment-redirect-frame.min.html?channel=service-id&r=https%3A%2F%2Fexample.com%2Ffallback&t=Button%20Text`,
            fundingSource: 'ideal',
            paymentTypeCountryCode: 'NL',
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
            merchantAccountId: 'merchant-account-id',
            bic: 'ABGANL6A'
          }
        });
      });
    });

    it('redirects frame to payment resource redirect url', () => {
      const frame = testContext.frameServiceInstance;

      frame.open.mockImplementation(yields(null, { foo: 'bar' }));

      return testContext.localPayment.startPayment(testContext.options).then(() => {
        expect(frame.redirect).toHaveBeenCalledWith('https://example.com/redirect-url');
      });
    });

    it('opens window with a default width and height', () => {
      const frame = testContext.frameServiceInstance;

      frame.open.mockImplementation(yields(null, { foo: 'bar' }));

      return testContext.localPayment.startPayment(testContext.options).then(() => {
        expect(frame.open).toHaveBeenCalledWith({
          width: 1282,
          height: 720
        }, expect.any(Function));
      });
    });

    it('can specify height and width of window', () => {
      const frame = testContext.frameServiceInstance;

      frame.open.mockImplementation(yields(null, { foo: 'bar' }));
      testContext.options.windowOptions = {
        width: 90,
        height: 50
      };

      return testContext.localPayment.startPayment(testContext.options).then(() => {
        expect(frame.open).toHaveBeenCalledWith({
          width: 90,
          height: 50
        }, expect.any(Function));
      });
    });

    it('errors when payment resource call fails', () => {
      const requestError = {
        message: 'Failed',
        details: {
          httpStatus: 400
        }
      };

      testContext.frameServiceInstance.open.mockClear();
      testContext.client.request.mockClear();
      testContext.client.request.mockRejectedValueOnce(requestError);

      return testContext.localPayment.startPayment(testContext.options).catch(({ code, details }) => {
        expect(code).toBe('LOCAL_PAYMENT_START_PAYMENT_FAILED');
        expect(details.originalError.message).toBe('Failed');
      });
    });

    it('errors with validation error when create payment resource fails with 422', () => {
      const requestError = {
        message: 'Failed',
        details: {
          httpStatus: 422
        }
      };

      testContext.frameServiceInstance.open.mockClear();
      testContext.client.request.mockRejectedValue(requestError);

      return testContext.localPayment.startPayment(testContext.options).catch(({ code, details }) => {
        expect(code).toBe('LOCAL_PAYMENT_INVALID_PAYMENT_OPTION');
        expect(details.originalError.message).toBe('Failed');
      });
    });

    it('cleans up state when payment resource request fails', () => {
      const requestError = {
        message: 'Failed',
        details: {
          httpStatus: 400
        }
      };

      testContext.frameServiceInstance.open.mockClear();
      testContext.client.request.mockRejectedValue(requestError);

      return testContext.localPayment.startPayment(testContext.options).catch(() => {
        expect(testContext.frameServiceInstance.close).toHaveBeenCalledTimes(1);
        expect(testContext.localPayment._authorizationInProgress).toBe(false);
      });
    });

    it('errors when frame service is closed', () => {
      const frameError = {
        code: 'FRAME_SERVICE_FRAME_CLOSED'
      };

      testContext.frameServiceInstance.open.mockImplementation(yieldsAsync(frameError));

      return testContext.localPayment.startPayment(testContext.options).catch(({ code }) => {
        expect(testContext.localPayment._authorizationInProgress).toBe(false);
        expect(code).toBe('LOCAL_PAYMENT_WINDOW_CLOSED');
      });
    });

    it('errors when frame service fails to open', () => {
      const frameError = {
        code: 'FRAME_SERVICE_FRAME_OPEN_FAILED_ABC'
      };

      testContext.frameServiceInstance.open.mockImplementation(yieldsAsync(frameError));

      return testContext.localPayment.startPayment(testContext.options).catch(({ code }) => {
        expect(testContext.localPayment._authorizationInProgress).toBe(false);
        expect(code).toBe('LOCAL_PAYMENT_WINDOW_OPEN_FAILED');
      });
    });

    it('tokenizes when frame service give params back', () => {
      testContext.frameServiceInstance.open.mockImplementation(yieldsAsync(null, {
        foo: 'bar'
      }));

      return testContext.localPayment.startPayment(testContext.options).then(result => {
        expect(testContext.localPayment._authorizationInProgress).toBe(false);
        expect(testContext.localPayment.tokenize).toHaveBeenCalledWith({
          foo: 'bar'
        });
        expect(result).toEqual({
          nonce: 'a-nonce',
          type: 'PayPalAccount',
          details: {
            payerInfo: 'payer-info',
            correlationId: 'correlation-id'
          }
        });
      });
    });
  });

  describe('tokenize', () => {
    beforeEach(() => {
      jest.spyOn(testContext.client, 'request').mockResolvedValue({
        paypalAccounts: [{
          nonce: 'a-nonce',
          type: 'PayPalAccount',
          details: {
            payerInfo: 'payer-info',
            correlationId: 'correlation-id'
          }
        }]
      });

      testContext.options = {
        btLpToken: 'token',
        btLpPaymentId: 'payment-token',
        btLpPayerId: 'payer-id'
      };
      testContext.localPayment = new LocalPayment({
        client: testContext.client,
        merchantAccountId: 'merchant-account-id'
      });
      testContext.localPayment._paymentType = 'ideal';
      testContext.expectedRequest = {
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
      };
    });

    it('tokenizes paypal account', () =>
      testContext.localPayment.tokenize(testContext.options).then(({ nonce }) => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request).toHaveBeenCalledWith(testContext.expectedRequest);

        expect(nonce).toBe('a-nonce');
      }));

    it('can use alternative param names', () => {
      const options = {
        token: 'token',
        paymentId: 'payment-token',
        PayerID: 'payer-id'
      };

      return testContext.localPayment.tokenize(options).then(({ nonce }) => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request).toHaveBeenCalledWith(testContext.expectedRequest);

        expect(nonce).toBe('a-nonce');
      });
    });

    it('prefers more specific param names', () => {
      testContext.options.token = 'other-token';
      testContext.options.paymentId = 'other-payment-token';
      testContext.options.PayerId = 'other-payer-id';

      return testContext.localPayment.tokenize(testContext.options).then(({ nonce }) => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request).toHaveBeenCalledWith(testContext.expectedRequest);

        expect(nonce).toBe('a-nonce');
      });
    });

    it('uses query params when no params are sent in', () => {
      jest.spyOn(querystring, 'parse').mockReturnValue({
        btLpToken: 'token',
        btLpPaymentId: 'payment-token',
        btLpPayerId: 'payer-id'
      });

      return testContext.localPayment.tokenize().then(({ nonce }) => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request).toHaveBeenCalledWith(testContext.expectedRequest);

        expect(nonce).toBe('a-nonce');
      });
    });

    it('rejects when tokenization fails', () => {
      const error = new Error('failed');

      testContext.client.request.mockRejectedValue(error);

      return testContext.localPayment.tokenize(testContext.options).catch(({ code, details }) => {
        expect(code).toBe('LOCAL_PAYMENT_TOKENIZATION_FAILED');
        expect(details.originalError.message).toBe('failed');
      });
    });

    it('sends analytics event for successful tokenizations', () =>
      testContext.localPayment.tokenize(testContext.options).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'ideal.local-payment.tokenization.success');
      }));

    it('sends analytics event for successful tokenizations with popupbridge', () => {
      window.popupBridge = {};

      return testContext.localPayment.tokenize(testContext.options).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'ideal.local-payment.tokenization.success-popupbridge');

        delete window.popupBridge;
      });
    });

    it('sends analytics event for failed tokenizations', () => {
      testContext.client.request.mockRejectedValue(new Error('failed'));

      return testContext.localPayment.tokenize(testContext.options).catch(() => {
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'ideal.local-payment.tokenization.failed');
      });
    });
  });

  describe('hasTokenizationParams', () => {
    beforeEach(() => {
      jest.spyOn(querystring, 'parse');
      testContext.localPayment = new LocalPayment({ client: testContext.client });
    });

    it('returns true if all necessary tokenization params are provided', () => {
      querystring.parse.mockReturnValue({
        btLpToken: 'token',
        btLpPaymentId: 'payment-id',
        btLpPayerId: 'payer-id'
      });

      expect(testContext.localPayment.hasTokenizationParams()).toBe(true);
    });

    it('returns false if no query params', () => {
      querystring.parse.mockReturnValue({});

      expect(testContext.localPayment.hasTokenizationParams()).toBe(false);
    });

    it.each([['Token'], ['PaymentId'], ['PayerId']])(
      'returns false if btLp%s is missing', (param) => {
        const params = {
          btLpToken: 'token',
          btLpPaymentId: 'payment-id',
          btLpPayerId: 'payer-id'
        };

        delete params[`btLp${param}`];

        querystring.parse.mockReturnValue(params);

        expect(testContext.localPayment.hasTokenizationParams()).toBe(false);
      });
  });

  describe('teardown', () => {
    beforeEach(() => {
      const frameServiceInstance = { teardown: jest.fn() };

      testContext.localPayment = new LocalPayment({ client: testContext.client });
      testContext.frameServiceInstance = frameServiceInstance;

      jest.spyOn(frameService, 'create').mockImplementation(yields(frameServiceInstance));
    });

    it('tears down the frame service', () => {
      const localPayment = testContext.localPayment;
      const frameServiceInstance = testContext.frameServiceInstance;

      return localPayment._initialize().then(() => {
        localPayment.teardown().then(() => {
          expect(frameServiceInstance.teardown).toHaveBeenCalled();
        });
      });
    });

    it('calls teardown analytic', () => {
      const localPayment = testContext.localPayment;

      return localPayment._initialize().then(() => {
        localPayment.teardown().then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(localPayment._client, 'local-payment.teardown-completed');
        });
      });
    });

    it('returns a promise if no callback is provided', () => {
      const localPayment = testContext.localPayment;

      return localPayment._initialize().then(() => {
        expect(localPayment.teardown()).resolves.toBeUndefined();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', done => {
      const localPayment = testContext.localPayment;

      localPayment._initialize().then(() => {
        localPayment.teardown(() => {
          methods(LocalPayment.prototype).forEach(method => {
            let error;

            try {
              localPayment[method]();
            } catch (err) {
              error = err;
            }

            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe(BraintreeError.types.MERCHANT);
            expect(error.code).toBe('METHOD_CALLED_AFTER_TEARDOWN');
            expect(error.message).toBe(`${method} cannot be called after teardown.`);
          });

          done();
        });
      });
    });
  });
});
