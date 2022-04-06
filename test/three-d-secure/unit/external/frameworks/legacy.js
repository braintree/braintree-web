"use strict";

const BaseFramework = require("../../../../../src/three-d-secure/external/frameworks/base");
const LegacyFramework = require("../../../../../src/three-d-secure/external/frameworks/legacy");
const Bus = require("framebus");
const BraintreeError = require("../../../../../src/lib/braintree-error");
const { parse: parseUrl } = require("url");
const analytics = require("../../../../../src/lib/analytics");
const { fake, noop, findFirstEventCallback } = require("../../../../helpers");
const events = require("../../../../../src/three-d-secure/shared/events");

describe("LegacyFramework", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: "encoded_auth_fingerprint",
      gatewayConfiguration: {
        assetsUrl: "http://example.com/assets",
      },
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
      getConfiguration() {
        return testContext.configuration;
      },
    };
  });

  describe("verifyCard", () => {
    beforeEach(() => {
      testContext.instance = new LegacyFramework({
        client: testContext.client,
        createPromise: Promise.resolve(testContext.client),
      });

      testContext.lookupResponse = {
        paymentMethod: {
          nonce: "upgraded-nonce",
          details: {
            cardType: "Visa",
          },
        },
        lookup: {
          threeDSecureVersion: "1.0.2",
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
      };
      testContext.client.request.mockResolvedValue(testContext.lookupResponse);
    });

    describe("required params", () => {
      it("requires addFrame", () =>
        testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            removeFrame: noop,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_MISSING_VERIFY_CARD_OPTION");
            expect(err.message).toBe(
              "verifyCard options must include an addFrame function."
            );
          }));

      it("requires removeFrame", () =>
        testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            addFrame: noop,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_MISSING_VERIFY_CARD_OPTION");
            expect(err.message).toBe(
              "verifyCard options must include a removeFrame function."
            );
          }));
    });

    describe("multiple calls", () => {
      it("can be called multiple times if canceled in between", (done) => {
        const threeDSecureInfo = {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        };

        testContext.lookupResponse.lookup.acsUrl = "https://example.com";
        testContext.lookupResponse.paymentMethod = {
          nonce: "upgraded-nonce",
          threeDSecureInfo: threeDSecureInfo,
        };
        testContext.lookupResponse.threeDSecureInfo = threeDSecureInfo;

        expect.assertions(1);

        testContext.instance.verifyCard({
          nonce: "fake-nonce",
          amount: 100,
          addFrame() {
            testContext.instance.cancelVerifyCard().then(() => {
              delete testContext.lookupResponse.lookup.acsUrl;

              return testContext.instance
                .verifyCard({
                  nonce: "fake-nonce",
                  amount: 100,
                  addFrame: noop,
                  removeFrame: noop,
                })
                .then(({ nonce }) => {
                  expect(nonce).toBe("upgraded-nonce");

                  done();
                });
            });
          },
          removeFrame: noop,
        });
      });

      it("cannot be called twice without cancelling in between", (done) => {
        const threeDSecureInfo = {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        };

        testContext.lookupResponse.lookup.acsUrl = "https://example.com";
        testContext.lookupResponse.paymentMethod = {
          nonce: "upgraded-nonce",
          threeDSecureInfo: threeDSecureInfo,
        };
        testContext.lookupResponse.threeDSecureInfo = threeDSecureInfo;

        expect.assertions(4);

        testContext.instance.verifyCard({
          nonce: "fake-nonce",
          amount: 100,
          addFrame() {
            delete testContext.lookupResponse.lookup.acsUrl;

            testContext.instance
              .verifyCard({
                nonce: "fake-nonce",
                amount: 100,
                addFrame: noop,
                removeFrame: noop,
              })
              .catch((err) => {
                expect(err).toBeInstanceOf(BraintreeError);
                expect(err.type).toBe("MERCHANT");
                expect(err.code).toBe("THREEDS_AUTHENTICATION_IN_PROGRESS");
                expect(err.message).toBe(
                  "Cannot call verifyCard while existing authentication is in progress."
                );

                done();
              });
          },
          removeFrame: noop,
        });
      });
    });

    describe("lookup request", () => {
      it("makes a request to the 3DS lookup endpoint with additional (legacy) customer data", () => {
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "1.0.2",
          },
        });

        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            customer: {
              billingAddress: {
                firstName: "John",
                lastName: "Doe",
                streetAddress: "555 Smith street",
                extendedAddress: "#5",
                locality: "Oakland",
                region: "CA",
                countryCodeAlpha2: "US",
              },
            },
            addFrame: noop,
            removeFrame: noop,
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                amount: 100,
                customer: {
                  billingAddress: {
                    firstName: "John",
                    lastName: "Doe",
                    line1: "555 Smith street",
                    line2: "#5",
                    city: "Oakland",
                    state: "CA",
                    countryCode: "US",
                  },
                },
              },
            });
          });
      });

      it("defaults showLoader to true in initializeChallengeWithLookupResponse", () => {
        const lookupResponse = testContext.lookupResponse;

        jest.spyOn(
          testContext.instance,
          "initializeChallengeWithLookupResponse"
        );

        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            addFrame: noop,
            removeFrame: noop,
          })
          .then(() => {
            expect(
              testContext.instance.initializeChallengeWithLookupResponse
            ).toHaveBeenCalledTimes(1);
            expect(
              testContext.instance.initializeChallengeWithLookupResponse
            ).toHaveBeenCalledWith(lookupResponse, expect.any(Object));
            expect(
              testContext.instance.initializeChallengeWithLookupResponse.mock
                .calls[0][1]
            ).toMatchObject({
              showLoader: true,
              addFrame: expect.any(Function),
              removeFrame: expect.any(Function),
            });
          });
      });

      it("can opt out of loader in initializeChallengeWithLookupResponse", () => {
        const lookupResponse = testContext.lookupResponse;

        jest.spyOn(
          testContext.instance,
          "initializeChallengeWithLookupResponse"
        );

        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            showLoader: false,
            addFrame: noop,
            removeFrame: noop,
          })
          .then(() => {
            expect(
              testContext.instance.initializeChallengeWithLookupResponse
            ).toHaveBeenCalledTimes(1);
            expect(
              testContext.instance.initializeChallengeWithLookupResponse
            ).toHaveBeenCalledWith(lookupResponse, {
              showLoader: false,
              addFrame: expect.any(Function),
              removeFrame: expect.any(Function),
              nonce: expect.any(String),
              amount: expect.any(Number),
            });
          });
      });
    });
  });

  describe("initializeChallengeWithLookupResponse", () => {
    beforeEach(() => {
      testContext.instance = new LegacyFramework({
        client: testContext.client,
        createPromise: Promise.resolve(testContext.client),
      });
    });

    it("calls removeFrame when receiving an AUTHENTICATION_COMPLETE event", () => {
      const removeFrameSpy = jest.fn();

      const lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: "http://example.com/acs",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
        },
      };

      return testContext.instance
        .initializeChallengeWithLookupResponse(lookupResponse, {
          addFrame() {
            const authenticationCompleteHandler = findFirstEventCallback(
              events.AUTHENTICATION_COMPLETE,
              Bus.prototype.on.mock.calls
            );

            authenticationCompleteHandler({
              // eslint-disable-next-line camelcase
              auth_response:
                '{"paymentMethod":{"type":"CreditCard","nonce":"some-fake-nonce","description":"ending+in+00","consumed":false,"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true,"status":"authenticate_successful","enrolled":"Y"},"details":{"lastTwo":"00","cardType":"Visa"}},"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true},"success":true}',
            });
          },
          removeFrame: removeFrameSpy,
        })
        .then(() => {
          expect(removeFrameSpy).toHaveBeenCalledTimes(1);
        });
    });

    it("tears down the bus when receiving an AUTHENTICATION_COMPLETE event", (done) => {
      const lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: "http://example.com/acs",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
        },
      };

      testContext.instance.initializeChallengeWithLookupResponse(
        lookupResponse,
        {
          addFrame() {
            const authenticationCompleteHandler = findFirstEventCallback(
              events.AUTHENTICATION_COMPLETE,
              Bus.prototype.on.mock.calls
            );

            authenticationCompleteHandler({
              // eslint-disable-next-line camelcase
              auth_response:
                '{"paymentMethod":{"type":"CreditCard","nonce":"some-fake-nonce","description":"ending+in+00","consumed":false,"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true,"status":"authenticate_successful","enrolled":"Y"},"details":{"lastTwo":"00","cardType":"Visa"}},"threeDSecureInfo":{"liabilityShifted":true,"liabilityShiftPossible":true},"success":true}',
            });
          },
          removeFrame() {
            expect(Bus.prototype.teardown).toHaveBeenCalled();

            done();
          },
        }
      );
    });

    it("does not call iframe-related callbacks when no authentication is required", () => {
      const threeDSecureInfo = {
        liabilityShiftPossible: true,
        liabilityShifted: true,
      };
      const addFrame = jest.fn();
      const removeFrame = jest.fn();

      testContext.lookupResponse = {
        paymentMethod: { nonce: "upgraded-nonce" },
        threeDSecureInfo: threeDSecureInfo,
      };

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          addFrame,
          removeFrame,
        })
        .then(() => {
          expect(addFrame).not.toHaveBeenCalled();
          expect(removeFrame).not.toHaveBeenCalled();
        });
    });

    it("returns an iframe with the right properties if authentication is needed", (done) => {
      testContext.lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: "http://example.com/acs",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
        },
      };

      testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          addFrame(err, iframe) {
            const url = parseUrl(iframe.src);

            expect(iframe).toBeInstanceOf(HTMLIFrameElement);
            expect(iframe.width).toBe("400");
            expect(iframe.height).toBe("400");
            expect(url.host).toBe("example.com");

            done();
          },
          removeFrame: noop,
        })
        .then(() => {
          done(new Error("This should never be called"));
        });
    });

    it("can show loader", (done) => {
      testContext.lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: "http://example.com/acs",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
        },
      };

      testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          showLoader: true,
          addFrame(err, iframe) {
            const url = parseUrl(iframe.src);

            expect(url.search).toMatch("showLoader=true");

            done();
          },
          removeFrame: noop,
        })
        .then(() => {
          done(new Error("This should never be called"));
        });
    });

    it("can opt out of loader", (done) => {
      testContext.lookupResponse = {
        paymentMethod: {},
        lookup: {
          acsUrl: "http://example.com/acs",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
        },
      };

      testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          showLoader: false,
          addFrame(err, iframe) {
            const url = parseUrl(iframe.src);

            expect(url.search).toMatch("showLoader=false");

            done();
          },
          removeFrame: noop,
        })
        .then(() => {
          done(new Error("This should never be called"));
        });
    });

    describe("Verify card resolution", () => {
      beforeEach(() => {
        testContext.authResponse = fake.authResponse();
        testContext.lookupResponse = fake.basicLookupResponse;

        testContext.makeAddFrameFunction = (authResponse) => () => {
          const authenticationCompleteHandler = findFirstEventCallback(
            events.AUTHENTICATION_COMPLETE,
            Bus.prototype.on.mock.calls
          );

          authenticationCompleteHandler({
            // eslint-disable-next-line camelcase
            auth_response: JSON.stringify(authResponse),
          });
        };
        analytics.sendEvent.mockClear();
      });

      it("resolves when receiving an AUTHENTICATION_COMPLETE event", () =>
        testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
            addFrame: testContext.makeAddFrameFunction(
              testContext.authResponse
            ),
            removeFrame: noop,
          })
          .then((data) => {
            expect(data).toEqual({
              nonce: "auth-success-nonce",
              binData: {
                prepaid: "No",
                healthcare: "Unknown",
                debit: "Unknown",
                durbinRegulated: "Unknown",
                commercial: "Unknown",
                payroll: "Unknown",
                issuingBank: "Unknown",
                countryOfIssuance: "CAN",
                productId: "Unknown",
              },
              details: {
                last2: 11,
              },
              description: "a description",
              liabilityShiftPossible: true,
              liabilityShifted: true,
              threeDSecureInfo: {
                threeDSecureVersion: "1.0.2",
              },
            });
          }));

      it("replaces + with a space in description parameter", () => {
        testContext.authResponse.paymentMethod.description =
          "A+description+with+pluses";

        return testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
            addFrame: testContext.makeAddFrameFunction(
              testContext.authResponse
            ),
            removeFrame: noop,
          })
          .then((data) => {
            expect(data.description).toBe("A description with pluses");
          });
      });

      it("sends back the new nonce if auth is successful", () => {
        return testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
            addFrame: testContext.makeAddFrameFunction(
              testContext.authResponse
            ),
            removeFrame: noop,
          })
          .then((data) => {
            expect(data.nonce).toBe("auth-success-nonce");
            expect(data.liabilityShiftPossible).toBe(true);
            expect(data.liabilityShifted).toBe(true);
          });
      });

      it("sends back the lookup nonce if auth is not successful but liability shift is possible", () => {
        delete testContext.authResponse.success;
        testContext.authResponse.threeDSecureInfo.liabilityShifted = false;

        return testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
            addFrame: testContext.makeAddFrameFunction(
              testContext.authResponse
            ),
            removeFrame: noop,
          })
          .then((data) => {
            expect(data.nonce).toBe("lookup-nonce");
            expect(data.liabilityShiftPossible).toBe(true);
            expect(data.liabilityShifted).toBe(false);
          });
      });

      it("sends back an error if it exists", () => {
        delete testContext.authResponse.success;
        testContext.authResponse.threeDSecureInfo.liabilityShiftPossible = false;
        testContext.authResponse.error = {
          message: "an error",
        };

        return expect(
          testContext.instance.initializeChallengeWithLookupResponse(
            testContext.lookupResponse,
            {
              addFrame: testContext.makeAddFrameFunction(
                testContext.authResponse
              ),
              removeFrame: noop,
            }
          )
        ).rejects.toMatchObject({
          type: BraintreeError.types.UNKNOWN,
          message: "an error",
        });
      });

      it("sends analytics events for failed liability shift", () => {
        testContext.authResponse.threeDSecureInfo.liabilityShifted = false;
        testContext.authResponse.threeDSecureInfo.liabilityShiftPossible = false;

        return testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
            addFrame: testContext.makeAddFrameFunction(
              testContext.authResponse
            ),
            removeFrame: noop,
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.liability-shifted.false"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.liability-shift-possible.false"
            );
          });
      });
    });
  });

  describe("cancelVerifyCard", () => {
    it("is identical to BaseFramework", () => {
      expect(LegacyFramework.prototype.cancelVerifyCard).toBe(
        BaseFramework.prototype.cancelVerifyCard
      );
    });
  });
});
