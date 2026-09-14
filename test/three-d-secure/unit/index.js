vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-deferred-client");
vi.mock("../../../src/lib/create-assets-url");

import analytics from "../../../src/lib/analytics";
import basicComponentVerification from "../../../src/lib/basic-component-verification";
import isHTTPS from "../../../src/lib/is-https";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import threeDSecure from "../../../src/three-d-secure";
import ThreeDSecure from "../../../src/three-d-secure/external/three-d-secure";
import BraintreeError from "../../../src/lib/braintree-error";
import { fake, noop } from "../../helpers";
import threedsErrors from "../../../src/three-d-secure/shared/errors";

describe("three-d-secure.create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    const configuration = fake.configuration();

    configuration.gatewayConfiguration.creditCard.threeDSecureEnabled = true;
    testContext.configuration = configuration;
    testContext.client = fake.client({
      configuration: testContext.configuration,
    });

    vi.spyOn(isHTTPS, "isHTTPS").mockReturnValue(true);
    vi.spyOn(createDeferredClient, "create").mockResolvedValue(
      testContext.client
    );
  });

  it("errors if merchant passes in unrecognized challengeDisplay", async () => {
    var expectedErr = {
      code: threedsErrors.THREEDS_CHALLENGE_DISPLAY_INVALID.code,
      type: threedsErrors.THREEDS_CHALLENGE_DISPLAY_INVALID.type,
      message:
        "Challenge display `unknown` is not recognized. Valid values are 'modal' and 'inline-iframe'.",
    };

    testContext.configuration.gatewayConfiguration.creditCard.threeDSecure = {
      cardinalAuthenticationJWT: "jwt",
      cardinalSongbirdUrl:
        "https://songbirdstag.cardinalcommerce.com/edge/v1/songbird.js",
    };

    await expect(async () => {
      await threeDSecure.create({
        client: testContext.client,
        challengeDisplay: "unknown",
      });
    }).rejects.toMatchObject(expectedErr);
  });

  describe.each(["modal", "inline-iframe"])(
    "challengeDisplay-related errors",
    (challengeDisplay) => {
      it("verifies with basicComponentVerification for %s challengeDisplay", () => {
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };

        expect.assertions(2);

        return threeDSecure
          .create({
            client: testContext.client,
            challengeDisplay: challengeDisplay,
          })
          .then(() => {
            expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
            expect(
              basicComponentVerification.verify.mock.calls[0][0]
            ).toMatchObject({
              name: "3D Secure",
              client: testContext.client,
            });
          });
      });

      it("does not error if merchant passes in %s challengeDisplay", () => {
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };

        return threeDSecure.create({
          client: testContext.client,
          challengeDisplay: challengeDisplay,
        });
      });

      it(`errors if merchant does not have a 3ds object when ${challengeDisplay} challengeDisplay is specified`, () => {
        const client = testContext.client;

        expect.assertions(2);
        delete testContext.configuration.gatewayConfiguration.creditCard
          .threeDSecure;

        return threeDSecure
          .create({
            client: client,
            challengeDisplay: challengeDisplay,
          })
          .catch(({ code }) => {
            expect(code).toBe("THREEDS_NOT_ENABLED_FOR_V2");
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              client,
              "three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT"
            );
          });
      });

      it(`errors if merchant does not have a jwt to setup songbird when ${challengeDisplay} challengeDisplay is specified`, () => {
        const client = testContext.client;

        expect.assertions(2);
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {};

        return threeDSecure
          .create({
            client: client,
            challengeDisplay: challengeDisplay,
          })
          .catch(({ code }) => {
            expect(code).toBe("THREEDS_NOT_ENABLED_FOR_V2");
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              client,
              "three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT"
            );
          });
      });

      it(`does not error when ${challengeDisplay} is used with deferred client`, () => {
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {};

        return threeDSecure
          .create({
            authorization: fake.clientToken,
            challengeDisplay: challengeDisplay,
          })
          .then((instance) => {
            expect(instance).toBeInstanceOf(ThreeDSecure);
            instance._framework._createPromise.catch(noop); // handle eventual promise rejection
          });
      });

      it("can create with an authorization instead of a client", () =>
        threeDSecure
          .create({
            authorization: fake.clientToken,
            debug: true,
            challengeDisplay: challengeDisplay,
          })
          .then((instance) => {
            expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
            expect(createDeferredClient.create.client).toBeUndefined();
            expect(createDeferredClient.create).toHaveBeenCalledWith({
              authorization: fake.clientToken,
              debug: true,
              assetsUrl: "https://example.com/assets",
              name: "3D Secure",
            });

            expect(instance).toBeInstanceOf(ThreeDSecure);
          }));

      it("errors out if three-d-secure is not enabled", () => {
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecureEnabled = false;

        expect.assertions(4);

        return threeDSecure
          .create({
            client: testContext.client,
            challengeDisplay: challengeDisplay,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_NOT_ENABLED_FOR_V2");
            expect(err.message).toBe(
              "3D Secure version 2 is not enabled for this merchant. Contact Braintree Support for assistance at https://help.braintreepayments.com/"
            );
          });
      });

      it("does not error when three-d-secure is not enabled when it is used with deferred client", () => {
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecureEnabled = false;

        return threeDSecure
          .create({
            authorization: fake.clientToken,
            challengeDisplay: challengeDisplay,
          })
          .then((instance) => {
            expect(instance).toBeInstanceOf(ThreeDSecure);
            instance._framework._createPromise.catch(noop); // handle eventual promise rejection
          });
      });

      it("errors out if tokenization key is used", () => {
        testContext.configuration.authorizationType = "TOKENIZATION_KEY";
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };
        expect.assertions(4);

        return threeDSecure
          .create({
            client: testContext.client,
            challengeDisplay: challengeDisplay,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_CAN_NOT_USE_TOKENIZATION_KEY");
            expect(err.message).toBe(
              "3D Secure can not use a tokenization key for authorization."
            );
          });
      });

      it("does not error out if tokenization key is used with deferred client", () => {
        testContext.configuration.authorizationType = "TOKENIZATION_KEY";

        return threeDSecure
          .create({
            authorization: fake.clientToken,
            challengeDisplay: challengeDisplay,
          })
          .then((instance) => {
            expect(instance).toBeInstanceOf(ThreeDSecure);
            instance._framework._createPromise.catch(noop); // handle eventual promise rejection
          });
      });

      it("errors out if browser is not https and environment is production", () => {
        isHTTPS.isHTTPS.mockClear();
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };
        testContext.configuration.gatewayConfiguration.environment =
          "production";
        vi.spyOn(isHTTPS, "isHTTPS").mockReturnValue(false);

        expect.assertions(4);

        return threeDSecure
          .create({
            client: testContext.client,
            challengeDisplay: challengeDisplay,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_HTTPS_REQUIRED");
            expect(err.message).toBe("3D Secure requires HTTPS.");
          });
      });

      it("does not error out if browser is not https and environment is production when using deferred client", () => {
        testContext.configuration.gatewayConfiguration.environment =
          "production";
        isHTTPS.isHTTPS.mockReturnValue(false);

        return threeDSecure
          .create({
            authorization: fake.clientToken,
            challengeDisplay: challengeDisplay,
          })
          .then((instance) => {
            expect(instance).toBeInstanceOf(ThreeDSecure);
            instance._framework._createPromise.catch(noop); // handle eventual promise rejection
          });
      });

      it("allows http connections when not in production", () => {
        isHTTPS.isHTTPS.mockClear();
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };
        testContext.configuration.gatewayConfiguration.environment = "sandbox";
        vi.spyOn(isHTTPS, "isHTTPS").mockReturnValue(false);

        expect.assertions(1);

        return threeDSecure
          .create({
            client: testContext.client,
            challengeDisplay: challengeDisplay,
          })
          .then((foo) => {
            expect(foo).toBeInstanceOf(ThreeDSecure);
          });
      });

      it("sends an analytics event", () => {
        const client = testContext.client;

        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };
        expect.assertions(1);

        return threeDSecure
          .create({
            client: client,
            challengeDisplay: challengeDisplay,
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              client,
              "three-d-secure.initialized"
            );
          });
      });

      it("resolves with a three-d-secure instance", () => {
        testContext.configuration.gatewayConfiguration.creditCard.threeDSecure =
          {
            cardinalAuthenticationJWT: "jwt",
          };
        threeDSecure
          .create({
            client: testContext.client,
            challengeDisplay: challengeDisplay,
          })
          .then((foo) => {
            expect(foo).toBeInstanceOf(ThreeDSecure);
          });
      });
    }
  );
});
