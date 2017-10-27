'use strict';

var atob = require('../../../src/lib/polyfill').atob;
var analytics = require('../../../src/lib/analytics');
var browserDetection = require('../../../src/venmo/shared/browser-detection');
var constants = require('../../../src/venmo/shared/constants');
var fake = require('../../helpers/fake');
var querystring = require('../../../src/lib/querystring');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var BraintreeError = require('../../../src/lib/braintree-error');
var Venmo = require('../../../src/venmo/venmo');
var Promise = require('../../../src/lib/promise');
var VERSION = require('../../../package.json').version;

function triggerWindowVisibilityChangeListener() {
  setTimeout(function () {
    document.addEventListener.getCall(0).args[1]();
  }, 0);
}

describe('Venmo', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.client = {
      request: this.sandbox.stub().resolves({}),
      getConfiguration: function () {
        return this.configuration;
      }.bind(this)
    };
    this.venmo = new Venmo({client: this.client});
    this.sandbox.stub(analytics, 'sendEvent');
    // Speed up unit tests
    constants.DOCUMENT_VISIBILITY_CHANGE_EVENT_DELAY = 0;
  });

  describe('_initialize', function () {
    beforeEach(function () {
      this.originalLocation = window.location.href;
    });

    afterEach(function () {
      history.replaceState({}, '', this.originalLocation);
    });

    it('resolves with the Venmo instance', function () {
      return this.venmo._initialize().then(function (instance) {
        expect(instance).to.be.an.instanceof(Venmo);
      });
    });

    describe('_url', function () {
      it('is set to correct base URL', function () {
        return this.venmo._initialize().then(function (venmoInstance) {
          expect(venmoInstance._url.indexOf('https://venmo.com/braintree/checkout')).to.equal(0);
        });
      });

      it('contains correct return URLs in query params', function () {
        var params;
        var expectedReturnUrls = {
          'x-success': window.location.href + '#venmoSuccess=1',
          'x-cancel': window.location.href + '#venmoCancel=1',
          'x-error': window.location.href + '#venmoError=1'
        };

        return this.venmo._initialize().then(function (venmoInstance) {
          params = querystring.parse(venmoInstance._url);
          expect(params['x-success']).to.equal(expectedReturnUrls['x-success']);
          expect(params['x-cancel']).to.equal(expectedReturnUrls['x-cancel']);
          expect(params['x-error']).to.equal(expectedReturnUrls['x-error']);
        });
      });

      it('contains correct return URLs in query params when checkout page URL has query params', function () {
        var expectedReturnUrls, params;

        history.replaceState({}, '', window.location.href + '?hey=now');
        expectedReturnUrls = {
          'x-success': window.location.href + '#venmoSuccess=1',
          'x-cancel': window.location.href + '#venmoCancel=1',
          'x-error': window.location.href + '#venmoError=1'
        };

        return this.venmo._initialize().then(function (venmoInstance) {
          params = querystring.parse(venmoInstance._url);
          expect(params['x-success']).to.equal(expectedReturnUrls['x-success']);
          expect(params['x-cancel']).to.equal(expectedReturnUrls['x-cancel']);
          expect(params['x-error']).to.equal(expectedReturnUrls['x-error']);
        });
      });

      it('contains user agent in query params', function () {
        var params;
        var userAgent = window.navigator.userAgent;

        return this.venmo._initialize().then(function (venmoInstance) {
          params = querystring.parse(venmoInstance._url);
          expect(params.ua).to.equal(userAgent);
        });
      });

      it('contains correct Braintree configuration options in query params', function () {
        /* eslint-disable camelcase */
        var params;
        var braintreeConfig = {
          braintree_merchant_id: 'pwv-merchant-id',
          braintree_access_token: 'pwv-access-token',
          braintree_environment: 'sandbox'
        };

        return this.venmo._initialize().then(function (venmoInstance) {
          params = querystring.parse(venmoInstance._url);
          expect(params.braintree_merchant_id).to.equal(braintreeConfig.braintree_merchant_id);
          expect(params.braintree_access_token).to.equal(braintreeConfig.braintree_access_token);
          expect(params.braintree_environment).to.equal(braintreeConfig.braintree_environment);
        });
        /* eslint-enable camelcase */
      });

      it('contains metadata in query params to forward to Venmo', function () {
        var params, braintreeData, metadata;

        return this.venmo._initialize().then(function (venmoInstance) {
          params = querystring.parse(venmoInstance._url);
          braintreeData = JSON.parse(atob(params.braintree_sdk_data)); // eslint-disable-line camelcase
          metadata = braintreeData._meta;

          expect(metadata.version).to.equal(VERSION);
          expect(metadata.sessionId).to.equal('fakeSessionId');
          expect(metadata.integration).to.equal('custom');
          expect(metadata.platform).to.equal('web');
          expect(Object.keys(metadata).length).to.equal(4);
        });
      });
    });
  });

  describe('isBrowserSupported', function () {
    it('returns true for iOS Safari', function () {
      this.sandbox.stub(browserDetection, 'isIosSafari').returns(true);

      expect(this.venmo.isBrowserSupported()).to.equal(true);
    });

    it('returns true for iOS Chrome', function () {
      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isChrome').returns(true);

      expect(this.venmo.isBrowserSupported()).to.equal(true);
    });

    it('returns true for Android Chrome', function () {
      this.sandbox.stub(browserDetection, 'isAndroid').returns(true);
      this.sandbox.stub(browserDetection, 'isChrome').returns(true);

      expect(this.venmo.isBrowserSupported()).to.equal(true);
    });

    it('returns true for Samsung Browser', function () {
      this.sandbox.stub(browserDetection, 'isSamsungBrowser').returns(true);

      expect(this.venmo.isBrowserSupported()).to.equal(true);
    });

    it('returns true for Mobile Firefox', function () {
      this.sandbox.stub(browserDetection, 'isMobileFirefox').returns(true);

      expect(this.venmo.isBrowserSupported()).to.equal(true);
    });

    it('returns false for other browsers', function () {
      this.sandbox.stub(browserDetection, 'isIosSafari').returns(false);
      this.sandbox.stub(browserDetection, 'isChrome').returns(false);
      this.sandbox.stub(browserDetection, 'isSamsungBrowser').returns(false);
      this.sandbox.stub(browserDetection, 'isMobileFirefox').returns(false);

      expect(this.venmo.isBrowserSupported()).to.equal(false);
    });

    context('when allowNewBrowserTab is false', function () {
      beforeEach(function () {
        this.venmo = new Venmo({
          client: this.client,
          allowNewBrowserTab: false
        });
      });

      it('returns false for iOS Chrome', function () {
        this.sandbox.stub(browserDetection, 'isIos').returns(true);
        this.sandbox.stub(browserDetection, 'isChrome').returns(true);

        expect(this.venmo.isBrowserSupported()).to.equal(false);
      });

      it('returns false for Mobile Firefox', function () {
        this.sandbox.stub(browserDetection, 'isMobileFirefox').returns(true);

        expect(this.venmo.isBrowserSupported()).to.equal(false);
      });
    });
  });

  describe('hasTokenizationResult', function () {
    beforeEach(function () {
      // Some tests use replaceState to simulate app switch returns rather
      // than updating window.location manually because this causes errors.
      // The window state needs to be reset after those tests.
      this.originalLocation = window.location.href;
    });

    afterEach(function () {
      history.replaceState({}, '', this.originalLocation);
    });

    it('returns true when URL has success payload', function () {
      history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');

      expect(this.venmo.hasTokenizationResult()).to.equal(true);
    });

    it('returns true when URL has error payload', function () {
      history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=hey&errorCode=1');

      expect(this.venmo.hasTokenizationResult()).to.equal(true);
    });

    it('returns true when URL has cancel payload', function () {
      history.replaceState({}, '', window.location.href + '#venmoCancel=1');

      expect(this.venmo.hasTokenizationResult()).to.equal(true);
    });

    it('returns false when URL has no Venmo payload', function () {
      expect(this.venmo.hasTokenizationResult()).to.equal(false);
    });
  });

  describe('tokenize', function () {
    beforeEach(function () {
      // Some tests use replaceState to simulate app switch returns rather
      // than updating window.location manually because this causes errors.
      // The window state needs to be reset after those tests.
      this.originalLocation = window.location.href;
      this.sandbox.stub(document, 'addEventListener');
      this.sandbox.stub(document, 'removeEventListener');
    });

    afterEach(function () {
      history.replaceState({}, '', this.originalLocation);
    });

    context('with promises', function () {
      it('returns a promise', function () {
        var promise = this.venmo.tokenize();

        expect(promise).to.be.an.instanceof(Promise);
      });

      it('errors if another tokenization request is active', function () {
        this.venmo.tokenize();

        return this.venmo.tokenize().then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('VENMO_TOKENIZATION_REQUEST_ACTIVE');
          expect(err.type).to.equal('MERCHANT');
          expect(err.message).to.equal('Another tokenization request is active.');
        });
      });

      context('when URL has Venmo results before calling tokenize', function () {
        it('resolves with nonce payload on successful result', function () {
          history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');

          return this.venmo.tokenize().then(function (payload) {
            expect(payload.nonce).to.equal('abc');
            expect(payload.type).to.equal('VenmoAccount');
            expect(payload.details.username).to.equal('keanu');
          });
        });

        it('rejects with error for error result', function () {
          history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');

          return this.venmo.tokenize().then(rejectIfResolves).catch(function (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('UNKNOWN');
            expect(err.code).to.equal('VENMO_APP_FAILED');
            expect(err.message).to.equal('Venmo app encountered a problem.');
            expect(err.details.originalError.message).to.equal('This is an error message.');
            expect(err.details.originalError.code).to.equal('42');
          });
        });

        it('rejects with cancellation error on Venmo app cancel', function () {
          history.replaceState({}, '', window.location.href + '#venmoCancel=1');

          return this.venmo.tokenize().then(rejectIfResolves).catch(function (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('CUSTOMER');
            expect(err.code).to.equal('VENMO_APP_CANCELED');
            expect(err.message).to.equal('Venmo app authorization was canceled.');
          });
        });

        it('consumes URL fragment parameters on successful result', function () {
          history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');

          return this.venmo.tokenize().then(function () {
            expect(window.location.href.indexOf('#')).to.equal(-1);
          });
        });

        it('consumes URL fragment parameters on error result', function () {
          history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');

          return this.venmo.tokenize().then(rejectIfResolves).catch(function () {
            expect(window.location.href.indexOf('#')).to.equal(-1);
          });
        });

        it('consumes URL fragment parameters on Venmo app cancel', function () {
          history.replaceState({}, '', window.location.href + '#venmoCancel=1');

          return this.venmo.tokenize().then(rejectIfResolves).catch(function () {
            expect(window.location.href.indexOf('#')).to.equal(-1);
          });
        });
      });

      it('resolves with nonce payload on success', function () {
        var promise = this.venmo.tokenize().then(function (payload) {
          expect(payload.nonce).to.equal('abc');
          expect(payload.type).to.equal('VenmoAccount');
          expect(payload.details.username).to.equal('keanu');
        });

        history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('rejects with error on Venmo app error', function () {
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('UNKNOWN');
          expect(err.code).to.equal('VENMO_APP_FAILED');
          expect(err.message).to.equal('Venmo app encountered a problem.');
          expect(err.details.originalError.message).to.equal('This is an error message.');
          expect(err.details.originalError.code).to.equal('42');
        });

        history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('rejects with cancellation error on Venmo app cancel', function () {
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('VENMO_APP_CANCELED');
          expect(err.message).to.equal('Venmo app authorization was canceled.');
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('rejects with cancellation error when app switch result not found', function () {
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('VENMO_CANCELED');
          expect(err.message).to.equal('User canceled Venmo authorization, or Venmo app is not available.');
        });

        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('sets _tokenizationInProgress to false when app switch result not found', function () {
        var self = this;
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(self.venmo._tokenizationInProgress).to.be.false;
        });

        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('consumes URL fragment parameters on successful result', function () {
        var promise = this.venmo.tokenize().then(function () {
          expect(window.location.href.indexOf('#')).to.equal(-1);
        });

        history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('consumes URL fragment parameters on error result', function () {
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(window.location.href.indexOf('#')).to.equal(-1);
        });

        history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('consumes URL fragment parameters on Venmo app cancel', function () {
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(window.location.href.indexOf('#')).to.equal(-1);
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('restores the previous URL fragment after consuming Venmo results', function () {
        var promise;

        history.replaceState({}, '', window.location.href + '#foo');

        promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(window.location.hash).to.equal('#foo');
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();

        return promise;
      });
    });

    context('with callbacks', function () {
      it('errors if another tokenization request is active', function (done) {
        this.venmo.tokenize();

        return this.venmo.tokenize(function (err, payload) {
          expect(payload).to.not.exist;
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('VENMO_TOKENIZATION_REQUEST_ACTIVE');
          expect(err.message).to.equal('Another tokenization request is active.');
          done();
        });
      });

      context('when URL has Venmo results before calling tokenize', function () {
        it('resolves with nonce payload on successful result', function (done) {
          history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');

          return this.venmo.tokenize(function (err, payload) {
            expect(err).not.to.exist;
            expect(payload.nonce).to.equal('abc');
            expect(payload.type).to.equal('VenmoAccount');
            expect(payload.details.username).to.equal('keanu');
            done();
          });
        });

        it('rejects with error for error result', function (done) {
          history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');

          return this.venmo.tokenize(function (err, payload) {
            expect(payload).not.to.exist;
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('UNKNOWN');
            expect(err.code).to.equal('VENMO_APP_FAILED');
            expect(err.message).to.equal('Venmo app encountered a problem.');
            expect(err.details.originalError.message).to.equal('This is an error message.');
            expect(err.details.originalError.code).to.equal('42');
            done();
          });
        });

        it('rejects with cancellation error on Venmo app cancel', function (done) {
          history.replaceState({}, '', window.location.href + '#venmoCancel=1');

          return this.venmo.tokenize(function (err, payload) {
            expect(payload).not.to.exist;
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('CUSTOMER');
            expect(err.code).to.equal('VENMO_APP_CANCELED');
            expect(err.message).to.equal('Venmo app authorization was canceled.');
            done();
          });
        });

        it('consumes URL fragment parameters on successful result', function (done) {
          history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');

          return this.venmo.tokenize(function () {
            expect(window.location.href.indexOf('#')).to.equal(-1);
            done();
          });
        });

        it('consumes URL fragment parameters on error result', function (done) {
          history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');

          return this.venmo.tokenize(function () {
            expect(window.location.href.indexOf('#')).to.equal(-1);
            done();
          });
        });

        it('consumes URL fragment parameters on Venmo app cancel', function (done) {
          history.replaceState({}, '', window.location.href + '#venmoCancel=1');

          return this.venmo.tokenize(function () {
            expect(window.location.href.indexOf('#')).to.equal(-1);
            done();
          });
        });
      });

      it('calls callback with nonce payload on success', function (done) {
        this.venmo.tokenize(function (err, payload) {
          expect(err).to.not.exist;
          expect(payload.nonce).to.equal('abc');
          expect(payload.type).to.equal('VenmoAccount');
          expect(payload.details.username).to.equal('keanu');
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');
        triggerWindowVisibilityChangeListener();
      });

      it('returns an error on Venmo app error', function (done) {
        this.venmo.tokenize(function (err, payload) {
          expect(payload).to.not.exist;
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('UNKNOWN');
          expect(err.code).to.equal('VENMO_APP_FAILED');
          expect(err.message).to.equal('Venmo app encountered a problem.');
          expect(err.details.originalError.message).to.equal('This is an error message.');
          expect(err.details.originalError.code).to.equal('42');
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');
        triggerWindowVisibilityChangeListener();
      });

      it('calls back with cancellation error on Venmo app cancel', function (done) {
        this.venmo.tokenize(function (err, payload) {
          expect(payload).to.not.exist;
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('VENMO_APP_CANCELED');
          expect(err.message).to.equal('Venmo app authorization was canceled.');
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();
      });

      it('calls back with cancellation error when app switch result not found', function (done) {
        this.venmo.tokenize(function (err, payload) {
          expect(payload).to.not.exist;
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('VENMO_CANCELED');
          expect(err.message).to.equal('User canceled Venmo authorization, or Venmo app is not available.');
          done();
        });

        triggerWindowVisibilityChangeListener();
      });

      it('sets _tokenizationInProgress to false when app switch result not received', function (done) {
        this.venmo.tokenize(function () {
          expect(this.venmo._tokenizationInProgress).to.be.false;
          done();
        }.bind(this));

        triggerWindowVisibilityChangeListener();
      });

      it('consumes URL fragment parameters on successful result', function (done) {
        this.venmo.tokenize(function () {
          expect(window.location.href.indexOf('#')).to.equal(-1);
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');
        triggerWindowVisibilityChangeListener();
      });

      it('consumes URL fragment parameters on error result', function (done) {
        this.venmo.tokenize(function () {
          expect(window.location.href.indexOf('#')).to.equal(-1);
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42');
        triggerWindowVisibilityChangeListener();
      });

      it('consumes URL fragment parameters on Venmo app cancel', function (done) {
        this.venmo.tokenize(function () {
          expect(window.location.href.indexOf('#')).to.equal(-1);
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();
      });

      it('restores the previous URL fragment after consuming Venmo results', function (done) {
        history.replaceState({}, '', window.location.href + '#foo');

        this.venmo.tokenize(function () {
          expect(window.location.hash).to.equal('#foo');
          done();
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();
      });
    });

    describe('analytics events', function () {
      it('sends an event on app switch return success', function () {
        var client = this.client;
        var promise = this.venmo.tokenize().then(function () {
          expect(analytics.sendEvent).to.be.calledWith(client, 'venmo.appswitch.handle.success');
        });

        history.replaceState({}, '', window.location.href + '#venmoSuccess=1&paymentMethodNonce=abc&username=keanu');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('sends an event on app switch return cancel', function () {
        var client = this.client;
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(client, 'venmo.appswitch.handle.cancel');
        });

        history.replaceState({}, '', window.location.href + '#venmoCancel=1');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('sends an event on app switch return error', function () {
        var client = this.client;
        var promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(client, 'venmo.appswitch.handle.error');
        });

        history.replaceState({}, '', window.location.href + '#venmoError=1&errorCode=1&errorMessage=error');
        triggerWindowVisibilityChangeListener();

        return promise;
      });

      it('sends an event when there\'s no app switch result before timeout', function () {
        var promise;
        var client = this.client;

        promise = this.venmo.tokenize().then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(client, 'venmo.appswitch.cancel-or-unavailable');
        });

        triggerWindowVisibilityChangeListener();

        return promise;
      });
    });
  });
});
