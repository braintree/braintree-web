'use strict';

var BaseFramework = require('../../../../../src/three-d-secure/external/frameworks/base');
var Bus = require('../../../../../src/lib/bus');
var BraintreeError = require('../../../../../src/lib/braintree-error');
var analytics = require('../../../../../src/lib/analytics');
var fake = require('../../../../helpers/fake');
var events = require('../../../../../src/three-d-secure/shared/events');
var rejectIfResolves = require('../../../../helpers/promise-helper').rejectIfResolves;

function noop() {}

function getBusHandler(eventName) {
  return Bus.prototype.on.withArgs(eventName).args[0][1];
}

describe('BaseFramework', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');
    this.Framework = function Framework(options) {
      BaseFramework.call(this, options);
    };
    this.Framework.prototype = Object.create(BaseFramework.prototype, {
      constructor: this.Framework
    });
    this.Framework.prototype._checkForFrameworkSpecificVerifyCardErrors = function () {
      return null;
    };
    this.Framework.prototype._presentChallenge = function () {
      this._verifyCardPromisePlus.resolve({
        nonce: 'some-fake-nonce',
        liabilityShifted: true,
        liabilityShiftPossible: true
      });
    };

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
      this.instance = new this.Framework({
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
      it('requires a nonce', function () {
        return this.instance.verifyCard({
          amount: 100
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include a nonce.');
        });
      });

      it('requires an amount', function () {
        return this.instance.verifyCard({
          nonce: 'abcdef'
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include an amount.');
        });
      });
    });

    context('lookup errors', function () {
      it('handles errors when hitting the 3DS lookup endpoint', function () {
        var error = new Error('network error');

        this.client.request.rejects(error);

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.details.originalError).to.eql(error);
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.code).to.equal('THREEDS_LOOKUP_ERROR');
        });
      });

      it('sends an analytics event for unknown lookup error', function () {
        var error = new Error('network error');

        this.client.request.rejects(error);

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100
        }).catch(function (err) {
          expect(err.details.originalError.message).to.equal('network error');
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.lookup-failed');
        }.bind(this));
      });

      it('rejects with a lookup error when lookup 404s', function () {
        var err = new Error('failure');

        err.details = {
          httpStatus: 404
        };

        this.client.request.rejects(err);

        return this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        }).then(rejectIfResolves).catch(function (lookupError) {
          expect(lookupError).to.be.an.instanceof(BraintreeError);
          expect(lookupError.code).to.equal('THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR');
        });
      });

      it('sends an analytics event for missing nonce', function () {
        var err = new Error('failure');

        err.details = {
          httpStatus: 404
        };

        this.client.request.rejects(err);

        return this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        }).catch(function (verifyError) {
          expect(verifyError.details.originalError.message).to.equal('failure');
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.lookup-failed.404');
        }.bind(this));
      });

      it('rejects with a lookup error when lookup 422s', function () {
        var err = new Error('failure');

        err.details = {
          httpStatus: 422
        };

        this.client.request.rejects(err);

        return this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        }).then(rejectIfResolves).catch(function (lookupError) {
          expect(lookupError).to.be.an.instanceof(BraintreeError);
          expect(lookupError.code).to.equal('THREEDS_LOOKUP_VALIDATION_ERROR');
        });
      });

      it('sends an analytics event when lookup 422s', function () {
        var err = new Error('failure');

        err.details = {
          httpStatus: 422
        };

        this.client.request.rejects(err);

        return this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        }).catch(function (verifyError) {
          expect(verifyError.details.originalError.message).to.equal('failure');
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.lookup-failed.422');
        }.bind(this));
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
        this.Framework.prototype._presentChallenge = function () {
          self.instance.cancelVerifyCard().then(function () {
            delete self.lookupResponse.lookup.acsUrl;

            return self.instance.verifyCard({
              nonce: 'fake-nonce',
              amount: 100
            }).then(function (data) {
              expect(data.nonce).to.equal('upgraded-nonce');

              done();
            });
          });
        };

        this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        });
      });

      it('can be called multiple times if first request failed', function () {
        var self = this;

        this.client.request.rejects(new Error('failure'));

        return this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        }).catch(function (err) {
          expect(err.details.originalError.message).to.equal('failure');
        }).then(function () {
          self.client.request.resolves(self.lookupResponse);

          return self.instance.verifyCard({
            nonce: 'fake-nonce',
            amount: 100
          });
        }).then(function (data) {
          expect(data.nonce).to.equal('upgraded-nonce');
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
        this.Framework.prototype._presentChallenge = function () {
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
        };

        this.instance.verifyCard({
          nonce: 'fake-nonce',
          amount: 100
        });
      });

      it('can be called multiple times if authentication completes in between', function () {
        var instance = this.instance;

        var options = {
          nonce: 'abc123',
          amount: 100
        };

        this.Framework.prototype._presentChallenge = function () {
          this._verifyCardPromisePlus.resolve({
            nonce: 'some-fake-nonce',
            liabilityShifted: true,
            liabilityShiftPossible: true
          });
        };
        this.lookupResponse.lookup = {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md',
          threeDSecureVersion: '1.0.2'
        };

        return instance.verifyCard(options).then(function (data) {
          expect(data.nonce).to.equal('some-fake-nonce');
          expect(data.liabilityShifted).to.equal(true);
          expect(data.liabilityShiftPossible).to.equal(true);

          return instance.verifyCard(options);
        }).then(function (data2) {
          expect(data2.nonce).to.equal('some-fake-nonce');
          expect(data2.liabilityShifted).to.equal(true);
          expect(data2.liabilityShiftPossible).to.equal(true);
        });
      });
    });

    context('lookup request', function () {
      it('makes a request to the 3DS lookup endpoint', function () {
        var self = this;

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }).then(function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              amount: 100
            }
          });
        });
      });

      it('sends analytics events for successful verification', function () {
        var self = this;

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          showLoader: false,
          addFrame: noop,
          removeFrame: noop
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.started');
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.3ds-version.1.0.2');
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.completed');
        });
      });

      it('sends analytics events for failed 3ds verifications', function () {
        var self = this;

        this.client.request.rejects(new Error('error'));

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          showLoader: false,
          addFrame: noop,
          removeFrame: noop
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.details.originalError.message).to.equal('error');
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.started');
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.failed');
          expect(analytics.sendEvent).to.not.be.calledWith(self.client, 'three-d-secure.verification-flow.3ds-version.1.0.2');
          expect(analytics.sendEvent).to.not.be.calledWith(self.client, 'three-d-secure.verification-flow.completed');
        });
      });

      it('retains verification details object for backwards compatibility in payload', function () {
        delete this.lookupResponse.lookup.acsUrl;

        return this.instance.verifyCard({
          nonce: 'nonce-that-does-not-require-authentication',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }).then(function (data) {
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
        });
      });

      it('resolves with a nonce and verification details', function () {
        delete this.lookupResponse.lookup.acsUrl;

        return this.instance.verifyCard({
          nonce: 'nonce-that-does-not-require-authentication',
          amount: 100,
          addFrame: noop,
          removeFrame: noop
        }).then(function (data) {
          expect(data.nonce).to.equal('upgraded-nonce');
          expect(data.details).to.deep.equal({cardType: 'Visa'});
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
        });
      });
    });
  });

  describe('initializeChallengeWithLookupResponse', function () {
    beforeEach(function () {
      this.instance = new this.Framework({
        client: this.client
      });
    });

    it('does not call present challenge when no authentication is required', function () {
      var threeDSecureInfo = {liabilityShiftPossible: true, liabilityShifted: true};

      this.lookupResponse = {
        paymentMethod: {nonce: 'upgraded-nonce'},
        threeDSecureInfo: threeDSecureInfo
      };

      this.sandbox.spy(this.instance, '_presentChallenge');

      return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
      }).then(function () {
        expect(this.instance._presentChallenge).to.not.be.called;
      }.bind(this));
    });

    context('Verify card callback', function () {
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

      it('sends analytics events for successful liability shift', function () {
        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.true');
          expect(analytics.sendEvent).to.not.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.false');
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shifted.true');
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.liability-shift-possible.true');
        }.bind(this));
      });

      it('sends analytics events when no challenge is presented', function () {
        delete this.lookupResponse.lookup.acsUrl;

        return this.instance.initializeChallengeWithLookupResponse(this.lookupResponse, {
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.false');
          expect(analytics.sendEvent).to.not.be.calledWith(this.client, 'three-d-secure.verification-flow.challenge-presented.true');
        }.bind(this));
      });
    });
  });

  describe('cancelVerifyCard', function () {
    beforeEach(function () {
      this.framework = new this.Framework({client: this.client});
      this.framework._verifyCardInProgress = true;
      this.framework._lookupPaymentMethod = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        }
      };
    });

    it('sets _verifyCardInProgress to false', function () {
      this.framework._verifyCardInProgress = true;

      this.framework.cancelVerifyCard().then(function () {
        expect(this.framework._verifyCardInProgress).to.equal(false);
      }.bind(this));
    });

    it('passes back an error if there is no initial lookup payment method', function () {
      delete this.framework._lookupPaymentMethod;

      return this.framework.cancelVerifyCard().then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.MERCHANT);
        expect(err.code).to.eql('THREEDS_NO_VERIFICATION_PAYLOAD');
        expect(err.message).to.equal('No verification payload available.');
      });
    });

    it('passes back the result of the initial lookup', function () {
      this.framework._lookupPaymentMethod = {
        nonce: 'fake-nonce',
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false
        }
      };

      return this.framework.cancelVerifyCard().then(function (response) {
        expect(response.nonce).to.eql('fake-nonce');
        expect(response.liabilityShiftPossible).to.eql(true);
        expect(response.liabilityShifted).to.eql(false);
      });
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.framework = new this.Framework({client: this.client});
    });

    it('calls teardown analytic', function () {
      var client = this.client;

      return this.framework.teardown().then(function () {
        expect(analytics.sendEvent).to.be.calledWith(client, 'three-d-secure.teardown-completed');
      });
    });

    it('tears down v1Bus if it exists', function () {
      var bus = {
        teardown: this.sandbox.stub()
      };

      this.framework._v1Bus = bus;

      return this.framework.teardown().then(function () {
        expect(bus.teardown).to.be.calledOnce;
      });
    });

    it('does not teardown bankFrame if is has no parent node', function () {
      var iframe = {
        parentNode: {
          removeChild: this.sandbox.stub()
        }
      };

      this.framework._v1Iframe = iframe;

      return this.framework.teardown().then(function () {
        expect(iframe.parentNode.removeChild).to.be.calledOnce;
        expect(iframe.parentNode.removeChild).to.be.calledWith(iframe);
      });
    });

    it('does not teardown bankFrame if is has no parent node', function () {
      var iframe = {};

      this.framework._v1Iframe = iframe;

      return this.framework.teardown().catch(function () {
        throw new Error('Did not expect teardown to error');
      });
    });
  });
});
