'use strict';

var Masterpass = require('../../../../src/masterpass/external/masterpass');
var VERSION = require('../../../../package.json').version;
var Promise = require('../../../../src/lib/promise');
var BraintreeError = require('../../../../src/lib/braintree-error');
var analytics = require('../../../../src/lib/analytics');
var frameService = require('../../../../src/lib/frame-service/external');
var methods = require('../../../../src/lib/methods');
var fake = require('../../../helpers/fake');
var rejectIfResolves = require('../../../helpers/promise-helper').rejectIfResolves;

function noop() {}

describe('Masterpass', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.isDebug = true;
    this.configuration.gatewayConfiguration.masterpass = {
      merchantCheckoutId: 'MERCHANT_ID',
      supportedNetworks: ['visa', 'master']
    };
    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this),
      request: this.sandbox.stub().resolves({})
    };
    this.fakeFrameService = {
      close: this.sandbox.stub(),
      open: this.sandbox.stub(),
      focus: this.sandbox.stub(),
      redirect: this.sandbox.stub(),
      state: {},
      _bus: {
        on: this.sandbox.stub()
      }
    };
    this.sandbox.stub(analytics, 'sendEvent');

    this.masterpass = new Masterpass({
      client: this.fakeClient
    });
    this.masterpass._frameService = this.fakeFrameService;
  });

  describe('_initialize', function () {
    it('uses unminified assets in debug mode', function () {
      var masterpass;

      this.configuration.isDebug = true;

      masterpass = new Masterpass({
        client: this.fakeClient
      });
      masterpass._frameService = this.fakeFrameService;

      this.sandbox.stub(frameService, 'create').yields();
      this.fakeClient.request.resolves({
        data: {}
      });

      return masterpass._initialize().then(function () {
        expect(frameService.create).to.be.calledOnce;
        expect(frameService.create).to.be.calledWithMatch({
          dispatchFrameUrl: 'https://assets.braintreegateway.com/web/' + VERSION + '/html/dispatch-frame.html',
          name: 'braintreemasterpasslanding',
          openFrameUrl: 'https://assets.braintreegateway.com/web/' + VERSION + '/html/masterpass-landing-frame.html'
        });
      });
    });

    it('attaches a frame service to the instance', function () {
      var fakeService = {fakeService: true};

      delete this.masterpass._frameService;

      this.sandbox.stub(frameService, 'create').yields(fakeService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.masterpass._initialize().then(function () {
        expect(this.masterpass._frameService).to.equal(fakeService);
      }.bind(this));
    });

    it('resolves the Masterpass instance', function () {
      var fakeService = {fakeService: true};

      this.sandbox.stub(frameService, 'create').yields(fakeService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.masterpass._initialize().then(function (instance) {
        expect(instance).to.be.an.instanceof(Masterpass);
      });
    });
  });

  describe('PopupBridge exists', function () {
    beforeEach(function () {
      global.popupBridge = {
        getReturnUrlPrefix: function () {
          return 'testscheme://';
        }
      };
    });

    afterEach(function () {
      delete global.popupBridge;
    });

    it('returns popupbridge callbackUrl', function () {
      var masterpass = new Masterpass({
        client: this.fakeClient
      });

      expect(masterpass._callbackUrl).to.equal('testscheme://return');
    });
  });

  describe('tokenize', function () {
    it('errors without any arguments', function () {
      return this.masterpass.tokenize().then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION');
        expect(err.message).to.equal('Missing required option for tokenize.');

        expect(this.fakeClient.request).not.to.have.beenCalled;
      }.bind(this));
    });

    it('sets auth in progress to true', function () {
      this.masterpass.tokenize({
        subtotal: '10.00',
        currencyCode: 'USD'
      }, noop);

      expect(this.masterpass._authInProgress).to.equal(true);
    });

    context('with promise', function () {
      context('with popupbridge', function () {
        beforeEach(function () {
          global.popupBridge = {};
        });

        afterEach(function () {
          delete global.popupBridge;
        });

        it('resolves with nonce when tokenize is called', function () {
          var expectedPayload = {
            masterpassCards: [{
              nonce: 'a-nonce',
              type: 'MasterpassCard',
              description: 'Ending in 22',
              details: {
                cardType: 'MasterCard',
                lastTwo: '22'
              },
              billingAddress: {
                countryCodeAlpha2: 'US',
                extendedAddress: ' ',
                locality: 'San Francisco',
                postalCode: '94107',
                region: 'US-SF',
                streetAddress: '123 Townsend St'
              },
              consumed: false,
              threeDSecureInfo: null,
              shippingAddress: {
                countryCodeAlpha2: 'US',
                extendedAddress: ' ',
                locality: 'San Francisco',
                postalCode: '94107',
                region: 'US-SF',
                streetAddress: '123 Townsend St'
              }
            }]
          };

          this.fakeFrameService.open.yieldsAsync(null, {
            queryItems: {
              mpstatus: 'success',
              oauth_token: 'token', // eslint-disable-line camelcase
              oauth_verifier: 'verifier', // eslint-disable-line camelcase
              checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
            }
          });

          this.fakeClient.request.resolves(expectedPayload);

          return this.masterpass.tokenize({
            subtotal: '10.00',
            currencyCode: 'USD'
          }).then(function (payload) {
            expect(payload).to.deep.equal(expectedPayload.masterpassCards[0]);
          });
        });

        it('closes the popup after tokenization', function () {
          this.fakeFrameService.open.yieldsAsync(null, {
            queryItems: {
              mpstatus: 'success',
              oauth_token: 'token', // eslint-disable-line camelcase
              oauth_verifier: 'verifier', // eslint-disable-line camelcase
              checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
            }
          });
          this.fakeClient.request.resolves({
            masterpassCards: [{
              nonce: 'a-nonce',
              type: 'MasterpassCard',
              description: 'Ending in 22'
            }]
          });

          return this.masterpass.tokenize({
            subtotal: '10.00',
            currencyCode: 'USD'
          }).then(function () {
            expect(this.fakeFrameService.close).to.be.calledOnce;
          }.bind(this));
        });

        it('sends an analytics event when tokenize call resolves with nonce', function () {
          var expectedPayload = {
            masterpassCards: []
          };

          this.fakeFrameService.open.yieldsAsync(null, {
            queryItems: {
              mpstatus: 'success',
              oauth_token: 'token', // eslint-disable-line camelcase
              oauth_verifier: 'verifier', // eslint-disable-line camelcase
              checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
            }
          });

          this.fakeClient.request.resolves(expectedPayload);

          return this.masterpass.tokenize({
            subtotal: '10.00',
            currencyCode: 'USD'
          }).then(function () {
            expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.success-popupbridge');
          }.bind(this));
        });

        it('sends an analytics event when popup returns without required query parameters', function () {
          this.fakeFrameService.open.yieldsAsync(null, {});

          return this.masterpass.tokenize({
            subtotal: '10.00',
            currencyCode: 'USD'
          }).then(rejectIfResolves).catch(function () {
            expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.failed-popupbridge');
          }.bind(this));
        });

        it('returns a BraintreeError when popupBridge returns a generic error', function () {
          var originalErr = new Error('foo');

          this.fakeFrameService.open.yieldsAsync(originalErr);

          return this.masterpass.tokenize({
            subtotal: '10.00',
            currencyCode: 'USD'
          }).then(rejectIfResolves).catch(function (err) {
            expect(err).to.be.instanceof(BraintreeError);
            expect(err.details.originalError).to.equal(originalErr);
          });
        });

        it('sends an analytics event when popup is closed by user', function () {
          var expectedError = new BraintreeError({
            type: 'INTERNAL',
            code: 'FRAME_SERVICE_FRAME_CLOSED',
            message: 'Frame closed'
          });

          this.fakeFrameService.open.yieldsAsync(expectedError);

          return this.masterpass.tokenize({
            subtotal: '10.00',
            currencyCode: 'USD'
          }).then(rejectIfResolves).catch(function () {
            expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.closed-popupbridge.by-user');
          }.bind(this));
        });
      });

      it('resolves with nonce when tokenize is called', function () {
        var expectedPayload = {
          masterpassCards: [{
            nonce: 'a-nonce',
            type: 'MasterpassCard',
            description: 'Ending in 22',
            details: {
              cardType: 'MasterCard',
              lastTwo: '22'
            },
            billingAddress: {
              countryCodeAlpha2: 'US',
              extendedAddress: ' ',
              locality: 'San Francisco',
              postalCode: '94107',
              region: 'US-SF',
              streetAddress: '123 Townsend St'
            },
            consumed: false,
            threeDSecureInfo: null,
            shippingAddress: {
              countryCodeAlpha2: 'US',
              extendedAddress: ' ',
              locality: 'San Francisco',
              postalCode: '94107',
              region: 'US-SF',
              streetAddress: '123 Townsend St'
            }
          }]
        };

        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'success',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });

        this.fakeClient.request.resolves(expectedPayload);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(function (payload) {
          expect(payload).to.deep.equal(expectedPayload.masterpassCards[0]);
        });
      });

      it('closes the popup after tokenization', function () {
        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'success',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });
        this.fakeClient.request.resolves({
          masterpassCards: [{
            nonce: 'a-nonce',
            type: 'MasterpassCard',
            description: 'Ending in 22'
          }]
        });

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(function () {
          expect(this.fakeFrameService.close).to.be.calledOnce;
        }.bind(this));
      });

      ['subtotal', 'currencyCode'].forEach(function (option) {
        var options = {
          subtotal: '10.00',
          currencyCode: 'USD'
        };

        it('requires ' + option + ' option when calling tokenize', function () {
          delete options[option];

          return this.masterpass.tokenize(options).then(rejectIfResolves).catch(function (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION');
            expect(err.message).to.equal('Missing required option for tokenize.');

            expect(this.fakeClient.request).not.to.have.beenCalled;
          }.bind(this));
        });
      });

      it('rejects with error when options are not provided', function () {
        return this.masterpass.tokenize(null).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION');
          expect(err.message).to.equal('Missing required option for tokenize.');

          expect(this.fakeClient.request).not.to.have.beenCalled;
        }.bind(this));
      });

      it('rejects with error if masterpass payment is already in progress', function () {
        this.masterpass._authInProgress = true;

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.exist;
          expect(err.message).to.equal('Masterpass tokenization is already in progress.');
        });
      });

      it('rejects with error if tokenize call fails with generic error', function () {
        var expectedError = new Error('foo');

        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'success',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });

        this.fakeClient.request.rejects(expectedError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.exist;
          expect(err.details.originalError).to.equal(expectedError);
        });
      });

      it('rejects with error if tokenize call fails with BraintreeError', function () {
        var expectedError = new BraintreeError({
          type: 'INTERNAL',
          code: 'FOO',
          message: 'foo'
        });

        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'success',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });

        this.fakeClient.request.rejects(expectedError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.equal(expectedError);
        });
      });

      it('rejects with error if masterpass payment `mpstatus` is not `success`', function () {
        this.fakeClient.request.resolves({});
        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'failed',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.code).to.equal('MASTERPASS_POPUP_CLOSED');
        });
      });

      it('closes the popup when masterpass payment `mpstatus` is not `success`', function () {
        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'failed',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function () {
          expect(this.fakeFrameService.close).to.be.calledOnce;
        }.bind(this));
      });

      it('rejects with error if popup is closed before completion', function () {
        var expectedError = new BraintreeError({
          type: 'INTERNAL',
          code: 'FRAME_SERVICE_FRAME_CLOSED',
          message: 'Frame closed'
        });

        this.fakeFrameService.open.yieldsAsync(expectedError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.instanceof(BraintreeError);
          expect(err.code).to.equal('MASTERPASS_POPUP_CLOSED');
          expect(err.type).to.equal('CUSTOMER');
          expect(err.message).to.equal('Customer closed Masterpass popup before authorizing.');
        });
      });

      it('rejects with error if popup fails to open', function () {
        var expectedError = new BraintreeError({
          type: 'INTERNAL',
          code: 'FRAME_SERVICE_FRAME_OPEN_FAILED',
          message: 'Frame closed'
        });

        this.fakeFrameService.open.yieldsAsync(expectedError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.instanceof(BraintreeError);
          expect(err.code).to.equal('MASTERPASS_POPUP_OPEN_FAILED');
          expect(err.type).to.equal('MERCHANT');
          expect(err.message).to.equal('Masterpass popup failed to open. Make sure to tokenize in response to a user action, such as a click.');
        });
      });

      it('rejects with Braintree error if popup fails with generic error', function () {
        var genericError = new Error('Foo');

        this.fakeFrameService.open.yieldsAsync(genericError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.code).to.equal('MASTERPASS_FLOW_FAILED');
          expect(err.type).to.equal('NETWORK');
          expect(err.message).to.equal('Could not initialize Masterpass flow.');
          expect(err.details.originalError).to.equal(genericError);
        });
      });

      it('rejects with wrapped BraintreeError when thrown generic errors', function () {
        var requestError = new Error('Foo');

        this.fakeClient.request.rejects(requestError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.instanceof(BraintreeError);
          expect(err.details.originalError).to.equal(requestError);
        });
      });

      it('sends an analytics event if masterpass payment `mpstatus` is not `success`', function () {
        this.fakeFrameService.open.yieldsAsync(null, {
          mpstatus: 'failed',
          oauth_token: 'token', // eslint-disable-line camelcase
          oauth_verifier: 'verifier', // eslint-disable-line camelcase
          checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
        });

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.closed.by-user');
        }.bind(this));
      });

      it('sends an analytics event if customer closes window before completion', function () {
        var expectedError = new BraintreeError({
          type: 'INTERNAL',
          code: 'FRAME_SERVICE_FRAME_CLOSED',
          message: 'Frame closed'
        });

        this.fakeFrameService.open.yieldsAsync(expectedError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.closed.by-user');
        }.bind(this));
      });

      it('sends an analytics event if popup fails to open', function () {
        var expectedError = new BraintreeError({
          type: 'INTERNAL',
          code: 'FRAME_SERVICE_FRAME_OPEN_FAILED',
          message: 'Frame closed'
        });

        this.fakeFrameService.open.yieldsAsync(expectedError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.failed.to-open');
        }.bind(this));
      });

      it('sends an analytics event if popup fails with generic error', function () {
        var genericError = new Error('Foo');

        this.fakeFrameService.open.yieldsAsync(genericError);

        return this.masterpass.tokenize({
          subtotal: '10.00',
          currencyCode: 'USD'
        }).then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'masterpass.tokenization.failed');
        }.bind(this));
      });

      context('when loading page in popup', function () {
        beforeEach(function () {
          this.fakeClient.request.resolves({
            masterpassCards: [{}]
          });
          this.fakeFrameService.open.yieldsAsync(null, {
            mpstatus: 'success',
            oauth_token: 'token', // eslint-disable-line camelcase
            oauth_verifier: 'verifier', // eslint-disable-line camelcase
            checkout_resource_url: 'checkout-resource-url' // eslint-disable-line camelcase
          });
          this.options = {
            subtotal: '10.00',
            currencyCode: 'USD'
          };
        });

        it('makes an api request for masterpass request token', function () {
          return this.masterpass.tokenize(this.options).then(function () {
            expect(this.fakeClient.request).to.have.been.calledWithMatch({
              endpoint: 'masterpass/request_token',
              method: 'post',
              data: {
                requestToken: {
                  originUrl: global.location.protocol + '//' + global.location.hostname,
                  subtotal: this.options.subtotal,
                  currencyCode: this.options.currencyCode,
                  callbackUrl: this.sandbox.match(/^https:\/\/assets.braintreegateway.com\/web\/.*masterpass-redirect-frame.html$/)
                }
              }
            });
          }.bind(this));
        });

        it('reports expected error when network request for Masterpass request token fails with a generic error', function () {
          var expectedError = new Error('foo');

          this.fakeClient.request.rejects(expectedError);

          return this.masterpass.tokenize(this.options).then(rejectIfResolves).catch(function (err) {
            expect(err.code).to.equal('MASTERPASS_FLOW_FAILED');
            expect(err.details.originalError).to.equal(expectedError);
          });
        });

        it('reports expected error when network request for Masterpass token fails with BraintreeError', function () {
          var expectedError = new BraintreeError({
            type: 'INTERNAL',
            code: 'FOO',
            message: 'foo'
          });

          this.fakeClient.request.rejects(expectedError);

          return this.masterpass.tokenize(this.options).then(rejectIfResolves).catch(function (err) {
            expect(err).to.equal(expectedError);
          });
        });

        it('reports expected error when network request for Masterpass request token fails with 422 status', function () {
          var expectedError = new Error('foo');

          expectedError.details = {
            httpStatus: 422
          };

          this.fakeClient.request.rejects(expectedError);

          return this.masterpass.tokenize(this.options).then(rejectIfResolves).catch(function (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.details.originalError).to.equal(expectedError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('MASTERPASS_INVALID_PAYMENT_OPTION');
            expect(err.message).to.equal('Masterpass payment options are invalid.');
          });
        });

        it('closes frame when network request for Masterpass request token fails', function () {
          this.fakeClient.request.rejects(new Error('foo'));
          this.masterpass._createFrameOpenHandler = function (resolve) {
            resolve({});
          };

          return this.masterpass.tokenize(this.options).then(rejectIfResolves).catch(function () {
            expect(this.fakeFrameService.close).to.be.calledOnce;
          }.bind(this));
        });

        it('redirects frameService', function () {
          this.fakeClient.request.resolves({requestToken: 'token'});
          this.masterpass._createFrameOpenHandler = function (resolve) {
            resolve({});
          };

          return this.masterpass.tokenize(this.options).then(function () {
            expect(this.fakeFrameService.redirect).to.be.calledOnce;
            expect(this.fakeFrameService.redirect).to.be.calledWith(this.sandbox.match(/^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=development&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-redirect-frame.html&merchantCheckoutId=MERCHANT_ID&allowedCardTypes=visa,master$/));
          }.bind(this));
        });

        it('redirects frameService with config', function () {
          var options = {
            currencyCode: 'USD',
            subtotal: '1.00',
            config: {
              paramKey: 'paramValue',
              allowedCardTypes: 'visa',
              merchantCheckoutId: 'OTHER_MERCHANT_ID'
            }
          };

          this.fakeClient.request.resolves({requestToken: 'token'});
          this.masterpass._createFrameOpenHandler = function (resolve) {
            resolve({});
          };

          return this.masterpass.tokenize(options).then(function () {
            expect(this.fakeFrameService.redirect).to.be.calledOnce;
            expect(this.fakeFrameService.redirect).to.be.calledWith(this.sandbox.match(/^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=development&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-redirect-frame.html&merchantCheckoutId=OTHER_MERCHANT_ID&allowedCardTypes=visa&paramKey=paramValue$/));
          }.bind(this));
        });

        it('redirectUrl ignores config with function values', function () {
          var options = {
            currencyCode: 'USD',
            subtotal: '1.00',
            config: {
              paramKey: 'paramValue',
              badFunction: function () {}
            }
          };

          this.fakeClient.request.resolves({requestToken: 'token'});
          this.masterpass._createFrameOpenHandler = function (resolve) {
            resolve({});
          };

          return this.masterpass.tokenize(options).then(function () {
            expect(this.fakeFrameService.redirect).to.be.calledOnce;
            expect(this.fakeFrameService.redirect).to.be.calledWith(this.sandbox.match(/^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=development&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-redirect-frame.html&merchantCheckoutId=MERCHANT_ID&allowedCardTypes=visa,master&paramKey=paramValue$/));
          }.bind(this));
        });
      });
    });
  });

  describe('closeWindow', function () {
    it('calls the frame service close function', function () {
      this.masterpass._closeWindow();

      expect(this.masterpass._frameService.close).to.be.calledOnce;
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.frameServiceInstance = {teardown: this.sandbox.stub()};
      this.fakeClient.request.resolves({});

      this.sandbox.stub(frameService, 'create').yields(this.frameServiceInstance);
    });

    it('tears down the frame service', function (done) {
      var frameServiceInstance = this.frameServiceInstance;
      var masterpass = this.masterpass;

      masterpass._initialize().then(function () {
        masterpass.teardown(function () {
          expect(frameServiceInstance.teardown).to.have.been.called;
          done();
        });
      });
    });

    it('calls teardown analytic', function (done) {
      var masterpass = this.masterpass;

      masterpass._initialize().then(function () {
        masterpass.teardown(function () {
          expect(analytics.sendEvent).to.have.been.calledWith(masterpass._client, 'masterpass.teardown-completed');
          done();
        });
      });
    });

    it('returns a promise', function (done) {
      var masterpass = this.masterpass;

      masterpass._initialize().then(function () {
        var teardown = masterpass.teardown();

        expect(teardown).to.be.an.instanceof(Promise);
        done();
      });
    });

    it('does not require a callback', function (done) {
      var masterpass = this.masterpass;

      masterpass._initialize().then(function () {
        expect(function () {
          masterpass.teardown();
        }).to.not.throw();
        done();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var masterpass = this.masterpass;

      masterpass._initialize().then(function () {
        masterpass.teardown(function () {
          methods(Masterpass.prototype).forEach(function (method) {
            try {
              masterpass[method]();
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
});
