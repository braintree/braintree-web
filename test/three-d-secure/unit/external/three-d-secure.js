import EventEmitter from "@braintree/event-emitter";
import ThreeDSecure from "../../../../src/three-d-secure/external/three-d-secure";
import SongbirdFramework from "../../../../src/three-d-secure/external/frameworks/songbird";
import CardinalModalFramework from "../../../../src/three-d-secure/external/frameworks/cardinal-modal";
import InlineIframeFramework from "../../../../src/three-d-secure/external/frameworks/inline-iframe";
import methods from "../../../../src/lib/methods";
import BraintreeError from "../../../../src/lib/braintree-error";
import { fake, noop } from "../../../helpers";

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
      request: vi.fn().mockResolvedValue(null),
      getConfiguration() {
        return testContext.configuration;
      },
    };
    vi.spyOn(SongbirdFramework.prototype, "setupSongbird");
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

    it('uses inline iframe framework when "inline-iframe" is passed in', () => {
      const options = {
        client: testContext.client,
        framework: "inline-iframe",
      };
      const dddS = new ThreeDSecure(options);

      expect(dddS._framework).toBeInstanceOf(InlineIframeFramework);
    });

    it("sets up event listeners for the framework", () =>
      new Promise((resolve) => {
        const options = {
          client: testContext.client,
          framework: "cardinal-modal",
        };
        let dddS, handler;

        vi.spyOn(SongbirdFramework.prototype, "setUpEventListeners");

        dddS = new ThreeDSecure(options);

        expect(
          SongbirdFramework.prototype.setUpEventListeners
        ).toHaveBeenCalledTimes(1);

        dddS.on("foo", (payload) => {
          expect(payload).toEqual({ someKey: "some data" });

          resolve();
        });

        handler =
          SongbirdFramework.prototype.setUpEventListeners.mock.calls[0][0];

        handler("foo", { someKey: "some data" });
      }));
  });

  describe("verifyCard", () => {
    it("calls the verifyCard method on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });
      // const options = { nonce: 'foo', amount: 100, onLookupComplete: noop };

      vi.spyOn(instance._framework, "verifyCard");

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

      vi.spyOn(instance._framework, "verifyCard");

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

      vi.spyOn(instance._framework, "initializeChallengeWithLookupResponse");

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

      vi.spyOn(instance._framework, "initializeChallengeWithLookupResponse");

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

      vi.spyOn(instance._framework, "prepareLookup").mockResolvedValue({
        foo: "bar",
      });

      instance.prepareLookup();

      expect(instance._framework.prepareLookup).toHaveBeenCalledTimes(1);
    });

    it("stringifies the result of prepareLookup on the framework", () => {
      const instance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      vi.spyOn(instance._framework, "prepareLookup").mockResolvedValue({
        foo: "bar",
      });

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

      vi.spyOn(instance._framework, "cancelVerifyCard");

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
          .concat("on", "emit")
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

    it("calls strategies teardown method", () => {
      const inlineIframeInstance = new ThreeDSecure({
        client: testContext.client,
        framework: "inline-iframe",
      });
      const cardinalModalInstance = new ThreeDSecure({
        client: testContext.client,
        framework: "cardinal-modal",
      });

      vi.spyOn(inlineIframeInstance._framework, "teardown").mockResolvedValue();
      vi.spyOn(
        cardinalModalInstance._framework,
        "teardown"
      ).mockResolvedValue();

      return Promise.all([
        inlineIframeInstance.teardown(),
        cardinalModalInstance.teardown(),
      ]).then(() => {
        expect(inlineIframeInstance._framework.teardown).toHaveBeenCalledTimes(
          1
        );
        expect(cardinalModalInstance._framework.teardown).toHaveBeenCalledTimes(
          1
        );
      });
    });
  });
});
