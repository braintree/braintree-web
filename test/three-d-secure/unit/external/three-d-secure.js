'use strict';

var ThreeDSecure = require('../../../../src/three-d-secure/external/three-d-secure');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var BraintreeError = require('../../../../src/lib/error');
var parseUrl = require('url').parse;
var Bus = require('../../../../src/lib/bus');
var deferred = require('../../../../src/lib/deferred');
var VERSION = require('../../../../package.json').version;
var events = require('../../../../src/three-d-secure/shared/events');

function noop() {}

describe('ThreeDSecure', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');

    this.configuration = {
      gatewayConfiguration: {
        assetsUrl: 'http://example.com/assets'
      }
    };
    this.client = {
      request: this.sandbox.stub(),
      getConfiguration: function () { return self.configuration; }
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
  });

  describe('verifyCard', function () {
    beforeEach(function () {
      this.instance = new ThreeDSecure({
        client: this.client
      });
    });

    it('requires an errback', function (done) {
      try {
        this.instance.verifyCard({});
      } catch (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.eql('MERCHANT');
        expect(err.code).to.eql('CALLBACK_REQUIRED');
        expect(err.message).to.eql('verifyCard must include a callback function.');

        done();
      }
    });

    it('can be called multiple times if cancelled in between', function (done) {
      var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};

      this.client.request.yields(null, {
        paymentMethod: {nonce: 'upgraded-nonce'},
        threeDSecureInfo: threeDSecureInfo
      });

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, noop);

      this.instance.cancelVerifyCard();

      this.instance.verifyCard({
        nonce: 'fake-nonce',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function (err, data) {
        expect(data.nonce).to.equal('upgraded-nonce');

        done();
      });
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
              auth_response: '{"paymentMethod":{"type":"CreditCard","nonce":"some-fake-nonce","description":"ending+in+00","consumed":false,"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true,"status":"authenticate_successful","enrolled":"Y"},"details":{"lastTwo":"00","cardType":"Visa"}},"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true},"success":true}' // eslint-disable-line
            }, options);
          })();
        },
        removeFrame: noop
      };

      this.client.request.callsArgWith(1, null, {
        paymentMethod: {},
        lookup: {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md'
        }
      });

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

    it('makes a request to the 3DS lookup endpoint', function (done) {
      var client = this.client;

      client.request.yields(null, {paymentMethod: {}});

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function () {
        expect(client.request).to.be.calledOnce;
        expect(client.request).to.be.calledWithMatch({
          endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
          method: 'post',
          data: {amount: 100}
        }, sinon.match.func);

        done();
      });
    });

    it('handles errors when hitting the 3DS lookup endpoint', function (done) {
      var error = new Error('network error');

      this.client.request.yields(error);

      this.instance.verifyCard({
        nonce: 'abcdef',
        amount: 100,
        addFrame: noop,
        removeFrame: noop
      }, function (err) {
        expect(err).to.eql(error);

        done();
      });
    });

    context('when no authentication is required', function () {
      it('calls the callback with a nonce and verification details', function (done) {
        var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};

        this.client.request.yields(null, {
          paymentMethod: {nonce: 'upgraded-nonce'},
          threeDSecureInfo: threeDSecureInfo
        });

        this.instance.verifyCard({
          nonce: 'nonce-that-does-not-require-authentication',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }, function (err, data) {
          expect(err).not.to.exist;
          expect(data.nonce).to.equal('upgraded-nonce');
          expect(data.verificationDetails).to.equal(threeDSecureInfo);

          done();
        });
      });

      it('does not call iframe-related callbacks', function (done) {
        var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};
        var addFrame = this.sandbox.spy();
        var removeFrame = this.sandbox.spy();

        this.client.request.yields(null, {
          paymentMethod: {nonce: 'upgraded-nonce'},
          threeDSecureInfo: threeDSecureInfo
        });

        this.instance.verifyCard({
          nonce: 'nonce-that-does-not-require-authentication',
          amount: 100,
          addFrame: addFrame,
          removeFrame: removeFrame
        }, function () {
          expect(addFrame).to.not.be.called;
          expect(removeFrame).to.not.be.called;

          done();
        });
      });
    });

    context('when authentication is required', function () {
      it('returns an iframe with the right properties if authentication is needed', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.client.request.callsArgWith(1, null, {
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

            expect(iframe).to.be.an.instanceof(HTMLIFrameElement);
            expect(iframe.width).to.equal('400');
            expect(iframe.height).to.equal('400');
            expect(url.host).to.equal('example.com');

            done();
          },
          removeFrame: noop
        }, function () {
          done(new Error('This should never be called'));
        });
      });

      it('responds to a CONFIGURATION_REQUEST with the right configuration', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.client.request.callsArgWith(1, null, {
          paymentMethod: {},
          lookup: {
            acsUrl: 'http://example.com/acs',
            pareq: 'pareq',
            termUrl: 'http://example.com/term?foo=boo',
            md: 'md'
          }
        });

        threeDSecure.verifyCard({
          nonce: 'abc123',
          amount: 100,
          addFrame: function () {
            var i, configurationRequestHandler;

            for (i = 0; i < Bus.prototype.on.callCount; i++) {
              if (Bus.prototype.on.getCall(i).args[0] === Bus.events.CONFIGURATION_REQUEST) {
                configurationRequestHandler = Bus.prototype.on.getCall(i).args[1];
              }
            }

            configurationRequestHandler(function (data) {
              var authenticationCompleteBaseUrl = threeDSecure._assetsUrl + '/web/' + VERSION + '/html/three-d-secure-authentication-complete-frame.html?channel=';

              expect(data.acsUrl).to.equal('http://example.com/acs');
              expect(data.pareq).to.equal('pareq');
              expect(data.termUrl).to.match(RegExp('^http://example.com/term\\?foo=boo&three_d_secure_version=' + VERSION + '&authentication_complete_base_url=' + encodeURIComponent(authenticationCompleteBaseUrl) + '[a-f0-9-]{36}' + encodeURIComponent('&') + '$'));
              expect(data.parentUrl).to.equal(location.href);

              done();
            });
          },
          removeFrame: noop
        }, function () {
          done(new Error('This should never be called'));
        });
      });

      it('calls removeFrame when receiving an AUTHENTICATION_COMPLETE event', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.client.request.callsArgWith(1, null, {
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
          addFrame: function () {
            var i, authenticationCompleteHandler;

            for (i = 0; i < Bus.prototype.on.callCount; i++) {
              if (Bus.prototype.on.getCall(i).args[0] === events.AUTHENTICATION_COMPLETE) {
                authenticationCompleteHandler = Bus.prototype.on.getCall(i).args[1];
              }
            }

            authenticationCompleteHandler({
              auth_response: '{}'  // eslint-disable-line camelcase
            });
          },
          removeFrame: function () {
            expect(arguments).to.have.lengthOf(0);

            done();
          }
        }, noop);
      });

      it('tears down the bus when receiving an AUTHENTICATION_COMPLETE event', function (done) {
        var threeDSecure = new ThreeDSecure({
          client: this.client
        });

        this.client.request.callsArgWith(1, null, {
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
          addFrame: function () {
            var i, authenticationCompleteHandler;

            for (i = 0; i < Bus.prototype.on.callCount; i++) {
              if (Bus.prototype.on.getCall(i).args[0] === events.AUTHENTICATION_COMPLETE) {
                authenticationCompleteHandler = Bus.prototype.on.getCall(i).args[1];
              }
            }

            authenticationCompleteHandler({
              auth_response: '{}'  // eslint-disable-line camelcase
            });
          },
          removeFrame: function () {
            expect(Bus.prototype.teardown).to.have.been.called;

            done();
          }
        }, noop);
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
              details: {
                last2: 11
              },
              description: 'a description',
              threeDSecureInfo: {
                liabilityShiftPossible: true,
                liabilityShifted: true
              }
            },
            threeDSecureInfo: {
              liabilityShiftPossible: true,
              liabilityShifted: true
            }
          };

          this.client.request.callsArgWith(1, null, {
            paymentMethod: {
              nonce: 'lookup-nonce'
            },
            lookup: {
              acsUrl: 'http://example.com/acs',
              pareq: 'pareq',
              termUrl: 'http://example.com/term',
              md: 'md'
            }
          });

          this.makeAddFrameFunction = function (authResponse) {
            return function () {
              var i, authenticationCompleteHandler;

              for (i = 0; i < Bus.prototype.on.callCount; i++) {
                if (Bus.prototype.on.getCall(i).args[0] === events.AUTHENTICATION_COMPLETE) {
                  authenticationCompleteHandler = Bus.prototype.on.getCall(i).args[1];
                }
              }

              authenticationCompleteHandler({
                auth_response: JSON.stringify(authResponse) // eslint-disable-line camelcase
              });
            };
          };
        });

        it('calls the merchant callback when receiving an AUTHENTICATION_COMPLETE event', function (done) {
          this.threeDSecure.verifyCard({
            nonce: 'abc123',
            amount: 100,
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }, function (err, data) {
            expect(err).not.to.exist;
            expect(data).to.deep.equal({
              nonce: 'auth-success-nonce',
              details: {
                last2: 11
              },
              description: 'a description',
              liabilityShiftPossible: true,
              liabilityShifted: true
            });

            done();
          });
        });

        it('sends back the new nonce if auth is succesful', function (done) {
          this.threeDSecure.verifyCard({
            nonce: 'abc123',
            amount: 100,
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }, function (err, data) {
            expect(err).not.to.exist;
            expect(data.nonce).to.equal('auth-success-nonce');
            expect(data.liabilityShiftPossible).to.equal(true);
            expect(data.liabilityShifted).to.equal(true);

            done();
          });
        });

        it('sends back the lookup nonce if auth is not succesful but liability shift is possible', function (done) {
          delete this.authResponse.success;
          this.authResponse.threeDSecureInfo.liabilityShifted = false;

          this.threeDSecure.verifyCard({
            nonce: 'abc123',
            amount: 100,
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }, function (err, data) {
            expect(err).not.to.exist;
            expect(data.nonce).to.equal('lookup-nonce');
            expect(data.liabilityShiftPossible).to.equal(true);
            expect(data.liabilityShifted).to.equal(false);

            done();
          });
        });

        it('sends back an error if it exists', function (done) {
          delete this.authResponse.success;
          this.authResponse.threeDSecureInfo.liabilityShiftPossible = false;
          this.authResponse.error = {
            message: 'an error'
          };

          this.threeDSecure.verifyCard({
            nonce: 'abc123',
            amount: 100,
            addFrame: this.makeAddFrameFunction(this.authResponse),
            removeFrame: noop
          }, function (err, data) {
            expect(data).not.to.exist;

            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.eql(BraintreeError.types.UNKNOWN);
            expect(err.message).to.eql('an error');

            done();
          });
        });
      });
    });
  });

  describe('cancelVerifyCard', function () {
    beforeEach(function () {
      this.threeDS = new ThreeDSecure({client: this.client});
    });

    it('does not require a callback', function () {
      expect(function () {
        this.threeDS.cancelVerifyCard();
      }.bind(this)).to.not.throw();
    });

    it('sets _verifyCardInProgress to false', function (done) {
      this.threeDS._verifyCardInProgress = true;

      this.threeDS.cancelVerifyCard(function () {
        expect(this.threeDS._verifyCardInProgress).to.equal(false);

        done();
      }.bind(this));
    });

    it('passes back an error if there is no _lookupPaymentMethod', function (done) {
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
        liabilityShiftPossible: true,
        liabilityShifted: false
      };

      this.threeDS.cancelVerifyCard(function (err, response) {
        expect(response.nonce).to.eql('fake-nonce');
        expect(response.liabilityShiftPossible).to.eql(true);
        expect(response.liabilityShifted).to.eql(false);

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
        expect(analytics.sendEvent).to.have.been.calledWith(threeDS._options.client, 'web.threedsecure.teardown-completed');
        done();
      });
    });

    it('does not require a callback', function () {
      var threeDS = this.threeDS;

      expect(function () {
        threeDS.teardown();
      }).to.not.throw();
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var threeDS = this.threeDS;

      threeDS.teardown(function () {
        methods(ThreeDSecure.prototype).forEach(function (method) {
          try {
            threeDS[method]();
          } catch (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal(BraintreeError.types.MERCHANT);
            expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
            expect(err.message).to.equal(method + ' cannot be called after teardown.');
          }

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
  });
});
