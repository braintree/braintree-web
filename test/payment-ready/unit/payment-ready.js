"use strict";

const PaymentReady = require("../../../src/payment-ready/payment-ready");
const constants = require("../../../src/payment-ready/constants");
const errors = require("../../../src/payment-ready/errors");
const analytics = require("../../../src/lib/analytics");

jest.mock("../../../src/lib/analytics");

describe("PaymentReady", () => {
  let mockClient, paymentReadyInstance;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
    };

    paymentReadyInstance = new PaymentReady({
      client: mockClient,
      useDeferredClient: false,
    });

    analytics.sendEvent.mockClear();
  });

  describe("createCustomerSession", () => {
    it("should return session data on success", async () => {
      const mockResponse = {
        data: { createCustomerSession: { sessionId: "mock-session-id" } },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await paymentReadyInstance.createCustomerSession({
        customer: { id: "customer-id" },
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        api: "graphQLApi",
        data: {
          query: constants.CREATE_PAYMENT_READY_SESSION_QUERY,
          variables: {
            input: {
              customer: { id: "customer-id" },
            },
          },
        },
      });
      expect(result).toEqual(mockResponse.data.createCustomerSession);
    });

    it("should accept sessionId and return session data upon success", async () => {
      const inputSessionId = "merchant-provided-session-id";
      const mockResponse = {
        data: { createCustomerSession: { sessionId: inputSessionId } },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await paymentReadyInstance.createCustomerSession({
        customer: { id: "customer-id" },
        sessionId: inputSessionId,
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        api: "graphQLApi",
        data: {
          query: constants.CREATE_PAYMENT_READY_SESSION_QUERY,
          variables: {
            input: {
              sessionId: inputSessionId,
              customer: { id: "customer-id" },
            },
          },
        },
      });
      expect(result).toEqual(mockResponse.data.createCustomerSession);
    });

    it("should reject with a BraintreeError on failure", async () => {
      const mockError = { message: "GraphQL error", details: {} };

      mockClient.request.mockRejectedValue(mockError);

      await expect(
        paymentReadyInstance.createCustomerSession({
          customer: { id: "customer-id" },
        })
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_CREATE_SESSION_ERROR.type,
        code: errors.PAYMENT_READY_CREATE_SESSION_ERROR.code,
        message: "GraphQL error",
        details: { originalError: mockError },
      });

      expect(mockClient.request).toHaveBeenCalled();
      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.create-customer-session.failed"
      );
    });

    it("should reject with missing required option error when customer is missing", async () => {
      await expect(
        paymentReadyInstance.createCustomerSession({})
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.type,
        code: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.code,
        message: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.message,
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.create-customer-session.missing-options"
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it("should reject with missing required option error when options is null", async () => {
      await expect(
        paymentReadyInstance.createCustomerSession(null)
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.type,
        code: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.code,
        message: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.message,
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.create-customer-session.missing-options"
      );
    });

    it("should send analytics on success", async () => {
      const mockResponse = {
        data: { createCustomerSession: { sessionId: "mock-session-id" } },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await paymentReadyInstance.createCustomerSession({
        customer: { id: "customer-id" },
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.create-customer-session.succeeded"
      );
    });
  });

  describe("updateCustomerSession", () => {
    it("should return updated session data on success", async () => {
      const mockResponse = {
        data: { updateCustomerSession: { sessionId: "updated-session-id" } },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await paymentReadyInstance.updateCustomerSession({
        sessionId: "mock-session-id",
        customer: { id: "customer-id" },
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        api: "graphQLApi",
        data: {
          query: constants.UPDATE_PAYMENT_READY_SESSION_QUERY,
          variables: {
            input: {
              sessionId: "mock-session-id",
              customer: { id: "customer-id" },
            },
          },
        },
      });
      expect(result).toEqual(mockResponse.data.updateCustomerSession);
    });

    it("should reject with a BraintreeError on failure", async () => {
      const mockError = { message: "GraphQL error", details: {} };

      mockClient.request.mockRejectedValue(mockError);

      await expect(
        paymentReadyInstance.updateCustomerSession({
          sessionId: "mock-session-id",
          customer: { id: "customer-id" },
        })
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_UPDATE_SESSION_ERROR.type,
        code: errors.PAYMENT_READY_UPDATE_SESSION_ERROR.code,
        message: "GraphQL error",
        details: { originalError: mockError },
      });

      expect(mockClient.request).toHaveBeenCalled();
      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.update-customer-session.failed"
      );
    });

    it("should reject with missing required option error when sessionId is missing", async () => {
      await expect(
        paymentReadyInstance.updateCustomerSession({
          customer: { id: "customer-id" },
        })
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.type,
        code: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.code,
        message: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.message,
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.update-customer-session.missing-options"
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it("should reject with missing required option error when customer is missing", async () => {
      await expect(
        paymentReadyInstance.updateCustomerSession({
          sessionId: "mock-session-id",
        })
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.type,
        code: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.code,
        message: errors.PAYMENT_READY_MISSING_REQUIRED_OPTION.message,
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.update-customer-session.missing-options"
      );
    });

    it("should send analytics on success", async () => {
      const mockResponse = {
        data: { updateCustomerSession: { sessionId: "updated-session-id" } },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await paymentReadyInstance.updateCustomerSession({
        sessionId: "mock-session-id",
        customer: { id: "customer-id" },
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.update-customer-session.succeeded"
      );
    });
  });

  describe("getCustomerRecommendations", () => {
    it("should return recommendations data ", async () => {
      const mockResponse = {
        data: {
          generateCustomerRecommendations: {
            sessionId: "mock-session-id",
            recommendations: [],
          },
        },
      };

      const recommendationsInput = {
        sessionId: "mock-session-id",
        customer: {
          hashedEmail: "test-email-hash",
          hashedPhoneNumber: "test-phone-hash",
          userAgent: "test-agent",
        },
        domain: "test.com",
        purchaseUnits: [
          {
            amount: {
              value: "10.00",
              currencyCode: "USD",
            },
          },
        ],
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result =
        await paymentReadyInstance.getCustomerRecommendations(
          recommendationsInput
        );

      expect(mockClient.request).toHaveBeenCalledWith({
        api: "graphQLApi",
        data: {
          query: constants.GENERATE_CUSTOMER_RECOMMENDATIONS_QUERY,
          variables: {
            input: {
              sessionId: recommendationsInput.sessionId,
              customer: recommendationsInput.customer,
              domain: recommendationsInput.domain,
              purchaseUnits: recommendationsInput.purchaseUnits,
            },
          },
        },
      });
      expect(result).toEqual(mockResponse.data.generateCustomerRecommendations);
    });

    it("should reject with a BraintreeError on failure", async () => {
      const mockError = { message: "GraphQL error", details: {} };

      const recommendationsInput = {
        sessionId: "mock-session-id",
        customer: {
          hashedEmail: "test-email-hash",
        },
      };

      mockClient.request.mockRejectedValue(mockError);

      await expect(
        paymentReadyInstance.getCustomerRecommendations(recommendationsInput)
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_GET_RECOMMENDATIONS_ERROR.type,
        code: errors.PAYMENT_READY_GET_RECOMMENDATIONS_ERROR.code,
        message: "GraphQL error",
        details: { originalError: mockError },
      });

      expect(mockClient.request).toHaveBeenCalled();
      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.get-customer-recommendations.failed"
      );
    });

    it("should reject with missing required option error when sessionId is missing", async () => {
      await expect(
        paymentReadyInstance.getCustomerRecommendations({
          customer: { hashedEmail: "test-email-hash" },
        })
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_NO_SESSION_ID.type,
        code: errors.PAYMENT_READY_NO_SESSION_ID.code,
        message: errors.PAYMENT_READY_NO_SESSION_ID.message,
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.get-customer-recommendations.missing-options"
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it("should reject with missing required option error when options is null", async () => {
      await expect(
        paymentReadyInstance.getCustomerRecommendations(null)
      ).rejects.toMatchObject({
        type: errors.PAYMENT_READY_NO_SESSION_ID.type,
        code: errors.PAYMENT_READY_NO_SESSION_ID.code,
        message: errors.PAYMENT_READY_NO_SESSION_ID.message,
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.get-customer-recommendations.missing-options"
      );
    });

    it("should send analytics on success", async () => {
      const mockResponse = {
        data: {
          generateCustomerRecommendations: {
            sessionId: "mock-session-id",
            recommendations: [],
          },
        },
      };

      const recommendationsInput = {
        sessionId: "mock-session-id",
        customer: {
          hashedEmail: "test-email-hash",
        },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await paymentReadyInstance.getCustomerRecommendations(
        recommendationsInput
      );

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        mockClient,
        "payment-ready.get-customer-recommendations.succeeded"
      );
    });
  });

  describe("sendSelectedEvent", () => {
    var consoleLogMock;

    beforeEach(() => {
      consoleLogMock = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogMock.mockRestore();
    });

    it.each(Object.values(constants.BUTTON_TYPE))(
      "should send analytics event with correct parameters: button type '%s'",
      (buttonTypeOption) => {
        const sessionId = "mock-session-pay-method-id";

        paymentReadyInstance.sendSelectedEvent({
          paymentReadySessionId: sessionId,
          buttonType: buttonTypeOption,
        });

        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          mockClient,
          constants.EVENT_BUTTON_SELECTED,
          {
            payment_ready_session_id: sessionId,
            button_type: buttonTypeOption,
          }
        );
      }
    );

    it("should send button type 'other' if random other button type provided", () => {
      const sessionId = "mock-session-other-id";
      var buttonType = "RANDOMNESS";

      paymentReadyInstance.sendSelectedEvent({
        paymentReadySessionId: sessionId,
        buttonType: buttonType,
      });

      expect(analytics.sendEventPlus).toHaveBeenCalledWith(
        mockClient,
        constants.EVENT_BUTTON_SELECTED,
        {
          payment_ready_session_id: sessionId,
          button_type: "other",
        }
      );
    });

    it("should not throw an error if no sessionId is provided", () => {
      expect(() => {
        paymentReadyInstance.sendSelectedEvent({
          buttonType: constants.BUTTON_TYPE.OTHER,
        });
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        "sendSelectedEvent: paymentReadySessionId is missing or invalid"
      );
    });

    it("should not make analytics call if no sessionId provided", () => {
      paymentReadyInstance.sendSelectedEvent({
        buttonType: constants.BUTTON_TYPE.OTHER,
      });

      expect(analytics.sendEventPlus).not.toHaveBeenCalled();
    });

    it("should not throw an error if no button type is provided", () => {
      expect(() => {
        paymentReadyInstance.sendSelectedEvent({
          paymentReadySessionId: "mock-session-id",
        });
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        "sendSelectedEvent: buttonType is missing"
      );
    });

    it("should not make analytics call if not button type provided", () => {
      paymentReadyInstance.sendSelectedEvent({
        paymentReadySessionId: "mock-session-id",
      });

      expect(analytics.sendEventPlus).not.toHaveBeenCalled();
    });
  });
});
