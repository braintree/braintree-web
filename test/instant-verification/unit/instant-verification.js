"use strict";

jest.mock("../../../src/lib/analytics");

const analytics = require("../../../src/lib/analytics");
const BraintreeError = require("../../../src/lib/braintree-error");
const { fake } = require("../../helpers");
const InstantVerification = require("../../../src/instant-verification/instant-verification");
const { create } = require("../../../src/instant-verification");
const uuid = require("@braintree/uuid");

describe("Instant-Verification", () => {
  let testContext, mockClose;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockClose = jest.fn();
    delete window.location;
    window.location = { href: "" };

    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.configuration.authorizationFingerprint =
      fake.clientToken.authorizationFingerprint;

    // Add analytics metadata to pass basic component verification
    testContext.configuration.analyticsMetadata = {
      sessionId: "session-id",
      sdkVersion: process.env.npm_package_version,
      merchantId: "merchant-id",
    };

    testContext.client = {
      request: jest.fn().mockResolvedValue({}),
      getVersion: () => process.env.npm_package_version,
      getConfiguration: () => testContext.configuration,
    };
  });

  it("sends analytics when instant-verification initialized successfully", () => {
    expect.assertions(1);

    new InstantVerification({
      client: testContext.client,
    });

    expect(analytics.sendEvent).toBeCalledWith(
      testContext.client,
      "instant-verification.component.initialized"
    );
  });

  it("throws error when openBanking configuration is not present during create", async () => {
    delete testContext.configuration.gatewayConfiguration.openBanking;

    expect.assertions(4);

    await create({
      client: testContext.client,
    }).catch((err) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("MERCHANT");
      expect(err.code).toBe("INSTANT_VERIFICATION_NOT_ENABLED");
      expect(err.message).toBe(
        "Instant Verification is not enabled for this merchant account."
      );
    });
  });

  describe("startPayment", () => {
    it("promise resolves when invoked successfully", async () => {
      const options = {
        client: testContext.client,
      };
      const instantVerification = new InstantVerification(options);

      await expect(
        instantVerification.startPayment({
          jwt: "jwt",
        })
      ).resolves.not.toThrow();
    });

    it("redirects to the experience URL with the JWT and client auth fingerprint", () => {
      const options = {
        client: testContext.client,
      };
      const instantVerification = new InstantVerification(options);

      instantVerification.startPayment({
        jwt: "jwt",
      });

      // Check window.location.href instead of window.open
      expect(window.location.href).toEqual(expect.stringContaining("ct=jwt"));
      expect(window.location.href).toEqual(
        expect.stringContaining(
          "at=" + fake.clientToken.authorizationFingerprint
        )
      );
    });

    it("throws error if jwt is not provided", async () => {
      const options = {
        client: testContext.client,
      };
      const instantVerification = new InstantVerification(options);

      expect.assertions(4);

      await instantVerification.startPayment({}).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("INSTANT_VERIFICATION_JWT_MISSING");
        expect(err.message).toBe(
          "JWT is required for Instant Verification payment flow."
        );
        expect(err.type).toBe("MERCHANT");
      });
    });

    it("sends analytics event upon launching redirect", async () => {
      const options = {
        client: testContext.client,
      };
      const instantVerification = new InstantVerification(options);

      await instantVerification.startPayment({ jwt: "jwt" });

      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "instant-verification.redirect.initiated"
      );
    });
  });

  describe("handleRedirect", () => {
    let btIvInstance,
      btOptions,
      merchantName,
      mockCancelPayload,
      mockErrorPayload,
      mockSuccessPayload,
      mockNonce;

    beforeEach(() => {
      const nonceUuid = uuid();

      btOptions = {
        client: testContext.client,
      };
      btIvInstance = new InstantVerification(btOptions);
      merchantName =
        testContext.configuration.gatewayConfiguration.openBanking
          .businessNames[0];
      mockNonce = `tokenbankacct_${nonceUuid}`;
      mockCancelPayload = {
        type: "cancel",
        context: {
          key: "BRAINTREE",
          value: merchantName,
        },
      };
      mockSuccessPayload = {
        type: "success",
        context: {
          key: "BRAINTREE",
          value: merchantName,
        },
        tokenizedAccounts: [
          {
            tokenized_account: mockNonce,

            token_issuer: "BRAINTREE",
          },
        ],
      };
      mockErrorPayload = {
        type: "error",
        context: {
          key: "BRAINTREE",
          value: merchantName,
        },
        error: "An error occurred",
      };
    });

    it("returns nonce extracted from success param", () => {
      const encodedSuccessParam = btoa(JSON.stringify(mockSuccessPayload));

      expect.assertions(1);

      return btIvInstance
        .handleRedirect({
          success: encodedSuccessParam,
        })
        .then((result) => {
          expect(result).toBe(mockNonce);
        });
    });

    it("rejects with error upon Instant Verification payment cancelled", () => {
      const encodedCancelParam = btoa(JSON.stringify(mockCancelPayload));

      expect.assertions(4);

      return btIvInstance
        .handleRedirect({
          cancel: encodedCancelParam,
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.message).toBe(
            "Customer canceled the Instant Verification payment before authorizing."
          );
          expect(err.code).toBe("INSTANT_VERIFICATION_CANCELED");
          expect(err.type).toBe("CUSTOMER");
        });
    });

    it("rejects with error upon failed auth completion", () => {
      const encodedErrorParam = btoa(JSON.stringify(mockErrorPayload));

      expect.assertions(4);

      return btIvInstance
        .handleRedirect({
          error: encodedErrorParam,
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.message).toBe(
            "Instant Verification payment failed during authorizing."
          );
          expect(err.code).toBe("INSTANT_VERIFICATION_FAILURE");
          expect(err.type).toBe("UNKNOWN");
        });
    });

    it("sends analytics event for success auth completion", () => {
      const encodedSuccessParam = btoa(JSON.stringify(mockSuccessPayload));

      expect.assertions(1);

      return btIvInstance
        .handleRedirect({
          success: encodedSuccessParam,
        })
        .then(() => {
          expect(analytics.sendEvent).toBeCalledWith(
            testContext.client,
            "instant-verification.redirect.completed.success"
          );
        });
    });

    it("sends analytics event for cancel upon failed auth completion", () => {
      const encodedCancelParam = btoa(JSON.stringify(mockCancelPayload));

      expect.assertions(1);

      return btIvInstance
        .handleRedirect({
          cancel: encodedCancelParam,
        })
        .catch(() => {
          expect(analytics.sendEvent).toBeCalledWith(
            testContext.client,
            "instant-verification.redirect.completed.canceled"
          );
        });
    });

    it("sends analytics event for error upon failed auth completion", () => {
      const encodedErrorParam = btoa(JSON.stringify(mockErrorPayload));

      expect.assertions(1);

      return btIvInstance
        .handleRedirect({
          error: encodedErrorParam,
        })
        .catch(() => {
          expect(analytics.sendEvent).toBeCalledWith(
            testContext.client,
            "instant-verification.redirect.completed.error"
          );
        });
    });
  });
});
