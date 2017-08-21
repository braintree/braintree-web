'use strict';

var Ideal = require('../../../../src/ideal/external/ideal');
var VERSION = require('../../../../package.json').version;
var Promise = require('../../../../src/lib/promise');
var BraintreeError = require('../../../../src/lib/braintree-error');
var frameService = require('../../../../src/lib/frame-service/external');
var methods = require('../../../../src/lib/methods');
var fake = require('../../../helpers/fake');
var rejectIfResolves = require('../../../helpers/promise-helper').rejectIfResolves;
var analytics = require('../../../../src/lib/analytics');

function noop() {}

function waitForAsyncAction(cb) {
  setTimeout(cb, 100);
}

describe('iDEAL', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.ideal = {
      assetsUrl: 'https://checkout.paypal.com',
      routeId: 'route_789'
    };
    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this),
      request: this.sandbox.stub().resolves({
        data: {}
      })
    };
    this.fakeFrameService = {
      close: this.sandbox.stub(),
      open: this.sandbox.stub(),
      focus: this.sandbox.stub(),
      redirect: this.sandbox.stub(),
      teardown: this.sandbox.stub(),
      _bus: {
        on: this.sandbox.stub()
      }
    };

    this.ideal = new Ideal({
      client: this.fakeClient
    });
    this.ideal._frameService = this.fakeFrameService;
    this.ideal._frameData = {};
    this.sandbox.stub(analytics, 'sendEvent');
  });

  describe('_initialize', function () {
    it('sends time out event when integration takes too long to finish', function () {
      var clock = this.sandbox.useFakeTimers();

      this.sandbox.stub(frameService, 'create');

      this.ideal._initialize();

      clock.tick(60010);

      expect(analytics.sendEvent).to.be.calledOnce;
      expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.load.timed-out');
    });

    it('it does not send time out event when completes in alotted timeout time', function () {
      var clock = this.sandbox.useFakeTimers();

      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.ideal._initialize().then(function () {
        clock.tick(60010);
        expect(analytics.sendEvent).to.not.be.calledWith(this.fakeClient, 'ideal.load.timed-out');
      }.bind(this));
    });

    it('rejects with error when request for issuing banks fails', function () {
      var requestError = new Error('request error');

      this.sandbox.stub(frameService, 'create');
      this.fakeClient.request.rejects(requestError);

      return this.ideal._initialize().then(rejectIfResolves).catch(function (err) {
        expect(err).to.equal(requestError);
        expect(frameService.create).to.not.be.called;
      });
    });

    it('fetches issuing banks and sends them to popup', function () {
      var bankData = {bankData: {data: 'data'}};

      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: bankData
      });

      return this.ideal._initialize().then(function () {
        expect(this.fakeClient.request).to.be.calledOnce;
        expect(this.fakeClient.request).to.be.calledWith({
          api: 'braintreeApi',
          method: 'get',
          endpoint: 'issuers/ideal'
        });

        expect(frameService.create).to.be.calledOnce;
        expect(frameService.create).to.be.calledWith({
          name: 'braintreeideallanding',
          height: 550,
          width: 960,
          dispatchFrameUrl: 'https://checkout.paypal.com/web/' + VERSION + '/html/dispatch-frame.min.html',
          openFrameUrl: 'https://checkout.paypal.com/web/' + VERSION + '/html/ideal-issuers-frame.min.html',
          state: {bankData: bankData}
        });
      }.bind(this));
    });

    it('uses unminified assets in debug mode', function () {
      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {}
      });
      this.ideal._isDebug = true;

      return this.ideal._initialize().then(function () {
        expect(frameService.create).to.be.calledOnce;
        expect(frameService.create).to.be.calledWithMatch({
          dispatchFrameUrl: 'https://checkout.paypal.com/web/' + VERSION + '/html/dispatch-frame.html',
          openFrameUrl: 'https://checkout.paypal.com/web/' + VERSION + '/html/ideal-issuers-frame.html'
        });
      });
    });

    it('attaches a frame service to the instance', function () {
      delete this.ideal._frameService;

      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.ideal._initialize().then(function () {
        expect(this.ideal._frameService).to.equal(this.fakeFrameService);
      }.bind(this));
    });

    it('sets a listener for ideal:BANK_CHOSEN event', function () {
      delete this.ideal._frameService;

      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.ideal._initialize().then(function () {
        expect(this.ideal._frameService._bus.on).to.be.calledWith('ideal:BANK_CHOSEN', this.sandbox.match.func);
      }.bind(this));
    });

    it('sets a listener for ideal:REDIRECT_REACHED event', function () {
      delete this.ideal._frameService;

      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.ideal._initialize().then(function () {
        expect(this.ideal._frameService._bus.on).to.be.calledWith('ideal:REDIRECT_PAGE_REACHED', this.sandbox.match.func);
      }.bind(this));
    });

    it('resolves the iDEAL instance', function () {
      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.ideal._initialize().then(function (instance) {
        expect(instance).to.be.an.instanceof(Ideal);
      });
    });

    it('fires an analytics event when initialized', function () {
      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });

      return this.ideal._initialize().then(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.load.succeeded');
      }.bind(this));
    });
  });

  describe('startPayment', function () {
    it('errors without any arguments', function () {
      return this.ideal.startPayment().catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('IDEAL_START_PAYMENT_MISSING_REQUIRED_OPTION');
        expect(err.message).to.equal('Missing required option for startPayment.');

        expect(this.fakeClient.request).not.to.have.beenCalled;
      }.bind(this));
    });

    it('sets auth in progress to true', function () {
      this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }, noop);

      expect(this.ideal._idealPaymentStatus.authInProgress).to.equal(true);
    });

    it('sends analytics event that startPayment was succesfully begun', function () {
      this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }, noop);

      expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.opened');
    });

    it('rejects with error when options are not provided', function () {
      return this.ideal.startPayment(null).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('IDEAL_START_PAYMENT_MISSING_REQUIRED_OPTION');
        expect(err.message).to.equal('Missing required option for startPayment.');

        expect(this.fakeClient.request).not.to.have.beenCalled;
      }.bind(this));
    });

    ['orderId', 'amount', 'currency'].forEach(function (option) {
      var options = {
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      };

      it('requires ' + option + ' option when calling startPayment', function () {
        delete options[option];

        return this.ideal.startPayment(options).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('IDEAL_START_PAYMENT_MISSING_REQUIRED_OPTION');
          expect(err.message).to.equal('Missing required option for startPayment.');

          expect(this.fakeClient.request).not.to.have.beenCalled;
        }.bind(this));
      });
    });

    it('rejects with error if ideal payment is already in progress', function () {
      this.ideal._idealPaymentStatus.authInProgress = true;
      this.fakeFrameService.open.yields(null, {issuingBankId: 'foo'});

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(rejectIfResolves).catch(function (err) {
        expect(err).to.exist;
        expect(err.message).to.equal('iDEAL payment is already in progress.');
      });
    });

    it('sends analytics event if iDEAL payment is already in progress', function () {
      this.ideal._idealPaymentStatus.authInProgress = true;
      this.fakeFrameService.open.yields(null, {issuingBankId: 'foo'});

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.error.already-opened');
      }.bind(this));
    });

    it('wraps generic errors in Braintree error', function () {
      var error = new Error('Foo');

      this.fakeFrameService.open.yields(error);

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.message).to.equal('iDEAL startPayment failed.');
        expect(err.details.originalError).to.equal(error);
      });
    });

    it('rejects with Braintree Error when frame fails to open', function () {
      var error = new BraintreeError({
        type: 'INTERNAL',
        code: 'FOO',
        message: 'Foo bar baz'
      });

      this.fakeFrameService.open.yields(error);

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(rejectIfResolves).catch(function (err) {
        expect(err).to.equal(error);
      });
    });

    it('resolves with ideal id and status if err is FRAME_SERVICE_FRAME_CLOSED and status is PENDING', function () {
      this.fakeFrameService.open.yields(new BraintreeError({
        type: 'INTERNAL',
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo'
      }));
      this.ideal._idealPaymentStatus = {
        authInProgress: false,
        id: 'foo-id',
        status: 'PENDING'
      };

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(function (response) {
        expect(response).to.deep.equal({
          nonce: 'foo-id',
          type: 'IdealPayment',
          details: {
            id: 'foo-id',
            status: 'PENDING'
          }
        });
      });
    });

    it('resolves with ideal id and status if err is FRAME_SERVICE_FRAME_CLOSED and status is COMPLETE', function () {
      this.fakeFrameService.open.yields(new BraintreeError({
        type: 'INTERNAL',
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo'
      }));
      this.ideal._idealPaymentStatus = {
        authInProgress: false,
        id: 'foo-id',
        status: 'COMPLETE'
      };

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(function (response) {
        expect(response).to.deep.equal({
          nonce: 'foo-id',
          type: 'IdealPayment',
          details: {
            id: 'foo-id',
            status: 'COMPLETE'
          }
        });
      });
    });

    it('can pass optional locale param', function () {
      this.fakeFrameService.open.yields(new BraintreeError({
        type: 'INTERNAL',
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo'
      }));
      this.ideal._idealPaymentStatus = {
        authInProgress: false,
        id: 'foo-id',
        status: 'COMPLETE'
      };

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR',
        locale: 'en'
      }).then(function () {
        expect(this.fakeFrameService.open).to.be.calledWithMatch({
          state: {
            locale: 'en'
          }
        });
      }.bind(this));
    });

    it('rejects with error when status is not PENDING or COMPLETE', function () {
      this.fakeFrameService.open.yields(new BraintreeError({
        type: 'INTERNAL',
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo'
      }));
      this.ideal._idealPaymentStatus = {
        authInProgress: false,
        id: 'foo-id',
        status: 'FAILED'
      };

      return this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }).then(rejectIfResolves).catch(function (err) {
        expect(err).to.exist;
      });
    });

    it('supports callbacks', function (done) {
      this.fakeFrameService.open.yields(new BraintreeError({
        type: 'INTERNAL',
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo'
      }));
      this.ideal._idealPaymentStatus = {
        authInProgress: false,
        id: 'foo-id',
        status: 'COMPLETE'
      };

      this.ideal.startPayment({
        orderId: 'abc',
        amount: '10.00',
        currency: 'EUR'
      }, function (err, response) {
        expect(err).to.not.exist;

        expect(response).to.deep.equal({
          nonce: 'foo-id',
          type: 'IdealPayment',
          details: {
            id: 'foo-id',
            status: 'COMPLETE'
          }
        });
        done();
      });
    });
  });

  describe('focusWindow', function () {
    it('calls the frame service focus function', function () {
      this.ideal.focusWindow();

      expect(this.ideal._frameService.focus).to.be.calledOnce;
    });
  });

  describe('closeWindow', function () {
    it('calls the frame service close function', function () {
      this.ideal.closeWindow();

      expect(this.ideal._frameService.close).to.be.calledOnce;
    });

    it('sends analytics event if auth is in progress', function () {
      this.ideal._idealPaymentStatus.authInProgress = true;
      this.ideal.closeWindow();

      expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.closed.by-merchant');
    });

    it('does not send analytics event if auth is not progress', function () {
      this.ideal._idealPaymentStatus.authInProgress = false;
      this.ideal.closeWindow();

      expect(analytics.sendEvent).to.not.be.called;
    });
  });

  describe('_createBankChosenHandler', function () {
    beforeEach(function () {
      this.ideal._startPaymentOptions = {
        amount: '10.00',
        currency: 'EUR',
        orderId: 'order-id',
        descriptor: 'Descriptor'
      };
      this.ideal._startPaymentCallback = this.sandbox.stub();
    });

    it('returns a function', function () {
      var fn = this.ideal._createBankChosenHandler();

      expect(fn).to.be.a('function');
    });

    it('returns a function that sends a request to start the iDEAL payment', function () {
      var fn = this.ideal._createBankChosenHandler();

      fn({issuingBankId: 'some-bank'});

      expect(this.ideal._client.request).to.be.calledOnce;
      expect(this.ideal._client.request).to.be.calledWith({
        api: 'braintreeApi',
        method: 'post',
        data: {
          route_id: 'route_789', // eslint-disable-line camelcase
          issuer: 'some-bank',
          order_id: 'order-id', // eslint-disable-line camelcase
          amount: '10.00',
          currency: 'EUR',
          descriptor: 'Descriptor',
          redirect_url: 'https://checkout.paypal.com/web/' + VERSION + '/html/ideal-redirect-frame.html' // eslint-disable-line camelcase
        },
        endpoint: 'ideal-payments'
      });
    });

    it('calls onPaymentStart option if provided', function (done) {
      var onPaymentStartHook = this.sandbox.spy();
      var fakeResponse = {
        data: {
          id: 'foo',
          status: 'PENDING',
          approval_url: 'https://fake-redirect.com' // eslint-disable-line camelcase
        }
      };
      var fn;

      this.ideal._startPaymentOptions.onPaymentStart = onPaymentStartHook;
      this.ideal._client.request.resolves(fakeResponse);

      fn = this.ideal._createBankChosenHandler();

      fn({issuingBankId: 'some-bank'});

      waitForAsyncAction(function () {
        expect(onPaymentStartHook).to.be.calledOnce;
        expect(onPaymentStartHook).to.be.calledWith({
          id: fakeResponse.data.id,
          status: fakeResponse.data.status
        });
        done();
      });
    });

    it('does not error if onPaymentStart is not a function', function () {
      var onPaymentStartHook = 'foo';
      var fakeResponse = {
        data: {
          id: 'foo',
          status: 'PENDING',
          approval_url: 'https://fake-redirect.com' // eslint-disable-line camelcase
        }
      };
      var fn;

      this.ideal._client.request.resolves(fakeResponse);

      fn = this.ideal._createBankChosenHandler();

      expect(function () {
        fn({
          issuingBankId: 'some-bank',
          onPaymentStart: onPaymentStartHook
        });
      }).to.not.throw();
    });

    it('sets ideal payment properties', function (done) {
      var fakeResponse = {
        data: {
          id: 'foo',
          status: 'PENDING',
          approval_url: 'https://fake-redirect.com' // eslint-disable-line camelcase
        }
      };
      var fn;

      this.ideal._client.request.resolves(fakeResponse);

      fn = this.ideal._createBankChosenHandler();

      expect(this.ideal._idealPaymentStatus.id).to.equal('');
      expect(this.ideal._idealPaymentStatus.status).to.equal('');

      fn({issuingBankId: 'some-bank'});

      waitForAsyncAction(function () {
        expect(this.ideal._idealPaymentStatus.id).to.equal('foo');
        expect(this.ideal._idealPaymentStatus.status).to.equal('PENDING');
        done();
      }.bind(this));
    });

    it('redirects to approval url', function (done) {
      var fakeResponse = {
        data: {
          id: 'foo',
          status: 'PENDING',
          approval_url: 'https://fake-redirect.com' // eslint-disable-line camelcase
        }
      };
      var fn;

      this.ideal._client.request.resolves(fakeResponse);

      fn = this.ideal._createBankChosenHandler();

      expect(this.ideal._idealPaymentStatus.id).to.equal('');
      expect(this.ideal._idealPaymentStatus.status).to.equal('');

      fn({issuingBankId: 'some-bank'});

      waitForAsyncAction(function () {
        expect(this.ideal._frameService.redirect).to.be.calledOnce;
        expect(this.ideal._frameService.redirect).to.be.calledWith(fakeResponse.data.approval_url);
        done();
      }.bind(this));
    });
  });

  describe('_createRedirectPageReachedHandler', function () {
    it('returns a function that calls _pollForComplete', function () {
      var func = this.ideal._createRedirectPageReachedHandler();

      this.sandbox.stub(this.ideal, '_pollForCompleteTransactionStatus');

      func();

      expect(this.ideal._pollForCompleteTransactionStatus).to.be.calledOnce;
      expect(this.ideal._pollForCompleteTransactionStatus).to.be.calledWith(0);
    });
  });

  describe('_createStartPaymentCallback', function () {
    it('returns a function', function () {
      var fn = this.ideal._createStartPaymentCallback();

      expect(fn).to.be.a('function');
    });

    it('resets idealPaymentStatusObject', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.authInProgress = true;
      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'COMPLETE';

      fn = this.ideal._createStartPaymentCallback(function () {
        expect(this.ideal._idealPaymentStatus.authInProgress).to.be.false;
        expect(this.ideal._idealPaymentStatus.id).to.not.exist;
        expect(this.ideal._idealPaymentStatus.status).to.not.exist;

        done();
      }.bind(this));

      fn();
    });

    it('calls resolve callback with ideal payment details if there is no error and status is COMPLETE', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'COMPLETE';

      fn = this.ideal._createStartPaymentCallback(function (response) {
        expect(response).to.deep.equal({
          nonce: 'id',
          type: 'IdealPayment',
          details: {
            id: 'id',
            status: 'COMPLETE'
          }
        });

        done();
      });

      fn();
    });

    it('calls resolve callback with ideal payment details if there is no error and status is PENDING', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'PENDING';

      fn = this.ideal._createStartPaymentCallback(function (response) {
        expect(response).to.deep.equal({
          nonce: 'id',
          type: 'IdealPayment',
          details: {
            id: 'id',
            status: 'PENDING'
          }
        });

        done();
      });

      fn();
    });

    it('calls resolve callback with ideal payment details if the error is FRAME_SERVICE_FRAME_CLOSED and status is COMPLETE', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'COMPLETE';

      fn = this.ideal._createStartPaymentCallback(function (response) {
        expect(response).to.deep.equal({
          nonce: 'id',
          type: 'IdealPayment',
          details: {
            id: 'id',
            status: 'COMPLETE'
          }
        });

        done();
      });

      fn(new BraintreeError({
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('sends analytics event for resolved complete status', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'COMPLETE';

      fn = this.ideal._createStartPaymentCallback(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.success-complete');

        done();
      }.bind(this));

      fn(new BraintreeError({
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('calls resolve callback with ideal payment details if the error is FRAME_SERVICE_FRAME_CLOSED and status is PENDING', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'PENDING';

      fn = this.ideal._createStartPaymentCallback(function (response) {
        expect(response).to.deep.equal({
          nonce: 'id',
          type: 'IdealPayment',
          details: {
            id: 'id',
            status: 'PENDING'
          }
        });

        done();
      });

      fn(new BraintreeError({
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('sends analytics event for resolved pending status', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'PENDING';

      fn = this.ideal._createStartPaymentCallback(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.success-pending');

        done();
      }.bind(this));

      fn(new BraintreeError({
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('sends analytics event when startPayment fails', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'FAILED';

      fn = this.ideal._createStartPaymentCallback(function () {
        throw new Error('should not get here');
      });

      try {
        fn(new BraintreeError({
          code: 'FOO',
          message: 'foo',
          type: 'INTERNAL'
        }));
      } catch (err) {
        expect(err).to.exist;
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.failed');

        done();
      }
    });

    it('calls reject function with error', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'PENDING';

      fn = this.ideal._createStartPaymentCallback(function () {
        throw new Error('should not get here');
      }, function (err) {
        expect(err.code).to.equal('FOO');

        done();
      });

      fn(new BraintreeError({
        code: 'FOO',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('throws iDEAL specific error for FRAME_SERVICE_FRAME_CLOSED error', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'FAILED';

      fn = this.ideal._createStartPaymentCallback(function () {
        throw new Error('should not get here');
      }, function (err) {
        expect(err.code).to.equal('IDEAL_WINDOW_CLOSED');

        done();
      });

      fn(new BraintreeError({
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('calls analytics when customer closes the window', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'FAILED';

      fn = this.ideal._createStartPaymentCallback(function () {
        throw new Error('should not get here');
      });

      try {
        fn(new BraintreeError({
          code: 'FRAME_SERVICE_FRAME_CLOSED',
          message: 'foo',
          type: 'INTERNAL'
        }));
      } catch (err) {
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.start-payment.closed.by-user');

        done();
      }
    });

    it('throws iDEAL specific error for FRAME_SERVICE_FRAME_OPEN_FAILED error', function (done) {
      var fn;

      this.ideal._idealPaymentStatus.id = 'id';
      this.ideal._idealPaymentStatus.status = 'PENDING';

      fn = this.ideal._createStartPaymentCallback(function () {
        throw new Error('should not get here');
      }, function (err) {
        expect(err.code).to.equal('IDEAL_WINDOW_OPEN_FAILED');

        done();
      });

      fn(new BraintreeError({
        code: 'FRAME_SERVICE_FRAME_OPEN_FAILED',
        message: 'foo',
        type: 'INTERNAL'
      }));
    });

    it('closes the frame', function (done) {
      var fn;

      fn = this.ideal._createStartPaymentCallback(noop, function () {
        expect(this.ideal._frameService.close).to.be.calledOnce;

        done();
      }.bind(this));

      fn();
    });

    it('rejects if no error is passed and status is not PENDING or COMPLETE', function (done) {
      var fn;

      fn = this.ideal._createStartPaymentCallback(noop, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('INTERNAL');
        expect(err.code).to.equal('IDEAL_START_PAYMENT_UNEXPECTED_STATUS');
        expect(err.message).to.equal('iDEAL startPayment returned an unexpected status without an error.');

        done();
      });

      this.ideal._idealPaymentStatus.status = 'FAILED';

      fn();
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.sandbox.stub(frameService, 'create').yields(this.fakeFrameService);
      this.fakeClient.request.resolves({
        data: {bankData: 'data'}
      });
    });

    it('tears down the frame service', function (done) {
      var frameServiceInstance = this.fakeFrameService;
      var ideal = this.ideal;

      ideal._initialize().then(function () {
        ideal.teardown(function () {
          expect(frameServiceInstance.teardown).to.have.been.called;
          done();
        });
      });
    });

    it('calls teardown analytic', function (done) {
      var ideal = this.ideal;

      ideal._initialize().then(function () {
        ideal.teardown(function () {
          expect(analytics.sendEvent).to.have.been.calledWith(ideal._client, 'ideal.teardown-completed');
          done();
        });
      });
    });

    it('returns a promise', function (done) {
      var ideal = this.ideal;

      ideal._initialize().then(function () {
        var promise = ideal.teardown();

        expect(promise).to.be.an.instanceof(Promise);
        done();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var ideal = this.ideal;

      ideal._initialize().then(function () {
        ideal.teardown(function () {
          methods(Ideal.prototype).forEach(function (method) {
            try {
              ideal[method]();
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
