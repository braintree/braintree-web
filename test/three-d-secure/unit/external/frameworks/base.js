"use strict";

const BaseFramework = require("../../../../../src/three-d-secure/external/frameworks/base");
const BraintreeError = require("../../../../../src/lib/braintree-error");
const analytics = require("../../../../../src/lib/analytics");
const { fake, noop } = require("../../../../helpers");

describe("BaseFramework", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    jest
      .spyOn(BaseFramework.prototype, "_presentChallenge")
      .mockImplementation(function () {
        this._verifyCardPromisePlus.resolve({
          nonce: "some-fake-nonce",
          liabilityShifted: true,
          liabilityShiftPossible: true,
        });
      });
    jest
      .spyOn(
        BaseFramework.prototype,
        "_checkForFrameworkSpecificVerifyCardErrors"
      )
      .mockReturnValue(null);

    testContext.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: "encoded_auth_fingerprint",
      gatewayConfiguration: {
        assetsUrl: "http://example.com/assets",
      },
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
      getConfiguration: () => testContext.configuration,
    };
  });

  describe("verifyCard", () => {
    beforeEach(() => {
      testContext.instance = new BaseFramework({
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
      it("requires a nonce", () =>
        testContext.instance
          .verifyCard({
            amount: 100,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_MISSING_VERIFY_CARD_OPTION");
            expect(err.message).toBe(
              "verifyCard options must include a nonce."
            );
          }));

      it("requires an amount", () => {
        expect.assertions(3);

        testContext.instance
          .verifyCard({
            nonce: "abcdef",
          })
          .catch((err) => {
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_MISSING_VERIFY_CARD_OPTION");
            expect(err.message).toBe(
              "verifyCard options must include an amount."
            );
          });
      });

      it("accepts an amount of 0", () => {
        expect.assertions(0);

        testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 0,
          })
          .catch((err) => {
            expect(err).not.toBeNull();
          });
      });

      it.each([
        ["non-numeric string", "g"],
        ["empty object", {}],
        ["empty list", []],
        ["empty string", ""],
        ["null", null],
        ["boolean", false],
      ])("does not accept an amount of '%s'", (descr, value) => {
        expect.assertions(3);

        testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: value,
          })
          .catch((err) => {
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_MISSING_VERIFY_CARD_OPTION");
            expect(err.message).toBe(
              "verifyCard options must include an amount."
            );
          });
      });
    });

    describe("lookup errors", () => {
      it("errors if create promise errors", () => {
        const error = new Error("network error");
        const instance = new BaseFramework({
          authorization: fake.clientToken,
          createPromise: Promise.reject(error),
        });

        return expect(
          instance.verifyCard({
            nonce: "abcdef",
            amount: 100,
          })
        ).rejects.toThrow("network error");
      });

      it("handles errors when hitting the 3DS lookup endpoint", () => {
        const error = new Error("network error");

        testContext.client.request.mockRejectedValue(error);

        expect.assertions(3);

        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
          })
          .catch((err) => {
            expect(err.details.originalError).toEqual(error);
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe("THREEDS_LOOKUP_ERROR");
          });
      });

      it("sends an analytics event for unknown lookup error", () => {
        const error = new Error("network error");

        testContext.client.request.mockRejectedValue(error);

        expect.assertions(2);

        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
          })
          .catch((err) => {
            expect(err.details.originalError.message).toBe("network error");
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.lookup-failed"
            );
          });
      });

      it("rejects with a lookup error when lookup 404s", () => {
        const err = new Error("failure");

        err.details = {
          httpStatus: 404,
        };

        testContext.client.request.mockRejectedValue(err);

        expect.assertions(2);

        return testContext.instance
          .verifyCard({
            nonce: "fake-nonce",
            amount: 100,
          })
          .catch((lookupError) => {
            expect(lookupError).toBeInstanceOf(BraintreeError);
            expect(lookupError.code).toBe(
              "THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR"
            );
          });
      });

      it("sends an analytics event for missing nonce", () => {
        const err = new Error("failure");

        err.details = {
          httpStatus: 404,
        };

        testContext.client.request.mockRejectedValue(err);

        expect.assertions(2);

        return testContext.instance
          .verifyCard({
            nonce: "fake-nonce",
            amount: 100,
          })
          .catch((verifyError) => {
            expect(verifyError.details.originalError.message).toBe("failure");
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.lookup-failed.404"
            );
          });
      });

      it("rejects with a lookup error when lookup 422s", () => {
        const err = new Error("failure");

        err.details = {
          httpStatus: 422,
        };

        testContext.client.request.mockRejectedValue(err);

        expect.assertions(2);

        return testContext.instance
          .verifyCard({
            nonce: "fake-nonce",
            amount: 100,
          })
          .catch((lookupError) => {
            expect(lookupError).toBeInstanceOf(BraintreeError);
            expect(lookupError.code).toBe("THREEDS_LOOKUP_VALIDATION_ERROR");
          });
      });

      it("sends an analytics event when lookup 422s", () => {
        const err = new Error("failure");

        err.details = {
          httpStatus: 422,
        };

        testContext.client.request.mockRejectedValue(err);

        expect.assertions(2);

        return testContext.instance
          .verifyCard({
            nonce: "fake-nonce",
            amount: 100,
          })
          .catch((verifyError) => {
            expect(verifyError.details.originalError.message).toBe("failure");
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.lookup-failed.422"
            );
          });
      });
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

        BaseFramework.prototype._presentChallenge = () => {
          testContext.instance.cancelVerifyCard().then(() => {
            delete testContext.lookupResponse.lookup.acsUrl;

            return testContext.instance
              .verifyCard({
                nonce: "fake-nonce",
                amount: 100,
              })
              .then((data) => {
                expect(data.nonce).toBe("upgraded-nonce");

                done();
              });
          });
        };

        testContext.instance.verifyCard({
          nonce: "fake-nonce",
          amount: 100,
        });
      });

      it("can be called multiple times if first request failed", () => {
        testContext.client.request.mockRejectedValue(new Error("failure"));

        expect.assertions(2);

        return testContext.instance
          .verifyCard({
            nonce: "fake-nonce",
            amount: 100,
          })
          .catch((err) => {
            expect(err.details.originalError.message).toBe("failure");
          })
          .then(() => {
            testContext.client.request.mockResolvedValue(
              testContext.lookupResponse
            );

            return testContext.instance.verifyCard({
              nonce: "fake-nonce",
              amount: 100,
            });
          })
          .then((data) => {
            expect(data.nonce).toBe("upgraded-nonce");
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
        BaseFramework.prototype._presentChallenge = () => {
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
        };

        testContext.instance.verifyCard({
          nonce: "fake-nonce",
          amount: 100,
        });
      });

      it("can be called multiple times if authentication completes in between", () => {
        const instance = testContext.instance;

        const options = {
          nonce: "abc123",
          amount: 100,
        };

        BaseFramework.prototype._presentChallenge = function () {
          this._verifyCardPromisePlus.resolve({
            nonce: "some-fake-nonce",
            liabilityShifted: true,
            liabilityShiftPossible: true,
          });
        };
        testContext.lookupResponse.lookup = {
          acsUrl: "http://example.com/acs",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
          threeDSecureVersion: "1.0.2",
        };

        return instance
          .verifyCard(options)
          .then((data) => {
            expect(data.nonce).toBe("some-fake-nonce");
            expect(data.liabilityShifted).toBe(true);
            expect(data.liabilityShiftPossible).toBe(true);

            return instance.verifyCard(options);
          })
          .then((data2) => {
            expect(data2.nonce).toBe("some-fake-nonce");
            expect(data2.liabilityShifted).toBe(true);
            expect(data2.liabilityShiftPossible).toBe(true);
          });
      });
    });

    describe("lookup request", () => {
      it("makes a request to 3DS lookup endpoint with device data collection disabled", () => {
        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            addFrame: noop,
            removeFrame: noop,
            collectDeviceData: false,
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                amount: 100,
              },
            });
          });
      });

      it("makes a request to 3DS lookup endpoint with device data collection implicitly disabled", () => {
        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
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
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint", () => {
        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            addFrame: noop,
            removeFrame: noop,
            collectDeviceData: true,
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                amount: 100,
                browserColorDepth: 24,
                browserJavaEnabled: false,
                browserJavascriptEnabled: true,
                browserLanguage: "en-US",
                browserScreenHeight: 0,
                browserScreenWidth: 0,
                browserTimeZone: new Date().getTimezoneOffset(),
                deviceChannel: "Browser",
              },
            });
          });
      });

      it("sends analytics events for successful verification", () => {
        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            showLoader: false,
            addFrame: noop,
            removeFrame: noop,
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.started"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.3ds-version.1.0.2"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.completed"
            );
          });
      });

      it("sends analytics events for failed 3ds verifications", () => {
        testContext.client.request.mockRejectedValue(new Error("error"));

        return testContext.instance
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            showLoader: false,
            addFrame: noop,
            removeFrame: noop,
          })
          .catch((err) => {
            expect(err.details.originalError.message).toBe("error");
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.started"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.failed"
            );
            expect(analytics.sendEvent).not.toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.3ds-version.1.0.2"
            );
            expect(analytics.sendEvent).not.toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.completed"
            );
          });
      });

      it("retains verification details object for backwards compatibility in payload", () => {
        delete testContext.lookupResponse.lookup.acsUrl;

        return testContext.instance
          .verifyCard({
            nonce: "nonce-that-does-not-require-authentication",
            amount: 100,
            addFrame: noop,
            removeFrame: noop,
          })
          .then((data) => {
            expect(data.liabilityShiftPossible).toBe(true);
            expect(data.liabilityShifted).toBe(true);
          });
      });

      it("resolves with a nonce and verification details", () => {
        delete testContext.lookupResponse.lookup.acsUrl;

        return testContext.instance
          .verifyCard({
            nonce: "nonce-that-does-not-require-authentication",
            amount: 100,
            addFrame: noop,
            removeFrame: noop,
          })
          .then((data) => {
            expect(data.nonce).toBe("upgraded-nonce");
            expect(data.details).toEqual({ cardType: "Visa" });
            expect(data.liabilityShiftPossible).toBe(true);
            expect(data.liabilityShifted).toBe(true);
          });
      });
    });
  });

  describe("initializeChallengeWithLookupResponse", () => {
    beforeEach(() => {
      testContext.instance = new BaseFramework({
        client: testContext.client,
        createPromise: Promise.resolve(testContext.client),
      });
    });

    it("does not call present challenge when no authentication is required", () => {
      const threeDSecureInfo = {
        liabilityShiftPossible: true,
        liabilityShifted: true,
      };

      testContext.lookupResponse = {
        paymentMethod: { nonce: "upgraded-nonce" },
        threeDSecureInfo: threeDSecureInfo,
      };

      jest.spyOn(testContext.instance, "_presentChallenge");

      expect.assertions(1);

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {})
        .then(() => {
          expect(testContext.instance._presentChallenge).not.toHaveBeenCalled();
        });
    });

    describe("Verify card callback", () => {
      beforeEach(() => {
        testContext.lookupResponse = fake.basicLookupResponse;
      });

      it("sends analytics events for successful liability shift", () => {
        return testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {})
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.challenge-presented.true"
            );
            expect(analytics.sendEvent).not.toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.challenge-presented.false"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.liability-shifted.true"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.liability-shift-possible.true"
            );
          });
      });

      it("sends analytics events when no challenge is presented", () => {
        delete testContext.lookupResponse.lookup.acsUrl;

        return testContext.instance
          .initializeChallengeWithLookupResponse(testContext.lookupResponse, {})
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.challenge-presented.false"
            );
            expect(analytics.sendEvent).not.toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.challenge-presented.true"
            );
          });
      });
    });
  });

  describe("cancelVerifyCard", () => {
    beforeEach(() => {
      testContext.framework = new BaseFramework({
        client: testContext.client,
        createPromise: Promise.resolve(testContext.client),
      });
      testContext.framework._verifyCardInProgress = true;
      testContext.framework._lookupPaymentMethod = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
      };
    });

    it("sets _verifyCardInProgress to false", () => {
      testContext.framework._verifyCardInProgress = true;

      expect.assertions(1);

      return testContext.framework.cancelVerifyCard().then(() => {
        expect(testContext.framework._verifyCardInProgress).toBe(false);
      });
    });

    it("passes back an error if there is no initial lookup payment method", () => {
      delete testContext.framework._lookupPaymentMethod;

      expect.assertions(4);

      return testContext.framework.cancelVerifyCard().catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.MERCHANT);
        expect(err.code).toBe("THREEDS_NO_VERIFICATION_PAYLOAD");
        expect(err.message).toBe("No verification payload available.");
      });
    });

    it("passes back the result of the initial lookup", () => {
      testContext.framework._lookupPaymentMethod = {
        nonce: "fake-nonce",
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false,
        },
      };

      expect.assertions(3);

      return testContext.framework.cancelVerifyCard().then((response) => {
        expect(response.nonce).toBe("fake-nonce");
        expect(response.liabilityShiftPossible).toBe(true);
        expect(response.liabilityShifted).toBe(false);
      });
    });
  });

  describe("teardown", () => {
    beforeEach(() => {
      jest.spyOn(analytics, "sendEvent");
      testContext.framework = new BaseFramework({
        client: testContext.client,
        createPromise: Promise.resolve(testContext.client),
      });
    });

    it("calls teardown analytic", () => {
      return testContext.framework.teardown().then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "three-d-secure.teardown-completed"
        );
      });
    });

    it("tears down v1Bus if it exists", () => {
      const bus = {
        teardown: jest.fn(),
      };

      testContext.framework._v1Bus = bus;

      return testContext.framework.teardown().then(() => {
        expect(bus.teardown).toHaveBeenCalledTimes(1);
      });
    });

    it("does not teardown bankFrame if is has no parent node", () => {
      const iframe = {
        parentNode: { removeChild: jest.fn() },
      };

      testContext.framework._v1Iframe = iframe;

      return testContext.framework.teardown().then(() => {
        expect(iframe.parentNode.removeChild).toHaveBeenCalledTimes(1);
        expect(iframe.parentNode.removeChild).toHaveBeenCalledWith(iframe);
      });
    });

    it("does not teardown bankFrame if is has no parent node", () => {
      testContext.framework._v1Iframe = {};

      return testContext.framework.teardown().catch(() => {
        throw new Error("Did not expect teardown to error");
      });
    });
  });
});
