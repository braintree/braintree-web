'use strict';

var BaseFramework = require('../../../../../src/three-d-secure/external/frameworks/base');
var LegacyFramework = require('../../../../../src/three-d-secure/external/frameworks/legacy');
var Bus = require('../../../../../src/lib/bus');
var BraintreeError = require('../../../../../src/lib/braintree-error');
var VERSION = require('../../../../../package.json').version;
var parseUrl = require('url').parse;
var analytics = require('../../../../../src/lib/analytics');
var fake = require('../../../../helpers/fake');
var events = require('../../../../../src/three-d-secure/shared/events');
var rejectIfResolves = require('../../../../helpers/promise-helper').rejectIfResolves;

function noop() {}

function getBusHandler(eventName) {
  return Bus.prototype.on.withArgs(eventName).args[0][1];
}

describe('LegacyFramework', function () {
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
  });

  describe('verifyCard', function () {
    beforeEach(function () {
      this.instance = new LegacyFramework({
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

    context('required params', function () {
      it('requires addFrame', function () {
        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          removeFrame: noop
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include an addFrame function.');
        });
      });

      it('requires removeFrame', function () {
        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          addFrame: noop
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include a removeFrame function.');
        });
      });
    });

    context('multiple calls', function () {
      it('can be called multiple times if canceled in between', function (done) {
        var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};
        var self = this;

        this.lookupResponse.lookup.acsUrl = 'https://example.com';
        this.lookupResponse.paymentMethod = {
          nonce: 'upgraded-nonce',
          threeDSecureInfo: threeDSecureInfo
        };
        this.lookupResponse.threeDSecureInfo = threeDSecureInfo;

        this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100,
          addFrame: function () {
            self.instance.cancelVerifyCard().then(function () {
              delete self.lookupResponse.lookup.acsUrl;

              return self.instance.verifyCard({
                nonce: 'fake-nonce',
                amount: 100,
                addFrame: noop,
                removeFrame: noop
              }).then(function (data) {
                expect(data.nonce).to.equal('upgraded-nonce');

                done();
              });
            });
          },
          removeFrame: noop
        });
      });

      it('cannot be called twice without cancelling in between', function (done) {
        var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};
        var self = this;

        this.lookupResponse.lookup.acsUrl = 'https://example.com';
        this.lookupResponse.paymentMethod = {
          nonce: 'upgraded-nonce',
          threeDSecureInfo: threeDSecureInfo
        };
        this.lookupResponse.threeDSecureInfo = threeDSecureInfo;

        this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100,
          addFrame: function () {
            delete self.lookupResponse.lookup.acsUrl;

            self.instance.verifyCard({
              nonce: 'fake-nonce',
              amount: 100,
              addFrame: noop,
              removeFrame: noop
            }).then(rejectIfResolves).catch(function (err) {
              expect(err).to.be.an.instanceof(BraintreeError);
              expect(err.type).to.eql('MERCHANT');
              expect(err.code).to.eql('THREEDS_AUTHENTICATION_IN_PROGRESS');
              expect(err.message).to.eql('Cannot call verifyCard while existing authentication is in progress.');

              done();
            });
          },
          removeFrame: noop
        });
      });
    });

    context('lookup request', function () {
      it('makes a request to the 3DS lookup endpoint with additional (legacy) customer data', function () {
        var self = this;

        this.client.request.resolves({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: '1.0.2'
          }
        });

        return this.instance.verifyCard({
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
        }).then(function () {
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
        });
      });

      it('defaults showLoader to true in initializeChallengeWithLookupResponse', function () {
        var self = this;
        var lookupResponse = this.lookupResponse;

        this.sandbox.spy(this.instance, 'initializeChallengeWithLookupResponse');

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }).then(function () {
          expect(self.instance.initializeChallengeWithLookupResponse).to.be.calledOnce;
          expect(self.instance.initializeChallengeWithLookupResponse).to.be.calledWithMatch(lookupResponse, {
            showLoader: true,
            addFrame: self.sandbox.match.func,
            removeFrame: self.sandbox.match.func
          });
        });
      });

      it('can opt out of loader in initializeChallengeWithLookupResponse', function () {
        var self = this;
        var lookupResponse = this.lookupResponse;

        this.sandbox.spy(this.instance, 'initializeChallengeWithLookupResponse');

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          showLoader: false,
          addFrame: noop,
          removeFrame: noop
        }).then(function () {
          expect(self.instance.initializeChallengeWithLookupResponse).to.be.calledOnce;
          expect(self.instance.initializeChallengeWithLookupResponse).to.be.calledWithMatch(lookupResponse, {
            showLoader: false,
            addFrame: self.sandbox.match.func,
            removeFrame: self.sandbox.match.func
          });
        });
      });
    });
  });

  describe('initializeChallengeWithLookupResponse', function () {
    beforeEach(function () {
      this.instance = new LegacyFramework({
        client: this.client
      });
    });

    it('responds to a CONFIGURATION_REQUEST with the right configuration', function (done) {
      var instance = this.instance;
      var lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term?foo=boo',
          md: 'md'
        }
      };

      instance.initializeChallengeWithLookupResponse(lookupResponse, {
        addFrame: function () {
          var configurationRequestHandler = getBusHandler(Bus.events.CONFIGURATION_REQUEST);

          configurationRequestHandler(function (data) {
            var authenticationCompleteBaseUrl = instance._assetsUrl + '/html/three-d-secure-authentication-complete-frame.html?channel=';

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

      return this.instance.initializeChallengeWithLookupResponse(lookupResponse, {
        addFrame: function () {
          var authenticationCompleteHandler = getBusHandler(events.AUTHENTICATION_COMPLETE);

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
      var lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md'
        }
      };

      this.instance.initializeChallengeWithLookupResponse(lookupResponse, {
        addFrame: function () {
          var authenticationCompleteHandler = getBusHandler(events.AUTHENTICATION_COMPLETE);

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

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        addFrame: addFrame,
        removeFrame: removeFrame
      }).then(function () {
        expect(addFrame).to.not.be.called;
        expect(removeFrame).to.not.be.called;
      });
    });

    it('returns an iframe with the right properties if authentication is needed', function (done) {
      this.lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md'
        }
      };

      this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
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

    it('can show loader', function (done) {
      this.lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md'
        }
      };

      this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        showLoader: true,
        addFrame: function (err, iframe) {
          var url = parseUrl(iframe.src);

          expect(url.search).to.include('showLoader=true');

          done();
        },
        removeFrame: noop
      }).then(function () {
        done(new Error('This should never be called'));
      });
    });

    it('can opt out of loader', function (done) {
      this.lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md'
        }
      };

      this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
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

    context('Verify card resolution', function () {
      beforeEach(function () {
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
              threeDSecureVersion: '1.0.2'
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
            var authenticationCompleteHandler = getBusHandler(events.AUTHENTICATION_COMPLETE);

            authenticationCompleteHandler({
              auth_response: JSON.stringify(authResponse) // eslint-disable-line camelcase
            });
          };
        };
      });

      it('resolves when receiving an AUTHENTICATION_COMPLETE event', function () {
        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
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
              threeDSecureVersion: '1.0.2'
            }
          });
        });
      });

      it('replaces + with a space in description parameter', function () {
        this.authResponse.paymentMethod.description = 'A+description+with+pluses';

        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
          addFrame: this.makeAddFrameFunction(this.authResponse),
          removeFrame: noop
        }).then(function (data) {
          expect(data.description).to.equal('A description with pluses');
        });
      });

      it('sends back the new nonce if auth is successful', function () {
        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
          addFrame: this.makeAddFrameFunction(this.authResponse),
          removeFrame: noop
        }).then(function (data) {
          expect(data.nonce).to.equal('auth-success-nonce');
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
        });
      });

      it('sends back the lookup nonce if auth is not successful but liability shift is possible', function () {
        delete this.authResponse.success;
        this.authResponse.threeDSecureInfo.liabilityShifted = false;

        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
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

        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
          addFrame: this.makeAddFrameFunction(this.authResponse),
          removeFrame: noop
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql(BraintreeError.types.UNKNOWN);
          expect(err.message).to.eql('an error');
        });
      });

      it('sends analytics events for failed liability shift', function () {
        this.authResponse.threeDSecureInfo.liabilityShifted = false;
        this.authResponse.threeDSecureInfo.liabilityShiftPossible = false;

        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
          addFrame: this.makeAddFrameFunction(this.authResponse),
          removeFrame: noop
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shifted.false');
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shift-possible.false');
        }.bind(this));
      });
    });
  });

  describe('cancelVerifyCard', function () {
    it('is identical to BaseFramework', function () {
      expect(LegacyFramework.prototype.cancelVerifyCard).to.equal(BaseFramework.prototype.cancelVerifyCard);
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.framework = new LegacyFramework({client: this.client});
    });

    it('does not attempt to tear down bus if it does not exist', function () {
      return this.framework.teardown().then(function () {
        expect(Bus.prototype.teardown).to.not.be.called;
      });
    });

    it('tears down bus if it exists', function () {
      var framework = this.framework;

      framework._bus = new Bus({
        channel: 'foo',
        merchantUrl: 'bar'
      });

      return framework.teardown().then(function () {
        expect(framework._bus.teardown).to.be.calledOnce;
      });
    });

    it('does not attempt to remove iframe from DOM if there is no iframe on instance', function () {
      this.sandbox.spy(document.body, 'removeChild');

      return this.framework.teardown().then(function () {
        expect(document.body.removeChild).to.not.be.called;
      });
    });

    it('does not remove iframe from DOM if it is not in the DOM', function () {
      var iframe = document.createElement('iframe');

      this.framework._bankIframe = iframe;
      this.sandbox.spy(document.body, 'removeChild');

      return this.framework.teardown().then(function () {
        expect(document.body.removeChild).to.not.be.called;
      });
    });

    it('removes bank iframe', function () {
      var iframe = document.createElement('iframe');

      this.sandbox.spy(document.body, 'removeChild');

      document.body.appendChild(iframe);

      this.framework._bankIframe = iframe;

      return this.framework.teardown().then(function () {
        expect(document.body.contains(iframe)).to.equal(false);
        expect(document.body.removeChild).to.be.calledOnce;
        expect(document.body.removeChild).to.be.calledWith(iframe);
      });
    });
  });
});
