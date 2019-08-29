'use strict';

var Promise = require('../../../../src/lib/promise');
var ThreeDSecure = require('../../../../src/three-d-secure/external/three-d-secure');
var assets = require('../../../../src/lib/assets');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var BraintreeError = require('../../../../src/lib/braintree-error');
var parseUrl = require('url').parse;
var Bus = require('../../../../src/lib/bus');
var deferred = require('../../../../src/lib/deferred');
var VERSION = require('../../../../package.json').version;
var events = require('../../../../src/three-d-secure/shared/events');
var fake = require('../../../helpers/fake');
var rejectIfResolves = require('../../../helpers/promise-helper').rejectIfResolves;
var wait = require('../../../helpers/promise-helper').wait;
var constants = require('../../../../src/lib/constants');

function noop() {}

describe('ThreeDSecure', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');

    this.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: 'encoded_auth_fingerprint',
      gatewayConfiguration: {
        assetsUrl: 'http://example.com/assets'
      }
    };
    this.client = {
      request: this.sandbox.stub().resolves(),
      getConfiguration: function () { return self.configuration; }
    };
    this.fakeCardinal = {
      setup: this.sandbox.stub(),
      on: this.sandbox.stub(),
      trigger: this.sandbox.stub().resolves({Status: false}),
      'continue': this.sandbox.stub()
    };
  });

  describe('Constructor', function () {
    it('maps provided options to instance property', function () {
      var options = {
        foo: 'bar',
        client: this.client
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._options).to.equal(options);
    });

    it('adds sdkVersion to clientMetadata', function () {
      var options = {
        foo: 'bar',
        client: this.client
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._clientMetadata.sdkVersion).to.equal(constants.PLATFORM + '/' + VERSION);
    });

    it('adds requestedThreeDSVersion to clientMetadata for v1', function () {
      var options = {
        foo: 'bar',
        client: this.client
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._clientMetadata.requestedThreeDSecureVersion).to.equal('1');
    });

    it('adds requestedThreeDSVersion to clientMetadata for v2', function () {
      var options = {
        foo: 'bar',
        client: this.client,
        version: 2
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._clientMetadata.requestedThreeDSecureVersion).to.equal('2');
    });
  });

  describe('_setupSongbird', function () {
    beforeEach(function () {
      var self = this;

      this.configuration.gatewayConfiguration.threeDSecure = {
        cardinalAuthenticationJWT: 'some-jwt'
      };
      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});

      this.tds = new ThreeDSecure({
        version: 2,
        client: this.client
      });

      this.sandbox.stub(assets, 'loadScript').callsFake(function () {
        global.Cardinal = self.fakeCardinal;

        // wait briefly for time elapsed tests
        return wait(100);
      });
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('loads cardinal production script onto page', function () {
      return this.tds._setupSongbird({isProduction: true}).then(function () {
        expect(assets.loadScript).to.be.calledOnce;
        expect(assets.loadScript).to.be.calledWith({
          src: 'https://songbird.cardinalcommerce.com/edge/v1/songbird.js'
        });
      });
    });

    it('loads cardinal sandbox script onto page', function () {
      return this.tds._setupSongbird().then(function () {
        expect(assets.loadScript).to.be.calledOnce;
        expect(assets.loadScript).to.be.calledWith({
          src: 'https://songbirdstag.cardinalcommerce.com/edge/v1/songbird.js'
        });
      });
    });

    it('sets up payments.setupComplete listener', function () {
      return this.tds._setupSongbird().then(function () {
        expect(global.Cardinal.on).to.be.calledWith('payments.setupComplete', this.sandbox.match.func);
      }.bind(this));
    });

    it('sets dfReferenceId when setupComplete event fires', function () {
      this.fakeCardinal.on.withArgs('payments.setupComplete').yields({
        sessionId: 'df-reference'
      });

      return this.tds._setupSongbird().then(function () {
        return this.tds._getDfReferenceId();
      }.bind(this)).then(function (id) {
        expect(id).to.equal('df-reference');
      });
    });

    it('resolves any previous getDfReferenceId calls', function (done) {
      var setupSongbirdHasResolved = false;
      var promises;

      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({
        sessionId: 'df-reference'
      });

      promises = [
        this.tds._getDfReferenceId(),
        this.tds._getDfReferenceId(),
        this.tds._getDfReferenceId(),
        this.tds._getDfReferenceId()
      ];

      Promise.all(promises).then(function (results) {
        expect(setupSongbirdHasResolved).to.equal(true);
        results.forEach(function (res) {
          expect(res).to.equal('df-reference');
        });

        done();
      }).catch(done);

      this.tds._setupSongbird().then(function () {
        setupSongbirdHasResolved = true;
      });
    });

    it('sets up Cardinal', function () {
      return this.tds._setupSongbird().then(function () {
        expect(global.Cardinal.setup).to.be.calledOnce;
        expect(global.Cardinal.setup).to.be.calledWith('init', {
          jwt: 'some-jwt'
        });
      });
    });

    it('adds cardinalDeviceDataCollectionTimeElapsed to clientMetadata', function () {
      return this.tds._setupSongbird().then(function () {
        expect(this.tds._clientMetadata.cardinalDeviceDataCollectionTimeElapsed).to.exist;
        expect(this.tds._clientMetadata.cardinalDeviceDataCollectionTimeElapsed).to.be.greaterThan(0);
      }.bind(this));
    });

    it('sends analytics event when setup is complete', function () {
      return this.tds._setupSongbird().then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-completed');
      }.bind(this));
    });

    it('rejects if loadscript fails', function () {
      assets.loadScript.rejects(new Error('foo'));

      return this.tds._setupSongbird().then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED');
        expect(err.message).to.equal('Cardinal\'s Songbird.js library could not be loaded.');
      });
    });

    it('sets _getDfReferenceId to reject if Cardinal can not be set up', function () {
      var tds = this.tds;

      assets.loadScript.rejects(new Error('foo'));

      return tds._setupSongbird().then(rejectIfResolves).catch(function () {
        return tds._getDfReferenceId();
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED');
        expect(err.message).to.equal('Cardinal\'s Songbird.js library could not be loaded.');
      });
    });

    it('rejects with a generic error if a specific Braintree error cannot be found', function () {
      var tds = this.tds;

      this.fakeCardinal.on.reset();
      this.fakeCardinal.on.throws(new Error('failure'));

      return tds._setupSongbird().then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SETUP_FAILED');
        expect(err.message).to.equal('Something went wrong setting up Cardinal\'s Songbird.js library.');
      });
    });

    it('sends analytics event when Cardinal fails to set up', function () {
      var tds = this.tds;

      this.fakeCardinal.on.reset();
      this.fakeCardinal.on.throws(new Error('failure'));

      return tds._setupSongbird().then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-failed');
      }.bind(this));
    });

    it('sets _getDfReferenceId to reject with a generic error if a specific Braintree error cannot be found', function () {
      var tds = this.tds;

      this.fakeCardinal.on.reset();
      this.fakeCardinal.on.throws(new Error('failure'));

      return tds._setupSongbird().then(rejectIfResolves).catch(function () {
        return tds._getDfReferenceId();
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SETUP_FAILED');
        expect(err.message).to.equal('Something went wrong setting up Cardinal\'s Songbird.js library.');
      });
    });

    it('rejects with timeout error if cardinal takes longer than 60 seconds to set up', function (done) {
      this.fakeCardinal.on.reset();

      this.tds._setupSongbird({
        timeout: 10
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT');
        expect(err.message).to.equal('Cardinal\'s Songbird.js took too long to setup.');

        done();
      });
    });

    it('sends analytics event when Cardinal times out during setup', function (done) {
      this.fakeCardinal.on.reset();

      this.tds._setupSongbird({
        timeout: 10
      }).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-timeout');

        done();
      }.bind(this));
    });
  });

  describe('_createPaymentsSetupCompleteCallback', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client,
        version: 2
      });
      this.sandbox.stub(global, 'clearTimeout');
    });

    it('creates a function that calls resolve callback when called', function () {
      var resolve = this.sandbox.stub();
      var setupCallback = this.instance._createPaymentsSetupCompleteCallback(resolve, 100);

      expect(resolve).to.not.be.called;

      setupCallback({sessionId: 'id'});

      expect(resolve).to.be.calledOnce;
    });

    it('clears timeout with passed timeoutReference', function () {
      var resolve = this.sandbox.stub();
      var setupCallback = this.instance._createPaymentsSetupCompleteCallback(resolve, 100);

      expect(global.clearTimeout).to.not.be.called;

      setupCallback({sessionId: 'id'});

      expect(global.clearTimeout).to.be.calledOnce;
      expect(global.clearTimeout).to.be.calledWith(100);
    });

    it('sends songbird-setup completed event', function () {
      var resolve = this.sandbox.stub();
      var setupCallback = this.instance._createPaymentsSetupCompleteCallback(resolve, 100);

      expect(analytics.sendEvent).to.not.be.called;

      setupCallback({sessionId: 'id'});

      expect(analytics.sendEvent).to.be.calledOnce;
      expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-completed');
    });

    it('resolves getDFReference calls if they were called before setup completed', function (done) {
      var resolve = this.sandbox.stub();
      var setupCallback = this.instance._createPaymentsSetupCompleteCallback(resolve, 100);

      this.instance._getDfReferenceId().then(function (id) {
        expect(id).to.equal('id');

        done();
      });

      setupCallback({sessionId: 'id'});
    });

    it('sets dfRerence method to return id', function () {
      var resolve = this.sandbox.stub();
      var setupCallback = this.instance._createPaymentsSetupCompleteCallback(resolve, 100);

      setupCallback({sessionId: 'id'});

      return this.instance._getDfReferenceId().then(function (id) {
        expect(id).to.equal('id');
      });
    });

    it('returns the new df refrence id if passed multiple times', function () {
      var resolve = this.sandbox.stub();
      var setupCallback = this.instance._createPaymentsSetupCompleteCallback(resolve, 100);

      setupCallback({sessionId: 'id'});
      setupCallback({sessionId: 'some-other-id'});

      return this.instance._getDfReferenceId().then(function (id) {
        expect(id).to.equal('some-other-id');
      });
    });
  });

  describe('_createPaymentsValidatedCallback ', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client,
        version: 2
      });

      this.instance._lookupPaymentMethod = {
        nonce: 'lookup-nonce'
      };
      this.instance._verifyCardCallback = this.sandbox.stub();
      this.sandbox.stub(this.instance, '_performJWTValidation').resolves({nonce: 'new-nonce'});

      this.paymentsSetupCompleteCallback = this.instance._createPaymentsValidatedCallback();
    });

    it('calls verifyCardCallback with result from _performJWTValidation on success', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'SUCCESS'
      }, 'jwt');

      return wait().then(function () {
        expect(this.instance._performJWTValidation).to.be.calledOnce;
        expect(this.instance._performJWTValidation).to.be.calledWith('jwt');

        expect(this.instance._verifyCardCallback).to.be.calledOnce;
        expect(this.instance._verifyCardCallback).to.be.calledWith(null, {nonce: 'new-nonce'});
      }.bind(this));
    });

    it('calls verifyCardCallback with error from _performJWTValidation on success', function () {
      var error = new Error('some error');

      this.instance._performJWTValidation.rejects(error);
      this.paymentsSetupCompleteCallback({
        ActionCode: 'SUCCESS'
      }, 'jwt');

      return wait().then(function () {
        expect(this.instance._verifyCardCallback).to.be.calledOnce;
        expect(this.instance._verifyCardCallback).to.be.calledWith(error);
      }.bind(this));
    });

    it('calls verifyCardCallback with result from _performJWTValidation on no action', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'NOACTION'
      }, 'jwt');

      return wait().then(function () {
        expect(this.instance._performJWTValidation).to.be.calledOnce;
        expect(this.instance._performJWTValidation).to.be.calledWith('jwt');

        expect(this.instance._verifyCardCallback).to.be.calledOnce;
        expect(this.instance._verifyCardCallback).to.be.calledWith(null, {nonce: 'new-nonce'});
      }.bind(this));
    });

    it('calls verifyCardCallback with error from _performJWTValidation on no action', function () {
      var error = new Error('some error');

      this.instance._performJWTValidation.rejects(error);
      this.paymentsSetupCompleteCallback({
        ActionCode: 'NOACTION'
      }, 'jwt');

      return wait().then(function () {
        expect(this.instance._verifyCardCallback).to.be.calledOnce;
        expect(this.instance._verifyCardCallback).to.be.calledWith(error);
      }.bind(this));
    });

    it('calls verifyCardCallback with result from _performJWTValidation on failed authentication', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'FAILURE'
      }, 'jwt');

      return wait().then(function () {
        expect(this.instance._performJWTValidation).to.be.calledOnce;
        expect(this.instance._performJWTValidation).to.be.calledWith('jwt');

        expect(this.instance._verifyCardCallback).to.be.calledOnce;
        expect(this.instance._verifyCardCallback).to.be.calledWith(null, {nonce: 'new-nonce'});
      }.bind(this));
    });

    it('calls verifyCardCallback with error from _performJWTValidation on failed authentication', function () {
      var error = new Error('some error');

      this.instance._performJWTValidation.rejects(error);
      this.paymentsSetupCompleteCallback({
        ActionCode: 'FAILURE'
      }, 'jwt');

      return wait().then(function () {
        expect(this.instance._verifyCardCallback).to.be.calledOnce;
        expect(this.instance._verifyCardCallback).to.be.calledWith(error);
      }.bind(this));
    });
    it('calls verifyCardCallback with Songbird timeout error when songbird errors with codes 10001 or 10002', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10001
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10002
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT'
      });
    });

    it('calls verifyCardCallback with Songbird response timeout error when songbird errors with codes 10003, 10007 or 10009', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10003
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10007
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10009
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT'
      });
    });

    it('calls verifyCardCallback with Songbird bad config error when songbird errors with codes 10005 or 10006', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10005
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_BAD_CONFIG'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10006
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_BAD_CONFIG'
      });
    });

    it('calls verifyCardCallback with Songbird bad jwt error when songbird errors with codes 10008 or 10010', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10008
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_BAD_JWT'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10010
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_BAD_JWT'
      });
    });

    it('calls verifyCardCallback with Songbird canceled error when songbird errors with codes 10011', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10011
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_CANCELED'
      });
    });

    it('sends analytics event with Songbird canceled error when songbird errors with codes 10011', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10011
      }, 'jwt');

      expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.canceled');
    });

    it('calls verifyCardCallback with Songbird generic error when songbird errors with codes 10004, 10012 or anything else', function () {
      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10004
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_ERROR'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 10012
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_ERROR'
      });

      this.instance._verifyCardCallback.resetHistory();

      this.paymentsSetupCompleteCallback({
        ActionCode: 'ERROR',
        ErrorNumber: 'Any other error code'
      }, 'jwt');

      expect(this.instance._verifyCardCallback).to.be.calledOnce;
      expect(this.instance._verifyCardCallback).to.be.calledWithMatch({
        code: 'THREEDS_CARDINAL_SDK_ERROR'
      });
    });
  });

  describe('_performJWTValidation', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client,
        version: 2
      });

      this.instance._lookupPaymentMethod = {
        nonce: 'lookup-nonce'
      };
      this.instance._verifyCardCallback = this.sandbox.stub();

      this.client.request.resolves({
        paymentMethod: {
          nonce: 'new-nonce',
          description: 'a card',
          binData: 'bin data',
          details: 'details',
          threeDSecureInfo: '3ds info'
        },
        threeDSecureInfo: {
          liabilityShifted: true,
          liabilityShiftPossible: true
        }
      });
    });

    it('authenticate jwt', function () {
      var client = this.client;

      return this.instance._performJWTValidation('jwt').then(function () {
        expect(client.request).to.be.calledOnce;
        expect(client.request).to.be.calledWith({
          method: 'post',
          endpoint: 'payment_methods/lookup-nonce/three_d_secure/authenticate_from_jwt',
          data: {
            jwt: 'jwt',
            paymentMethodNonce: 'lookup-nonce'
          }
        });
      });
    });

    it('resolves with response from gw', function () {
      return this.instance._performJWTValidation('jwt').then(function (payload) {
        expect(payload.nonce).to.equal('new-nonce');
        expect(payload.description).to.equal('a card');
        expect(payload.details).to.equal('details');
        expect(payload.binData).to.equal('bin data');
        expect(payload.liabilityShifted).to.equal(true);
        expect(payload.liabilityShiftPossible).to.equal(true);
        expect(payload.threeDSecureInfo).to.equal('3ds info');
      });
    });

    it('sends analytics events for successful validation', function () {
      var self = this;

      return this.instance._performJWTValidation('jwt').then(function () {
        expect(analytics.sendEvent).to.be.calledTwice;
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.upgrade-payment-method.started');
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.upgrade-payment-method.succeeded');
      });
    });

    it('sends analytics events for error in validation request', function () {
      var self = this;
      var error = new Error('some error');

      this.client.request.rejects(error);

      return this.instance._performJWTValidation('jwt').then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledTwice;
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.upgrade-payment-method.started');
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.upgrade-payment-method.errored');
      });
    });

    it('rejects with the client request error', function () {
      var error = new Error('some error');

      this.client.request.rejects(error);

      return this.instance._performJWTValidation('jwt').then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_JWT_AUTHENTICATION_FAILED');
        expect(err.type).to.equal('UNKNOWN');
        expect(err.message).to.equal('Something went wrong authenticating the JWT from Cardinal');
        expect(err.details.originalError).to.equal(error);
      });
    });
  });

  describe('address transformation methods', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client,
        version: 2
      });
    });

    it('transforms billing address', function () {
      var additionalInformation = {
      };
      var billingAddress = {
        phoneNumber: '5555555555',
        givenName: 'First',
        surname: 'Last',
        streetAddress: '555 Smith street',
        extendedAddress: '#5',
        line3: 'More Address',
        locality: 'Oakland',
        region: 'CA',
        postalCode: '12345',
        countryCodeAlpha2: 'US'
      };

      additionalInformation = this.instance._transformBillingAddress(additionalInformation, billingAddress);

      expect(additionalInformation.billingPhoneNumber).to.equal('5555555555');
      expect(additionalInformation.billingGivenName).to.equal('First');
      expect(additionalInformation.billingSurname).to.equal('Last');
      expect(additionalInformation.billingLine1).to.equal('555 Smith street');
      expect(additionalInformation.billingLine2).to.equal('#5');
      expect(additionalInformation.billingLine3).to.equal('More Address');
      expect(additionalInformation.billingCity).to.equal('Oakland');
      expect(additionalInformation.billingState).to.equal('CA');
      expect(additionalInformation.billingPostalCode).to.equal('12345');
      expect(additionalInformation.billingCountryCode).to.equal('US');
    });

    it('transforms shipping address', function () {
      var additionalInformation = {
        shippingAddress: {
          streetAddress: '555 Smith street',
          extendedAddress: '#5',
          line3: 'More Address',
          locality: 'Oakland',
          region: 'CA',
          postalCode: '12345',
          countryCodeAlpha2: 'US'
        }
      };

      additionalInformation = this.instance._transformShippingAddress(additionalInformation);
      expect(additionalInformation.shippingAddress).not.to.exist;
      expect(additionalInformation.shippingLine1).to.equal('555 Smith street');
      expect(additionalInformation.shippingLine2).to.equal('#5');
      expect(additionalInformation.shippingLine3).to.equal('More Address');
      expect(additionalInformation.shippingCity).to.equal('Oakland');
      expect(additionalInformation.shippingState).to.equal('CA');
      expect(additionalInformation.shippingPostalCode).to.equal('12345');
      expect(additionalInformation.shippingCountryCode).to.equal('US');
    });
  });

  describe('verifyCard', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client
      });

      this.lookupResponse = {
        paymentMethod: {
          nonce: 'upgraded-nonce',
          details: {
            cardType: 'Visa'
          }
        },
        lookup: {
          threeDSecureVersion: '1.0.2'
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        }
      };
      this.client.request.resolves(this.lookupResponse);
    });

    it('returns a promise', function () {
      var promise = this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      });

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('can be called multiple times if canceled in between', function () {
      var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};
      var self = this;

      this.lookupResponse.paymentMethod = {
        nonce: 'upgraded-nonce',
        threeDSecureInfo: threeDSecureInfo
      };
      this.lookupResponse.threeDSecureInfo = threeDSecureInfo;

      return this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }).then(function () {
        return self.instance.cancelVerifyCard();
      }).then(function () {
        return self.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        });
      }).then(function (data) {
        expect(data.nonce).to.equal('upgraded-nonce');
      });
    });

    it('can be called multiple times if first request failed', function (done) {
      this.client.request.rejects(new Error('failure'));

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        this.client.request.resolves(this.lookupResponse);

        this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }, function (err, data) {
          expect(err).not.to.exist;
          expect(data.nonce).to.equal('upgraded-nonce');

          done();
        });
      }.bind(this));
    });

    it('cannot be called twice without cancelling in between', function (done) {
      var options = {
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      };

      this.instance.verifyCard(options, noop);

      this.instance.verifyCard(options, function (err, data) {
        expect(data).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.eql('MERCHANT');
        expect(err.code).to.eql('THREEDS_AUTHENTICATION_IN_PROGRESS');
        expect(err.message).to.eql('Cannot call verifyCard while existing authentication is in progress.');

        done();
      });
    });

    it('can be called multiple times if authentication completes in between', function (done) {
      var threeDSecure = new ThreeDSecure({
        client: this.client
      });

      var options = {
        nonce: 'abc123',
        amount: 100,
        addFrame: function (err, iframe) {
          expect(err).not.to.exist;
          expect(iframe).to.exist;

          deferred(function () {
            threeDSecure._handleAuthResponse({
              channel: 'some-channel',
              auth_response: '{"paymentMethod":{"type":"CreditCard","nonce":"some-fake-nonce","description":"ending+in+00","consumed":false,"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true,"status":"authenticate_successful","enrolled":"Y"},"details":{"lastTwo":"00","cardType":"Visa"}},"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true},"success":true}' // eslint-disable-line camelcase
            }, options);
          })();
        },
        removeFrame: noop
      };

      this.lookupResponse.lookup = {
        acsUrl: 'http://example.com/acs',
        pareq: 'pareq',
        termUrl: 'http://example.com/term',
        md: 'md',
        threeDSecureVersion: '1.0.2'
      };

      threeDSecure.verifyCard(options, function (err, data) {
        expect(err).not.to.exist;
        expect(data.nonce).to.equal('some-fake-nonce');
        expect(data.liabilityShifted).to.equal(true);
        expect(data.liabilityShiftPossible).to.equal(true);

        threeDSecure.verifyCard(options, function (err2, data2) {
          expect(err2).not.to.exist;
          expect(data2.nonce).to.equal('some-fake-nonce');
          expect(data2.liabilityShifted).to.equal(true);
          expect(data2.liabilityShiftPossible).to.equal(true);

          done();
        });
      });
    });

    it('requires a nonce', function (done) {
      this.instance.verifyCard({
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function (err, data) {
        expect(data).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.eql('MERCHANT');
        expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
        expect(err.message).to.eql('verifyCard options must include a nonce.');

        done();
      });
    });

    it('requires an amount', function (done) {
      this.instance.verifyCard({
        nonce: 'abcdef',
        addFrame: noop,
        removeFrame: noop
      }, function (err, data) {
        expect(data).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.eql('MERCHANT');
        expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
        expect(err.message).to.eql('verifyCard options must include an amount.');

        done();
      });
    });

    it('makes a request to the 3DS lookup endpoint without customer data', function (done) {
      var self = this;

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(self.client.request).to.be.calledOnce;
        expect(self.client.request).to.be.calledWithMatch({
          endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
          method: 'post',
          data: {
            amount: 100
          }
        });

        done();
      });
    });

    it('calls _initializeChallengeWithLookupResponse with lookup response and options', function (done) {
      var self = this;
      var lookupResponse = this.lookupResponse;

      this.sandbox.spy(this.instance, '_initializeChallengeWithLookupResponse');

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        showLoader: false,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(self.instance._initializeChallengeWithLookupResponse).to.be.calledOnce;
        expect(self.instance._initializeChallengeWithLookupResponse).to.be.calledWithMatch(lookupResponse, {
          showLoader: false,
          addFrame: self.sandbox.match.func,
          removeFrame: self.sandbox.match.func
        });

        done();
      });
    });

    it('sends analytics events for successful verification', function (done) {
      var self = this;

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        showLoader: false,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.started');
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.3ds-version.1.0.2');
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.completed');

        done();
      });
    });

    it('sends analytics events for lookup version', function (done) {
      var self = this;

      this.lookupResponse.lookup.threeDSecureVersion = '2.0.0';

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        showLoader: false,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.3ds-version.2.0.0');

        done();
      });
    });

    it('sends analytics events for failed 3ds verifications', function (done) {
      var self = this;

      this.client.request.rejects(new Error('error'));

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        showLoader: false,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.started');
        expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.failed');
        expect(analytics.sendEvent).to.not.be.calledWith(self.client, 'three-d-secure.verification-flow.3ds-version.1.0.2');
        expect(analytics.sendEvent).to.not.be.calledWith(self.client, 'three-d-secure.verification-flow.completed');

        done();
      });
    });

    context('deprecated iframe flow', function () {
      it('makes a request to the 3DS lookup endpoint with customer data', function (done) {
        var self = this;

        this.client.request.resolves({paymentMethod: {}, threeDSecureInfo: {}});

        this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          customer: {
            billingAddress: {
              firstName: 'John',
              lastName: 'Doe',
              streetAddress: '555 Smith street',
              extendedAddress: '#5',
              locality: 'Oakland',
              region: 'CA',
              countryCodeAlpha2: 'US'
            }
          },
          addFrame: noop,
          removeFrame: noop
        }, function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              amount: 100,
              customer: {
                billingAddress: {
                  firstName: 'John',
                  lastName: 'Doe',
                  line1: '555 Smith street',
                  line2: '#5',
                  city: 'Oakland',
                  state: 'CA',
                  countryCode: 'US'
                }
              }
            }
          });

          done();
        });
      });

      it('requires addFrame', function (done) {
        this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          removeFrame: noop
        }, function (err, data) {
          expect(data).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include an addFrame function.');

          done();
        });
      });

      it('requires removeFrame', function (done) {
        this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          addFrame: noop
        }, function (err, data) {
          expect(data).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include a removeFrame function.');

          done();
        });
      });

      it('defaults to showing loader on bank frame', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.client.request.resolves({
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term',
            md: 'md'
          }
        });

        threeDSecure.verifyCard({
          nonce: 'abc123',
          amount: 100,
          addFrame: function (err, iframe) {
            var url = parseUrl(iframe.src);

            expect(url.search).to.include('showLoader=true');

            done();
          },
          removeFrame: noop
        }, function () {
          done(new Error('This should never be called'));
        });
      });
    });

    context('songbird flow', function () {
      beforeEach(function () {
        this.tokenizedCard = {
          nonce: 'abcdef',
          details: {
            bin: '123456'
          }
        };
        this.configuration.gatewayConfiguration.threeDSecure = {
          cardinalAuthenticationJWT: 'some-jwt'
        };
        this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});
        this.instance = new ThreeDSecure({
          version: 2,
          client: this.client
        });

        this.sandbox.stub(assets, 'loadScript').callsFake(function () {
          global.Cardinal = this.fakeCardinal;

          return Promise.resolve();
        }.bind(this));

        return this.instance._setupSongbird();
      });

      afterEach(function () {
        delete global.Cardinal;
      });

      it('cannot be called if a blocking error occurs during cardinal sdk setup', function (done) {
        var self = this;
        var error = new Error('blocking error');

        this.instance._verifyCardBlockingError = error;
        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync(),
          email: 'test@example.com',
          mobilePhoneNumber: '8101234567',
          billingAddress: {
            phoneNumber: '1234567',
            givenName: 'Jill',
            surname: 'Gal',
            streetAddress: '555 Smith street',
            extendedAddress: '#5',
            line3: 'More Address',
            locality: 'Oakland',
            region: 'CA',
            postalCode: '12345',
            countryCodeAlpha2: 'US'
          },
          additionalInformation: {
            shippingMethod: '01',
            shippingGivenName: 'Bob',
            shippingSurname: 'Guy',
            shippingAddress: {
              streetAddress: '123 XYZ Street',
              extendedAddress: 'Apt 2',
              line3: 'Even More Address',
              locality: 'Hagerstown',
              region: 'MD',
              postalCode: '21740',
              countryCodeAlpha2: 'US'
            }
          }
        }, function (err) {
          expect(err).to.equal(error);
          expect(self.client.request).to.not.be.called;

          done();
        });
      });

      it('makes a request to the 3DS lookup endpoint with customer data', function (done) {
        var self = this;

        this.client.request.resolves({paymentMethod: {}, threeDSecureInfo: {}});

        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync(),
          email: 'test@example.com',
          mobilePhoneNumber: '8101234567',
          billingAddress: {
            phoneNumber: '1234567',
            givenName: 'Jill',
            surname: 'Gal',
            streetAddress: '555 Smith street',
            extendedAddress: '#5',
            line3: 'More Address',
            locality: 'Oakland',
            region: 'CA',
            postalCode: '12345',
            countryCodeAlpha2: 'US'
          },
          additionalInformation: {
            shippingMethod: '01',
            shippingGivenName: 'Bob',
            shippingSurname: 'Guy',
            shippingAddress: {
              streetAddress: '123 XYZ Street',
              extendedAddress: 'Apt 2',
              line3: 'Even More Address',
              locality: 'Hagerstown',
              region: 'MD',
              postalCode: '21740',
              countryCodeAlpha2: 'US'
            }
          }
        }, function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              amount: 100,
              additionalInfo: {
                mobilePhoneNumber: '8101234567',
                email: 'test@example.com',
                billingGivenName: 'Jill',
                billingSurname: 'Gal',
                billingLine1: '555 Smith street',
                billingLine2: '#5',
                billingLine3: 'More Address',
                billingCity: 'Oakland',
                billingState: 'CA',
                billingPostalCode: '12345',
                billingCountryCode: 'US',
                billingPhoneNumber: '1234567',
                shippingMethod: '01',
                shippingGivenName: 'Bob',
                shippingSurname: 'Guy',
                shippingLine1: '123 XYZ Street',
                shippingLine2: 'Apt 2',
                shippingLine3: 'Even More Address',
                shippingCity: 'Hagerstown',
                shippingState: 'MD',
                shippingPostalCode: '21740',
                shippingCountryCode: 'US'
              }
            }
          });

          done();
        });
      });

      it('does not require addFrame and removeFrame', function (done) {
        this.sandbox.stub(this.instance, '_getDfReferenceId').resolves('df-id');
        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          onLookupComplete: this.sandbox.stub().yieldsAsync(),
          amount: 100
        }, function (err) {
          expect(err).not.to.exist;

          done();
        });
      });

      it('requires an onLookupComplete function', function (done) {
        this.sandbox.stub(this.instance, '_getDfReferenceId').resolves('df-id');
        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100
        }, function (err, data) {
          expect(data).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include an onLookupComplete function.');

          done();
        });
      });

      it('prepares the lookup', function (done) {
        this.sandbox.spy(this.instance, '_prepareRawLookup');
        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          onLookupComplete: this.sandbox.stub().yieldsAsync(),
          amount: 100
        }, function () {
          expect(this.instance._prepareRawLookup).to.be.calledOnce;
          expect(this.instance._prepareRawLookup).to.be.calledWithMatch({
            amount: 100
          });
          done();
        }.bind(this));
      });

      it('makes a request to the 3DS lookup endpoint df reference id', function (done) {
        var self = this;

        this.sandbox.stub(this.instance, '_getDfReferenceId').resolves('df-id');
        this.client.request.resolves({paymentMethod: {}, threeDSecureInfo: {}});

        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync()
        }, function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              dfReferenceId: 'df-id', // eslint-disable-line camelcase
              amount: 100
            }
          });

          done();
        });
      });

      it('makes a request to the 3DS lookup endpoint with challengeRequested', function (done) {
        var self = this;

        this.sandbox.stub(this.instance, '_getDfReferenceId').resolves('df-id');
        this.client.request.resolves({paymentMethod: {}, threeDSecureInfo: {}});

        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          challengeRequested: true,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync()
        }, function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              challengeRequested: true,
              dfReferenceId: 'df-id', // eslint-disable-line camelcase
              amount: 100
            }
          });

          done();
        });
      });

      it('makes a request to the 3DS lookup endpoint with exemptionRequested', function (done) {
        var self = this;

        this.sandbox.stub(this.instance, '_getDfReferenceId').resolves('df-id');
        this.client.request.resolves({paymentMethod: {}, threeDSecureInfo: {}});

        this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          exemptionRequested: true,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync()
        }, function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              exemptionRequested: true,
              dfReferenceId: 'df-id', // eslint-disable-line camelcase
              amount: 100
            }
          });

          done();
        });
      });
    });

    it('handles errors when hitting the 3DS lookup endpoint', function (done) {
      var error = new Error('network error');

      this.client.request.rejects(error);

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function (err) {
        expect(err.details.originalError).to.eql(error);
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.code).to.equal('THREEDS_LOOKUP_ERROR');

        done();
      });
    });

    it('sends an analytics event for a generic lookup error', function (done) {
      var error = new Error('network error');

      this.client.request.rejects(error);

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.lookup-failed');

        done();
      }.bind(this));
    });

    it('rejects with a lookup error when lookup 404s', function (done) {
      var err = new Error('failure');

      err.details = {
        httpStatus: 404
      };

      this.client.request.rejects(err);

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function (lookupError) {
        expect(lookupError).to.be.an.instanceof(BraintreeError);
        expect(lookupError.code).to.equal('THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR');

        done();
      });
    });

    it('sends an analytics event for missing nonce', function (done) {
      var err = new Error('failure');

      err.details = {
        httpStatus: 404
      };

      this.client.request.rejects(err);

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.lookup-failed.404');

        done();
      }.bind(this));
    });

    it('rejects with a lookup error when lookup 422s', function (done) {
      var err = new Error('failure');

      err.details = {
        httpStatus: 422
      };

      this.client.request.rejects(err);

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function (lookupError) {
        expect(lookupError).to.be.an.instanceof(BraintreeError);
        expect(lookupError.code).to.equal('THREEDS_LOOKUP_VALIDATION_ERROR');

        done();
      });
    });

    it('sends an analytics event when lookup 422s', function (done) {
      var err = new Error('failure');

      err.details = {
        httpStatus: 422
      };

      this.client.request.rejects(err);

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.lookup-failed.422');

        done();
      }.bind(this));
    });

    context('when no authentication is required', function () {
      it('retains verification details object for backwards compatibility', function (done) {
        delete this.lookupResponse.lookup.acsUrl;

        this.instance.verifyCard({
          nonce: 'nonce-that-does-not-require-authentication',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }, function (err, data) {
          expect(err).not.to.exist;

          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
          done();
        });
      });

      it('calls the callback with a nonce and verification details', function (done) {
        delete this.lookupResponse.lookup.acsUrl;

        this.instance.verifyCard({
          nonce: 'nonce-that-does-not-require-authentication',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }, function (err, data) {
          expect(err).not.to.exist;
          expect(data.nonce).to.equal('upgraded-nonce');
          expect(data.details).to.deep.equal({cardType: 'Visa'});
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);

          done();
        });
      });
    });
  });

  describe('initializeChallengeWithLookupResponse', function () {
    it('calls _initializeChallengeWithLookupResponse', function () {
      var instance = new ThreeDSecure({
        client: this.client
      });
      var options = {};

      this.sandbox.stub(instance, '_initializeChallengeWithLookupResponse').resolves();

      return instance.initializeChallengeWithLookupResponse(options).then(function () {
        expect(instance._initializeChallengeWithLookupResponse).to.be.calledOnce;
        expect(instance._initializeChallengeWithLookupResponse).to.be.calledWith(options);
      });
    });
  });

  describe('_initializeChallengeWithLookupResponse', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client
      });

      this.client.request.resolves({
        paymentMethod: {},
        threeDSecureInfo: {}
      });
    });

    describe('deprecated iframe flow', function () {
      it('responds to a CONFIGURATION_REQUEST with the right configuration', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });
        var lookupResponse = {
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term?foo=boo',
            md: 'md'
          }
        };

        threeDSecure._initializeChallengeWithLookupResponse(lookupResponse, {
          addFrame: function () {
            var i, configurationRequestHandler;

            for (i = 0; i < Bus.prototype.on.callCount; i++) {
              if (Bus.prototype.on.getCall(i).args[0] === Bus.events.CONFIGURATION_REQUEST) {
                configurationRequestHandler = Bus.prototype.on.getCall(i).args[1];
              }
            }

            configurationRequestHandler(function (data) {
              var authenticationCompleteBaseUrl = threeDSecure._assetsUrl + '/html/three-d-secure-authentication-complete-frame.html?channel=';

              expect(data.acsUrl).to.equal('http://example.com/acs');
              expect(data.pareq).to.equal('pareq');
              expect(data.termUrl).to.match(RegExp('^http://example.com/term\\?foo=boo&three_d_secure_version=' + VERSION + '&authentication_complete_base_url=' + encodeURIComponent(authenticationCompleteBaseUrl) + '[a-f0-9-]{36}' + encodeURIComponent('&') + '$'));
              expect(data.parentUrl).to.equal(location.href);

              done();
            });
          },
          removeFrame: noop
        }).then(function () {
          done(new Error('This should never be called'));
        });
      });

      it('calls removeFrame when receiving an AUTHENTICATION_COMPLETE event', function () {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });
        var removeFrameSpy = this.sandbox.stub();

        var lookupResponse = {
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term',
            md: 'md'
          }
        };

        return threeDSecure._initializeChallengeWithLookupResponse(lookupResponse, {
          addFrame: function () {
            var authenticationCompleteHandler = Bus.prototype.on.withArgs(events.AUTHENTICATION_COMPLETE).getCall(0).args[1];

            authenticationCompleteHandler({
              auth_response: '{"paymentMethod":{"type":"CreditCard","nonce":"some-fake-nonce","description":"ending+in+00","consumed":false,"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true,"status":"authenticate_successful","enrolled":"Y"},"details":{"lastTwo":"00","cardType":"Visa"}},"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true},"success":true}' // eslint-disable-line camelcase
            });
          },
          removeFrame: removeFrameSpy
        }).then(function () {
          expect(removeFrameSpy).to.be.calledOnce;
        });
      });

      it('tears down the bus when receiving an AUTHENTICATION_COMPLETE event', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        var lookupResponse = {
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term',
            md: 'md'
          }
        };

        threeDSecure._initializeChallengeWithLookupResponse(lookupResponse, {
          addFrame: function () {
            var authenticationCompleteHandler = Bus.prototype.on.withArgs(events.AUTHENTICATION_COMPLETE).getCall(0).args[1];

            authenticationCompleteHandler({
              auth_response: '{"paymentMethod":{"type":"CreditCard","nonce":"some-fake-nonce","description":"ending+in+00","consumed":false,"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true,"status":"authenticate_successful","enrolled":"Y"},"details":{"lastTwo":"00","cardType":"Visa"}},"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true},"success":true}' // eslint-disable-line camelcase
            });
          },
          removeFrame: function () {
            expect(Bus.prototype.teardown).to.be.called;

            done();
          }
        });
      });

      it('does not call iframe-related callbacks when no authentication is required', function () {
        var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};
        var addFrame = this.sandbox.spy();
        var removeFrame = this.sandbox.spy();

        this.lookupResponse = {
          paymentMethod: {nonce: 'upgraded-nonce'},
          threeDSecureInfo: threeDSecureInfo
        };

        return this.instance._initializeChallengeWithLookupResponse(this.lookupResponse, {
          addFrame: addFrame,
          removeFrame: removeFrame
        }).then(function () {
          expect(addFrame).to.not.be.called;
          expect(removeFrame).to.not.be.called;
        });
      });

      it('returns an iframe with the right properties if authentication is needed', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.lookupResponse = {
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term',
            md: 'md'
          }
        };

        threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
          addFrame: function (err, iframe) {
            var url = parseUrl(iframe.src);

            expect(iframe).to.be.an.instanceof(HTMLIFrameElement);
            expect(iframe.width).to.equal('400');
            expect(iframe.height).to.equal('400');
            expect(url.host).to.equal('example.com');

            done();
          },
          removeFrame: noop
        }).then(function () {
          done(new Error('This should never be called'));
        });
      });

      it('can opt out of loader', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.lookupResponse = {
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term',
            md: 'md'
          }
        };

        threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
          showLoader: false,
          addFrame: function (err, iframe) {
            var url = parseUrl(iframe.src);

            expect(url.search).to.include('showLoader=false');

            done();
          },
          removeFrame: noop
        }).then(function () {
          done(new Error('This should never be called'));
        });
      });

      context('Verify card callback', function () {
        beforeEach(function () {
          this.threeDSecure = new ThreeDSecure({
            client: this.client
          });
          this.authResponse = {
            success: true,
            paymentMethod: {
              nonce: 'auth-success-nonce',
              binData: {
                prepaid: 'No',
                healthcare: 'Unknown',
                debit: 'Unknown',
                durbinRegulated: 'Unknown',
                commercial: 'Unknown',
                payroll: 'Unknown',
                issuingBank: 'Unknown',
                countryOfIssuance: 'CAN',
                productId: 'Unknown'
              },
              details: {
                last2: 11
              },
              description: 'a description',
              threeDSecureInfo: {
                liabilityShiftPossible: true,
                liabilityShifted: true,
                status: 'authenticate_successful',
                enrolled: 'Y',
                cavv: 'fake-cavv',
                xid: 'fake-xid',
                eciFlag: '05',
                threeDSecureVersion: '2.0.0',
                dsTransactionId: 'fake-ds-txn-id'
              }
            },
            threeDSecureInfo: {
              liabilityShiftPossible: true,
              liabilityShifted: true
            }
          };

          this.lookupResponse = {
            paymentMethod: {
              nonce: 'lookup-nonce'
            },
            lookup: {
              acsUrl: 'http://example.com/acs',
              pareq: 'pareq',
              termUrl: 'http://example.com/term',
              md: 'md'
            }
          };

          this.makeAddFrameFunction = function (authResponse) {
            return function () {
              var authenticationCompleteHandler = Bus.prototype.on.withArgs(events.AUTHENTICATION_COMPLETE).getCall(0).args[1];

              authenticationCompleteHandler({
                auth_response: JSON.stringify(authResponse) // eslint-disable-line camelcase
              });
            };
          };
        });

        it('calls the merchant callback when receiving an AUTHENTICATION_COMPLETE event', function () {
          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function (data) {
            expect(data).to.deep.equal({
              nonce: 'auth-success-nonce',
              binData: {
                prepaid: 'No',
                healthcare: 'Unknown',
                debit: 'Unknown',
                durbinRegulated: 'Unknown',
                commercial: 'Unknown',
                payroll: 'Unknown',
                issuingBank: 'Unknown',
                countryOfIssuance: 'CAN',
                productId: 'Unknown'
              },
              details: {
                last2: 11
              },
              description: 'a description',
              liabilityShiftPossible: true,
              liabilityShifted: true,
              threeDSecureInfo: {
                liabilityShiftPossible: true,
                liabilityShifted: true,
                status: 'authenticate_successful',
                enrolled: 'Y',
                cavv: 'fake-cavv',
                xid: 'fake-xid',
                eciFlag: '05',
                threeDSecureVersion: '2.0.0',
                dsTransactionId: 'fake-ds-txn-id'
              }
            });
          });
        });

        it('replaces + with a space in description parameter', function () {
          this.authResponse.paymentMethod.description = 'A+description+with+pluses';

          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function (data) {
            expect(data.description).to.equal('A description with pluses');
          });
        });

        it('sends back the new nonce if auth is succesful', function () {
          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function (data) {
            expect(data.nonce).to.equal('auth-success-nonce');
            expect(data.liabilityShiftPossible).to.equal(true);
            expect(data.liabilityShifted).to.equal(true);
          });
        });

        it('sends back the lookup nonce if auth is not succesful but liability shift is possible', function () {
          delete this.authResponse.success;
          this.authResponse.threeDSecureInfo.liabilityShifted = false;

          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function (data) {
            expect(data.nonce).to.equal('lookup-nonce');
            expect(data.liabilityShiftPossible).to.equal(true);
            expect(data.liabilityShifted).to.equal(false);
          });
        });

        it('sends back an error if it exists', function () {
          delete this.authResponse.success;
          this.authResponse.threeDSecureInfo.liabilityShiftPossible = false;
          this.authResponse.error = {
            message: 'an error'
          };

          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(rejectIfResolves).catch(function (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.eql(BraintreeError.types.UNKNOWN);
            expect(err.message).to.eql('an error');
          });
        });

        it('sends analytics events for successful liability shift', function () {
          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.true');
            expect(analytics.sendEvent).to.not.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.false');
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shifted.true');
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shift-possible.true');
          }.bind(this));
        });

        it('sends analytics events when no challenge is presented', function () {
          delete this.lookupResponse.lookup.acsUrl;

          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.false');
            expect(analytics.sendEvent).to.not.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.true');
          }.bind(this));
        });

        it('sends analytics events for failed liability shift', function () {
          this.authResponse.threeDSecureInfo.liabilityShifted = false;
          this.authResponse.threeDSecureInfo.liabilityShiftPossible = false;

          return this.threeDSecure._initializeChallengeWithLookupResponse(this.lookupResponse, {
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }).then(function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shifted.false');
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shift-possible.false');
          }.bind(this));
        });
      });
    });

    describe('songbird flow', function () {
      beforeEach(function () {
        this.configuration.gatewayConfiguration.threeDSecure = {
          cardinalAuthenticationJWT: 'some-jwt'
        };
        this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({
          ActionCode: 'SUCCESS'
        });
        this.instance = new ThreeDSecure({
          version: 2,
          client: this.client
        });

        this.sandbox.stub(assets, 'loadScript').callsFake(function () {
          global.Cardinal = this.fakeCardinal;

          return Promise.resolve();
        }.bind(this));

        return this.instance._setupSongbird();
      });

      afterEach(function () {
        delete global.Cardinal;
      });

      it('calls Cardinal.continue when onLookupComplete callback is called', function () {
        var lookupResponse = {
          threeDSecureInfo: {
            liabilityShiftPossible: true,
            liabilityShifted: true
          },
          paymentMethod: {},
          lookup: {
            acsUrl: 'https://exmaple.com/acs',
            pareq: 'pareq',
            transactionId: 'transaction-id'
          }
        };
        var fakeCardinal = this.fakeCardinal;
        var instance = new ThreeDSecure({
          version: 2,
          client: this.client
        });

        this.fakeCardinal.on.withArgs('payments.validated').callsFake(function (event, cb) {
          setTimeout(function () {
            cb({
              ActionCode: 'SUCCESS'
            }, 'valdiated-jwt');
          }, 100);
        });

        function onLookupComplete(data, start) {
          expect(fakeCardinal.continue).to.not.be.called;

          start();

          expect(fakeCardinal.continue).to.be.calledOnce;
          expect(fakeCardinal.continue).to.be.calledWith('cca', {
            AcsUrl: lookupResponse.lookup.acsUrl,
            Payload: lookupResponse.lookup.pareq
          }, {
            OrderDetails: {
              TransactionId: lookupResponse.lookup.transactionId
            }
          });
        }

        return instance._setupSongbird().then(function () {
          return instance._initializeChallengeWithLookupResponse(lookupResponse, {
            onLookupComplete: onLookupComplete
          });
        });
      });

      it('reports action code in analytics event', function () {
        var lookupResponse = {
          threeDSecureInfo: {
            liabilityShiftPossible: true,
            liabilityShifted: true
          },
          paymentMethod: {},
          lookup: {
            acsUrl: 'https://exmaple.com/acs',
            pareq: 'pareq',
            transactionId: 'transaction-id'
          }
        };
        var instance = new ThreeDSecure({
          version: 2,
          client: this.client
        });

        this.fakeCardinal.on.withArgs('payments.validated').callsFake(function (event, cb) {
          setTimeout(function () {
            cb({
              ActionCode: 'SUCCESS'
            }, 'valdiated-jwt');
          }, 100);
        });

        return instance._setupSongbird().then(function () {
          return instance._initializeChallengeWithLookupResponse(lookupResponse);
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.cardinal-sdk.action-code.success');
        }.bind(this));
      });
    });
  });

  describe('prepareLookup', function () {
    beforeEach(function () {
      global.Cardinal = this.fakeCardinal;
      this.instance = new ThreeDSecure({
        version: 2,
        client: this.client
      });

      this.sandbox.stub(this.instance, '_getDfReferenceId').resolves('df-id');
      this.fakeCardinal.trigger.resolves({
        Status: 'status'
      });

      this.options = {
        nonce: 'a-nonce',
        bin: '411111'
      };
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('maintains data passed in options', function () {
      var options = this.options;

      return this.instance.prepareLookup(options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data).to.not.equal(options);
        expect(data.nonce).to.equal(options.nonce);
        expect(data.bin).to.equal(options.bin);
      });
    });

    it('retrieves authorizationFingerprint', function () {
      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data.authorizationFingerprint).to.equal('encoded_auth_fingerprint');
      });
    });

    it('can pass arbitrary data into options', function () {
      this.options.foo = 'bar';

      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data.foo).to.equal('bar');
      });
    });

    it('retrieves dfReferenceId', function () {
      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data.dfReferenceId).to.equal('df-id'); // eslint-disable-line camelcase
      });
    });

    it('retrieves braintreeLibraryVersion', function () {
      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION); // eslint-disable-line camelcase
      });
    });

    it('retrieves bin metadata', function () {
      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(this.fakeCardinal.trigger).to.be.calledOnce;
        expect(this.fakeCardinal.trigger).to.be.calledWith('bin.process', '411111');
        expect(data.clientMetadata.issuerDeviceDataCollectionTimeElapsed).to.exist;
        expect(data.clientMetadata.issuerDeviceDataCollectionResult).to.equal('status');
      }.bind(this));
    });

    it('ignores errors df reference id lookup fails', function () {
      var error = new Error('df reference id lookup fails');

      this.instance._getDfReferenceId.rejects(error);

      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data.dfReferenceId).to.not.exist;
        expect(data.clientMetadata).to.deep.equal({
          sdkVersion: 'web/' + VERSION,
          requestedThreeDSecureVersion: '2'
        });
      });
    });

    it('ignores errors from Cardinal bin lookup', function () {
      this.fakeCardinal.trigger.rejects(new Error('bin process failed'));

      return this.instance.prepareLookup(this.options).then(function (stringifiedData) {
        var data = JSON.parse(stringifiedData);

        expect(data.dfReferenceId).to.equal('df-id'); // eslint-disable-line camelcase
        expect(data.clientMetadata).to.deep.equal({
          sdkVersion: 'web/' + VERSION,
          requestedThreeDSecureVersion: '2'
        });
      });
    });
  });

  describe('cancelVerifyCard', function () {
    beforeEach(function () {
      this.threeDS = new ThreeDSecure({client: this.client});
      this.threeDS._verifyCardInProgress = true;
      this.threeDS._lookupPaymentMethod = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        }
      };
    });

    it('returns a promise', function () {
      var promise = this.threeDS.cancelVerifyCard();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('sets _verifyCardInProgress to false', function (done) {
      this.threeDS._verifyCardInProgress = true;

      this.threeDS.cancelVerifyCard(function () {
        expect(this.threeDS._verifyCardInProgress).to.equal(false);

        done();
      }.bind(this));
    });

    it('passes back an error if there is no _lookupPaymentMethod', function (done) {
      delete this.threeDS._lookupPaymentMethod;

      this.threeDS.cancelVerifyCard(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.MERCHANT);
        expect(err.code).to.eql('THREEDS_NO_VERIFICATION_PAYLOAD');
        expect(err.message).to.equal('No verification payload available.');

        done();
      });
    });

    it('passes back the result of the initial lookup', function (done) {
      this.threeDS._lookupPaymentMethod = {
        nonce: 'fake-nonce',
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false,
          verificationDetails: {}
        }
      };

      this.threeDS.cancelVerifyCard(function (err, response) {
        expect(response.nonce).to.eql('fake-nonce');
        expect(response.liabilityShiftPossible).to.eql(true);
        expect(response.liabilityShifted).to.eql(false);
        expect(response.verificationDetails).to.deep.equal({});

        done();
      });
    });

    it('calls verifyCardCallback with error when using songbird flow', function (done) {
      var spy = this.sandbox.stub();

      this.threeDS._options.version = 2;

      this.threeDS._lookupPaymentMethod = {
        nonce: 'fake-nonce',
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false,
          verificationDetails: {}
        }
      };
      this.threeDS._verifyCardCallback = spy;

      this.threeDS.cancelVerifyCard(function (err) {
        var verifyCardError = spy.args[0][0];

        expect(err).to.not.exist;

        expect(spy).to.be.calledOnce;
        expect(verifyCardError.code).to.equal('THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT');

        done();
      });
    });

    it('does not throw an error when using v2 and there is no verifyCardCallback', function (done) {
      this.threeDS._options.version = 2;

      this.threeDS._lookupPaymentMethod = {
        nonce: 'fake-nonce',
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false,
          verificationDetails: {}
        }
      };

      this.threeDS.cancelVerifyCard(function (err, response) {
        expect(err).to.not.exist;

        expect(response.nonce).to.eql('fake-nonce');
        expect(response.liabilityShiftPossible).to.eql(true);
        expect(response.liabilityShifted).to.eql(false);
        expect(response.verificationDetails).to.deep.equal({});

        done();
      });
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.threeDS = new ThreeDSecure({client: this.client});
    });

    it('calls teardown analytic', function (done) {
      var threeDS = this.threeDS;

      threeDS.teardown(function () {
        expect(analytics.sendEvent).to.be.calledWith(threeDS._options.client, 'three-d-secure.teardown-completed');
        done();
      });
    });

    it('returns a promise', function () {
      var promise = this.threeDS.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var threeDS = this.threeDS;

      threeDS.teardown(function () {
        methods(ThreeDSecure.prototype).forEach(function (method) {
          var error;

          try {
            threeDS[method]();
          } catch (err) {
            error = err;
          }

          expect(error).to.be.an.instanceof(BraintreeError);
          expect(error.type).to.equal(BraintreeError.types.MERCHANT);
          expect(error.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
          expect(error.message).to.equal(method + ' cannot be called after teardown.');

          done();
        });
      });
    });

    it('does not attempt to tear down bus if it does not exist', function (done) {
      this.threeDS.teardown(function () {
        expect(Bus.prototype.teardown).to.not.be.called;

        done();
      });
    });

    it('tears down bus if it exists', function (done) {
      var threeDS = this.threeDS;

      threeDS._bus = new Bus({
        channel: 'foo',
        merchantUrl: 'bar'
      });

      threeDS.teardown(function () {
        expect(threeDS._bus.teardown).to.be.calledOnce;

        done();
      });
    });

    it('does not attempt to remove iframe from DOM if there is no iframe on instance', function (done) {
      this.sandbox.spy(document.body, 'removeChild');

      this.threeDS.teardown(function () {
        expect(document.body.removeChild).to.not.be.called;

        done();
      });
    });

    it('does not remove iframe from DOM if it is not in the DOM', function (done) {
      var iframe = document.createElement('iframe');

      this.threeDS._bankIframe = iframe;
      this.sandbox.spy(document.body, 'removeChild');

      this.threeDS.teardown(function () {
        expect(document.body.removeChild).to.not.be.called;

        done();
      });
    });

    it('removes bank iframe', function (done) {
      var iframe = document.createElement('iframe');

      this.sandbox.spy(document.body, 'removeChild');

      document.body.appendChild(iframe);

      this.threeDS._bankIframe = iframe;

      this.threeDS.teardown(function () {
        expect(document.body.contains(iframe)).to.equal(false);
        expect(document.body.removeChild).to.be.calledOnce;
        expect(document.body.removeChild).to.be.calledWith(iframe);

        done();
      });
    });

    it('removes Cardinal listeners', function (done) {
      global.Cardinal = {
        off: this.sandbox.stub()
      };

      this.threeDS.teardown(function () {
        expect(global.Cardinal.off).to.be.calledTwice;
        expect(global.Cardinal.off).to.be.calledWith('payments.setupComplete');
        expect(global.Cardinal.off).to.be.calledWith('payments.validated');

        done();
      });
    });

    it('does not remove cardinal script', function (done) {
      var script = document.createElement('script');

      document.body.appendChild(script);

      this.threeDS._cardinalScript = script;

      this.threeDS.teardown(function () {
        expect(document.body.contains(script)).to.equal(true);

        done();
      });
    });
  });
});
