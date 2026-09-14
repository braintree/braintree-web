vi.mock("../../../src/lib/analytics");

import analytics from "../../../src/lib/analytics";
import BraintreeError from "../../../src/lib/braintree-error";
import { fake } from "../../helpers";
import InstantVerification from "../../../src/instant-verification/instant-verification";
import _e7 from "../../../src/instant-verification";

const { create } = _e7;

import uuid from "@braintree/uuid";

describe("Instant-Verification", () => {
  let testContext, mockClose;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockClose = vi.fn();
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
      request: vi.fn().mockResolvedValue({}),
      getVersion: () => process.env.npm_package_version,
      getConfiguration: () => testContext.configuration,
    };
  });

  it("sends analytics when instant-verification initialized successfully", () =>
    new Promise((done) => {
      new InstantVerification({
        client: testContext.client,
      });

      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "instant-verification.component.initialized"
      );
      done();
    }));

  it("throws error when openBanking configuration is not present during create", () =>
    new Promise((done) => {
      delete testContext.configuration.gatewayConfiguration.openBanking;

      create({
        client: testContext.client,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("INSTANT_VERIFICATION_NOT_ENABLED");
        expect(err.message).toBe(
          "Instant Verification is not enabled for this merchant account."
        );
        done();
      });
    }));

  describe("startPayment", () => {
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

    it("throws error if jwt is not provided", () =>
      new Promise((done) => {
        const options = {
          client: testContext.client,
        };
        const instantVerification = new InstantVerification(options);

        try {
          instantVerification.startPayment({});
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("INSTANT_VERIFICATION_JWT_MISSING");
          expect(err.message).toBe(
            "JWT is required for Instant Verification payment flow."
          );
          expect(err.type).toBe("MERCHANT");
          done();
        }
      }));

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

    it("returns nonce extracted from success param", () =>
      new Promise((done) => {
        const encodedSuccessParam = btoa(JSON.stringify(mockSuccessPayload));

        const result = btIvInstance.handleRedirect({
          success: encodedSuccessParam,
        });
        expect(result).toBe(mockNonce);
        done();
      }));

    it("rejects with error upon Instant Verification payment cancelled", () =>
      new Promise((done) => {
        const encodedCancelParam = btoa(JSON.stringify(mockCancelPayload));

        try {
          btIvInstance.handleRedirect({
            cancel: encodedCancelParam,
          });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.message).toBe(
            "Customer canceled the Instant Verification payment before authorizing."
          );
          expect(err.code).toBe("INSTANT_VERIFICATION_CANCELED");
          expect(err.type).toBe("CUSTOMER");
          done();
        }
      }));

    it("rejects with error upon failed auth completion", () =>
      new Promise((done) => {
        const encodedErrorParam = btoa(JSON.stringify(mockErrorPayload));

        try {
          btIvInstance.handleRedirect({
            error: encodedErrorParam,
          });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.message).toBe(
            "Instant Verification payment failed during authorizing."
          );
          expect(err.code).toBe("INSTANT_VERIFICATION_FAILURE");
          expect(err.type).toBe("UNKNOWN");
          done();
        }
      }));

    it("sends analytics event for success auth completion", () =>
      new Promise((done) => {
        const encodedSuccessParam = btoa(JSON.stringify(mockSuccessPayload));

        btIvInstance.handleRedirect({
          success: encodedSuccessParam,
        });

        expect(analytics.sendEvent).toBeCalledWith(
          testContext.client,
          "instant-verification.redirect.completed.success"
        );
        done();
      }));

    it("sends analytics event for cancel upon failed auth completion", () =>
      new Promise((done) => {
        const encodedCancelParam = btoa(JSON.stringify(mockCancelPayload));

        try {
          btIvInstance.handleRedirect({
            cancel: encodedCancelParam,
          });
        } catch {
          expect(analytics.sendEvent).toBeCalledWith(
            testContext.client,
            "instant-verification.redirect.completed.canceled"
          );
          done();
        }
      }));

    it("sends analytics event for error upon failed auth completion", () =>
      new Promise((done) => {
        const encodedErrorParam = btoa(JSON.stringify(mockErrorPayload));

        try {
          btIvInstance.handleRedirect({
            error: encodedErrorParam,
          });
        } catch {
          expect(analytics.sendEvent).toBeCalledWith(
            testContext.client,
            "instant-verification.redirect.completed.error"
          );
          done();
        }
      }));
  });

  describe("getAchMandateDetails", () => {
    let btIvInstance, mandateId, mockNodeResponse;

    beforeEach(() => {
      btIvInstance = new InstantVerification({
        client: testContext.client,
      });
      mandateId = "mandate-id-1234";

      mockNodeResponse = {
        data: {
          node: {
            id: mandateId,
            details: {
              accountholderName: "John Doe",
              accountType: "checking",
              bankName: "Test Bank",
              last4: "1234",
              ownershipType: "personal",
              routingNumber: "012345678",
              verified: true,
            },
            verifications: {
              edges: [
                {
                  node: {
                    status: "VERIFIED",
                  },
                },
              ],
            },
          },
        },
      };
    });

    it("throws error if mandateId is not provided", () =>
      new Promise((done) => {
        return btIvInstance.getAchMandateDetails({}).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("INSTANT_VERIFICATION_MANDATE_ID_REQUIRED");
          expect(err.message).toBe(
            "Mandate ID is required to fetch ACH mandate details."
          );
          done();
        });
      }));

    it("makes a request to the GraphQL API with the correct parameters", () => {
      testContext.client.request.mockResolvedValue(mockNodeResponse);

      return btIvInstance.getAchMandateDetails({ mandateId }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith({
          api: "graphQLApi",
          method: "post",
          data: {
            query: expect.any(String),
            variables: { id: mandateId },
            operationName: "AchMandateDetails",
          },
        });
      });
    });

    it("formats the mandate details correctly on success", () => {
      testContext.client.request.mockResolvedValue(mockNodeResponse);

      return btIvInstance.getAchMandateDetails({ mandateId }).then((result) => {
        expect(result).toEqual({
          accountHolderName: "John Doe",
          accountType: "checking",
          bankName: "Test Bank",
          last4: "1234",
          ownershipType: "personal",
          routingNumber: "012345678",
        });
      });
    });

    it("sends analytics event on successful mandate details fetch", () => {
      testContext.client.request.mockResolvedValue(mockNodeResponse);

      return btIvInstance.getAchMandateDetails({ mandateId }).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "instant-verification.ach-mandate-details.succeeded"
        );
      });
    });

    it("rejects with BraintreeError if request fails", () =>
      new Promise((done) => {
        const mockError = new Error("Network error");

        testContext.client.request.mockRejectedValue(mockError);

        return btIvInstance.getAchMandateDetails({ mandateId }).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED");
          expect(err.message).toBe("Failed to fetch ACH mandate details.");
          expect(err.details.originalError).toBe(mockError);
          done();
        });
      }));

    it("sends analytics event when mandate details fetch fails", () =>
      new Promise((done) => {
        const mockError = new Error("Network error");

        testContext.client.request.mockRejectedValue(mockError);

        return btIvInstance.getAchMandateDetails({ mandateId }).catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "instant-verification.ach-mandate-details.failed"
          );
          done();
        });
      }));

    it("rejects with BraintreeError if node is missing from response", () =>
      new Promise((done) => {
        const missingNodeResponse = {
          data: {},
        };

        testContext.client.request.mockResolvedValue(missingNodeResponse);

        return btIvInstance.getAchMandateDetails({ mandateId }).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED");
          expect(err.message).toBe(
            "No mandate details found for the provided ID."
          );
          done();
        });
      }));

    it("rejects with BraintreeError if details is missing from node response", () =>
      new Promise((done) => {
        const missingDetailsResponse = {
          data: {
            node: {
              id: mandateId,
              // Missing details object
            },
          },
        };

        testContext.client.request.mockResolvedValue(missingDetailsResponse);

        return btIvInstance.getAchMandateDetails({ mandateId }).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED");
          expect(err.message).toBe(
            "Mandate details are missing in the response."
          );
          done();
        });
      }));
  });
});
