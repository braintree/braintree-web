'use strict';

var ThreeDSecure = require('../../../../src/three-d-secure/external/three-d-secure');
var LegacyFramework = require('../../../../src/three-d-secure/external/frameworks/legacy');
var SongbirdFramework = require('../../../../src/three-d-secure/external/frameworks/songbird');
var CardinalModalFramework = require('../../../../src/three-d-secure/external/frameworks/cardinal-modal');
var Bootstrap3ModalFramework = require('../../../../src/three-d-secure/external/frameworks/bootstrap3-modal');
var InlineIframeFramework = require('../../../../src/three-d-secure/external/frameworks/inline-iframe');
var EventEmitter = require('@braintree/event-emitter');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var BraintreeError = require('../../../../src/lib/braintree-error');
var Promise = require('../../../../src/lib/promise');
var fake = require('../../../helpers/fake');

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
    this.sandbox.stub(SongbirdFramework.prototype, 'setupSongbird');
  });

  describe('Constructor', function () {
    it('is an event emitter', function () {
      var options = {
        client: this.client,
        framework: 'cardinal-modal'
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS).to.be.an.instanceof(EventEmitter);
    });

    it('uses legacy framework when "legacy" is passed in', function () {
      var options = {
        client: this.client,
        framework: 'legacy'
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._framework).to.be.an.instanceof(LegacyFramework);
    });

    it('uses cardinal modal framework when "cardinal-modal" is passed in', function () {
      var options = {
        client: this.client,
        framework: 'cardinal-modal'
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._framework).to.be.an.instanceof(CardinalModalFramework);
    });

    it('uses bootstrap3 modal framework when "bootstrap3-modal" is passed in', function () {
      var options = {
        client: this.client,
        framework: 'bootstrap3-modal'
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._framework).to.be.an.instanceof(Bootstrap3ModalFramework);
    });

    it('uses inline iframe framework when "inline-iframe" is passed in', function () {
      var options = {
        client: this.client,
        framework: 'inline-iframe'
      };
      var dddS = new ThreeDSecure(options);

      expect(dddS._framework).to.be.an.instanceof(InlineIframeFramework);
    });

    it('sets up event listeners for the framework', function (done) {
      var options = {
        client: this.client,
        framework: 'cardinal-modal'
      };
      var dddS, handler;

      this.sandbox.stub(SongbirdFramework.prototype, 'setUpEventListeners');

      dddS = new ThreeDSecure(options);

      expect(SongbirdFramework.prototype.setUpEventListeners).to.be.calledOnce;

      dddS.on('foo', function (data, otherData) {
        expect(data).to.equal('some data');
        expect(otherData).to.equal('other data');

        done();
      });

      handler = SongbirdFramework.prototype.setUpEventListeners.args[0][0];

      handler('foo', 'some data', 'other data');
    });
  });

  describe('verifyCard', function () {
    it('calls the verifyCard method on the framework', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });
      var options = {};

      this.sandbox.stub(instance._framework, 'verifyCard');

      instance.verifyCard(options);

      expect(instance._framework.verifyCard).to.be.calledOnce;
      expect(instance._framework.verifyCard).to.be.calledWith(options, this.sandbox.match.undefined);
    });

    it('passes along `ignoreOnLookupCompleteRequirement` if a listner for it is included', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });
      var options = {};

      instance.on('lookup-complete', function () {
        // noop
      });

      this.sandbox.stub(instance._framework, 'verifyCard');

      instance.verifyCard(options);

      expect(instance._framework.verifyCard).to.be.calledOnce;
      expect(instance._framework.verifyCard).to.be.calledWith(options, {
        ignoreOnLookupCompleteRequirement: true
      });
    });
  });

  describe('initializeChallengeWithLookupResponse', function () {
    it('calls the initializeChallengeWithLookupResponse method on the framework', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });
      var options = {
        paymentMethod: {
          consumed: false,
          description: 'ending in 02',
          details: {
            cardType: 'Visa',
            lastTwo: '02'
          },
          nonce: 'nonce',
          threeDSecureInfo: {
            enrolled: 'N',
            liabilityShiftPossible: false,
            liabilityShifted: false,
            status: 'authenticate_successful_issuer_not_participating'
          },
          type: 'CreditCard'
        },
        success: true,
        threeDSecureInfo: {
          liabilityShiftPossible: false,
          liabilityShifted: false
        }
      };

      this.sandbox.stub(instance._framework, 'initializeChallengeWithLookupResponse');

      instance.initializeChallengeWithLookupResponse(options);

      expect(instance._framework.initializeChallengeWithLookupResponse).to.be.calledOnce;
      expect(instance._framework.initializeChallengeWithLookupResponse).to.be.calledWith(options);
    });

    it('can pass a string version of lookup response', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });
      var options = {
        paymentMethod: {
          consumed: false,
          description: 'ending in 02',
          details: {
            cardType: 'Visa',
            lastTwo: '02'
          },
          nonce: 'nonce',
          threeDSecureInfo: {
            enrolled: 'N',
            liabilityShiftPossible: false,
            liabilityShifted: false,
            status: 'authenticate_successful_issuer_not_participating'
          },
          type: 'CreditCard'
        },
        success: true,
        threeDSecureInfo: {
          liabilityShiftPossible: false,
          liabilityShifted: false
        }
      };
      var stringifiedOptions = JSON.stringify(options);

      this.sandbox.stub(instance._framework, 'initializeChallengeWithLookupResponse');

      instance.initializeChallengeWithLookupResponse(stringifiedOptions);

      expect(instance._framework.initializeChallengeWithLookupResponse).to.be.calledOnce;
      expect(instance._framework.initializeChallengeWithLookupResponse).to.be.calledWith(options);
    });
  });

  describe('prepareLookup', function () {
    it('calls the prepareLookup method on the framework', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });

      this.sandbox.stub(instance._framework, 'prepareLookup').resolves({foo: 'bar'});

      instance.prepareLookup();

      expect(instance._framework.prepareLookup).to.be.calledOnce;
    });

    it('stringifies the result of prepareLookup on the framework', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });

      this.sandbox.stub(instance._framework, 'prepareLookup').resolves({foo: 'bar'});

      return instance.prepareLookup().then(function (data) {
        expect(data).to.be.a('string');
        expect(JSON.parse(data)).to.deep.equal({foo: 'bar'});
      });
    });
  });

  describe('cancelVerifyCard', function () {
    it('calls the cancelVerifyCard method on the framework', function () {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });

      this.sandbox.stub(instance._framework, 'cancelVerifyCard');

      instance.cancelVerifyCard();

      expect(instance._framework.cancelVerifyCard).to.be.calledOnce;
    });
  });

  describe('teardown', function () {
    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = new ThreeDSecure({
        client: this.client,
        framework: 'legacy'
      });

      instance.teardown(function () {
        methods(ThreeDSecure.prototype).concat('on', '_emit').forEach(function (method) {
          var error;

          try {
            instance[method]();
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

    it('calls stategies teardown method', function () {
      var legacyInstance = new ThreeDSecure({
        client: this.client,
        framework: 'legacy'
      });
      var cardinalModalInstance = new ThreeDSecure({
        client: this.client,
        framework: 'cardinal-modal'
      });

      this.sandbox.stub(legacyInstance._framework, 'teardown').resolves();
      this.sandbox.stub(cardinalModalInstance._framework, 'teardown').resolves();

      return Promise.all([
        legacyInstance.teardown(),
        cardinalModalInstance.teardown()
      ]).then(function () {
        expect(legacyInstance._framework.teardown).to.be.calledOnce;
        expect(cardinalModalInstance._framework.teardown).to.be.calledOnce;
      });
    });
  });
});
