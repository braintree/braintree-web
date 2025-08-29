"use strict";

const PaymentReady = require("../../../src/payment-ready/payment-ready");
const constants = require("../../../src/payment-ready/constants");
const analytics = require("../../../src/lib/analytics");
const assign = require("../../../src/lib/assign").assign;

// Mock for analytics.js
jest.mock("../../../src/lib/analytics", () => {
  return {
    sendEvent: jest.fn().mockResolvedValue({}),
    sendEventPlus: jest.fn().mockResolvedValue({}),
  };
});

describe("PaymentReady.prototype.sendPresentedEvent", () => {
  var consoleLogMock;
  const presentedEventName = constants.EVENT_BUTTON_PRESENTED;
  const mockButtonOrder = constants.BUTTON_ORDER.OTHER;
  const mockExperimentType = constants.EXPERIMENT_TYPE.CONTROL;
  const mockPageType = constants.PAGE_TYPE.OTHER;
  const mockSessionId = "test-session-123";
  let mockClient, mockPresentedEventOptions, paymentReadyInstance;

  beforeEach(() => {
    consoleLogMock = jest.spyOn(console, "warn").mockImplementation(() => {});

    mockClient = {
      request: jest.fn(),
    };

    mockPresentedEventOptions = {
      buttonType: constants.BUTTON_TYPE.PAYPAL,
      paymentReadySessionId: mockSessionId,
      presentmentDetails: {
        experimentType: mockExperimentType,
        pageType: mockPageType,
        buttonOrder: mockButtonOrder,
      },
    };

    paymentReadyInstance = new PaymentReady({
      client: mockClient,
      useDeferredClient: false,
    });

    jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log
    jest.clearAllMocks(); // Clear previous mock calls
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
    jest.restoreAllMocks();
  });

  it("should log a message and return if paymentReadySessionId is undefined", () => {
    const modifiedPresentedOptions = assign({}, mockPresentedEventOptions);

    delete modifiedPresentedOptions["paymentReadySessionId"];
    paymentReadyInstance.sendPresentedEvent(modifiedPresentedOptions);

    expect(analytics.sendEventPlus).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "sendPresentedEvent: paymentReadySessionId is missing or invalid"
    );
  });

  it("should log a message and return if options.buttonType is undefined", () => {
    const modifiedPresentedOptions = assign({}, mockPresentedEventOptions);

    delete modifiedPresentedOptions["buttonType"];
    paymentReadyInstance.sendPresentedEvent(modifiedPresentedOptions);

    expect(analytics.sendEventPlus).not.toHaveBeenCalled();
  });

  it("should call analytics.sendEventPlus with correct parameters for a valid event", () => {
    const modifiedPresentedOptions = assign({}, mockPresentedEventOptions);

    modifiedPresentedOptions.buttonType = constants.BUTTON_TYPE.PAYPAL;
    paymentReadyInstance.sendPresentedEvent(modifiedPresentedOptions);

    expect(analytics.sendEventPlus).toHaveBeenCalledWith(
      mockClient,
      presentedEventName,
      {
        payment_ready_session_id: mockSessionId,
        button_type: "paypal",
        payment_ready_button_order: mockButtonOrder,
        payment_ready_experiment_type: mockExperimentType,
        payment_ready_page_type: mockPageType,
      }
    );
  });

  it("should pass paymentReadySessionId in analytics data when provided", () => {
    const modifiedPresentedOptions = assign({}, mockPresentedEventOptions);

    modifiedPresentedOptions.buttonType = constants.BUTTON_TYPE.VENMO;

    paymentReadyInstance.sendPresentedEvent(modifiedPresentedOptions);

    expect(analytics.sendEventPlus).toHaveBeenCalledWith(
      mockClient,
      presentedEventName,
      {
        button_type: "venmo",
        payment_ready_session_id: mockSessionId,
        payment_ready_button_order: mockButtonOrder,
        payment_ready_experiment_type: mockExperimentType,
        payment_ready_page_type: mockPageType,
      }
    );
  });

  it.each([
    {
      missingProperty: "pageType",
      expectedAnalyticsData: {
        button_type: "venmo",
        payment_ready_session_id: mockSessionId,
        payment_ready_button_order: mockButtonOrder,
        payment_ready_experiment_type: mockExperimentType,
      },
    },
    {
      missingProperty: "buttonOrder",
      expectedAnalyticsData: {
        button_type: "venmo",
        payment_ready_session_id: mockSessionId,
        payment_ready_experiment_type: mockExperimentType,
        payment_ready_page_type: mockPageType,
      },
    },
    {
      missingProperty: "experimentType",
      expectedAnalyticsData: {
        button_type: "venmo",
        payment_ready_session_id: mockSessionId,
        payment_ready_button_order: mockButtonOrder,
        payment_ready_page_type: mockPageType,
      },
    },
  ])(
    "sends analytics event if no `$missingProperty` specified",
    ({ missingProperty, expectedAnalyticsData }) => {
      const modifiedPresentedOptions = assign({}, mockPresentedEventOptions);

      modifiedPresentedOptions.buttonType = constants.BUTTON_TYPE.VENMO;
      delete modifiedPresentedOptions.presentmentDetails[missingProperty];

      paymentReadyInstance.sendPresentedEvent(modifiedPresentedOptions);

      expect(analytics.sendEventPlus).toHaveBeenCalledWith(
        mockClient,
        constants.EVENT_BUTTON_PRESENTED,
        expectedAnalyticsData
      );
    }
  );

  it("sends analytics event if no `presentmentDetails` specified", () => {
    const modifiedPresentedOptions = assign({}, mockPresentedEventOptions);

    modifiedPresentedOptions.buttonType = constants.BUTTON_TYPE.VENMO;
    delete modifiedPresentedOptions.presentmentDetails;

    paymentReadyInstance.sendPresentedEvent(modifiedPresentedOptions);

    expect(analytics.sendEventPlus).toHaveBeenCalledWith(
      mockClient,
      constants.EVENT_BUTTON_PRESENTED,
      {
        button_type: "venmo",
        payment_ready_session_id: mockSessionId,
      }
    );
  });
});
