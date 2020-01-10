'use strict';

var CardinalModalFramework = require('../../../../../src/three-d-secure/external/frameworks/cardinal-modal');
var analytics = require('../../../../../src/lib/analytics');
var fake = require('../../../../helpers/fake');
var assets = require('../../../../../src/lib/assets');

describe('CardinalModalFramework', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');

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
  });

  describe('setupSongbird', function () {
    beforeEach(function () {
      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('creates a cardinal style modal for v1 fallback', function () {
      var framework;

      this.sandbox.stub(assets, 'loadScript').rejects(new Error('failed'));

      framework = new CardinalModalFramework({
        client: this.client
      });

      return framework.setupSongbird().then(function () {
        var iframe = document.createElement('iframe');
        var modal = framework._createV1IframeModal(iframe);

        expect(modal.querySelector('[data-braintree-v1-fallback-iframe-container]')).to.exist;
        expect(modal.querySelector('[data-braintree-v1-fallback-iframe-container] iframe')).to.equal(iframe);
      });
    });

    it('closes the modal when close button is clicked', function () {
      var framework;

      this.sandbox.stub(assets, 'loadScript').rejects(new Error('failed'));

      framework = new CardinalModalFramework({
        client: this.client
      });

      this.sandbox.stub(framework, 'cancelVerifyCard');

      return framework.setupSongbird().then(function () {
        var iframe = document.createElement('iframe');
        var modal = framework._createV1IframeModal(iframe);
        var btn = modal.querySelector('[data-braintree-v1-fallback-close-button]');

        document.body.appendChild(modal);

        btn.click();

        expect(framework.cancelVerifyCard).to.be.calledOnce;
        expect(framework.cancelVerifyCard).to.be.calledWithMatch({
          code: 'THREEDS_CARDINAL_SDK_CANCELED'
        });
        expect(document.body.querySelector('[data-braintree-v1-fallback-iframe-container]')).to.not.exist;
      });
    });

    it('closes the modal when backdrop is clicked', function () {
      var framework;

      this.sandbox.stub(assets, 'loadScript').rejects(new Error('failed'));

      framework = new CardinalModalFramework({
        client: this.client
      });

      this.sandbox.stub(framework, 'cancelVerifyCard');

      return framework.setupSongbird().then(function () {
        var iframe = document.createElement('iframe');
        var modal = framework._createV1IframeModal(iframe);
        var backdrop = modal.querySelector('[data-braintree-v1-fallback-backdrop]');

        document.body.appendChild(modal);

        backdrop.click();

        expect(framework.cancelVerifyCard).to.be.calledOnce;
        expect(framework.cancelVerifyCard).to.be.calledWithMatch({
          code: 'THREEDS_CARDINAL_SDK_CANCELED'
        });
        expect(document.body.querySelector('[data-braintree-v1-fallback-iframe-container]')).to.not.exist;
      });
    });

    // TODO doesn't work in Karma, enable this when using Jest instead
    // it('pressing escape key closes the modal', function () {
    //   var framework;
    //
    //   this.sandbox.stub(assets, 'loadScript').rejects(new Error('failed'));
    //
    //   framework = new CardinalModalFramework({
    //     client: this.client
    //   });
    //
    //   this.sandbox.stub(framework, 'cancelVerifyCard');
    //
    //   return framework.setupSongbird().then(function () {
    //     var iframe = document.createElement('iframe');
    //     var modal = framework._createV1IframeModal(iframe);
    //
    //     document.body.appendChild(modal);
    //
    //     document.dispatchEvent(new KeyboardEvent('keyup', {
    //       key: 'Escape'
    //     }));
    //
    //     expect(framework.cancelVerifyCard).to.be.calledOnce;
    //     expect(framework.cancelVerifyCard).to.be.calledWithMatch({
    //       code: 'THREEDS_CARDINAL_SDK_CANCELED'
    //     });
    //     expect(document.body.querySelector('[data-braintree-v1-fallback-iframe-container]')).to.not.exist;
    //   });
    // });
  });
});
