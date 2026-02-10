"use strict";

const EventEmitter = require("@braintree/event-emitter");
const ThreeDSecure = require("../../../../src/three-d-secure/external/three-d-secure");
const SongbirdFramework = require("../../../../src/three-d-secure/external/frameworks/songbird");
const CardinalModalFramework = require("../../../../src/three-d-secure/external/frameworks/cardinal-modal");
const Bootstrap3ModalFramework = require("../../../../src/three-d-secure/external/frameworks/bootstrap3-modal");
const InlineIframeFramework = require("../../../../src/three-d-secure/external/frameworks/inline-iframe");
const methods = require("../../../../src/lib/methods");
const BraintreeError = require("../../../../src/lib/braintree-error");
const { fake, noop } = require("../../../helpers");

describe("ThreeDSecure", () => {
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
    jest.spyOn(SongbirdFramework.prototype, "setupSongbird");
  });

  describe("Constructor", () => {
    it("is an event emitter", () => {
      const options = {
        client: testContext.client,
        framework: "cardinal-modal",
      };
      const dddS = new ThreeDSecure(options);

      expect(dddS).toBeInstanceOf(EventEmitter);
    });

    it('uses cardinal modal framework when "cardinal-modal" is passed in', () => {
      const options = {
        client: testContext.client,
        framework: "cardinal-modal",
      };
      const dddS = new ThreeDSecure(options);

      expect(dddS._framework).toBeInstanceOf(CardinalModalFramework);
    });

    it('uses bootstrap3 modal framework when "bootstrap3-modal" is passed in', () => {
      const options = {
        client: testContext.client,
        framework: "bootstrap3-modal",
      };
      const dddS = new ThreeDSecure(options);

      expect(dddS._framework).toBeInstanceOf(Bootstrap3ModalFramework);
    });

    it('uses inline iframe framework when "inline-iframe" is passed in', () => {
      const options = {
        client: testContext.client,
        framework: "inline-iframe",
      };
      const dddS = new ThreeDSecure(options);

      expect(dddS._framework).toBeInstanceOf(InlineIframeFramework);
    });

    it("sets up event listeners for the framework", (done) => {
      const options = {
        client: testContext.client,
        framework: "cardinal-modal",
      };
      let dddS, handler;

      jest.spyOn(SongbirdFramework.prototype, "setUpEventListeners");

      dddS = new ThreeDSecure(options);

      expect(
        SongbirdFramework.prototype.setUpEventListeners
      ).toHaveBeenCalledTimes(1);

      dddS.on("foo", (data, otherData) => {
        expect(data).toBe("some data");
        expect(otherData).toBe("other data");

        done();
      });

      handler =
        SongbirdFramework.prototype.setUpEventListeners.mock.calls[0][0];

      handler("foo", "some data", "other data");
    });
  });

  describe("verifyCard", () => {
    it("calls the verifyCard method on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });
      // const options = { nonce: 'foo', amount: 100, onLookupComplete: noop };

      jest.spyOn(instance._framework, "verifyCard");

      expect.assertions(2);

      return instance
        .verifyCard({})
        .catch(noop)
        .then(() => {
          expect(instance._framework.verifyCard).toHaveBeenCalledTimes(1);
          expect(instance._framework.verifyCard).toHaveBeenCalledWith(
            {},

            undefined
          );
        });
    });

    it("passes along `ignoreOnLookupCompleteRequirement` if a listener for it is included", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      instance.on("lookup-complete", noop);

      jest.spyOn(instance._framework, "verifyCard");

      expect.assertions(2);

      return instance
        .verifyCard({})
        .catch(noop)
        .then(() => {
          expect(instance._framework.verifyCard).toHaveBeenCalledTimes(1);
          expect(instance._framework.verifyCard).toHaveBeenCalledWith(
            {},
            {
              ignoreOnLookupCompleteRequirement: true,
            }
          );
        });
    });
  });

  describe("initializeChallengeWithLookupResponse", () => {
    it("calls the initializeChallengeWithLookupResponse method on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });
      const options = {
        paymentMethod: {
          consumed: false,
          description: "ending in 02",
          details: {
            cardType: "Visa",
            lastTwo: "02",
          },
          nonce: "nonce",
          threeDSecureInfo: {
            enrolled: "N",
            liabilityShiftPossible: false,
            liabilityShifted: false,
            status: "authenticate_successful_issuer_not_participating",
          },
          type: "CreditCard",
        },
        success: true,
        threeDSecureInfo: {
          liabilityShiftPossible: false,
          liabilityShifted: false,
        },
      };

      jest.spyOn(instance._framework, "initializeChallengeWithLookupResponse");

      instance.initializeChallengeWithLookupResponse(options);

      expect(
        instance._framework.initializeChallengeWithLookupResponse
      ).toHaveBeenCalledTimes(1);
      expect(
        instance._framework.initializeChallengeWithLookupResponse
      ).toHaveBeenCalledWith(options);
    });

    it("can pass a string version of lookup response", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });
      const options = {
        paymentMethod: {
          consumed: false,
          description: "ending in 02",
          details: {
            cardType: "Visa",
            lastTwo: "02",
          },
          nonce: "nonce",
          threeDSecureInfo: {
            enrolled: "N",
            liabilityShiftPossible: false,
            liabilityShifted: false,
            status: "authenticate_successful_issuer_not_participating",
          },
          type: "CreditCard",
        },
        success: true,
        threeDSecureInfo: {
          liabilityShiftPossible: false,
          liabilityShifted: false,
        },
      };
      const stringifiedOptions = JSON.stringify(options);

      jest.spyOn(instance._framework, "initializeChallengeWithLookupResponse");

      instance.initializeChallengeWithLookupResponse(stringifiedOptions);

      expect(
        instance._framework.initializeChallengeWithLookupResponse
      ).toHaveBeenCalledTimes(1);
      expect(
        instance._framework.initializeChallengeWithLookupResponse
      ).toHaveBeenCalledWith(options);
    });
  });

  describe("prepareLookup", () => {
    it("calls the prepareLookup method on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      jest
        .spyOn(instance._framework, "prepareLookup")
        .mockResolvedValue({ foo: "bar" });

      instance.prepareLookup();

      expect(instance._framework.prepareLookup).toHaveBeenCalledTimes(1);
    });

    it("stringifies the result of prepareLookup on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      jest
        .spyOn(instance._framework, "prepareLookup")
        .mockResolvedValue({ foo: "bar" });

      return instance.prepareLookup().then((data) => {
        expect(typeof data).toBe("string");
        expect(JSON.parse(data)).toEqual({ foo: "bar" });
      });
    });
  });

  describe("cancelVerifyCard", () => {
    it("calls the cancelVerifyCard method on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      jest.spyOn(instance._framework, "cancelVerifyCard");

      expect.assertions(1);

      return instance
        .cancelVerifyCard()
        .catch(noop)
        .then(() => {
          expect(instance._framework.cancelVerifyCard).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      expect.assertions(28);

      return instance.teardown().then(() => {
        methods(ThreeDSecure.prototype)
          .concat("on", "_emit")
          .forEach((method) => {
            let error;

            try {
              instance[method]();
            } catch (err) {
              error = err;
            }

            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe(BraintreeError.types.MERCHANT);
            expect(error.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(error.message).toBe(
              `${method} cannot be called after teardown.`
            );
          });
      });
    });

    it("calls stategies teardown method", () => {
      const bootstrapInstance = new ThreeDSecure({
        client: testContext.client,
        framework: "bootstrap3-modal",
      });
      const cardinalModalInstance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      jest.spyOn(bootstrapInstance._framework, "teardown").mockResolvedValue();
      jest
        .spyOn(cardinalModalInstance._framework, "teardown")
        .mockResolvedValue();

      return Promise.all([
        bootstrapInstance.teardown(),
        cardinalModalInstance.teardown(),
      ]).then(() => {
        expect(bootstrapInstance._framework.teardown).toHaveBeenCalledTimes(1);
        expect(cardinalModalInstance._framework.teardown).toHaveBeenCalledTimes(
          1
        );
      });
    });
  });
});
