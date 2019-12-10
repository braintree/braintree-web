'use strict';

var BaseFramework = require('../../../../../src/three-d-secure/external/frameworks/base');
var SongbirdFramework = require('../../../../../src/three-d-secure/external/frameworks/songbird');
var Promise = require('../../../../../src/lib/promise');
var rejectIfResolves = require('../../../../helpers/promise-helper').rejectIfResolves;
var BraintreeError = require('../../../../../src/lib/braintree-error');
var VERSION = require('../../../../../package.json').version;
var analytics = require('../../../../../src/lib/analytics');
var fake = require('../../../../helpers/fake');
var wait = require('../../../../helpers/promise-helper').wait;
var constants = require('../../../../../src/lib/constants');
var assets = require('../../../../../src/lib/assets');

function callsNext(data, next) {
  next();
}

describe('SongbirdFramework', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(SongbirdFramework.prototype, 'setupSongbird');

    this.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: 'encoded_auth_fingerprint',
      gatewayConfiguration: {
        environment: 'sandbox',
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

  describe('Constructor', function () {
    it('adds sdkVersion to clientMetadata', function () {
      var options = {
        client: this.client
      };
      var framework = new SongbirdFramework(options);

      expect(framework._clientMetadata.sdkVersion).to.equal(constants.PLATFORM + '/' + VERSION);
    });

    it('adds requestedThreeDSVersion to clientMetadata as "2"', function () {
      var options = {
        client: this.client
      };
      var framework = new SongbirdFramework(options);

      expect(framework._clientMetadata.requestedThreeDSecureVersion).to.equal('2');
    });

    it('sets up songbird when instance is created', function () {
      var options = {
        client: this.client
      };
      var framework = new SongbirdFramework(options);

      expect(framework.setupSongbird).to.be.calledOnce;
    });
  });

  describe('setUpEventListeners', function () {
    it('sets up listener for on lookup complete event', function (done) {
      var options = {
        client: this.client
      };
      var framework = new SongbirdFramework(options);

      this.sandbox.stub(framework, 'on').yieldsAsync('some data', 'a fake function');

      framework.setUpEventListeners(function (eventName, data, fakeFunction) {
        expect(eventName).to.equal('lookup-complete');
        expect(data).to.equal('some data');
        expect(fakeFunction).to.equal('a fake function');

        done();
      });
    });
  });

  describe('verifyCard', function () {
    beforeEach(function () {
      this.instance = new SongbirdFramework({
        client: this.client
      });

      this.lookupResponse = {
        paymentMethod: {
          nonce: 'upgraded-nonce',
          details: {
            bin: '123456',
            cardType: 'Visa'
          }
        },
        lookup: {
          threeDSecureVersion: '2.1.0'
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        }
      };
      this.client.request.resolves(this.lookupResponse);
      this.tokenizedCard = {
        nonce: 'abcdef',
        details: {
          bin: '123456',
          cardType: 'Visa'
        }
      };
      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({
        sessionId: 'df'
      });
      SongbirdFramework.prototype.setupSongbird.restore();

      this.sandbox.stub(assets, 'loadScript').callsFake(function () {
        global.Cardinal = this.fakeCardinal;

        return Promise.resolve();
      }.bind(this));

      return this.instance.setupSongbird();
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    context('required params', function () {
      it('requires an onLookupComplete function', function () {
        this.sandbox.stub(this.instance, 'getDfReferenceId').resolves('df-id');

        return this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.eql('MERCHANT');
          expect(err.code).to.eql('THREEDS_MISSING_VERIFY_CARD_OPTION');
          expect(err.message).to.eql('verifyCard options must include an onLookupComplete function.');
        });
      });

      it('it does not require an onLookupComplete function if override is passed into additional options', function () {
        this.sandbox.stub(this.instance, 'getDfReferenceId').resolves('df-id');

        this.instance.on(SongbirdFramework.events.ON_LOOKUP_COMPLETE, function (data, next) {
          next();
        });

        return this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100
        }, {
          ignoreOnLookupCompleteRequirement: true
        }).then(function (payload) {
          expect(payload.nonce).to.exist;
        });
      });
    });

    context('lookup request', function () {
      it('cannot be called if a blocking error occurs during cardinal sdk setup', function () {
        var self = this;
        var error = new Error('blocking error');

        this.instance._verifyCardBlockingError = error;

        return this.instance.verifyCard({
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
        }).then(rejectIfResolves).catch(function (err) {
          expect(err).to.equal(error);
          expect(self.client.request).to.not.be.called;
        });
      });

      it('makes a request to the 3DS lookup endpoint with billing address data', function () {
        var self = this;

        this.client.request.resolves({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: '2.1.0'
          }
        });

        return this.instance.verifyCard({
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
          }
        }).then(function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              amount: 100,
              additionalInfo: {
                billingGivenName: 'Jill',
                billingSurname: 'Gal',
                billingLine1: '555 Smith street',
                billingLine2: '#5',
                billingLine3: 'More Address',
                billingCity: 'Oakland',
                billingState: 'CA',
                billingPostalCode: '12345',
                billingCountryCode: 'US',
                billingPhoneNumber: '1234567'
              }
            }
          });
        });
      });

      it('makes a request to the 3DS lookup endpoint with customer data', function () {
        var self = this;

        this.client.request.resolves({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: '2.1.0'
          }
        });

        return this.instance.verifyCard({
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
        }).then(function () {
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
        });
      });

      it('prepares the lookup', function () {
        this.sandbox.spy(this.instance, 'prepareLookup');

        return this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          onLookupComplete: this.sandbox.stub().yieldsAsync(),
          amount: 100
        }).then(function () {
          expect(this.instance.prepareLookup).to.be.calledOnce;
          expect(this.instance.prepareLookup).to.be.calledWithMatch({
            amount: 100,
            bin: this.tokenizedCard.details.bin
          });
        }.bind(this));
      });

      it('makes a request to the 3DS lookup endpoint df reference id', function () {
        var self = this;

        this.sandbox.stub(this.instance, 'getDfReferenceId').resolves('df-id');
        this.client.request.resolves({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: '2.1.0'
          }
        });

        return this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync()
        }).then(function () {
          expect(self.client.request).to.be.calledOnce;
          expect(self.client.request).to.be.calledWithMatch({
            endpoint: 'payment_methods/abcdef/three_d_secure/lookup',
            method: 'post',
            data: {
              dfReferenceId: 'df-id', // eslint-disable-line camelcase
              amount: 100
            }
          });
        });
      });

      it('makes a request to the 3DS lookup endpoint with challengeRequested', function () {
        var self = this;

        this.sandbox.stub(this.instance, 'getDfReferenceId').resolves('df-id');
        this.client.request.resolves({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: '2.1.0'
          }
        });

        return this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          challengeRequested: true,
          amount: 100,
          onLookupComplete: this.sandbox.stub().yieldsAsync()
        }).then(function () {
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
        });
      });

      it('makes a request to the 3DS lookup endpoint with exemptionRequested', function () {
        var self = this;

        this.sandbox.stub(this.instance, 'getDfReferenceId').resolves('df-id');
        this.client.request.resolves({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: '2.1.0'
          }
        });

        return this.instance.verifyCard({
          nonce: this.tokenizedCard.nonce,
          bin: this.tokenizedCard.details.bin,
          exemptionRequested: true,
          amount: 100,
          onLookupComplete: callsNext
        }).then(function () {
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
        });
      });

      it('calls initializeChallengeWithLookupResponse with lookup response and options', function () {
        var self = this;
        var lookupResponse = this.lookupResponse;

        this.sandbox.spy(this.instance, 'initializeChallengeWithLookupResponse');

        return this.instance.verifyCard({
          nonce: 'abcdef',
          amount: 100,
          onLookupComplete: callsNext
        }).then(function () {
          expect(self.instance.initializeChallengeWithLookupResponse).to.be.calledOnce;
          expect(self.instance.initializeChallengeWithLookupResponse).to.be.calledWithMatch(lookupResponse, {
            onLookupComplete: self.sandbox.match.func
          });
        });
      });
    });

    context('multiple calls', function () {
      it('can be called multiple times if authentication completes in between', function () {
        var self = this;

        var options = {
          nonce: 'abc123',
          amount: 100,
          onLookupComplete: callsNext
        };

        this.lookupResponse.lookup = {
          acsUrl: 'http://example.com/acs',
          pareq: 'pareq',
          termUrl: 'http://example.com/term',
          md: 'md',
          threeDSecureVersion: '2.1.0'
        };

        this.client.request.onCall(1).resolves({
          paymentMethod: {
            nonce: 'new-nonce',
            description: 'a card',
            binData: 'bin data',
            details: {
              cardType: 'Visa',
              bin: '123456'
            },
            threeDSecureInfo: {}
          },
          threeDSecureInfo: {
            liabilityShifted: true,
            liabilityShiftPossible: true
          }
        });

        this.fakeCardinal.continue.callsFake(function () {
          var cbFromPaymentsValidated = self.fakeCardinal.on.withArgs('payments.validated').args[0][1];

          cbFromPaymentsValidated({
            ActionCode: 'SUCCESS'
          }, 'validated-jwt');
        });

        return this.instance.verifyCard(options).then(function (data) {
          expect(data.nonce).to.equal('new-nonce');
          expect(data.liabilityShifted).to.equal(true);
          expect(data.liabilityShiftPossible).to.equal(true);

          self.client.request.onCall(3).resolves({
            paymentMethod: {
              nonce: 'upgraded-nonce',
              description: 'a card',
              binData: 'bin data',
              details: {
                cardType: 'Visa',
                bin: '123456'
              },
              threeDSecureInfo: {}
            },
            threeDSecureInfo: {
              liabilityShifted: false,
              liabilityShiftPossible: true
            }
          });

          return self.instance.verifyCard(options);
        }).then(function (data2) {
          expect(data2.nonce).to.equal('upgraded-nonce');
          expect(data2.liabilityShifted).to.equal(false);
          expect(data2.liabilityShiftPossible).to.equal(true);
        });
      });
    });

    context('payload results', function () {
      beforeEach(function () {
        var self = this;

        this.lookupResponse.lookup.acsUrl = 'https://example.com/acs';
        this.client.request.onCall(1).resolves({
          paymentMethod: {
            nonce: 'new-nonce',
            description: 'a card',
            binData: 'bin data',
            details: {
              cardType: 'Visa',
              bin: '123456'
            },
            threeDSecureInfo: {}
          },
          threeDSecureInfo: {
            liabilityShifted: true,
            liabilityShiftPossible: true
          }
        });

        this.validationArgs = [{
          ActionCode: 'SUCCESS'
        }, 'jwt'];

        this.fakeCardinal.continue.callsFake(function () {
          wait(5).then(function () {
            var handler = self.fakeCardinal.on.withArgs('payments.validated').args[0][1];

            handler.apply(null, self.validationArgs);
          });
        });
      });

      it('resolves with the result from performJWTValidation on SUCCESS', function () {
        this.validationArgs[0] = {
          ActionCode: 'SUCCESS'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(function (data) {
          expect(data.nonce).to.equal('new-nonce');
          expect(data.details).to.deep.equal({cardType: 'Visa', bin: '123456'});
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
        });
      });

      it('passes back a `requiresUserAuthentication=true` when an acs url is present', function () {
        this.validationArgs[0] = {
          ActionCode: 'SUCCESS'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: function (data, next) {
            expect(data.requiresUserAuthentication).to.equal(true);
            next();
          }
        });
      });

      it('passes back a `requiresUserAuthentication=false` when an acs url is not present', function () {
        delete this.lookupResponse.lookup.acsUrl;

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: function (data, next) {
            expect(data.requiresUserAuthentication).to.equal(false);
            next();
          }
        });
      });

      it('rejects with error from performJWTValidation even when Cardinal reports SUCCESS', function () {
        var error = new Error('some error');

        this.client.request.onCall(1).rejects(error);
        this.validationArgs[0] = {
          ActionCode: 'SUCCESS'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.code).to.equal('THREEDS_JWT_AUTHENTICATION_FAILED');
          expect(err.details.originalError).to.equal(error);
        });
      });

      it('resolves with result from performJWTValidation on NOACTION', function () {
        this.validationArgs[0] = {
          ActionCode: 'NOACTION'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(function (data) {
          expect(data.nonce).to.equal('new-nonce');
          expect(data.details).to.deep.equal({cardType: 'Visa', bin: '123456'});
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
        });
      });

      it('rejects with error from performJWTValidation even when Cardinal reports NOACTION', function () {
        var error = new Error('some error');

        this.client.request.onCall(1).rejects(error);
        this.validationArgs[0] = {
          ActionCode: 'NOACTION'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.code).to.equal('THREEDS_JWT_AUTHENTICATION_FAILED');
          expect(err.details.originalError).to.equal(error);
        });
      });

      it('resolves with result from performJWTValidation on FAILURE', function () {
        this.validationArgs[0] = {
          ActionCode: 'FAILURE'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(function (data) {
          expect(data.nonce).to.equal('new-nonce');
          expect(data.details).to.deep.equal({cardType: 'Visa', bin: '123456'});
          expect(data.liabilityShiftPossible).to.equal(true);
          expect(data.liabilityShifted).to.equal(true);
        });
      });

      it('rejects with error from performJWTValidation even when Cardinal reports FAILURE', function () {
        var error = new Error('some error');

        this.client.request.onCall(1).rejects(error);
        this.validationArgs[0] = {
          ActionCode: 'FAILURE'
        };

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.code).to.equal('THREEDS_JWT_AUTHENTICATION_FAILED');
          expect(err.details.originalError).to.equal(error);
        });
      });

      [{
        songbirdCode: 10001,
        braintreeCode: 'THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10001'
        ]
      }, {
        songbirdCode: 10002,
        braintreeCode: 'THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10002'
        ]
      }, {
        songbirdCode: 10003,
        braintreeCode: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10003'
        ]
      }, {
        songbirdCode: 10007,
        braintreeCode: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10007'
        ]
      }, {
        songbirdCode: 10009,
        braintreeCode: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10009'
        ]
      }, {
        songbirdCode: 10005,
        braintreeCode: 'THREEDS_CARDINAL_SDK_BAD_CONFIG',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10005'
        ]
      }, {
        songbirdCode: 10006,
        braintreeCode: 'THREEDS_CARDINAL_SDK_BAD_CONFIG',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10006'
        ]
      }, {
        songbirdCode: 10008,
        braintreeCode: 'THREEDS_CARDINAL_SDK_BAD_JWT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10008'
        ]
      }, {
        songbirdCode: 10010,
        braintreeCode: 'THREEDS_CARDINAL_SDK_BAD_JWT',
        analytics: [
          'three-d-secure.verification-flow.cardinal-sdk-error.10010'
        ]
      }, {
        songbirdCode: 10011,
        braintreeCode: 'THREEDS_CARDINAL_SDK_CANCELED',
        analytics: [
          'three-d-secure.verification-flow.canceled',
          'three-d-secure.verification-flow.cardinal-sdk-error.10011'
        ]
      }, {
        songbirdCode: 'anything-other-code',
        braintreeCode: 'THREEDS_CARDINAL_SDK_ERROR'
      }].forEach(function (test) {
        it('rejects with error with code ' + test.braintreeCode + ' when Songbird returns an error with code ' + test.songbirdCode, function () {
          this.validationArgs[0] = {
            ActionCode: 'ERROR',
            ErrorNumber: test.songbirdCode
          };

          return this.instance.verifyCard({
            nonce: 'nonce',
            amount: 100,
            onLookupComplete: callsNext
          }).then(rejectIfResolves).catch(function (err) {
            expect(err.code).to.equal(test.braintreeCode);
          });
        });

        if (test.analytics) {
          test.analytics.forEach(function (analyticName) {
            it('sends the analytic ' + analyticName, function () {
              var client = this.client;

              this.validationArgs[0] = {
                ActionCode: 'ERROR',
                ErrorNumber: test.songbirdCode
              };

              return this.instance.verifyCard({
                nonce: 'nonce',
                amount: 100,
                onLookupComplete: callsNext
              }).then(rejectIfResolves).catch(function () {
                expect(analytics.sendEvent).to.be.calledWith(client, analyticName);
              });
            });
          });
        }
      });

      it('authenticate jwt', function () {
        var client = this.client;

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(function () {
          expect(client.request).to.be.calledTwice;
          expect(client.request).to.be.calledWith({
            method: 'post',
            endpoint: 'payment_methods/upgraded-nonce/three_d_secure/authenticate_from_jwt',
            data: {
              jwt: 'jwt',
              paymentMethodNonce: 'upgraded-nonce'
            }
          });
        });
      });

      it('sends analytics events for successful jwt validation', function () {
        var client = this.client;

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(function () {
          expect(analytics.sendEvent).to.be.calledWith(client, 'three-d-secure.verification-flow.upgrade-payment-method.started');
          expect(analytics.sendEvent).to.be.calledWith(client, 'three-d-secure.verification-flow.upgrade-payment-method.succeeded');
        });
      });

      it('sends analytics events for error in jwt validation request', function () {
        var self = this;
        var error = new Error('some error');

        this.client.request.onCall(1).rejects(error);

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(rejectIfResolves).catch(function () {
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.upgrade-payment-method.started');
          expect(analytics.sendEvent).to.be.calledWith(self.client, 'three-d-secure.verification-flow.upgrade-payment-method.errored');
        });
      });

      it('rejects with the client request error when jwt validation fails', function () {
        var error = new Error('some error');

        this.client.request.onCall(1).rejects(error);

        return this.instance.verifyCard({
          nonce: 'nonce',
          amount: 100,
          onLookupComplete: callsNext
        }).then(rejectIfResolves).catch(function (err) {
          expect(err.code).to.equal('THREEDS_JWT_AUTHENTICATION_FAILED');
          expect(err.type).to.equal('UNKNOWN');
          expect(err.message).to.equal('Something went wrong authenticating the JWT from Cardinal');
          expect(err.details.originalError).to.equal(error);
        });
      });
    });
  });

  describe('setupSongbird', function () {
    beforeEach(function () {
      var fakeCardinal = this.fakeCardinal;

      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});

      this.tds = new SongbirdFramework({
        client: this.client
      });
      SongbirdFramework.prototype.setupSongbird.restore();

      this.sandbox.stub(assets, 'loadScript').callsFake(function () {
        global.Cardinal = fakeCardinal;

        // allow a slight delay so timing tests can run
        return wait(5);
      });
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('only lets songbird be setup once', function () {
      return Promise.all([
        this.tds.setupSongbird(),
        this.tds.setupSongbird(),
        this.tds.setupSongbird()
      ]).then(function () {
        expect(assets.loadScript).to.be.calledOnce;
      });
    });

    it('loads cardinal production script onto page', function () {
      this.configuration.gatewayConfiguration.environment = 'production';

      return this.tds.setupSongbird().then(function () {
        expect(assets.loadScript).to.be.calledOnce;
        expect(assets.loadScript).to.be.calledWith({
          src: 'https://songbird.cardinalcommerce.com/edge/v1/songbird.js'
        });
      });
    });

    it('loads cardinal sandbox script onto page', function () {
      return this.tds.setupSongbird().then(function () {
        expect(assets.loadScript).to.be.calledOnce;
        expect(assets.loadScript).to.be.calledWith({
          src: 'https://songbirdstag.cardinalcommerce.com/edge/v1/songbird.js'
        });
      });
    });

    it('configures Cardinal to use verbose logging with loggingEnabled', function () {
      var framework = new SongbirdFramework({
        client: this.client,
        loggingEnabled: true
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWithMatch({
          logging: {
            level: 'verbose'
          }
        });
      });
    });

    it('configures Cardinal to use logging object provided by merchant', function () {
      var framework = new SongbirdFramework({
        client: this.client,
        cardinalSDKConfig: {
          logging: {
            level: 'off'
          }
        }
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWithMatch({
          logging: {
            level: 'off'
          }
        });
      });
    });

    it('configures Cardinal to use logging object provided by merchant when loggingEnabled is also used', function () {
      var framework = new SongbirdFramework({
        client: this.client,
        loggingEnabled: true,
        cardinalSDKConfig: {
          logging: {
            level: 'off'
          }
        }
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWithMatch({
          logging: {
            level: 'off'
          }
        });
      });
    });

    it('configures Cardinal to use timeout setting provided by the merchant', function () {
      var framework = new SongbirdFramework({
        client: this.client,
        cardinalSDKConfig: {
          timeout: 1000
        }
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWithMatch({
          timeout: 1000
        });
      });
    });

    it('configures Cardinal to use maxRequestRetries setting provided by the merchant', function () {
      var framework = new SongbirdFramework({
        client: this.client,
        cardinalSDKConfig: {
          maxRequestRetries: 3
        }
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWithMatch({
          maxRequestRetries: 3
        });
      });
    });

    it('configures Cardinal to use a subset of payment options provided by the merchant', function () {
      var framework = new SongbirdFramework({
        client: this.client,
        cardinalSDKConfig: {
          payment: {
            view: 'modal',
            framework: 'inline',
            displayLoading: true,
            displayExitButton: true
          }
        }
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWithMatch({
          payment: {
            displayLoading: true,
            displayExitButton: true
          }
        });
      });
    });

    it('sets up payments.setupComplete listener', function () {
      return this.tds.setupSongbird().then(function () {
        expect(global.Cardinal.on).to.be.calledWith('payments.setupComplete', this.sandbox.match.func);
      }.bind(this));
    });

    it('sets dfReferenceId when setupComplete event fires', function () {
      this.fakeCardinal.on.withArgs('payments.setupComplete').yields({
        sessionId: 'df-reference'
      });

      return this.tds.setupSongbird().then(function () {
        return this.tds.getDfReferenceId();
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
        this.tds.getDfReferenceId(),
        this.tds.getDfReferenceId(),
        this.tds.getDfReferenceId(),
        this.tds.getDfReferenceId()
      ];

      Promise.all(promises).then(function (results) {
        expect(setupSongbirdHasResolved).to.equal(true);
        results.forEach(function (res) {
          expect(res).to.equal('df-reference');
        });

        done();
      }).catch(done);

      this.tds.setupSongbird().then(function () {
        setupSongbirdHasResolved = true;
      });
    });

    it('sets up Cardinal', function () {
      return this.tds.setupSongbird().then(function () {
        expect(global.Cardinal.setup).to.be.calledOnce;
        expect(global.Cardinal.setup).to.be.calledWith('init', {
          jwt: 'jwt'
        });
      });
    });

    it('adds cardinalDeviceDataCollectionTimeElapsed to clientMetadata', function () {
      return this.tds.setupSongbird().then(function () {
        expect(this.tds._clientMetadata.cardinalDeviceDataCollectionTimeElapsed).to.exist;
        expect(this.tds._clientMetadata.cardinalDeviceDataCollectionTimeElapsed).to.be.greaterThan(0);
      }.bind(this));
    });

    it('sends analytics event when setup is complete', function () {
      return this.tds.setupSongbird().then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-completed');
      }.bind(this));
    });

    it('rejects if loadScript fails', function () {
      assets.loadScript.rejects(new Error('foo'));

      return this.tds.setupSongbird().then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED');
        expect(err.message).to.equal('Cardinal\'s Songbird.js library could not be loaded.');
      });
    });

    it('sets getDfReferenceId to reject if Cardinal can not be set up', function () {
      var tds = this.tds;

      assets.loadScript.rejects(new Error('foo'));

      return tds.setupSongbird().then(rejectIfResolves).catch(function () {
        return tds.getDfReferenceId();
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED');
        expect(err.message).to.equal('Cardinal\'s Songbird.js library could not be loaded.');
      });
    });

    it('rejects with a generic error if a specific Braintree error cannot be found', function () {
      var tds = this.tds;

      this.fakeCardinal.on.reset();
      this.fakeCardinal.on.throws(new Error('failure'));

      return tds.setupSongbird().then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SETUP_FAILED');
        expect(err.message).to.equal('Something went wrong setting up Cardinal\'s Songbird.js library.');
      });
    });

    it('sends analytics event when Cardinal fails to set up', function () {
      var tds = this.tds;

      this.fakeCardinal.on.reset();
      this.fakeCardinal.on.throws(new Error('failure'));

      return tds.setupSongbird().then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-failed');
      }.bind(this));
    });

    it('sets getDfReferenceId to reject with a generic error if a specific Braintree error cannot be found', function () {
      var tds = this.tds;

      this.fakeCardinal.on.reset();
      this.fakeCardinal.on.throws(new Error('failure'));

      return tds.setupSongbird().then(rejectIfResolves).catch(function () {
        return tds.getDfReferenceId();
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SETUP_FAILED');
        expect(err.message).to.equal('Something went wrong setting up Cardinal\'s Songbird.js library.');
      });
    });

    it('rejects with timeout error if cardinal takes longer than 60 seconds to set up', function () {
      this.fakeCardinal.on.reset();

      return this.tds.setupSongbird({
        timeout: 3
      }).then(rejectIfResolves).catch(function (err) {
        expect(err.code).to.equal('THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT');
        expect(err.message).to.equal('Cardinal\'s Songbird.js took too long to setup.');
      });
    });

    it('sends analytics event when Cardinal times out during setup', function () {
      this.fakeCardinal.on.reset();

      return this.tds.setupSongbird({
        timeout: 3
      }).then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.cardinal-sdk.init.setup-timeout');
      }.bind(this));
    });

    it('does not send timeout event when `payments.setupComplete` callback is called', function () {
      var self = this;

      return this.tds.setupSongbird({
        timeout: 10
      }).then(function () {
        expect(analytics.sendEvent).to.not.be.calledWith(self.client, 'three-d-secure.cardinal-sdk.init.setup-timeout');

        return wait(100);
      }).then(function () {
        expect(analytics.sendEvent).to.not.be.calledWith(self.client, 'three-d-secure.cardinal-sdk.init.setup-timeout');
      });
    });
  });

  describe('initializeChallengeWithLookupResponse', function () {
    beforeEach(function () {
      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({
        ActionCode: 'SUCCESS'
      });
      this.client.request.resolves({
        paymentMethod: {},
        threeDSecureInfo: {}
      });

      SongbirdFramework.prototype.setupSongbird.restore();

      this.sandbox.stub(assets, 'loadScript').callsFake(function () {
        global.Cardinal = this.fakeCardinal;

        return Promise.resolve();
      }.bind(this));
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('calls setupSongibrd before continuing with the call', function () {
      var lookupResponse = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        },
        paymentMethod: {},
        lookup: {
          pareq: 'pareq',
          transactionId: 'transaction-id'
        }
      };
      var instance = new SongbirdFramework({
        client: this.client
      });

      this.sandbox.spy(instance, 'setupSongbird');
      this.sandbox.stub(BaseFramework.prototype, 'initializeChallengeWithLookupResponse').resolves();

      return instance.initializeChallengeWithLookupResponse(lookupResponse, {
        onLookupComplete: callsNext
      }).then(function () {
        expect(instance.setupSongbird).to.be.calledOnce;
        expect(BaseFramework.prototype.initializeChallengeWithLookupResponse).to.be.calledOnce;
        expect(BaseFramework.prototype.initializeChallengeWithLookupResponse).to.be.calledWith(lookupResponse, {
          onLookupComplete: callsNext
        });
      });
    });

    it('calls Cardinal.continue when onLookupComplete callback is called', function () {
      var lookupResponse = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        },
        paymentMethod: {},
        lookup: {
          acsUrl: 'https://example.com/acs',
          pareq: 'pareq',
          transactionId: 'transaction-id'
        }
      };
      var fakeCardinal = this.fakeCardinal;
      var instance = new SongbirdFramework({
        client: this.client
      });

      this.fakeCardinal.on.withArgs('payments.validated').callsFake(function (event, cb) {
        setTimeout(function () {
          cb({
            ActionCode: 'SUCCESS'
          }, 'validated-jwt');
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

      return instance.initializeChallengeWithLookupResponse(lookupResponse, {
        onLookupComplete: onLookupComplete
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
      var instance = new SongbirdFramework({
        client: this.client
      });

      this.fakeCardinal.on.withArgs('payments.validated').callsFake(function (event, cb) {
        setTimeout(function () {
          cb({
            ActionCode: 'SUCCESS'
          }, 'validated-jwt');
        }, 100);
      });

      return instance.initializeChallengeWithLookupResponse(lookupResponse, {
        onLookupComplete: callsNext
      }).then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'three-d-secure.verification-flow.cardinal-sdk.action-code.success');
      }.bind(this));
    });

    it('does not call Cardinal.continue when no acsUrl is present', function () {
      var lookupResponse = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        },
        paymentMethod: {},
        lookup: {
          pareq: 'pareq',
          transactionId: 'transaction-id'
        }
      };
      var fakeCardinal = this.fakeCardinal;
      var instance = new SongbirdFramework({
        client: this.client
      });

      this.fakeCardinal.on.withArgs('payments.validated').callsFake(function (event, cb) {
        setTimeout(function () {
          cb({
            ActionCode: 'SUCCESS'
          }, 'validated-jwt');
        }, 100);
      });

      function onLookupComplete(data, start) {
        expect(fakeCardinal.continue).to.not.be.called;

        start();

        expect(fakeCardinal.continue).to.not.be.called;
      }

      return instance.initializeChallengeWithLookupResponse(lookupResponse, {
        onLookupComplete: onLookupComplete
      });
    });
  });

  describe('transformBillingAddress', function () {
    beforeEach(function () {
      this.instance = new SongbirdFramework({
        client: this.client
      });
    });

    it('transforms billing address', function () {
      var additionalInformation = {};
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

      additionalInformation = this.instance.transformBillingAddress(additionalInformation, billingAddress);

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

    it('ignores additionalInformation if no billingAddress param is provided', function () {
      var info = {foo: 'bar'};

      expect(this.instance.transformBillingAddress(info)).to.equal(info);
    });
  });

  describe('transformShippingAddress', function () {
    beforeEach(function () {
      this.instance = new SongbirdFramework({
        client: this.client
      });
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

      additionalInformation = this.instance.transformShippingAddress(additionalInformation);
      expect(additionalInformation.shippingAddress).not.to.exist;
      expect(additionalInformation.shippingLine1).to.equal('555 Smith street');
      expect(additionalInformation.shippingLine2).to.equal('#5');
      expect(additionalInformation.shippingLine3).to.equal('More Address');
      expect(additionalInformation.shippingCity).to.equal('Oakland');
      expect(additionalInformation.shippingState).to.equal('CA');
      expect(additionalInformation.shippingPostalCode).to.equal('12345');
      expect(additionalInformation.shippingCountryCode).to.equal('US');
    });

    it('ignores additionalInformation if no shippingAddress param is provided', function () {
      var info = {foo: 'bar'};

      expect(this.instance.transformShippingAddress(info)).to.equal(info);
    });
  });

  describe('prepareLookup', function () {
    beforeEach(function () {
      global.Cardinal = this.fakeCardinal;
      this.instance = new SongbirdFramework({
        client: this.client
      });

      this.sandbox.stub(this.instance, 'getDfReferenceId').resolves('df-id');
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

      return this.instance.prepareLookup(options).then(function (data) {
        expect(data).to.not.equal(options);
        expect(data.nonce).to.equal(options.nonce);
        expect(data.bin).to.equal(options.bin);
      });
    });

    it('retrieves authorizationFingerprint', function () {
      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(data.authorizationFingerprint).to.equal('encoded_auth_fingerprint');
      });
    });

    it('can pass arbitrary data into options', function () {
      this.options.foo = 'bar';

      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(data.foo).to.equal('bar');
      });
    });

    it('retrieves dfReferenceId', function () {
      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(data.dfReferenceId).to.equal('df-id');
      });
    });

    it('retrieves braintreeLibraryVersion', function () {
      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION);
      });
    });

    it('retrieves bin metadata', function () {
      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(this.fakeCardinal.trigger).to.be.calledOnce;
        expect(this.fakeCardinal.trigger).to.be.calledWith('bin.process', '411111');
        expect(data.clientMetadata.issuerDeviceDataCollectionTimeElapsed).to.exist;
        expect(data.clientMetadata.issuerDeviceDataCollectionResult).to.equal('status');
      }.bind(this));
    });

    it('ignores errors df reference id lookup fails', function () {
      var error = new Error('df reference id lookup fails');

      this.instance.getDfReferenceId.rejects(error);

      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(data.dfReferenceId).to.not.exist;
        expect(data.clientMetadata).to.deep.equal({
          sdkVersion: 'web/' + VERSION,
          requestedThreeDSecureVersion: '2'
        });
      });
    });

    it('ignores errors from Cardinal bin lookup', function () {
      this.fakeCardinal.trigger.rejects(new Error('bin process failed'));

      return this.instance.prepareLookup(this.options).then(function (data) {
        expect(data.dfReferenceId).to.equal('df-id');
        expect(data.clientMetadata).to.deep.equal({
          sdkVersion: 'web/' + VERSION,
          requestedThreeDSecureVersion: '2'
        });
      });
    });
  });

  describe('cancelVerifyCard', function () {
    beforeEach(function () {
      this.framework = new SongbirdFramework({client: this.client});
      this.lookupResponse = {
        paymentMethod: {
          nonce: 'upgraded-nonce',
          details: {
            bin: '123456',
            cardType: 'Visa'
          },
          threeDSecureInfo: {
            liabilityShiftPossible: true,
            liabilityShifted: true
          }
        },
        lookup: {
          threeDSecureVersion: '2.1.0'
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        }
      };
      this.client.request.resolves(this.lookupResponse);
      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({
        sessionId: 'df'
      });
      SongbirdFramework.prototype.setupSongbird.restore();

      this.sandbox.stub(assets, 'loadScript').callsFake(function () {
        global.Cardinal = this.fakeCardinal;

        return Promise.resolve();
      }.bind(this));

      return this.framework.setupSongbird();
    });

    it('errors verifyCard with cancel error', function () {
      var framework = this.framework;

      return framework.verifyCard({
        amount: '100.00',
        nonce: 'a-nonce',
        onLookupComplete: function () {
          framework.cancelVerifyCard();
        }
      }).then(rejectIfResolves).catch(function (verifyCardError) {
        expect(verifyCardError.code).to.equal('THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT');
      });
    });

    it('does not throw an error when there is no verifyCardPromisePlus', function () {
      this.framework._lookupPaymentMethod = {
        nonce: 'fake-nonce',
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false,
          verificationDetails: {}
        }
      };

      return this.framework.cancelVerifyCard().then(function (response) {
        expect(response.nonce).to.eql('fake-nonce');
        expect(response.liabilityShiftPossible).to.eql(true);
        expect(response.liabilityShifted).to.eql(false);
        expect(response.verificationDetails).to.deep.equal({});
      });
    });
  });

  describe('setCardinalListener', function () {
    it('sets up listener for Cardinal', function () {
      var spy = this.sandbox.stub();
      var framework = new SongbirdFramework({client: this.client});

      global.Cardinal = {
        on: this.sandbox.stub()
      };

      framework.setCardinalListener('foo', spy);

      expect(global.Cardinal.on).to.be.calledOnce;
      expect(global.Cardinal.on).to.be.calledWith('foo', spy);
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.framework = new SongbirdFramework({client: this.client});
    });

    it('removes all configured Cardinal listeners', function () {
      global.Cardinal = {
        on: this.sandbox.stub(),
        off: this.sandbox.stub()
      };
      this.framework.setCardinalListener('foo', this.sandbox.stub());
      this.framework.setCardinalListener('bar', this.sandbox.stub());

      return this.framework.teardown().then(function () {
        expect(global.Cardinal.off).to.be.calledTwice;
        expect(global.Cardinal.off).to.be.calledWith('foo');
        expect(global.Cardinal.off).to.be.calledWith('bar');
      });
    });
  });
});
