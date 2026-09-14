vi.mock("../../../src/lib/analytics");
vi.mock("../../../src/venmo/shared/supports-venmo");
vi.mock("../../../src/venmo/external");
vi.mock("../../../src/lib/in-iframe");
vi.mock("../../../src/venmo/shared/web-login-backdrop");
import analytics from "../../../src/lib/analytics";
import { fake } from "../../helpers";
import querystring from "../../../src/lib/querystring";
import BraintreeError from "../../../src/lib/braintree-error";
import Venmo from "../../../src/venmo/venmo";
import browserDetection from "../../../src/venmo/shared/browser-detection";
import supportsVenmo from "../../../src/venmo/shared/supports-venmo";
import inIframe from "../../../src/lib/in-iframe";
import { version as VERSION } from "../../../package.json";
import methods from "../../../src/lib/methods";
import createVenmoDesktop from "../../../src/venmo/external";
import venmoErrors from "../../../src/venmo/shared/errors";
import {
  runWebLogin,
  setupDesktopWebLogin,
} from "../../../src/venmo/shared/web-login-backdrop";
import venmoConstants from "../../../src/venmo/shared/constants";

function triggerVisibilityHandler(instance, runAllTimers = true) {
  // We should have it trigger the actual
  // visibility event if possible, rather than
  // calling the method saved on the instance
  instance._visibilityChangeListener();

  if (runAllTimers) {
    vi.runAllTimers();
  }
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve().then(() => {
    try {
      vi.advanceTimersByTime(1);
    } catch {
      // Real timers are active (e.g. inside Desktop QR / Desktop Web Login
      // beforeEach after vi.useRealTimers()). A plain Promise drain is enough.
    }
  });
  await Promise.resolve();
}

