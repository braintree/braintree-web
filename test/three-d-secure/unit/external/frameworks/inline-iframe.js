'use strict';

var InlineIframeFramework = require('../../../../../src/three-d-secure/external/frameworks/inline-iframe');
var SongbirdFramework = require('../../../../../src/three-d-secure/external/frameworks/songbird');
var rejectIfResolves = require('../../../../helpers/promise-helper').rejectIfResolves;
var analytics = require('../../../../../src/lib/analytics');
var fake = require('../../../../helpers/fake');
var wait = require('../../../../helpers/promise-helper').wait;
var assets = require('../../../../../src/lib/assets');

function callsNext(data, next) {
  next();
}

describe('InlineIframeFramework', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(InlineIframeFramework.prototype, 'setupSongbird');

    this.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: 'encoded_auth_fingerprint',
      gatewayConfiguration: {
        assetsUrl: 'http://example.com/assets',
        threeDSecure: {
          cardinalAuthenticationJWT: 'jwt'
        }
      }
    };
    this.client = {
      request: this.sandbox.stub().resolves(),
      getConfiguration: function () { return self.configuration; }
    };
    this.fakeCardinal = {
      configure: this.sandbox.stub(),
      setup: this.sandbox.stub(),
      on: this.sandbox.stub(),
      trigger: this.sandbox.stub().resolves({Status: false}),
      'continue': this.sandbox.stub()
    };
    this.sandbox.stub(assets, 'loadScript').callsFake(function () {
      global.Cardinal = self.fakeCardinal;

      // allow a slight delay so timing tests can run
      return wait(5);
    });
  });

  describe('setUpEventListeners', function () {
    it('sets up Songbird framework listeners', function () {
      var options = {
        client: this.client
      };
      var framework = new InlineIframeFramework(options);
      var spy = this.sandbox.stub();

      this.sandbox.stub(SongbirdFramework.prototype, 'setUpEventListeners');

      framework.setUpEventListeners(spy);

      expect(SongbirdFramework.prototype.setUpEventListeners).to.be.calledOnce;
      expect(SongbirdFramework.prototype.setUpEventListeners).to.be.calledWith(spy);
    });

    it('sets up listener for on authentication iframe available event', function (done) {
      var options = {
        client: this.client
      };
      var framework = new InlineIframeFramework(options);

      this.sandbox.stub(framework, 'on').withArgs('inline-iframe-framework:AUTHENTICATION_IFRAME_AVAILABLE').yieldsAsync('some data', 'a fake function');

      framework.setUpEventListeners(function (eventName, data, fakeFunction) {
        expect(eventName).to.equal('authentication-iframe-available');
        expect(data).to.equal('some data');
        expect(fakeFunction).to.equal('a fake function');

        done();
      });
    });
  });

  describe('setupSongbird', function () {
    beforeEach(function () {
      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});

      this.tds = new InlineIframeFramework({
        client: this.client
      });
      InlineIframeFramework.prototype.setupSongbird.restore();
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('configures Cardinal to use inline framework', function () {
      var framework = new InlineIframeFramework({
        client: this.client
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWith({
          payment: {
            framework: 'inline'
          }
        });
      });
    });

    it('configures Cardinal to use verbose logging and the inline framework', function () {
      var framework = new InlineIframeFramework({
        client: this.client,
        loggingEnabled: true
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWith({
          payment: {
            framework: 'inline'
          },
          logging: {
            level: 'verbose'
          }
        });
      });
    });

    it('configures Cardinal to include a listener for `ui.inline.setup` when `inline-iframe` framework is used', function () {
      var framework = new InlineIframeFramework({
        client: this.client
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.on).to.be.calledWith('ui.inline.setup');
      });
    });
  });

  describe('initializeChallengeWithLookupResponse', function () {
    beforeEach(function () {
      var self = this;

      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});
      this.lookupResponse = {
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
      this.client.request.resolves({
        threeDSecure: {},
        lookup: {},
        paymentMethod: {}
      });
      this.validationArgs = [{
        ActionCode: 'SUCCESS'
      }, 'jwt'];
      this.failureArgs = [{
        ActionCode: 'ERROR'
      }];
      this.htmlTemplate = '<div><iframe></iframe></div>';
      this.iframeDetails = {
        paymentType: 'CCA',
        data: {
          mode: 'static'
        }
      };
      this.resolveFunction = this.sandbox.stub().callsFake(function () {
        var handler = self.fakeCardinal.on.withArgs('payments.validated').args[0][1];

        handler.apply(null, self.validationArgs);
      });
      this.rejectFunction = this.sandbox.stub().callsFake(function () {
        var handler = self.fakeCardinal.on.withArgs('payments.validated').args[0][1];

        handler.apply(null, self.failureArgs);
      });

      this.instance = new InlineIframeFramework({
        client: this.client,
        framework: 'inline-iframe'
      });

      InlineIframeFramework.prototype.setupSongbird.restore();

      this.fakeCardinal.continue.callsFake(function () {
        wait(5).then(function () {
          var handler = self.fakeCardinal.on.withArgs('ui.inline.setup').args[0][1];

          handler(self.htmlTemplate, self.iframeDetails, self.resolveFunction, self.rejectFunction);
        });
      });

      return this.instance.setupSongbird();
    });

    it('rejects if no html template is available', function () {
      delete this.htmlTemplate;

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_ERROR');
      });
    });

    it('rejects if no details are available', function () {
      delete this.iframeDetails;

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_ERROR');
      });
    });

    it('rejects if paymentType is not CCA (customer card authentication)', function () {
      this.iframeDetails.paymentType = 'foo';

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_ERROR');
      });
    });

    it('rejects if mode is not static or suppress', function () {
      this.iframeDetails.data.mode = 'foo';

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_ERROR');
      });
    });

    it('adds element to page and calls resolve callback automatically when mode is suppress', function () {
      var self = this;

      this.sandbox.stub(document.body, 'appendChild');
      this.iframeDetails.data.mode = 'suppress';

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      }).then(function () {
        var domNode = document.body.appendChild.args[0][0];

        expect(self.resolveFunction).to.be.calledOnce;
        expect(document.body.appendChild).to.be.calledOnce;
        expect(domNode.querySelector('iframe')).to.exist;
        expect(domNode.style.display).to.equal('none');
      });
    });

    it('passes iframe to merchant and waits for merchant to resolve when mode is static', function (done) {
      var self = this;

      this.sandbox.stub(document.body, 'appendChild');
      this.iframeDetails.data.mode = 'static';

      this.instance.on('inline-iframe-framework:AUTHENTICATION_IFRAME_AVAILABLE', function (payload, next) {
        expect(self.resolveFunction).to.not.be.called;
        expect(payload.element.querySelector('iframe')).to.exist;

        next();

        expect(self.resolveFunction).to.be.calledOnce;

        done();
      });

      this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      });
    });

    it('passes iframe to merchant for v1 fallback', function (done) {
      var framework;

      assets.loadScript.rejects(new Error('failed'));

      framework = new InlineIframeFramework({
        client: this.client
      });

      framework.setupSongbird();

      framework.on('inline-iframe-framework:AUTHENTICATION_IFRAME_AVAILABLE', function (payload, next) {
        expect(payload.element.querySelector('[data-braintree-v1-fallback-iframe-container="true"] iframe')).to.exist;

        next();

        done();
      });

      framework.initializeChallengeWithLookupResponse(this.lookupResponse, {
        onLookupComplete: callsNext
      });
    });
  });
});