describe("Venmo", () => {
  let testContext, originalLocationHref;

  beforeAll(() => {
    window.open = vi.fn();
    originalLocationHref = window.location.href;
  });

  beforeEach(() => {
    vi.useFakeTimers();

    testContext = {};
    inIframe.mockReturnValue(false);

    testContext.location = originalLocationHref;
    testContext.configuration = fake.configuration();
    testContext.client = {
      request: vi.fn().mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  id: "context-id",
                  status: "CREATED",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      }),
      getConfiguration: () => testContext.configuration,
    };

    setupDesktopWebLogin.mockResolvedValue({});

    analytics.sendEventPlus = vi.fn();

    vi.spyOn(document, "addEventListener");
    vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Explicitly reset browser-detection and supportsVenmo mocks to return
    // undefined. vi.restoreAllMocks() removes the spy wrapper but in some
    // Vitest versions the underlying vi.fn()'s mockReturnValue implementation
    // can persist, causing cross-test pollution.
    Object.values(browserDetection).forEach((fn) => {
      if (typeof fn === "function" && fn.mockReset) fn.mockReset();
    });
    Object.values(supportsVenmo).forEach((fn) => {
      if (typeof fn === "function" && fn.mockReset) fn.mockReset();
    });
    window.location.href = originalLocationHref;
    vi.clearAllTimers();
    vi.useRealTimers();

    if (window.popupBridge) {
      delete window.popupBridge;
    }
  });

  it("sends analytics events when venmo is not configured for desktop", async () => {
    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(analytics.sendEvent).not.toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.configured.true"
    );
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.configured.false"
    );
    expect(analytics.sendEvent).not.toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.presented"
    );
  });

  it("sends analytics events for configuring venmo for desktop", async () => {
    // pass a stub so create methods don't hang
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(analytics.sendEvent).not.toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.configured.false"
    );
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.configured.true"
    );
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.presented"
    );
  });

  it("sends analytics events for when venmo desktop setup fails", async () => {
    // pass a stub so create methods don't hang
    createVenmoDesktop.mockRejectedValue(new Error("foo"));
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(analytics.sendEvent).not.toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.presented"
    );
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.desktop-flow.setup-failed"
    );
  });

  it("configures venmo desktop with payment method usage (if passed)", async () => {
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "multi_use",
    });

    await flushPromises();

    expect(createVenmoDesktop).toBeCalledWith(
      expect.objectContaining({
        paymentMethodUsage: "MULTI_USE",
      })
    );
  });

  it("configures venmo with allowNonDefaultBrowsers when specified", () => {
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      allowNonDefaultBrowsers: false,
      paymentMethodUsage: "single_use",
    });

    expect(venmo._allowNonDefaultBrowsers).toBe(false);
  });

  it("defaults allowNonDefaultBrowsers to true when not specified", () => {
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    expect(venmo._allowNonDefaultBrowsers).toBe(true);
  });

  it("configures venmo desktop with display name (if passed)", async () => {
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      displayName: "name",
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(createVenmoDesktop).toBeCalledWith(
      expect.objectContaining({
        displayName: "name",
      })
    );
  });

  it("configures venmo desktop with default merchant id", async () => {
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(createVenmoDesktop).toBeCalledWith(
      expect.objectContaining({
        profileId: "pwv-merchant-id",
      })
    );
  });

  it("can configure venmo desktop with a specific profile id", async () => {
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      profileId: "profile-id",
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(createVenmoDesktop).toBeCalledWith(
      expect.objectContaining({
        profileId: "profile-id",
      })
    );
  });

  it("configures venmo desktop with riskCorrelationId (if passed)", async () => {
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      riskCorrelationId: "custom-risk-id",
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(createVenmoDesktop).toBeCalledWith(
      expect.objectContaining({
        riskCorrelationId: "custom-risk-id",
      })
    );
  });

  it("sets up a payment context when mobile polling flow is used with paymentMethodUsage when in an iframe", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            paymentMethodUsage: "SINGLE_USE",
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: false,
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
            },
          },
        },
      },
    });
    expect(analytics.sendEventPlus).toBeCalledWith(
      expect.anything(),
      "venmo.manual-return.presented",
      expect.anything()
    );

    expect(venmo._venmoPaymentContextStatus).toBe("CREATED");
    expect(venmo._venmoPaymentContextId).toBe("context-id");
  });

  it("sets up a payment context when mobile polling flow is used with paymentMethodUsage when configured from manual return", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      requireManualReturn: true,
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            paymentMethodUsage: "SINGLE_USE",
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: false,
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
            },
          },
        },
      },
    });
    expect(analytics.sendEventPlus).toBeCalledWith(
      expect.anything(),
      "venmo.manual-return.presented",
      expect.anything()
    );

    expect(venmo._venmoPaymentContextStatus).toBe("CREATED");
    expect(venmo._venmoPaymentContextId).toBe("context-id");
  });

  it("sets up a payment context when hash change flow is used with paymentMethodUsage", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            paymentMethodUsage: "SINGLE_USE",
            intent: "CONTINUE",
            isFinalAmount: false,
            customerClient: "MOBILE_WEB",
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
            },
          },
        },
      },
    });
    expect(analytics.sendEventPlus).toBeCalledWith(
      expect.anything(),
      "venmo.mobile-payment-context.presented",
      expect.anything()
    );

    expect(venmo._venmoPaymentContextStatus).toBe("CREATED");
    expect(venmo._venmoPaymentContextId).toBe("context-id");
  });

  it("sets up a payment context with display name when configured with paymentMethodUsage", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });

    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
      displayName: "name",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            paymentMethodUsage: "SINGLE_USE",
            displayName: "name",
            intent: "CONTINUE",
            isFinalAmount: false,
            customerClient: "MOBILE_WEB",
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
            },
          },
        },
      },
    });
  });

  it("includes riskCorrelationId in payment context when provided", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
      riskCorrelationId: "custom-risk-id",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            venmoRiskCorrelationId: "custom-risk-id",
            paymentMethodUsage: "SINGLE_USE",
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: false,
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
            },
          },
        },
      },
    });

    expect(venmo._venmoPaymentContextStatus).toBe("CREATED");
    expect(venmo._venmoPaymentContextId).toBe("context-id");
  });

  it("sets up a payment context with default values of collect address flags when not passed", async () => {
    const expectedDefault = false;

    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });

    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: false,
            paymentMethodUsage: "SINGLE_USE",
            paysheetDetails: {
              collectCustomerBillingAddress: expectedDefault,
              collectCustomerShippingAddress: expectedDefault,
              // transactionDetails should not be present when amounts & line items are missing
              transactionDetails: undefined,
            },
          },
        },
      },
    });
  });

  it("sets up a payment context with collect address flags when passed", async () => {
    const inputAddressCollection = true;

    testContext.configuration.gatewayConfiguration.venmo.enrichedCustomerDataEnabled = true;
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });

    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
      collectCustomerBillingAddress: inputAddressCollection,
      collectCustomerShippingAddress: inputAddressCollection,
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: false,
            paymentMethodUsage: "SINGLE_USE",
            paysheetDetails: {
              collectCustomerBillingAddress: inputAddressCollection,
              collectCustomerShippingAddress: inputAddressCollection,
              transactionDetails: undefined,
            },
          },
        },
      },
    });
  });

  it("rejects with VENMO_ECD_DISABLED when collectCustomerBillingAddress is true and enrichedCustomerDataEnabled is false", async () => {
    testContext.configuration.gatewayConfiguration.venmo.enrichedCustomerDataEnabled = false;

    var venmo = new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
      collectCustomerBillingAddress: true,
    });

    await expect(venmo._createPromise).rejects.toMatchObject({
      code: venmoErrors.VENMO_ECD_DISABLED.code,
      type: venmoErrors.VENMO_ECD_DISABLED.type,
      message: venmoErrors.VENMO_ECD_DISABLED.message,
    });
  });

  it("rejects with VENMO_ECD_DISABLED when collectCustomerShippingAddress is true and enrichedCustomerDataEnabled is false", async () => {
    testContext.configuration.gatewayConfiguration.venmo.enrichedCustomerDataEnabled = false;

    var venmo = new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
      collectCustomerShippingAddress: true,
    });

    await expect(venmo._createPromise).rejects.toMatchObject({
      code: venmoErrors.VENMO_ECD_DISABLED.code,
      type: venmoErrors.VENMO_ECD_DISABLED.type,
      message: venmoErrors.VENMO_ECD_DISABLED.message,
    });
  });

  it("rejects with VENMO_ECD_DISABLED when both collect address flags are true and enrichedCustomerDataEnabled is false", async () => {
    testContext.configuration.gatewayConfiguration.venmo.enrichedCustomerDataEnabled = false;

    var venmo = new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
      collectCustomerBillingAddress: true,
      collectCustomerShippingAddress: true,
    });

    await expect(venmo._createPromise).rejects.toMatchObject({
      code: venmoErrors.VENMO_ECD_DISABLED.code,
      type: venmoErrors.VENMO_ECD_DISABLED.type,
      message: venmoErrors.VENMO_ECD_DISABLED.message,
    });
  });

  it("sets up a payment context with amount and line item fields when passed", async () => {
    const expectedLineItems = [
      {
        name: "Example item A",
        quantity: 10,
        unitAmount: "5.00",
        type: "CREDIT",
        description: "purchase item",
      },
    ];
    const expectedFields = {
      totalAmount: "70",
      discountAmount: "4.5",
      subTotalAmount: "55",
      taxAmount: "5.00",
      paymentMethodUsage: "single_use",
    };

    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });

    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: expectedFields.paymentMethodUsage,
      totalAmount: expectedFields.totalAmount,
      discountAmount: expectedFields.discountAmount,
      subTotalAmount: expectedFields.subTotalAmount,
      taxAmount: expectedFields.taxAmount,
      lineItems: expectedLineItems,
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: false,
            paymentMethodUsage: expectedFields.paymentMethodUsage.toUpperCase(),
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
              transactionDetails: {
                totalAmount: expectedFields.totalAmount,
                discountAmount: expectedFields.discountAmount,
                subTotalAmount: expectedFields.subTotalAmount,
                taxAmount: expectedFields.taxAmount,
                lineItems: expectedLineItems,
              },
            },
          },
        },
      },
    });
  });

  it("refreshes the payment context after 2/3 of the expiration time has passed", async () => {
    var createCallCount = 0;
    testContext.client.request.mockImplementation((options) => {
      var query = (options.data && options.data.query) || "";
      if (query.includes("createVenmoPaymentContext")) {
        createCallCount++;
        var contextId =
          createCallCount === 1 ? "first-context-id" : "second-context-id";
        return Promise.resolve({
          data: {
            createVenmoPaymentContext: {
              venmoPaymentContext: {
                status: "CREATED",
                id: contextId,
                createdAt: "2021-01-20T03:25:00.000000Z",
                expiresAt: "2021-01-20T03:25:10.000000Z",
              },
            },
          },
        });
      }
      if (query.includes("node") && query.includes("VenmoPaymentContext")) {
        return Promise.resolve({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "test-user",
            },
          },
        });
      }
      return Promise.resolve({});
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    vi.advanceTimersByTime(6000); // 6 seconds

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    vi.advanceTimersByTime(1000); // 1 second

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("second-context-id");
  });

  it("does not refresh the payment context after 2/3 of the expiration time has passed when tokenization is in progress", async () => {
    testContext.client.request.mockImplementation((options) => {
      var query = (options.data && options.data.query) || "";
      if (query.includes("createVenmoPaymentContext")) {
        return Promise.resolve({
          data: {
            createVenmoPaymentContext: {
              venmoPaymentContext: {
                status: "CREATED",
                id: "first-context-id",
                createdAt: "2021-01-20T03:25:00.000000Z",
                expiresAt: "2021-01-20T03:25:10.000000Z",
              },
            },
          },
        });
      }
      if (query.includes("node") && query.includes("VenmoPaymentContext")) {
        return Promise.resolve({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "test-user",
            },
          },
        });
      }
      return Promise.resolve({});
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    vi.advanceTimersByTime(6000); // 6 seconds

    venmo._tokenizationInProgress = true;

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    vi.advanceTimersByTime(5000); // 5 seconds

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");
    expect(testContext.client.request).toBeCalledTimes(1);
    expect(testContext.client.request).toHaveBeenNthCalledWith(1, {
      api: "graphQLApi",
      data: expect.objectContaining({
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
      }),
    });
  });

  it("does make a request for a new payment context after 2/3 of the expiration time has passed, but does not update the reference to the payment context if tokenization started while the request for the new payment context was in process", async () => {
    var createCallCount = 0;
    testContext.client.request.mockImplementation((options) => {
      var query = (options.data && options.data.query) || "";
      if (query.includes("createVenmoPaymentContext")) {
        createCallCount++;
        var contextId =
          createCallCount === 1 ? "first-context-id" : "second-context-id";
        return Promise.resolve({
          data: {
            createVenmoPaymentContext: {
              venmoPaymentContext: {
                status: "CREATED",
                id: contextId,
                createdAt: "2021-01-20T03:25:00.000000Z",
                expiresAt: "2021-01-20T03:25:10.000000Z",
              },
            },
          },
        });
      }
      if (query.includes("node") && query.includes("VenmoPaymentContext")) {
        return Promise.resolve({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "test-user",
            },
          },
        });
      }
      return Promise.resolve({});
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    vi.advanceTimersByTime(6667); // just over the 2/3 threshold

    venmo._tokenizationInProgress = true;

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    vi.advanceTimersByTime(1000); // 1 second

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");
    expect(testContext.client.request).toBeCalledTimes(2);
    expect(testContext.client.request).toHaveBeenNthCalledWith(1, {
      api: "graphQLApi",
      data: expect.objectContaining({
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
      }),
    });
    expect(testContext.client.request).toHaveBeenNthCalledWith(2, {
      api: "graphQLApi",
      data: expect.objectContaining({
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
      }),
    });
  });

  it("errors when payment context fails to set up in mobile polling flow", async () => {
    expect.assertions(4);

    const networkError = new Error("some network error");

    testContext.client.request.mockRejectedValue(networkError);
    inIframe.mockResolvedValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await venmo.getUrl().catch((err) => {
      expect(err.code).toBe("VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED");
      expect(err.details.originalError).toBe(networkError);

      expect(analytics.sendEvent).not.toBeCalledWith(
        expect.anything(),
        "venmo.manual-return.presented"
      );
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "venmo.manual-return.setup-failed"
      );
    });
  });

  it("shows the right error message in case of a validation error during Payment Context creation", async () => {
    const error = {
      details: {
        originalError: [
          {
            message: "Amount must be positive",
            extensions: {
              errorClass: "VALIDATION",
              errorType: "user_error",
            },
          },
        ],
      },
    };

    testContext.client.request.mockRejectedValue(error);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    venmo.getUrl().catch((err) => {
      expect(err.message).toBe("Amount must be positive");
      expect(err.code).toBe("VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED");
    });
  });

  it("errors when payment context fails to set up in payment method usage hash flow", async () => {
    expect.assertions(4);

    const networkError = new Error("some network error");

    testContext.client.request.mockRejectedValue(networkError);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await venmo.getUrl().catch((err) => {
      expect(err.code).toBe("VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED");
      expect(err.details.originalError).toBe(networkError);

      expect(analytics.sendEvent).not.toBeCalledWith(
        expect.anything(),
        "venmo.mobile-payment-context.presented"
      );
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "venmo.mobile-payment-context.setup-failed"
      );
    });
  });

  it("sets up desktop web login", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        },
      },
    });

    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(setupDesktopWebLogin).toBeCalledWith({
      assetsUrl: expect.stringContaining(
        testContext.configuration.gatewayConfiguration.assetsUrl
      ),
      debug: testContext.configuration.isDebug,
    });
  });

  it("sets up a payment context with `isFinalAmount` flag when passed", async () => {
    const expectedLineItems = [
      {
        name: "Example item Q",
        quantity: 5,
        unitAmount: "21.10",
        type: "CREDIT",
        description: "purchase item",
      },
    ];
    const expectedFields = {
      discountAmount: "5.5",
      isFinalAmount: true,
      paymentMethodUsage: "single_use",
      subTotalAmount: "105.5",
      taxAmount: "10.00",
      totalAmount: "110",
    };

    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoPaymentContext: {
          venmoPaymentContext: {
            status: "CREATED",
            id: "context-id",
            createdAt: "2022-01-20T02:25:37.522000Z",
            expiresAt: "2022-01-20T03:30:37.522000Z",
          },
        },
      },
    });

    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: expectedFields.paymentMethodUsage,
      discountAmount: expectedFields.discountAmount,
      isFinalAmount: expectedFields.isFinalAmount,
      lineItems: expectedLineItems,
      subTotalAmount: expectedFields.subTotalAmount,
      taxAmount: expectedFields.taxAmount,
      totalAmount: expectedFields.totalAmount,
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        variables: {
          input: {
            intent: "CONTINUE",
            customerClient: "MOBILE_WEB",
            isFinalAmount: expectedFields.isFinalAmount,
            paymentMethodUsage: expectedFields.paymentMethodUsage.toUpperCase(),
            paysheetDetails: {
              collectCustomerBillingAddress: false,
              collectCustomerShippingAddress: false,
              transactionDetails: {
                totalAmount: expectedFields.totalAmount,
                discountAmount: expectedFields.discountAmount,
                subTotalAmount: expectedFields.subTotalAmount,
                taxAmount: expectedFields.taxAmount,
                lineItems: expectedLineItems,
              },
            },
          },
        },
      },
    });
  });

  describe("getUrl", () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        _isIncognito: false,
        paymentMethodUsage: "single_use",
      });
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });
    });

    afterEach(() => {
      history.replaceState({}, "", testContext.location);
    });

    it("defaults to correct base URL", () =>
      venmo.getUrl().then((url) => {
        expect(url.indexOf(venmoConstants.VENMO_MOBILE_APP_AUTH_ONLY_URL)).toBe(
          0
        );
      }));

    it("uses braintree redirect-frame url for desktop web login", () => {
      const allowDesktopWebLogin = true;
      const expectedUrl = `${testContext.configuration.gatewayConfiguration.assetsUrl}/web/${VERSION}/html/redirect-frame.html`;

      venmo = new Venmo({
        allowDesktopWebLogin,
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(expectedUrl);
        expect(params["x-cancel"]).toBe(expectedUrl);
        expect(params["x-error"]).toBe(expectedUrl);
      });
    });

    it("uses web fallback url when mobileWebFallBack supplied as true", () => {
      const venmoConfig = {
        mobileWebFallBack: true,
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      };

      venmo = new Venmo(venmoConfig);

      return venmo.getUrl().then((url) => {
        expect(url.indexOf(venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL)).toBe(
          0
        );
      });
    });

    it("uses sandbox url when allowDesktopWebLogin and enableVenmoSandbox are enabled", () => {
      const venmoConfig = {
        allowDesktopWebLogin: true,
        enableVenmoSandbox: true,
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      };

      venmo = new Venmo(venmoConfig);

      return venmo.getUrl().then((url) => {
        expect(url.indexOf(venmoConstants.VENMO_WEB_LOGIN_SANDBOX_URL)).toBe(0);
      });
    });

    it("uses production url when enableVenmoSandbox is true but environment is production", () => {
      const productionClient = Object.assign({}, testContext.client);

      productionClient.request = vi.fn().mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });

      productionClient.getConfiguration = vi.fn().mockReturnValue({
        gatewayConfiguration: {
          assetsUrl: "https://assets.braintreegateway.com",
          environment: "production",
          venmo: {
            accessToken: "access-token",
            merchantId: "merchant-id",
            environment: "production",
          },
        },
        analyticsMetadata: {
          sdkVersion: "1.0.0",
          integration: "custom",
          platform: "web",
          sessionId: "session-id",
        },
      });

      const venmoConfig = {
        allowDesktopWebLogin: true,
        enableVenmoSandbox: true,
        createPromise: new Promise((resolve) => resolve(productionClient)),
        paymentMethodUsage: "single_use",
      };

      venmo = new Venmo(venmoConfig);

      return venmo.getUrl().then((url) => {
        expect(url.indexOf(venmoConstants.VENMO_WEB_LOGIN_URL)).toBe(0);
        expect(url.indexOf(venmoConstants.VENMO_WEB_LOGIN_SANDBOX_URL)).toBe(
          -1
        );
      });
    });

    it("removes hash from parent page url for use with return urls", () => {
      const pageUrlWithoutHash = window.location.href;

      window.location.hash = "#bar";

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(pageUrlWithoutHash);
        expect(params["x-cancel"]).toBe(pageUrlWithoutHash);
        expect(params["x-error"]).toBe(pageUrlWithoutHash);
      });
    });

    it("removes hash with no value from parent page url", () => {
      const pageUrlWithoutHash = window.location.href;

      window.location.hash = "#";

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(pageUrlWithoutHash);
        expect(params["x-cancel"]).toBe(pageUrlWithoutHash);
        expect(params["x-error"]).toBe(pageUrlWithoutHash);
      });
    });

    it.each([
      ["", window.location.href, false],
      [
        "when deepLinkReturnUrl is specified",
        "com.braintreepayments.test://",
        true,
      ],
      [
        "when checkout page URL has query params",
        `${window.location.href}?hey=now`,
        false,
      ],
    ])("contains return URL %s", (s, location, deepLinked) => {
      let params;
      const expectedReturnUrls = {
        "x-success": location,
        "x-cancel": location,
        "x-error": location,
      };

      if (deepLinked) {
        venmo = new Venmo({
          allowDesktopWebLogin: false,
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: location,
          paymentMethodUsage: "single_use",
        });
      } else if (location !== testContext.location) {
        history.replaceState({}, "", location);
      }

      return venmo.getUrl().then((url) => {
        params = querystring.parse(url);
        expect(params["x-success"]).toBe(expectedReturnUrls["x-success"]);
        expect(params["x-cancel"]).toBe(expectedReturnUrls["x-cancel"]);
        expect(params["x-error"]).toBe(expectedReturnUrls["x-error"]);
      });
    });

    it("omits return urls when using polling flow without a deep link return url", () => {
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });
      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe("NOOP");
        expect(params["x-cancel"]).toBe("NOOP");
        expect(params["x-error"]).toBe("NOOP");
      });
    });

    it("includes return urls when using polling flow with a deep link return url", () => {
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });
      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        deepLinkReturnUrl: "https://example.com/top-level-page",
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe("https://example.com/top-level-page");
        expect(params["x-cancel"]).toBe("https://example.com/top-level-page");
        expect(params["x-error"]).toBe("https://example.com/top-level-page");
      });
    });

    it("omits return urls when configured to require manual return", () => {
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        requireManualReturn: true,
        paymentMethodUsage: "single_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe("NOOP");
        expect(params["x-cancel"]).toBe("NOOP");
        expect(params["x-error"]).toBe("NOOP");
      });
    });

    it("omits return urls when using non-default mobile browser", function () {
      vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);

      return venmo.getUrl().then(function (url) {
        var params = querystring.parse(url);

        expect(params["x-success"]).toBe("NOOP");
        expect(params["x-cancel"]).toBe("NOOP");
        expect(params["x-error"]).toBe("NOOP");
      });
    });

    describe("non-default browser with deep link return URL", () => {
      it("omits return urls when using iOS non-default browser even with deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when using Android non-default browser with deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("com.example://return");
          expect(params["x-cancel"]).toBe("com.example://return");
          expect(params["x-error"]).toBe("com.example://return");
        });
      });
    });

    describe("webview with deep link return URL", () => {
      it("includes return urls when using webview with deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(true);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("com.example://return");
          expect(params["x-cancel"]).toBe("com.example://return");
          expect(params["x-error"]).toBe("com.example://return");
        });
      });
    });

    describe("iframe scenarios with deep link return URL", () => {
      beforeEach(() => {
        inIframe.mockReturnValue(true);
      });

      it("omits return urls when iframe + non-default browser + deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when iframe + default browser + deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("com.example://return");
          expect(params["x-cancel"]).toBe("com.example://return");
          expect(params["x-error"]).toBe("com.example://return");
        });
      });

      it("includes return urls when webview + iframe + deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(true);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("com.example://return");
          expect(params["x-cancel"]).toBe("com.example://return");
          expect(params["x-error"]).toBe("com.example://return");
        });
      });
    });

    describe("incognito mode scenarios", () => {
      it("omits return urls when default browser + incognito + no deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        inIframe.mockReturnValue(false);

        // Create venmo instance with incognito mode
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          paymentMethodUsage: "single_use",
        });
        venmo._isIncognito = true;

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when incognito + deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });
        venmo._isIncognito = true;

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("com.example://return");
          expect(params["x-cancel"]).toBe("com.example://return");
          expect(params["x-error"]).toBe("com.example://return");
        });
      });
    });

    describe("manual return scenarios", () => {
      it("omits return urls when manual return is required + no deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        inIframe.mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          requireManualReturn: true,
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when manual return is required + deep link return url", () => {
        vi.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          requireManualReturn: true,
          deepLinkReturnUrl: "com.example://return",
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("com.example://return");
          expect(params["x-cancel"]).toBe("com.example://return");
          expect(params["x-error"]).toBe("com.example://return");
        });
      });
    });

    it("contains user agent in query params", () => {
      let params;
      const userAgent = window.navigator.userAgent;

      return venmo.getUrl().then((url) => {
        params = querystring.parse(url);
        expect(params.ua).toBe(userAgent);
      });
    });

    it.each([["pwv-merchant-id"], ["pwv-profile-id"]])(
      'contains correct Braintree configuration options in query params when "braintree_merchant_id" is %p',
      (merchantID) => {
        const braintreeConfig = {
          braintree_merchant_id: merchantID,
          braintree_access_token: "pwv-access-token",
          braintree_environment: "sandbox",
        };

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          profileId: merchantID,
          paymentMethodUsage: "single_use",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);

          expect(params.braintree_merchant_id).toBe(
            braintreeConfig.braintree_merchant_id
          );
          expect(params.braintree_access_token).toBe(
            braintreeConfig.braintree_access_token
          );
          expect(params.braintree_environment).toBe(
            braintreeConfig.braintree_environment
          );
        });
      }
    );

    it("lowercases the GraphQL-native uppercase environment enum for the deep link params", () => {
      testContext.configuration.gatewayConfiguration.venmo.environment =
        "SANDBOX";

      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params.braintree_environment).toBe("sandbox");
      });
    });

    it("applies mobile polling context id to pwv-access-token when it is present", () => {
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: "2021-01-20T03:25:37.522000Z",
                  expiresAt: "2021-01-20T03:30:37.522000Z",
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        requireManualReturn: true,
        paymentMethodUsage: "single_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params.braintree_access_token).toBe("pwv-access-token");
        expect(params.resource_id).toBe("context-id");
      });
    });

    it("applies venmoRiskCorrelationId to client-metadata-id param when passed", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoPaymentContext: {
            venmoPaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: "2021-01-20T03:25:37.522000Z",
              expiresAt: "2021-01-20T03:30:37.522000Z",
              venmoRiskCorrelationId: "foo-bar-test",
            },
          },
        },
      });
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "multi_use",
        riskCorrelationId: "foo-bar-test",
      });

      return venmo.getUrl().then((url) => {
        expect(url).toEqual(
          expect.stringContaining("client-metadata-id=foo-bar-test")
        );
      });
    });

    it("applies mobile polling context id to resource id param when paymentMethodUsage is passed", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoPaymentContext: {
            venmoPaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: "2021-01-20T03:25:37.522000Z",
              expiresAt: "2021-01-20T03:30:37.522000Z",
            },
          },
        },
      });
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "multi_use",
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        // NEXT_MAJOR_VERSION stop adding it to the access token
        // and rely on the resource id param only
        expect(params.braintree_access_token).toBe("pwv-access-token");
        expect(params.resource_id).toBe("context-id");
      });
    });

    it("contains metadata in query params to forward to Venmo", () => {
      let params, braintreeData, metadata;

      return venmo.getUrl().then((url) => {
        params = querystring.parse(url);
        braintreeData = JSON.parse(atob(params.braintree_sdk_data));
        metadata = braintreeData._meta;

        expect(metadata.version).toBe(VERSION);
        expect(metadata.sessionId).toBe("fakeSessionId");
        expect(metadata.integration).toBe("custom");
        expect(metadata.platform).toBe("web");
        expect(Object.keys(metadata).length).toBe(4);
      });
    });

    it("rejects if client creation rejects", () =>
      expect(
        new Venmo({
          createPromise: Promise.reject(new Error("client error")),
          paymentMethodUsage: "single_use",
        }).getUrl()
      ).rejects.toThrow("client error"));

    it("includes allowAndroidRecreation flag if merchant configures it to do so", async () => {
      let venmoRecreating = new Venmo({
        allowAndroidRecreation: false,
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });
      const url = await venmoRecreating.getUrl();

      expect(url).toEqual(expect.stringContaining("allowAndroidRecreation=0"));
    });

    it("defaults allowAndroidRecreation flag to true if merchant does not specify", async () => {
      const url = await venmo.getUrl();

      expect(url).toEqual(expect.stringContaining("allowAndroidRecreation=1"));
    });
  });

  describe("appSwitch", () => {
    let originalNavigator, originalLocation, originalTop, venmoOptions;

    beforeEach(() => {
      venmoOptions = {
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      };

      originalNavigator = window.navigator;
      originalLocation = window.location;
      originalTop = window.top;

      delete window.navigator;
      delete window.location;
      delete window.top;

      window.navigator = {
        platform: "platform",
      };
      window.location = {
        href: "old",
        hash: "",
      };
      window.top = {
        location: {
          href: "top-old",
        },
      };
    });

    afterEach(() => {
      window.navigator = originalNavigator;
      window.location = originalLocation;
      window.top = originalTop;
    });

    describe("not deep link return url", () => {
      it("calls window.open by default", async () => {
        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).toBeCalledWith("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("calls window.open when device is not ios and is configured to use ios redirect strategy", async () => {
        venmoOptions.useRedirectForIOS = true;
        vi.spyOn(browserDetection, "isIos").mockReturnValue(false);

        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).toBeCalledWith("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("calls window.open when device is ios but is not configured to use ios redirect strategy", async () => {
        vi.spyOn(browserDetection, "isIos").mockReturnValue(true);

        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).toBeCalledWith("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("sets location.href when device is ios and is configured to use ios redirect strategy", async () => {
        venmoOptions.useRedirectForIOS = true;
        vi.spyOn(browserDetection, "isIos").mockReturnValue(true);

        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("sets location.href when device does not support redirects on ios, even when not configured to use ios redirect strategy", async () => {
        venmoOptions.useRedirectForIOS = false;
        vi.spyOn(
          browserDetection,
          "doesNotSupportWindowOpenInIos"
        ).mockReturnValue(true);

        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("sets location.href when device is android chrome and mobileWebFallBack is true", async () => {
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);
        vi.spyOn(browserDetection, "isChrome").mockReturnValue(true);

        const venmoOptionsWithFallback = {
          ...venmoOptions,
          mobileWebFallBack: true,
        };
        const venmo = new Venmo(venmoOptionsWithFallback);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("calls window.open when device is android chrome and mobileWebFallBack is false", async () => {
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);
        vi.spyOn(browserDetection, "isChrome").mockReturnValue(true);

        const venmoOptionsWithoutFallback = {
          ...venmoOptions,
          mobileWebFallBack: false,
        };
        const venmo = new Venmo(venmoOptionsWithoutFallback);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).toBeCalledWith("https://venmo.com/braintree");
        expect(window.location.href).not.toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });
    });

    describe("deep link return url", () => {
      beforeEach(() => {
        venmoOptions.deepLinkReturnUrl = "com.braintreepayments://";
      });

      it.each([["iPhone"], ["iPad"], ["iPod"]])(
        "opens the app switch url by setting window.location.href when platform is %p",
        async (platform) => {
          const venmo = new Venmo(venmoOptions);

          window.navigator.platform = platform;

          expect(window.location.href).not.toContain(
            "https://venmo.com/braintree"
          );

          await venmo.appSwitch("https://venmo.com/braintree");

          expect(window.open).not.toBeCalled();
          expect(window.location.href).toContain("https://venmo.com/braintree");
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.appswitch.start.ios-webview"
          );
        }
      );

      it("opens the app switch url by calling PopupBridge.open when available", async () => {
        const venmo = new Venmo(venmoOptions);

        window.popupBridge = {
          open: vi.fn(),
        };
        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.location.href).toContain("old");
        expect(window.open).not.toBeCalled();
        expect(window.popupBridge.open).toBeCalledWith(
          "https://venmo.com/braintree"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.popup-bridge"
        );
      });

      it("opens the app switch url by setting window.location.href for Android webview", async () => {
        const venmo = new Venmo(venmoOptions);

        vi.spyOn(browserDetection, "isAndroidWebview").mockReturnValue(true);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).toContain("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.android-webview-redirect"
        );
      });

      it("breaks out of iframe when in iframe and using Android webview", async () => {
        const venmo = new Venmo(venmoOptions);

        vi.spyOn(browserDetection, "isAndroidWebview").mockReturnValue(true);
        inIframe.mockReturnValue(true);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).not.toBe("https://venmo.com/braintree");
        expect(window.top.location.href).toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.android-webview-redirect"
        );
      });

      it("opens the app switch url by calling window.open otherwise", async () => {
        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.location.href).toContain("old");
        expect(window.open).toBeCalledWith("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.webview"
        );
      });

      it("opens the Venmo native app if it is iOS, in an iframe, and the Venmo native app is installed", async () => {
        const mockUrl = "com.venmo.test://";

        window.popupBridge = {
          isVenmoInstalled: true,
        };
        window.navigator.platform = "iPhone";

        const venmo = new Venmo(venmoOptions);

        inIframe.mockReturnValueOnce(true);
        await venmo.appSwitch(mockUrl);

        expect(window.top.location.href).toBe(mockUrl);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.ios-webview"
        );
      });

      it("opens Popup Bridge if it is is iOS, in an iframe, and Popup Bridge is installed", async () => {
        const mockUrl = "https://venmo.com/braintree";

        window.popupBridge = {
          open: vi.fn(),
        };
        window.navigator.platform = "iPhone";

        const venmo = new Venmo(venmoOptions);

        inIframe.mockReturnValueOnce(true);
        await venmo.appSwitch(mockUrl);

        expect(window.popupBridge.open).toBeCalledWith(mockUrl);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.popup-bridge"
        );
      });

      it("opens Popup Bridge if it is iOS, not in an iframe, Venmo native is not installed, and Popup Bridge is installed", async () => {
        const mockUrl = "https://venmo.com/braintree";

        window.popupBridge = {
          open: vi.fn(),
        };
        window.navigator.platform = "iPhone";

        const venmo = new Venmo(venmoOptions);

        inIframe.mockReturnValueOnce(false);
        await venmo.appSwitch(mockUrl);

        expect(window.popupBridge.open).toBeCalledWith(mockUrl);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.popup-bridge"
        );
      });

      it("breaks out of the iframe if the device is iOS, in an iframe, Venmo native is not installed, and Popup Bridge is not installed", async () => {
        const mockUrl = "https://venmo.com/braintree";

        window.navigator.platform = "iPhone";

        const venmo = new Venmo(venmoOptions);

        inIframe.mockReturnValueOnce(true);
        await venmo.appSwitch(mockUrl);

        expect(window.top.location.href).toBe(mockUrl);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.ios-webview"
        );
      });
    });
  });

  describe("isBrowserSupported", () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });
      vi.spyOn(supportsVenmo, "isBrowserSupported");
    });

    it("calls isBrowserSupported library", () => {
      supportsVenmo.isBrowserSupported.mockReturnValue(true);

      expect(venmo.isBrowserSupported()).toBe(true);

      supportsVenmo.isBrowserSupported.mockReturnValue(false);

      expect(venmo.isBrowserSupported()).toBe(false);
    });

    it("calls isBrowserSupported with allowNewBrowserTab: true by default", () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowNewBrowserTab: true,
        })
      );
    });

    it("calls isBrowserSupported with allowWebviews: true by default", () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowWebviews: true,
        })
      );
    });

    it("calls isBrowserSupported with allowDesktop: false by default", () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowDesktop: false,
        })
      );
    });

    it("calls isBrowserSupported with allowNewBrowserTab: false when venmo instance is configured to do so", () => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowNewBrowserTab: false,
        paymentMethodUsage: "single_use",
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowNewBrowserTab: false,
        })
      );
    });

    it("calls isBrowserSupported with allowWebviews: false when venmo instance is configured to do so", () => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowWebviews: false,
        paymentMethodUsage: "single_use",
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowWebviews: false,
        })
      );
    });

    it("calls isBrowserSupported with allowDesktop: true when venmo instance is configured to do so", () => {
      // pass a stub so create methods don't hang
      createVenmoDesktop.mockResolvedValue({});
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowDesktop: true,
        paymentMethodUsage: "single_use",
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowDesktop: true,
        })
      );
    });

    it("calls isBrowserSupported with allowDesktopWebLogin: true when venmo instance is configured to do so", () => {
      // testing isBrowserSupported for web login flow, not desktop QR flow
      createVenmoDesktop.mockResolvedValue({});
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowDesktop: false,
        allowDesktopWebLogin: true,
        paymentMethodUsage: "single_use",
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowDesktop: false,
          allowDesktopWebLogin: true,
        })
      );
    });

    it("calls isBrowserSupported with allowNonDefaultBrowsers: false when venmo instance is configured to do so", () => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowNonDefaultBrowsers: false,
        paymentMethodUsage: "single_use",
      });

      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowNonDefaultBrowsers: false,
        })
      );
    });

    it("calls isBrowserSupported with allowNonDefaultBrowsers: true by default", () => {
      venmo.isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toHaveBeenCalledWith(
        expect.objectContaining({
          allowNonDefaultBrowsers: true,
        })
      );
    });
  });

  describe("tokenize", () => {
    it("errors if another tokenization request is active", () => {
      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      venmo.tokenize();

      return venmo.tokenize().catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_TOKENIZATION_REQUEST_ACTIVE");
        expect(err.type).toBe("MERCHANT");
        expect(err.message).toBe("Another tokenization request is active.");
      });
    });

    describe("mobile flow with hash change listeners", () => {
      let venmo;

      beforeEach(() => {
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          paymentMethodUsage: "single_use",
        });
      });

      afterEach(() => {
        /*
         * Some tests use replaceState to simulate app switch returns rather
         * than updating window.location manually because this causes errors.
         * The window state needs to be reset after those tests.
         * */
        history.replaceState({}, "", testContext.location);

        vi.runAllTimers();
      });

      it("errors if getUrl fails", () => {
        vi.spyOn(venmo, "getUrl").mockRejectedValue(new Error("client error"));

        return expect(venmo.tokenize()).rejects.toThrow("client error");
      });

      describe("when visibility listener triggers", () => {
        it("resolves with nonce payload on success", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockResolvedValue({
            paymentMethodId: "abc",
            userName: "keanu",
          });

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();

          const { details, nonce, type } = await promise;

          expect(nonce).toBe("abc");
          expect(type).toBe("VenmoAccount");
          expect(details.username).toBe("keanu");
        });

        it("rejects with error on Venmo app error", async () => {
          const err = new Error("fail");

          vi.spyOn(venmo, "_pollForStatusChange").mockRejectedValue(err);

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();

          await expect(promise).rejects.toBe(err);
        });

        it("sets _tokenizationInProgress to false when app switch result not found", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockRejectedValue(
            new Error("no result")
          );

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();

          await promise.catch(() => {});

          expect(venmo._tokenizationInProgress).toBe(false);
        });

        it("preserves URL if fragments are never set", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockRejectedValue(
            new Error("no result")
          );

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();

          await promise.catch(() => {});

          expect(window.location.href).toBe(testContext.location);
        });

        it("delays processing results by 1 second by default", async () => {
          const originalTimeout = window.setTimeout;

          window.setTimeout = vi.fn().mockImplementation((fn) => {
            fn();
          });

          vi.spyOn(venmo, "_pollForStatusChange").mockResolvedValue({
            paymentMethodId: "abc",
            userName: "keanu",
          });

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();
          await promise;

          expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
          expect(setTimeout).toBeCalledWith(expect.any(Function), 1000);

          window.setTimeout = originalTimeout;
        });

        it("can configure processing delay", async () => {
          const originalTimeout = window.setTimeout;

          window.setTimeout = vi.fn().mockImplementation((fn) => {
            fn();
          });

          vi.spyOn(venmo, "_pollForStatusChange").mockResolvedValue({
            paymentMethodId: "abc",
            userName: "keanu",
          });

          const promise = venmo.tokenize({ processResultsDelay: 3000 });

          triggerVisibilityHandler(venmo);
          await flushPromises();
          await promise;

          expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
          expect(setTimeout).toBeCalledWith(expect.any(Function), 3000);

          window.setTimeout = originalTimeout;
        });
      });

      describe("analytics events", () => {
        it("sends an event that the mobile flow is used", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockResolvedValue({
            paymentMethodId: "abc",
            userName: "keanu",
          });

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();
          await promise;

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.mobile.start",
            expect.anything()
          );
        });

        it("sends an event on app switch return Success", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockResolvedValue({
            paymentMethodId: "abc",
            userName: "keanu",
          });

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();
          await promise;

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.appswitch.handle.payment-context-status-query.success",
            expect.anything()
          );
        });

        it("sends an event on app switch return failure", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockRejectedValue(
            new BraintreeError({
              type: BraintreeError.types.NETWORK,
              code: "TEST_ERROR",
              message: "test error",
            })
          );

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();

          await expect(promise).rejects.toThrow();

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.mobile.start",
            expect.anything()
          );
        });

        it("sends an event when there's no app switch result before timeout", async () => {
          vi.spyOn(venmo, "_pollForStatusChange").mockRejectedValue(
            new BraintreeError({
              type: BraintreeError.types.CUSTOMER,
              code: "VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED",
              message: "Venmo polling was canceled.",
            })
          );

          const promise = venmo.tokenize();

          triggerVisibilityHandler(venmo);
          await flushPromises();

          await promise.catch(() => {});

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.mobile.start",
            expect.anything()
          );
        });
      });
    });

    describe("mobile flow with polling", () => {
      let venmo;

      // ---------------------------------------------------------------------------
      // Helpers scoped to this describe block
      // ---------------------------------------------------------------------------

      // Build the resolved value for a createVenmoPaymentContext mutation.
      // Pass overrides to customise individual fields (e.g. a fixed createdAt for
      // snapshot-style tests, or a different id for counter-based tests).
      function makePaymentContextResponse(overrides) {
        return {
          data: {
            createVenmoPaymentContext: {
              venmoPaymentContext: Object.assign(
                {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: new Date().toString(),
                  expiresAt: new Date(Date.now() + 30000000).toString(),
                },
                overrides
              ),
            },
          },
        };
      }

      // Build the resolved value for a node(VenmoPaymentContext) query.
      // Defaults to a successful APPROVED response; pass overrides to vary the
      // status or add extra fields (e.g. payerInfo).
      function makeNodeResponse(overrides) {
        return {
          data: {
            node: Object.assign(
              {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "some-name",
              },
              overrides
            ),
          },
        };
      }

      // Wire up testContext.client.request with the standard two-branch dispatcher
      // used by every polling test.
      //
      // contextOverrides: plain object merged into the payment context fields
      // nodeResolver: either a plain object of node field overrides (simple
      //   case) or a function called on each poll invocation
      //   (for counter-based or rejection scenarios)
      // queryMatchString: override the string used to detect the create mutation
      //                     (defaults to "createVenmoPaymentContext"; use
      //                     "mutation CreateVenmo" for mobileWebFallBack tests)
      function mockPollingClient(client, options) {
        options = options || {};
        var contextOverrides = options.contextOverrides;
        var nodeResolver = options.nodeResolver;
        var queryMatchString =
          options.queryMatchString || "createVenmoPaymentContext";

        client.request.mockImplementation(function (reqOptions) {
          var query = (reqOptions.data && reqOptions.data.query) || "";
          if (query.includes(queryMatchString)) {
            var resolvedContextOverrides =
              typeof contextOverrides === "function"
                ? contextOverrides()
                : contextOverrides;
            return Promise.resolve(
              makePaymentContextResponse(resolvedContextOverrides)
            );
          }
          if (query.includes("node") && query.includes("VenmoPaymentContext")) {
            if (typeof nodeResolver === "function") {
              return nodeResolver();
            }
            return Promise.resolve(makeNodeResponse(nodeResolver));
          }
          return Promise.resolve({});
        });
      }

      async function drivePolling(promise, ms) {
        await vi.advanceTimersByTimeAsync(
          ms !== undefined ? ms : venmo._mobilePollingExpiresThreshold + 1
        );
        return promise;
      }

      // ---------------------------------------------------------------------------
      // Hooks
      // ---------------------------------------------------------------------------

      beforeEach(async () => {
        mockPollingClient(testContext.client);

        inIframe.mockReturnValue(true);
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          paymentMethodUsage: "single_use",
        });
        await flushPromises();

        // Reduce polling thresholds so drivePolling() completes in a handful
        // of fake-timer cycles rather than ~1200, keeping each test under the
        // 4-second wall-clock timeout.
        venmo._mobilePollingExpiresThreshold = 500;
        venmo._mobilePollingInterval = 250;
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      // ---------------------------------------------------------------------------
      // Tests
      // ---------------------------------------------------------------------------

      it("polls for status", async () => {
        // Use fixed ISO dates so the assertion on the query shape is deterministic.
        mockPollingClient(testContext.client, {
          contextOverrides: {
            createdAt: "2021-01-20T03:25:37.522000Z",
            expiresAt: "2021-01-20T03:30:37.522000Z",
          },
        });

        venmo._paymentMethodUsage = "SINGLE_USE";

        await drivePolling(venmo.tokenize());

        expect(testContext.client.request).toBeCalledWith({
          api: "graphQLApi",
          data: {
            query: expect.stringMatching("on VenmoPaymentContext"),
            variables: {
              id: "context-id",
            },
          },
        });
      });

      it("app switches to the Venmo app", async () => {
        vi.spyOn(venmo, "appSwitch");

        await drivePolling(venmo.tokenize());

        expect(venmo.appSwitch).toBeCalledTimes(1);
        expect(venmo.appSwitch).toBeCalledWith(
          expect.stringContaining("resource_id=context-id")
        );
      });

      it("app switches to the Venmo app on mobile web fallback", async () => {
        const mockPaymentContextId = "mockPaymentContextId";

        // mobileWebFallBack uses a different mutation name in the query string.
        mockPollingClient(testContext.client, {
          contextOverrides: { id: mockPaymentContextId },
          queryMatchString: "mutation CreateVenmo",
        });

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          mobileWebFallBack: true,
          paymentMethodUsage: "single_use",
        });

        venmo._venmoPaymentContextId = mockPaymentContextId;

        vi.spyOn(venmo, "appSwitch");

        await drivePolling(venmo.tokenize());

        expect(venmo.appSwitch).toBeCalledWith(
          expect.stringContaining(venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL)
        );
        expect(window.open).toBeCalledWith(
          expect.stringContaining(venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL)
        );
      });

      it("resolves when polling concludes", async () => {
        const payload = await drivePolling(venmo.tokenize());

        expect(payload.nonce).toBe("fake-nonce");
        expect(payload.type).toBe("VenmoAccount");
        expect(payload.details.username).toBe("some-name");
        expect(payload.details.paymentContextId).toBe("context-id");

        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.start",
          expect.objectContaining({ context_id: "context-id" })
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.success",
          expect.objectContaining({ context_id: "context-id" })
        );
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("includes payerInfo if included in the query", async () => {
        const payerInfo = {
          userName: "some-name",
          email: "email@example.com",
          phoneNumber: "1234567890",
          billingAddress: {
            streetAddress: "2 XYZ St.",
            extendedAddress: "Unit 1",
            locality: "Atlanta",
            region: "GA",
            postalCode: "111",
          },
          shippingAddress: {
            streetAddress: "1 Vista Avenue",
            extendedAddress: "Apt. 123",
            locality: "San Jose",
            region: "CA",
            postalCode: "95131",
          },
        };

        mockPollingClient(testContext.client, {
          nodeResolver: { payerInfo: payerInfo },
        });

        const payload = await drivePolling(venmo.tokenize());

        expect(payload.details.payerInfo).toEqual(payerInfo);
      });

      it("creates a new payment context upon successful tokenization", async () => {
        var createCallCount = 0;

        mockPollingClient(testContext.client, {
          contextOverrides: function () {
            // First call returns the "new" id that we expect to be stored;
            // subsequent calls (the replacement context) return the default.
            createCallCount++;
            return {
              id: createCallCount === 1 ? "new-context-id" : "context-id",
            };
          },
        });

        expect(venmo._venmoPaymentContextId).toBe("context-id");

        await drivePolling(venmo.tokenize());

        expect(venmo._venmoPaymentContextId).toBe("new-context-id");
      });

      it("creates a new payment context upon unsuccessful tokenization", async () => {
        expect.assertions(2);

        var createCallCount = 0;

        mockPollingClient(testContext.client, {
          contextOverrides: function () {
            createCallCount++;
            return {
              id: createCallCount === 1 ? "new-context-id" : "context-id",
            };
          },
          nodeResolver: function () {
            return Promise.reject(new Error("network error"));
          },
        });

        expect(venmo._venmoPaymentContextId).toBe("context-id");

        await drivePolling(
          venmo.tokenize().catch(() => {
            expect(venmo._venmoPaymentContextId).toBe("new-context-id");
          })
        );
      });

      it("rejects when a network error occurs", async () => {
        expect.assertions(4);

        const networkError = new Error("network error");

        mockPollingClient(testContext.client, {
          nodeResolver: function () {
            return Promise.reject(networkError);
          },
        });

        await drivePolling(
          venmo.tokenize().catch((err) => {
            expect(analytics.sendEvent).not.toBeCalledWith(
              expect.anything(),
              "venmo.tokenize.manual-return.success"
            );
            expect(analytics.sendEventPlus).toBeCalledWith(
              expect.anything(),
              "venmo.tokenize.manual-return.failure",
              expect.objectContaining({ context_id: "context-id" })
            );
            expect(err.code).toBe(
              "VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR"
            );
            expect(err.details.originalError).toBe(networkError);
          })
        );
      });

      it.each(["EXPIRED", "FAILED", "CANCELED"])(
        "rejects for %s status",
        async (status) => {
          expect.assertions(2);

          mockPollingClient(testContext.client, {
            nodeResolver: { status: status },
          });

          await drivePolling(
            venmo.tokenize().catch((err) => {
              expect(err.code).toBe(
                `VENMO_MOBILE_POLLING_TOKENIZATION_${status}`
              );
              expect(analytics.sendEventPlus).toBeCalledWith(
                expect.anything(),
                `venmo.tokenize.manual-return.status-change.${status.toLowerCase()}`,
                expect.objectContaining({ context_id: "context-id" })
              );
            })
          );
        }
      );

      it("rejects with cancellation error when tab/window is closed", async () => {
        expect.assertions(3);

        venmo._venmoWindow = { closed: true };
        venmo._venmoPaymentContextStatus = "CREATED";
        venmo._cancelOnReturnToBrowser = true;

        await drivePolling(
          venmo.tokenize().catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe("VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED");
            expect(analytics.sendEventPlus).toHaveBeenCalledWith(
              expect.anything(),
              "venmo.appswitch.browser-window.closed",
              { context_id: "context-id" }
            );
          })
        );
      });

      it("does not trigger cancellation when window is closed but payment context status is APPROVED", async () => {
        venmo._venmoWindow = { closed: true };
        venmo._venmoPaymentContextStatus = "SCANNED";

        // Default mock already returns APPROVED; no override needed.
        const result = await drivePolling(venmo.tokenize());

        expect(result.nonce).toBe("fake-nonce");
        expect(analytics.sendEventPlus).not.toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.browser-window.closed",
          { context_id: "context-id" }
        );
      });

      it("sends an analytics event for each status change", async () => {
        var nodeCallCount = 0;

        mockPollingClient(testContext.client, {
          nodeResolver: function () {
            nodeCallCount++;
            if (nodeCallCount === 1) {
              return Promise.resolve(makeNodeResponse({ status: "SCANNED" }));
            }
            if (nodeCallCount === 2) {
              return Promise.resolve(
                makeNodeResponse({
                  status: "UNKNOWN_STATUS_WE_DO_NOT_ACCOUNT_FOR",
                })
              );
            }
            return Promise.resolve(makeNodeResponse());
          },
        });

        await drivePolling(venmo.tokenize());

        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.status-change.scanned",
          expect.objectContaining({ context_id: "context-id" })
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.status-change.unknown_status_we_do_not_account_for",
          expect.objectContaining({ context_id: "context-id" })
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.status-change.approved",
          expect.objectContaining({ context_id: "context-id" })
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.success",
          expect.objectContaining({ context_id: "context-id" })
        );

        // once to create the payment context
        // three times for polling the status
        // once to create a new payment context to replace the original one
        expect(testContext.client.request).toBeCalledTimes(5);
      });

      it("rejects if polling lasts for 5 minutes with no results", async () => {
        // Use a short expiry threshold so we only need a handful of poll cycles
        // to trigger the timeout without spending real time on 1200 fake iterations.
        venmo._mobilePollingExpiresThreshold = 500;
        venmo._mobilePollingInterval = 250;

        // mobileWebFallBack uses a different mutation name; keep that match here
        // because the production source uses it for the timeout path.
        mockPollingClient(testContext.client, {
          nodeResolver: { status: "SCANNED" },
          queryMatchString: "mutation CreateVenmo",
        });

        // Advance just past threshold + one interval to trigger the timeout
        // with the minimum number of polling cycles.
        var advanceMs =
          venmo._mobilePollingExpiresThreshold +
          venmo._mobilePollingInterval +
          1;

        await drivePolling(
          venmo.tokenize().catch((err) => {
            expect(err.code).toBe("VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT");
          }),
          advanceMs
        );
      });

      describe("platform metadata tag", () => {
        it("tags manual-return.start/.success with the analytics category", async () => {
          await drivePolling(venmo.tokenize());

          var expectedPlatform = venmo._determineAnalyticsCategory();

          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.start",
            expect.objectContaining({ platform: expectedPlatform })
          );
          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.success",
            expect.objectContaining({ platform: expectedPlatform })
          );
        });

        it("tags manual-return events with 'popup-bridge' when PopupBridge is installed", async () => {
          window.popupBridge = { open: vi.fn() };

          await drivePolling(venmo.tokenize());

          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.start",
            expect.objectContaining({ platform: "popup-bridge" })
          );
          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.status-change.approved",
            expect.objectContaining({ platform: "popup-bridge" })
          );
          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.success",
            expect.objectContaining({ platform: "popup-bridge" })
          );
        });

        it("tags manual-return.failure with 'popup-bridge' when PopupBridge is installed", async () => {
          window.popupBridge = { open: vi.fn() };

          var networkError = new BraintreeError({
            type: BraintreeError.types.NETWORK,
            code: "VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR",
            message: "network error",
          });

          mockPollingClient(testContext.client, {
            nodeResolver: function () {
              return Promise.reject(networkError);
            },
          });

          await drivePolling(venmo.tokenize().catch(function () {}));

          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.failure",
            expect.objectContaining({ platform: "popup-bridge" })
          );
        });

        it("tags manual-return.canceled with 'popup-bridge' when PopupBridge is installed", async () => {
          window.popupBridge = { open: vi.fn() };

          venmo._venmoWindow = { closed: true };
          venmo._venmoPaymentContextStatus = "CREATED";
          venmo._cancelOnReturnToBrowser = true;

          await drivePolling(venmo.tokenize().catch(function () {}));

          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.canceled",
            expect.objectContaining({ platform: "popup-bridge" })
          );
        });
      });
    });

    // Note: These iframe breakout tests test appSwitch behavior but are placed here
    // (after mobile polling tests) rather than in the describe('appSwitch') section
    // above to avoid test pollution. When placed before the mobile polling tests,
    // Android Chrome mocks appear to pollute the "sends an analytics event for each
    // status change" test despite cleanup attempts with vi.restoreAllMocks() and
    // explicit mock resets.
    describe("appSwitch iframe breakout on android chrome", () => {
      let venmo, venmoOptions, originalNavigator, originalLocation, originalTop;

      beforeEach(async () => {
        originalNavigator = window.navigator;
        originalLocation = window.location;
        originalTop = window.top;

        delete window.navigator;
        delete window.location;
        delete window.top;

        window.navigator = {
          platform: "platform",
        };
        window.location = {
          href: "old",
          hash: "",
        };
        window.top = {
          location: {
            href: "top-old",
          },
        };

        venmoOptions = {
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          paymentMethodUsage: "single_use",
        };

        venmo = new Venmo(venmoOptions);
        await flushPromises();
      });

      afterEach(() => {
        window.navigator = originalNavigator;
        window.location = originalLocation;
        window.top = originalTop;
      });

      it("breaks out of iframe when in iframe and using android chrome without mobileWebFallBack", async () => {
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);
        vi.spyOn(browserDetection, "isChrome").mockReturnValue(true);
        inIframe.mockReturnValue(true);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).not.toBe("https://venmo.com/braintree");
        expect(window.top.location.href).toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.chrome-android-iframe-breakout"
        );
      });

      it("breaks out of iframe when in iframe and using android chrome with mobileWebFallBack true", async () => {
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);
        vi.spyOn(browserDetection, "isChrome").mockReturnValue(true);
        inIframe.mockReturnValue(true);

        const venmoWithFallback = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          mobileWebFallBack: true,
          paymentMethodUsage: "single_use",
        });

        await flushPromises();

        await venmoWithFallback.appSwitch("https://venmo.com/braintree");

        expect(window.open).not.toBeCalled();
        expect(window.location.href).not.toBe("https://venmo.com/braintree");
        expect(window.top.location.href).toBe("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.chrome-android-iframe-breakout"
        );
      });
    });

    describe("Desktop QR Code Flow", () => {
      let venmo, fakeVenmoDesktop;

      beforeEach(async () => {
        vi.useRealTimers();

        fakeVenmoDesktop = {
          hideDesktopFlow: vi.fn().mockResolvedValue(),
          launchDesktopFlow: vi.fn().mockResolvedValue({
            paymentMethodNonce: "fake-venmo-account-nonce",
            username: "username",
          }),
        };
        createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          allowDesktop: true,
          paymentMethodUsage: "single_use",
        });
        await flushPromises();
      });

      it("launches the venmo desktop flow", async () => {
        await venmo.tokenize();

        expect(fakeVenmoDesktop.launchDesktopFlow).toBeCalledTimes(1);
      });

      it("sends an event that the desktop flow is started", async () => {
        await venmo.tokenize();

        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.tokenize.desktop.start"
        );
      });

      it("resolves with the nonce payload", async () => {
        const result = await venmo.tokenize();

        expect(result).toEqual({
          nonce: "fake-venmo-account-nonce",
          type: "VenmoAccount",
          details: {
            username: "username",
          },
        });
      });

      it("sends an event when the desktop flow succeeds", async () => {
        await venmo.tokenize();

        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.tokenize.desktop.success",
          expect.anything()
        );
      });

      it("rejects when venmo desktop flow rejects", async () => {
        expect.assertions(2);

        const error = new Error("fail");

        fakeVenmoDesktop.launchDesktopFlow.mockRejectedValue(error);

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(err.code).toBe("VENMO_DESKTOP_UNKNOWN_ERROR");
          expect(err.details.originalError).toBe(error);
        }
      });

      it("passes on specific desktop canceled event when customer cancels the modal", async () => {
        expect.assertions(1);

        const error = new Error("fail");

        error.reason = "CUSTOMER_CANCELED";

        fakeVenmoDesktop.launchDesktopFlow.mockRejectedValue(error);

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(err.code).toBe("VENMO_DESKTOP_CANCELED");
        }
      });

      it("sends an event when the desktop flow fails", async () => {
        expect.assertions(1);

        fakeVenmoDesktop.launchDesktopFlow.mockRejectedValue(new Error("fail"));

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.desktop.failure",
            expect.anything()
          );
        }
      });
    });

    describe("Desktop Web Login Flow", () => {
      const flowSpecificConfig = {
        allowDesktopWebLogin: true,
        paymentMethodUsage: "single_use",
      };
      const mockNonce = "fake-nonce";
      const mockPaymentContextId = "some-context-id";
      const mockVenmoUserName = "the-user";
      const mockPayload = {
        paymentMethodId: mockNonce,
        userName: mockVenmoUserName,
      };
      const mockGatewayApprovedPayload = {
        status: "APPROVED",
        paymentMethodId: mockNonce,
        userName: mockVenmoUserName,
      };

      runWebLogin.mockResolvedValue(mockPayload);

      beforeEach(() => {
        vi.spyOn(browserDetection, "isIos").mockReturnValue(false);

        vi.clearAllMocks();
        vi.useFakeTimers();
        inIframe.mockReturnValue(true);
        window.open = vi.fn();
        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoPaymentContext: {
                  venmoPaymentContext: {
                    status: "CREATED",
                    id: mockPaymentContextId,
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.resolve({
            data: {
              node: mockGatewayApprovedPayload,
            },
          });
        });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("launches the desktop web login flow with approval", async () => {
        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });
        await flushPromises();

        const expectedCreateVenmoPaymentContextArgs = {
          api: "graphQLApi",
          data: expect.objectContaining({
            query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
            variables: {
              input: {
                customerClient: "NATIVE_WEB",

                displayName: undefined,
                intent: "CONTINUE",
                isFinalAmount: false,
                paymentMethodUsage: "SINGLE_USE",
                paysheetDetails: {
                  collectCustomerBillingAddress: false,
                  collectCustomerShippingAddress: false,

                  transactionDetails: undefined,
                },
              },
            },
          }),
        };
        const result = await venmo.tokenize();

        expect(testContext.client.request).toBeCalledWith(
          expect.objectContaining({
            api: "graphQLApi",
            data: expect.objectContaining({
              query: expect.stringMatching(
                "mutation CreateVenmoPaymentContext"
              ),
              variables: expect.objectContaining({
                input: expect.objectContaining({
                  paymentMethodUsage: "SINGLE_USE",
                }),
              }),
            }),
          })
        );
        expect(result.nonce).toBe(mockNonce);
        expect(result.type).toBe("VenmoAccount");
        expect(result.details.username).toBe(mockVenmoUserName);
        expect(result.details.paymentContextId).toBe(mockPaymentContextId);
      });

      it("use the correct url for web login", async () => {
        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });
        await flushPromises();

        await venmo.tokenize();
        expect(runWebLogin).toHaveBeenCalledWith({
          analyticsCallback: expect.any(Function),
          cancelTokenization: expect.any(Function),
          checkForStatusChange: expect.any(Function),
          frameServiceInstance: expect.any(Object),
          venmoUrl: expect.stringContaining(venmoConstants.VENMO_WEB_LOGIN_URL),
          debug: testContext.configuration.isDebug,
          checkPaymentContextStatus: expect.any(Function),
        });
      });

      it("passes style nonce with web login", async () => {
        let nonceText = "eigh-eee-iii-oh-you";
        let nonceOption = {
          styleCspNonce: nonceText,
        };

        let venmo = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          ...flowSpecificConfig,
          ...nonceOption,
        });
        await flushPromises();

        await venmo.tokenize();
        expect(runWebLogin).toHaveBeenCalledWith({
          analyticsCallback: expect.any(Function),
          cancelTokenization: expect.any(Function),
          checkForStatusChange: expect.any(Function),
          frameServiceInstance: expect.any(Object),
          venmoUrl: expect.stringContaining(venmoConstants.VENMO_WEB_LOGIN_URL),
          debug: testContext.configuration.isDebug,
          checkPaymentContextStatus: expect.any(Function),
          styleCspNonce: expect.stringMatching(nonceText),
        });
      });

      it("processes the payment context status on approval", async () => {
        const expectedStatus = "APPROVED";
        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        const result = await venmo._checkPaymentContextStatusAndProcessResult();

        expect(result).toEqual(mockGatewayApprovedPayload);
        expect(venmo._venmoPaymentContextStatus).toEqual(expectedStatus);
      });

      it("handles a canceled gateway status", async () => {
        expect.assertions(5);
        const expectedStatus = "CANCELED";
        const mockGatewayCanceledPayload = {
          status: expectedStatus,
        };

        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoPaymentContext: {
                  venmoPaymentContext: {
                    status: "CREATED",
                    id: mockPaymentContextId,
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.resolve({
            data: {
              node: mockGatewayCanceledPayload,
            },
          });
        });

        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        await venmo
          ._checkPaymentContextStatusAndProcessResult()
          .catch((errResult) => {
            expect(errResult).toBeInstanceOf(BraintreeError);
            expect(errResult.type).toEqual(
              venmoErrors.VENMO_CUSTOMER_CANCELED.type
            );
            expect(errResult.code).toEqual(
              venmoErrors.VENMO_CUSTOMER_CANCELED.code
            );
            expect(errResult.message).toEqual(
              venmoErrors.VENMO_CUSTOMER_CANCELED.message
            );
            expect(venmo._venmoPaymentContextStatus).toEqual(expectedStatus);
          });
      });

      it("handles the failed gateway status", async () => {
        expect.assertions(5);
        const expectedStatus = "FAILED";
        const mockGatewayFailedPayload = {
          status: expectedStatus,
        };

        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoPaymentContext: {
                  venmoPaymentContext: {
                    status: "CREATED",
                    id: mockPaymentContextId,
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.resolve({
            data: {
              node: mockGatewayFailedPayload,
            },
          });
        });

        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        await venmo
          ._checkPaymentContextStatusAndProcessResult()
          .catch((errResult) => {
            expect(errResult).toBeInstanceOf(BraintreeError);
            expect(errResult.type).toEqual(
              venmoErrors.VENMO_TOKENIZATION_FAILED.type
            );
            expect(errResult.code).toEqual(
              venmoErrors.VENMO_TOKENIZATION_FAILED.code
            );
            expect(errResult.message).toEqual(
              venmoErrors.VENMO_TOKENIZATION_FAILED.message
            );
            expect(venmo._venmoPaymentContextStatus).toEqual(expectedStatus);
          });
      });

      it("rejects on network issues", async () => {
        expect.assertions(5);
        const expectedError = "This is a network error";

        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoPaymentContext: {
                  venmoPaymentContext: {
                    status: "CREATED",
                    id: mockPaymentContextId,
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.reject(expectedError);
        });

        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        await venmo
          ._checkPaymentContextStatusAndProcessResult()
          .catch((errResult) => {
            expect(errResult).toBeInstanceOf(BraintreeError);
            expect(errResult.type).toEqual(
              venmoErrors.VENMO_NETWORK_ERROR.type
            );
            expect(errResult.code).toEqual(
              venmoErrors.VENMO_NETWORK_ERROR.code
            );
            expect(errResult.message).toEqual(
              venmoErrors.VENMO_NETWORK_ERROR.message
            );
            expect(errResult.details).toEqual(expectedError);
          });
      });

      it("retries the status check after redirect when status hasn't changed", async () => {
        const retryStatus = "CREATED";
        const mockGatewayRetryPayload = {
          status: retryStatus,
        };
        const maxRetries = 3;
        let retryCount = 1;

        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoPaymentContext: {
                  venmoPaymentContext: {
                    status: "CREATED",
                    id: mockPaymentContextId,
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }
          if (retryCount < maxRetries) {
            retryCount++;

            return Promise.resolve({
              data: {
                node: mockGatewayRetryPayload,
              },
            });
          }

          return Promise.resolve({
            data: {
              node: mockGatewayApprovedPayload,
            },
          });
        });

        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        await venmo._checkPaymentContextStatusAndProcessResult(retryCount);
        expect(testContext.client.request).toBeCalledTimes(4); // once for creating the context, 3 for retries to status checks
      });

      it("rejects if retries limited hit and no status change occurred", async () => {
        expect.assertions(5);
        const retryStatus = "CREATED";
        const mockGatewayRetryPayload = {
          status: retryStatus,
        };
        let retryCount = 1;

        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoPaymentContext: {
                  venmoPaymentContext: {
                    status: "CREATED",
                    id: mockPaymentContextId,
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.resolve({
            data: {
              node: mockGatewayRetryPayload,
            },
          });
        });

        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        await venmo
          ._checkPaymentContextStatusAndProcessResult(retryCount)
          .catch((errResult) => {
            expect(testContext.client.request).toBeCalledTimes(4); // once for creating the context, 3 for retries to status checks
            expect(errResult).toBeInstanceOf(BraintreeError);
            expect(errResult.type).toEqual(
              venmoErrors.VENMO_TOKENIZATION_FAILED.type
            );
            expect(errResult.code).toEqual(
              venmoErrors.VENMO_TOKENIZATION_FAILED.code
            );
            expect(errResult.message).toEqual(
              venmoErrors.VENMO_TOKENIZATION_FAILED.message
            );
          });
      });

      describe("Analytics Events", () => {
        let venmo;

        beforeEach(() => {
          venmo = new Venmo({
            createPromise: new Promise((resolve) =>
              resolve(testContext.client)
            ),
            ...flowSpecificConfig,
          });
        });

        const mockStatusCheckRequest = (status) => {
          testContext.client.request.mockImplementation((options) => {
            if (options.data.query.includes("mutation CreateVenmo")) {
              return Promise.resolve({
                data: {
                  createVenmoPaymentContext: {
                    venmoPaymentContext: {
                      status: "CREATED",
                      id: mockPaymentContextId,
                      createdAt: new Date().toString(),
                      expiresAt: new Date(Date.now() + 30000000).toString(),
                    },
                  },
                },
              });
            }

            return Promise.resolve({
              data: { node: { status: status } },
            });
          });
        };

        it("sends analytics events on start and approval", async () => {
          await venmo._tokenizeWebLoginWithRedirect();

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.web-login.start",
            { context_id: "some-context-id" }
          );
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.web-login.success",
            { context_id: "some-context-id" }
          );
        });

        it("sends analytics events on rejection", async () => {
          expect.assertions(1);
          runWebLogin.mockRejectedValueOnce(new Error("some error!"));

          await venmo._tokenizeWebLoginWithRedirect().catch(() => {
            expect(analytics.sendEventPlus).toHaveBeenCalledWith(
              expect.anything(),
              "venmo.tokenize.web-login.failure",
              { context_id: "some-context-id" }
            );
          });
        });

        it("sends desktop web login analytics from web-login-backdrop callback", async () => {
          await venmo._tokenizeWebLoginWithRedirect();

          runWebLogin.mock.calls[0][0].analyticsCallback("login", "start");

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.desktop.login.start",
            { context_id: "some-context-id" }
          );
        });

        it("uses id argument in query-payment-context analytics on success", async () => {
          await venmo._queryPaymentContextStatus("query-context-id");

          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.query-payment-context.started",
            { context_id: "query-context-id" }
          );
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.query-payment-context.succeeded",
            { context_id: "query-context-id" }
          );
        });

        it("uses id argument in query-payment-context analytics on failure", async () => {
          expect.assertions(2);
          testContext.client.request.mockRejectedValueOnce(new Error("fail"));

          await venmo
            ._queryPaymentContextStatus("query-context-id")
            .catch(function () {
              expect(analytics.sendEventPlus).toHaveBeenCalledWith(
                expect.anything(),
                "venmo.query-payment-context.started",
                { context_id: "query-context-id" }
              );
              expect(analytics.sendEventPlus).toHaveBeenCalledWith(
                expect.anything(),
                "venmo.query-payment-context.failed",
                { context_id: "query-context-id" }
              );
            });
        });
      });
    });
  });

  describe("cancelTokenization", () => {
    it("errors if no tokenization is in process", () => {
      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      expect.assertions(1);

      return venmo.cancelTokenization().catch((err) => {
        expect(err.code).toBe("VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE");
      });
    });

    it("rejects tokenize with an error indicating that the merchant canceled the flow", () => {
      expect.assertions(1);

      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      vi.spyOn(window.document, "addEventListener").mockImplementation();
      vi.spyOn(window, "open").mockImplementation();

      const promise = venmo.tokenize().catch((err) => {
        expect(err.code).toBe("VENMO_TOKENIZATION_CANCELED_BY_MERCHANT");
      });

      vi.spyOn(window.document, "removeEventListener").mockImplementation();

      return venmo.cancelTokenization().then(() => {
        return promise;
      });
    });

    it("removes event listeners for event listener mobile flow", () => {
      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      vi.spyOn(window.document, "addEventListener").mockImplementation();
      vi.spyOn(window, "open").mockImplementation();

      venmo.tokenize().catch(() => {
        // noop
      });

      vi.spyOn(window.document, "removeEventListener").mockImplementation();

      return venmo.cancelTokenization().then(() => {
        expect(window.document.removeEventListener).toBeCalledTimes(1);
        expect(window.document.removeEventListener).toBeCalledWith(
          "visibilitychange",
          expect.any(Function)
        );
      });
    });

    it("cancels the payment context in the mobile flow when paymentMethodUsage is passed", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoPaymentContext: {
            venmoPaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: new Date().toString(),
              expiresAt: new Date(Date.now() + 30000000).toString(),
            },
          },
        },
      });

      inIframe.mockReturnValue(true);

      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "multi_use",
      });

      venmo.tokenize().catch(() => {
        // noop
      });

      return venmo.cancelTokenization().then(() => {
        expect(testContext.client.request).toBeCalledWith({
          api: "graphQLApi",
          data: {
            query: expect.stringMatching(
              "mutation UpdateVenmoPaymentContextStatus"
            ),
            variables: {
              input: {
                id: "context-id",
                status: "CANCELED",
              },
            },
          },
        });
      });
    });

    it("cancels the venmo desktop flow", async () => {
      const fakeVenmoDesktop = {
        hideDesktopFlow: vi.fn().mockResolvedValue(),
        updateVenmoDesktopPaymentContext: vi.fn().mockResolvedValue(),
        launchDesktopFlow: vi.fn().mockResolvedValue({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
        }),
      };

      createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);

      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowDesktop: true,
        paymentMethodUsage: "single_use",
      });
      await flushPromises();

      venmo.tokenize().catch(() => {
        // noop
      });

      return venmo.cancelTokenization().then(() => {
        expect(
          fakeVenmoDesktop.updateVenmoDesktopPaymentContext
        ).toBeCalledTimes(1);
        expect(
          fakeVenmoDesktop.updateVenmoDesktopPaymentContext
        ).toBeCalledWith("CANCELED");
      });
    });
  });

  describe("_isIOSIframeWithoutVenmoApp", () => {
    let venmo;

    beforeEach(async () => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });
      await flushPromises();
    });

    it("returns true when on iOS, in iframe, without Venmo app", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(true);
    });

    it("returns false when not on iOS", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(false);
      inIframe.mockReturnValue(true);
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });

    it("returns false when not in iframe", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(false);
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });

    it("returns false when Venmo app is installed", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(true);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });

    it("returns false when requireManualReturn is true (respects merchant override)", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);

      venmo._requireManualReturn = true;
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });
  });

  describe("iOS iframe flow bypass", () => {
    let venmo;

    beforeEach(async () => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });
      await flushPromises();
    });

    it("detects the correct scenario for iOS iframe without Venmo app", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(true);
    });

    it("respects requireManualReturn flag even on iOS iframe without app", () => {
      vi.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);

      venmo._requireManualReturn = true;
      vi.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });
  });

  describe("teardown", () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });
    });

    it("removes event listener from document body", () => {
      venmo.teardown();

      expect(document.removeEventListener).toHaveBeenCalledTimes(1);
      expect(document.removeEventListener).toHaveBeenCalledWith(
        "visibilitychange",

        undefined
      );
    });

    it("replaces all methods so error is thrown when methods are invoked", () => {
      const instance = venmo;

      return instance.teardown().then(() => {
        methods(Venmo.prototype).forEach((method) => {
          try {
            instance[method]();
          } catch (err) {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe(BraintreeError.types.MERCHANT);
            expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(err.message).toBe(
              `${method} cannot be called after teardown.`
            );
          }
        });
      });
    });

    it("tears down venmo desktop instance if it exists", async () => {
      const fakeVenmoDesktop = {
        teardown: vi.fn().mockResolvedValue(),
      };

      createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowDesktop: true,
        paymentMethodUsage: "single_use",
      });
      await flushPromises();

      return venmo.teardown().then(() => {
        expect(fakeVenmoDesktop.teardown).toBeCalledTimes(1);
      });
    });

    it("cancels mobile polling venmo payment context if it exists", async () => {
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: new Date().toString(),
                  expiresAt: new Date(Date.now() + 30000000).toString(),
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });

      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      await flushPromises();

      return venmo.teardown().then(() => {
        expect(testContext.client.request).toBeCalledWith({
          api: "graphQLApi",
          data: {
            query: expect.stringMatching(
              "mutation UpdateVenmoPaymentContextStatus"
            ),
            variables: {
              input: {
                id: "context-id",
                status: "CANCELED",
              },
            },
          },
        });
      });
    });

    it("prevents venmo payment context from refreshing after teardown", async () => {
      vi.clearAllTimers();
      testContext.client.request.mockImplementation((options) => {
        var query = (options.data && options.data.query) || "";
        if (query.includes("createVenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  status: "CREATED",
                  id: "context-id",
                  createdAt: new Date().toString(),
                  expiresAt: new Date(Date.now() + 30000000).toString(),
                },
              },
            },
          });
        }
        if (query.includes("node") && query.includes("VenmoPaymentContext")) {
          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "test-user",
              },
            },
          });
        }
        return Promise.resolve({});
      });

      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      await flushPromises();

      await venmo.teardown();

      testContext.client.request.mockReset();
      testContext.client.request.mockResolvedValue({});

      vi.runAllTimers();
      await flushPromises();

      expect(testContext.client.request).not.toBeCalledWith({
        api: "graphQLApi",
        data: expect.objectContaining({
          query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
        }),
      });
    });
  });

  describe("_shouldIncludeReturnUrls", () => {
    beforeEach(() => {
      // Set up default mocks for browser detection
      vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);
      vi.spyOn(browserDetection, "isAndroid").mockReturnValue(false);
      vi.spyOn(browserDetection, "isIosSafari").mockReturnValue(false);

      // Set up default mocks for other conditions
      inIframe.mockReturnValue(false);
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(false);
    });

    it("returns true when _deepLinkReturnUrl is set", () => {
      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        deepLinkReturnUrl: "myapp://return",
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when in a non-default browser that is not webview and not Android", () => {
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns true when in a non-default browser that is a webview", () => {
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);
      vi.spyOn(browserDetection, "isWebview").mockReturnValue(true);

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        _isIncognito: false,
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns true when in a non-default browser on Android", () => {
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);
      vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        _isIncognito: false,
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when _cannotHaveReturnUrls is true (in iframe)", () => {
      inIframe.mockReturnValue(true);

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });

      // Prevent async initialization from causing unhandled promise rejections
      vi.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns false when _isIncognito is true", () => {
      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        _isIncognito: true,
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns true when _isIncognito is true and in iOS Safari", () => {
      vi.spyOn(browserDetection, "isIosSafari").mockReturnValue(true);

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        _isIncognito: true,
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when _isIncognito is true and in iOS Safari but in iframe", () => {
      inIframe.mockReturnValue(true);
      vi.spyOn(browserDetection, "isIosSafari").mockReturnValue(true);

      const instance = new Venmo({
        _isIncognito: true,
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });

      // Prevent async initialization from causing unhandled promise rejections
      vi.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns true when all conditions allow return URLs", () => {
      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        _isIncognito: false,
        paymentMethodUsage: "single_use",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns true when _deepLinkReturnUrl is set even if other conditions would prevent return URLs", () => {
      inIframe.mockReturnValue(true);
      vi.spyOn(browserDetection, "isWebview").mockReturnValue(true); // Make it webview to bypass first condition

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        deepLinkReturnUrl: "myapp://return",
        _isIncognito: true,
        paymentMethodUsage: "single_use",
      });

      // Prevent async initialization from causing unhandled promise rejections
      vi.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when requireManualReturn is true", () => {
      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        requireManualReturn: true,
        _isIncognito: false,
        paymentMethodUsage: "single_use",
      });

      // Prevent async initialization from causing unhandled promise rejections
      vi.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    describe("non-default browser with deepLinkReturnUrl and redirect strategy", () => {
      beforeEach(() => {
        supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);
        vi.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        vi.spyOn(browserDetection, "isAndroid").mockReturnValue(false);
      });

      it("returns true when deepLinkReturnUrl is set and redirect strategy is enabled (iOS + mobileWebFallBack)", () => {
        vi.spyOn(browserDetection, "isIos").mockReturnValue(true);

        const instance = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: "myapp://return",
          mobileWebFallBack: true,
          paymentMethodUsage: "single_use",
        });

        expect(instance._shouldIncludeReturnUrls()).toBe(true);
      });

      it("returns true when deepLinkReturnUrl is set and redirect strategy is enabled (iOS + useRedirectForIOS)", () => {
        vi.spyOn(browserDetection, "isIos").mockReturnValue(true);

        const instance = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: "myapp://return",
          useRedirectForIOS: true,
          paymentMethodUsage: "single_use",
        });

        expect(instance._shouldIncludeReturnUrls()).toBe(true);
      });

      it("returns false when deepLinkReturnUrl is set but redirect strategy is disabled (iOS)", () => {
        vi.spyOn(browserDetection, "isIos").mockReturnValue(true);

        const instance = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: "myapp://return",
          mobileWebFallBack: false,
          useRedirectForIOS: false,
          paymentMethodUsage: "single_use",
        });

        expect(instance._shouldIncludeReturnUrls()).toBe(false);
      });

      it("returns false when deepLinkReturnUrl is set but not on iOS (Android excluded earlier)", () => {
        vi.spyOn(browserDetection, "isIos").mockReturnValue(false);

        const instance = new Venmo({
          createPromise: Promise.resolve(testContext.client),
          deepLinkReturnUrl: "myapp://return",
          paymentMethodUsage: "single_use",
        });

        expect(instance._shouldIncludeReturnUrls()).toBe(false);
      });
    });
  });

  describe("_determineAnalyticsCategory", () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });
      vi.spyOn(venmo, "_popupBridgeIsInstalled").mockReturnValue(false);
      vi.spyOn(venmo, "_isDesktop").mockReturnValue(false);
      venmo._useDesktopQRFlow = false;
    });

    it("returns 'popup-bridge' when popupBridge is installed", () => {
      vi.spyOn(venmo, "_popupBridgeIsInstalled").mockReturnValue(true);

      expect(venmo._determineAnalyticsCategory()).toBe("popup-bridge");
    });

    it("returns 'qr' when using the desktop QR flow", () => {
      venmo._useDesktopQRFlow = true;

      expect(venmo._determineAnalyticsCategory()).toBe("desktop-qr");
    });

    it("returns 'desktop' when on desktop without QR flow or popup-bridge", () => {
      vi.spyOn(venmo, "_isDesktop").mockReturnValue(true);

      expect(venmo._determineAnalyticsCategory()).toBe("desktop");
    });

    it("returns 'mobile' when not popup-bridge, QR, or desktop", () => {
      expect(venmo._determineAnalyticsCategory()).toBe("mobile");
    });

    it("prefers 'popup-bridge' over QR flow and desktop", () => {
      vi.spyOn(venmo, "_popupBridgeIsInstalled").mockReturnValue(true);
      venmo._useDesktopQRFlow = true;
      vi.spyOn(venmo, "_isDesktop").mockReturnValue(true);

      expect(venmo._determineAnalyticsCategory()).toBe("popup-bridge");
    });

    it("prefers 'qr' over desktop when both conditions are true", () => {
      venmo._useDesktopQRFlow = true;
      vi.spyOn(venmo, "_isDesktop").mockReturnValue(true);

      expect(venmo._determineAnalyticsCategory()).toBe("desktop-qr");
    });
  });

  describe("cancelOnReturnToBrowser Android override", () => {
    it("forces _cancelOnReturnToBrowser to false on Android even when merchant sets it to true", () => {
      vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);

      var instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
        cancelOnReturnToBrowser: true,
      });

      expect(instance._cancelOnReturnToBrowser).toBe(false);
    });

    it("preserves cancelOnReturnToBrowser on non-Android platforms", () => {
      vi.spyOn(browserDetection, "isAndroid").mockReturnValue(false);

      var instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
        cancelOnReturnToBrowser: true,
      });

      expect(instance._cancelOnReturnToBrowser).toBe(true);
    });

    it("keeps _cancelOnReturnToBrowser false on Android when merchant does not set the option", () => {
      vi.spyOn(browserDetection, "isAndroid").mockReturnValue(true);

      var instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });

      expect(instance._cancelOnReturnToBrowser).toBe(false);
    });
  });

  describe("_handleCancelOnReturn", () => {
    let venmo;

    const setupVenmoForCancellation = (overrides = {}) => {
      const defaults = {
        cancelOnReturnToBrowser: true,
        pollCount: 4,
        paymentContextStatus: "CREATED",
        locationHash: "",
      };
      const config = { ...defaults, ...overrides };

      venmo._cancelOnReturnToBrowser = config.cancelOnReturnToBrowser;
      venmo._pollCount = config.pollCount;
      venmo._venmoPaymentContextStatus = config.paymentContextStatus;
      window.location.hash = config.locationHash;
    };

    const expectNoCancellation = () => {
      expect(analytics.sendEventPlus).not.toHaveBeenCalled();
      expect(venmo._cancelMobilePaymentContext).not.toHaveBeenCalled();
    };

    beforeEach(async () => {
      vi.clearAllMocks();
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        paymentMethodUsage: "single_use",
      });
      await flushPromises();
      analytics.sendEventPlus.mockClear();
      venmo._venmoPaymentContextStatus = "CREATED";
      venmo._venmoPaymentContextId = "test-context-id";
      venmo._cancelMobilePaymentContext = vi.fn().mockResolvedValue();
    });

    it.each([false, undefined])(
      "does nothing if _cancelOnReturnToBrowser is %s",
      async (cancelValue) => {
        venmo._cancelOnReturnToBrowser = cancelValue;

        await venmo._handleCancelOnReturn();

        expect(venmo._pollCount).toBe(0);
        expectNoCancellation();
      }
    );

    it("increments poll count when _cancelOnReturnToBrowser is true", async () => {
      venmo._cancelOnReturnToBrowser = true;

      await venmo._handleCancelOnReturn();

      expect(venmo._pollCount).toBe(1);
    });

    describe("when cancellation conditions are not met", () => {
      it.each([
        [
          "payment context status is not CREATED",
          { paymentContextStatus: "APPROVED" },
        ],
        ["poll count is below minimum threshold", { pollCount: 1 }],
      ])("does not cancel if %s", async (_description, overrides) => {
        setupVenmoForCancellation(overrides);

        await venmo._handleCancelOnReturn();

        expectNoCancellation();
      });
    });

    describe("when cancellation conditions are met", () => {
      it("cancels payment context and sends analytics", async () => {
        setupVenmoForCancellation();

        await venmo._handleCancelOnReturn();

        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          venmo._createPromise,
          "venmo.appswitch.cancel-on-return-to-browser",
          {
            context_id: "test-context-id",
          }
        );
        expect(venmo._cancelMobilePaymentContext).toHaveBeenCalled();
      });

      it("sends success analytics event when cancel succeeds", async () => {
        setupVenmoForCancellation();

        await venmo._handleCancelOnReturn();

        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          venmo._createPromise,
          "venmo.appswitch.cancel-on-return-to-browser.success",
          {
            context_id: "test-context-id",
          }
        );
        expect(venmo._pollCount).toBe(0);
      });

      it("sends error analytics event when cancel fails", async () => {
        setupVenmoForCancellation();
        venmo._cancelMobilePaymentContext = vi
          .fn()
          .mockRejectedValue(new Error("Cancel failed"));

        await venmo._handleCancelOnReturn();

        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          venmo._createPromise,
          "venmo.appswitch.cancel-on-return-to-browser.error",
          {
            context_id: "test-context-id",
          }
        );
        expect(venmo._pollCount).toBe(0);
      });
    });
  });
});
