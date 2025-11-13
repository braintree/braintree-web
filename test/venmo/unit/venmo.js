"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/venmo/shared/supports-venmo");
jest.mock("../../../src/venmo/external");
jest.mock("../../../src/lib/in-iframe");
jest.mock("../../../src/venmo/shared/web-login-backdrop");
jest.mock("../../../src/lib/url-params");

const analytics = require("../../../src/lib/analytics");
const { fake } = require("../../helpers");
const querystring = require("../../../src/lib/querystring");
const BraintreeError = require("../../../src/lib/braintree-error");
const Venmo = require("../../../src/venmo/venmo");
const browserDetection = require("../../../src/venmo/shared/browser-detection");
const supportsVenmo = require("../../../src/venmo/shared/supports-venmo");
const inIframe = require("../../../src/lib/in-iframe");
const { version: VERSION } = require("../../../package.json");
const methods = require("../../../src/lib/methods");
const createVenmoDesktop = require("../../../src/venmo/external");
const venmoErrors = require("../../../src/venmo/shared/errors");
const {
  runWebLogin,
  setupDesktopWebLogin,
} = require("../../../src/venmo/shared/web-login-backdrop");
const venmoConstants = require("../../../src/venmo/shared/constants");
const urlParams = require("../../../src/lib/url-params");

function triggerVisibilityHandler(instance, runAllTimers = true) {
  // TODO we should have it trigger the actual
  // visibility event if possible, rather than
  // calling the method saved on the instance
  instance._visibilityChangeListener();

  if (runAllTimers) {
    jest.runAllTimers();
  }
}

function triggerHashChangeHandler(instance) {
  instance._onHashChangeListener({
    newURL: window.location.href,
  });

  jest.runAllTimers();
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve().then(() => jest.advanceTimersByTime(1));
  await Promise.resolve();
}

describe("Venmo", () => {
  let testContext, originalLocationHref;

  beforeAll(() => {
    window.open = jest.fn();
    originalLocationHref = window.location.href;
    urlParams.getUrlParams.mockReturnValue({});
  });

  beforeEach(() => {
    jest.useFakeTimers();

    testContext = {};
    inIframe.mockReturnValue(false);

    testContext.location = originalLocationHref;
    testContext.configuration = fake.configuration();
    testContext.client = {
      request: jest.fn().mockResolvedValue({}),
      getConfiguration: () => testContext.configuration,
    };

    setupDesktopWebLogin.mockResolvedValue({});

    analytics.sendEventPlus = jest.fn();

    jest.spyOn(document, "addEventListener");
    jest.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    window.location.href = originalLocationHref;
    jest.clearAllTimers();
    jest.useRealTimers();

    if (window.popupBridge) {
      delete window.popupBridge;
    }
  });

  it("sends analytics events when venmo is not configured for desktop", async () => {
    new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
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
    });

    expect(venmo._allowNonDefaultBrowsers).toBe(false);
  });

  it("defaults allowNonDefaultBrowsers to true when not specified", () => {
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
    });

    expect(venmo._allowNonDefaultBrowsers).toBe(true);
  });

  it("configures venmo desktop with display name (if passed)", async () => {
    createVenmoDesktop.mockResolvedValue({});
    new Venmo({
      allowDesktop: true,
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      displayName: "name",
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
    });

    await flushPromises();

    expect(createVenmoDesktop).toBeCalledWith(
      expect.objectContaining({
        profileId: "profile-id",
      })
    );
  });

  it("sets up a payment context using legacy mutation when mobile polling flow is used without paymentMethodUsage when in an iframe", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
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
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching(
          "mutation CreateVenmoQRCodePaymentContext"
        ),
        variables: {
          input: {
            environment: "SANDBOX",
            intent: "PAY_FROM_APP",
          },
        },
      },
    });
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.manual-return.presented"
    );

    expect(venmo._venmoPaymentContextStatus).toBe("CREATED");
    expect(venmo._venmoPaymentContextId).toBe("context-id");
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
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.manual-return.presented"
    );

    expect(venmo._venmoPaymentContextStatus).toBe("CREATED");
    expect(venmo._venmoPaymentContextId).toBe("context-id");
  });

  it("sets up a payment context using legacy mutation when mobile polling flow is used without paymentMethodUsage when configured from manual return", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
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
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching(
          "mutation CreateVenmoQRCodePaymentContext"
        ),
        variables: {
          input: {
            environment: "SANDBOX",
            intent: "PAY_FROM_APP",
          },
        },
      },
    });
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.manual-return.presented"
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
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.manual-return.presented"
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
    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.mobile-payment-context.presented"
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

  it("ignores display name when not configured with paymentMethodUsage", async () => {
    testContext.client.request.mockResolvedValue({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
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
      displayName: "name",
    });

    await flushPromises();

    expect(testContext.client.request).toBeCalledWith({
      api: "graphQLApi",
      data: {
        query: expect.stringMatching(
          "mutation CreateVenmoQRCodePaymentContext"
        ),
        variables: {
          input: {
            environment: "SANDBOX",
            intent: "PAY_FROM_APP",
          },
        },
      },
    });
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

    testContext.configuration.gatewayConfiguration.payWithVenmo.enrichedCustomerDataEnabled = true;
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

  it("does not create a new payment context or venmo desktop when url hash has tokenization results", async () => {
    jest.spyOn(Venmo.prototype, "hasTokenizationResult").mockReturnValue(true);

    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
      paymentMethodUsage: "single_use",
    });

    await flushPromises();

    expect(testContext.client.request).not.toBeCalled();
    expect(createVenmoDesktop).not.toBeCalled();

    expect(analytics.sendEvent).toBeCalledWith(
      expect.anything(),
      "venmo.appswitch.return-in-new-tab"
    );
  });

  it("refreshes the payment context after 2/3 of the expiration time has passed", async () => {
    testContext.client.request.mockResolvedValueOnce({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: "CREATED",
            id: "first-context-id",
            createdAt: "2021-01-20T03:25:00.000000Z",
            expiresAt: "2021-01-20T03:25:10.000000Z",
          },
        },
      },
    });
    testContext.client.request.mockResolvedValueOnce({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: "CREATED",
            id: "second-context-id",
            createdAt: "2021-01-20T03:25:00.000000Z",
            expiresAt: "2021-01-20T03:25:10.000000Z",
          },
        },
      },
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
    });

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    jest.advanceTimersByTime(6000); // 6 seconds

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    jest.advanceTimersByTime(1000); // 1 second

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("second-context-id");
  });

  it("does not refresh the payment context after 2/3 of the expiration time has passed when tokenization is in progress", async () => {
    testContext.client.request.mockResolvedValueOnce({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: "CREATED",
            id: "first-context-id",
            createdAt: "2021-01-20T03:25:00.000000Z",
            expiresAt: "2021-01-20T03:25:10.000000Z",
          },
        },
      },
    });
    testContext.client.request.mockResolvedValueOnce({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: "CREATED",
            id: "second-context-id",
            createdAt: "2021-01-20T03:25:00.000000Z",
            expiresAt: "2021-01-20T03:25:10.000000Z",
          },
        },
      },
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
    });

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    jest.advanceTimersByTime(6000); // 6 seconds

    venmo._tokenizationInProgress = true;

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    jest.advanceTimersByTime(5000); // 5 seconds

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");
    expect(testContext.client.request).toBeCalledTimes(1);
    expect(testContext.client.request).toHaveBeenNthCalledWith(1, {
      api: "graphQLApi",
      data: expect.objectContaining({
        query: expect.stringMatching(
          "mutation CreateVenmoQRCodePaymentContext"
        ),
      }),
    });
  });

  it("does make a request for a new payment context after 2/3 of the expiration time has passed, but does not update the reference to the payment context if tokenization started while the request for the new payment context was in process", async () => {
    testContext.client.request.mockResolvedValueOnce({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: "CREATED",
            id: "first-context-id",
            createdAt: "2021-01-20T03:25:00.000000Z",
            expiresAt: "2021-01-20T03:25:10.000000Z",
          },
        },
      },
    });
    testContext.client.request.mockResolvedValueOnce({
      data: {
        createVenmoQRCodePaymentContext: {
          venmoQRCodePaymentContext: {
            status: "CREATED",
            id: "second-context-id",
            createdAt: "2021-01-20T03:25:00.000000Z",
            expiresAt: "2021-01-20T03:25:10.000000Z",
          },
        },
      },
    });
    inIframe.mockReturnValue(true);
    const venmo = new Venmo({
      createPromise: new Promise((resolve) => resolve(testContext.client)),
    });

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    jest.advanceTimersByTime(6667); // just over the 2/3 threshold

    venmo._tokenizationInProgress = true;

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");

    jest.advanceTimersByTime(1000); // 1 second

    await flushPromises();

    expect(venmo._venmoPaymentContextId).toBe("first-context-id");
    expect(testContext.client.request).toBeCalledTimes(2);
    expect(testContext.client.request).toHaveBeenNthCalledWith(1, {
      api: "graphQLApi",
      data: expect.objectContaining({
        query: expect.stringMatching(
          "mutation CreateVenmoQRCodePaymentContext"
        ),
      }),
    });
    expect(testContext.client.request).toHaveBeenNthCalledWith(2, {
      api: "graphQLApi",
      data: expect.objectContaining({
        query: expect.stringMatching(
          "mutation CreateVenmoQRCodePaymentContext"
        ),
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
      });
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: "2021-01-20T03:25:37.522000Z",
              expiresAt: "2021-01-20T03:30:37.522000Z",
            },
          },
        },
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
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(`${expectedUrl}#venmoSuccess=1`);
        expect(params["x-cancel"]).toBe(`${expectedUrl}#venmoCancel=1`);
        expect(params["x-error"]).toBe(`${expectedUrl}#venmoError=1`);
      });
    });

    it("uses web fallback url when mobileWebFallBack supplied as true", () => {
      const venmoConfig = {
        mobileWebFallBack: true,
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      };

      venmo = new Venmo(venmoConfig);

      return venmo.getUrl().then((url) => {
        expect(url.indexOf(venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL)).toBe(
          0
        );
      });
    });

    it("removes hash from parent page url for use with return urls", () => {
      const pageUrlWithoutHash = window.location.href;

      window.location.hash = "#bar";

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(
          `${pageUrlWithoutHash}#venmoSuccess=1`
        );
        expect(params["x-cancel"]).toBe(`${pageUrlWithoutHash}#venmoCancel=1`);
        expect(params["x-error"]).toBe(`${pageUrlWithoutHash}#venmoError=1`);
      });
    });

    it("removes hash with no value from parent page url", () => {
      const pageUrlWithoutHash = window.location.href;

      window.location.hash = "#";

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(
          `${pageUrlWithoutHash}#venmoSuccess=1`
        );
        expect(params["x-cancel"]).toBe(`${pageUrlWithoutHash}#venmoCancel=1`);
        expect(params["x-error"]).toBe(`${pageUrlWithoutHash}#venmoError=1`);
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
        "x-success": `${location}#venmoSuccess=1`,
        "x-cancel": `${location}#venmoCancel=1`,
        "x-error": `${location}#venmoError=1`,
      };

      if (deepLinked) {
        venmo = new Venmo({
          allowDesktopWebLogin: false,
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: location,
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
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: "2021-01-20T03:25:37.522000Z",
              expiresAt: "2021-01-20T03:30:37.522000Z",
            },
          },
        },
      });
      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe("NOOP");
        expect(params["x-cancel"]).toBe("NOOP");
        expect(params["x-error"]).toBe("NOOP");
      });
    });

    it("includes return urls when using polling flow with a deep link return url", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: "2021-01-20T03:25:37.522000Z",
              expiresAt: "2021-01-20T03:30:37.522000Z",
            },
          },
        },
      });
      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        deepLinkReturnUrl: "https://example.com/top-level-page",
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe(
          "https://example.com/top-level-page#venmoSuccess=1"
        );
        expect(params["x-cancel"]).toBe(
          "https://example.com/top-level-page#venmoCancel=1"
        );
        expect(params["x-error"]).toBe(
          "https://example.com/top-level-page#venmoError=1"
        );
      });
    });

    it("omits return urls when configured to require manual return", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
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
        requireManualReturn: true,
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params["x-success"]).toBe("NOOP");
        expect(params["x-cancel"]).toBe("NOOP");
        expect(params["x-error"]).toBe("NOOP");
      });
    });

    it("omits return urls when using non-default mobile browser", function () {
      jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);

      return venmo.getUrl().then(function (url) {
        var params = querystring.parse(url);

        expect(params["x-success"]).toBe("NOOP");
        expect(params["x-cancel"]).toBe("NOOP");
        expect(params["x-error"]).toBe("NOOP");
      });
    });

    describe("non-default browser with deep link return URL", () => {
      it("omits return urls when using iOS non-default browser even with deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        jest.spyOn(browserDetection, "isAndroid").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when using Android non-default browser with deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        jest.spyOn(browserDetection, "isAndroid").mockReturnValue(true);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe(
            "com.example://return#venmoSuccess=1"
          );
          expect(params["x-cancel"]).toBe("com.example://return#venmoCancel=1");
          expect(params["x-error"]).toBe("com.example://return#venmoError=1");
        });
      });
    });

    describe("webview with deep link return URL", () => {
      it("includes return urls when using webview with deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(true);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe(
            "com.example://return#venmoSuccess=1"
          );
          expect(params["x-cancel"]).toBe("com.example://return#venmoCancel=1");
          expect(params["x-error"]).toBe("com.example://return#venmoError=1");
        });
      });
    });

    describe("iframe scenarios with deep link return URL", () => {
      beforeEach(() => {
        inIframe.mockReturnValue(true);
      });

      it("omits return urls when iframe + non-default browser + deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when iframe + default browser + deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe(
            "com.example://return#venmoSuccess=1"
          );
          expect(params["x-cancel"]).toBe("com.example://return#venmoCancel=1");
          expect(params["x-error"]).toBe("com.example://return#venmoError=1");
        });
      });

      it("includes return urls when webview + iframe + deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(true);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(true);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe(
            "com.example://return#venmoSuccess=1"
          );
          expect(params["x-cancel"]).toBe("com.example://return#venmoCancel=1");
          expect(params["x-error"]).toBe("com.example://return#venmoError=1");
        });
      });
    });

    describe("incognito mode scenarios", () => {
      it("omits return urls when default browser + incognito + no deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        inIframe.mockReturnValue(false);

        // Create venmo instance with incognito mode
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
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
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          deepLinkReturnUrl: "com.example://return",
        });
        venmo._isIncognito = true;

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe(
            "com.example://return#venmoSuccess=1"
          );
          expect(params["x-cancel"]).toBe("com.example://return#venmoCancel=1");
          expect(params["x-error"]).toBe("com.example://return#venmoError=1");
        });
      });
    });

    describe("manual return scenarios", () => {
      it("omits return urls when manual return is required + no deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);
        inIframe.mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          requireManualReturn: true,
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe("NOOP");
          expect(params["x-cancel"]).toBe("NOOP");
          expect(params["x-error"]).toBe("NOOP");
        });
      });

      it("includes return urls when manual return is required + deep link return url", () => {
        jest.spyOn(supportsVenmo, "isNonDefaultBrowser").mockReturnValue(false);
        jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          requireManualReturn: true,
          deepLinkReturnUrl: "com.example://return",
        });

        return venmo.getUrl().then((url) => {
          const params = querystring.parse(url);
          expect(params["x-success"]).toBe(
            "com.example://return#venmoSuccess=1"
          );
          expect(params["x-cancel"]).toBe("com.example://return#venmoCancel=1");
          expect(params["x-error"]).toBe("com.example://return#venmoError=1");
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

    // NEXT_MAJOR_VERSION should be able to remove this test
    // since we won't be using the legacy qr code mutation anymore
    it("applies mobile polling context id to pwv-access-token when it is present", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
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
        requireManualReturn: true,
      });

      return venmo.getUrl().then((url) => {
        const params = querystring.parse(url);

        expect(params.braintree_access_token).toBe(
          "pwv-access-token|pcid:context-id"
        );
        expect(params.resource_id).toBeFalsy();
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
        }).getUrl()
      ).rejects.toThrow("client error"));

    it("includes allowAndroidRecreation flag if merchant configures it to do so", async () => {
      let venmoRecreating = new Venmo({
        allowAndroidRecreation: false,
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      });
      const url = await venmoRecreating.getUrl();

      expect(url).toEqual(expect.stringContaining("allowAndroidRecreation=0"));
    });

    it("defaults allowAndroidRecreation flag to true if merchant does not specify", async () => {
      const url = await venmo.getUrl();

      expect(url).toEqual(expect.stringContaining("allowAndroidRecreation=1"));
    });
  });

  describe("processHashChangeFlowResults", () => {
    let createOptions;

    beforeEach(() => {
      createOptions = {
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      };
      // when venmo is created with a paymentMethodUsage param, it ends
      // up creating a payment context object before it resolves.
      // This requires a lot of boilerplate scaffolding in the tests.
      // The one exception to this is when the page url has a hash
      // with tokenization results already, so in order to simplify
      // our test setup, we're just going to mock that so it will always
      // indicate that the hash has a tokenization result. It should have
      // no effect on the actual tests.
      jest
        .spyOn(Venmo.prototype, "hasTokenizationResult")
        .mockReturnValue(true);
    });

    it("uses hash from url if no hash is provided", async () => {
      const venmo = new Venmo(createOptions);

      history.replaceState(
        {},
        "",
        `${testContext.location}#venmoSuccess=1&paymentMethodNonce=nonce-from-url&username=username-from-url`
      );

      const resultFromUrl = await venmo.processHashChangeFlowResults();
      const result = await venmo.processHashChangeFlowResults(
        "venmoSuccess=1&paymentMethodNonce=nonce-from-argument&username=username-from-argument"
      );

      expect(resultFromUrl.paymentMethodNonce).toBe("nonce-from-url");
      expect(resultFromUrl.username).toBe("username-from-url");
      expect(result.paymentMethodNonce).toBe("nonce-from-argument");
      expect(result.username).toBe("username-from-argument");
    });

    it("sanitizes keys pulled off of hash for non-alpha characters", async () => {
      const venmo = new Venmo(createOptions);

      history.replaceState(
        {},
        "",
        `${testContext.location}#/venmoSuccess=1&paym!entMethodNonce/=abc&userna@#me=keanu`
      );

      const result = await venmo.processHashChangeFlowResults();

      expect(result.paymentMethodNonce).toBe("abc");
      expect(result.username).toBe("keanu");
    });

    it("resolves with nonce payload on successful result", () => {
      const name = "keanu";
      const nonce = "abc";
      const resourceId = "123";
      const venmo = new Venmo(createOptions);

      return venmo
        .processHashChangeFlowResults(
          `venmoSuccess=1&paymentMethodNonce=${nonce}&username=${name}&resource_id=${resourceId}`
        )
        .then((payload) => {
          expect(payload.paymentMethodNonce).toBe(nonce);
          expect(payload.username).toBe(name);
          expect(payload.id).toBe(resourceId);
        });
    });

    it("successfully returns a nonce payload when nonce hash value is snake case", () => {
      const snakeCaseNonceParam = "payment_method_nonce";
      const venmo = new Venmo(createOptions);

      return venmo
        .processHashChangeFlowResults(
          `venmoSuccess=1&${snakeCaseNonceParam}=abc&username=keanu`
        )
        .then((payload) => {
          expect(payload.paymentMethodNonce).toBe("abc");
          expect(payload.username).toBe("keanu");
        });
    });

    it("polls for status change when using the legacy flow instead of relying on hashes", async () => {
      const mockPaymentContextId = "some-context-id";

      testContext.client.request.mockResolvedValueOnce({
        data: {
          node: {
            status: "APPROVED",
            paymentMethodId: "fake-nonce-from-context",
            userName: "name-from-context",
          },
        },
      });
      createOptions.paymentMethodUsage = "single_use";

      const venmo = new Venmo(createOptions);

      venmo._venmoPaymentContextId = mockPaymentContextId;

      const payload = await venmo.processHashChangeFlowResults();

      expect(payload.paymentMethodNonce).toBe("fake-nonce-from-context");
      expect(payload.username).toBe("name-from-context");
      expect(payload.id).toBe(mockPaymentContextId);
      expect(testContext.client.request).toBeCalledTimes(1);
      expect(testContext.client.request).toBeCalledWith({
        api: "graphQLApi",
        data: {
          query: expect.stringMatching("on VenmoPaymentContext"),
          variables: {
            id: mockPaymentContextId,
          },
        },
      });
    });

    it("resolves with hash params when payment context status polling fails", async () => {
      const mockNonce = "nonce-from-hash";
      const mockUsername = "bill-bobbo";
      const mockResourceId = "context-id-from-hash";

      testContext.client.request.mockRejectedValue(new Error("network error"));
      createOptions.paymentMethodUsage = "single_use";

      const venmo = new Venmo(createOptions);

      // hasTokenizationResult should have extracted this in real-life usage
      venmo._venmoPaymentContextId = mockResourceId;

      const results = await venmo.processHashChangeFlowResults(
        `venmoSuccess=1&paymentMethodNonce=${mockNonce}&username=${mockUsername}&resource_id=${mockResourceId}`
      );

      expect(results.venmoSuccess).toBe("1");
      expect(results.paymentMethodNonce).toBe(mockNonce);
      expect(results.username).toBe(mockUsername);
      expect(results.id).toBe(mockResourceId);
      expect(testContext.client.request).toBeCalledTimes(1);
    });

    it("fails if polling rejects due to canceled status", async () => {
      const mockResourceId = "context-id-from-hash";

      expect.assertions(4);
      testContext.client.request.mockResolvedValueOnce({
        data: {
          node: {
            status: "CANCELED",
          },
        },
      });
      createOptions.paymentMethodUsage = "single_use";

      const venmo = new Venmo(createOptions);

      // hasTokenizationResult should have extracted this in real-life usage
      venmo._venmoPaymentContextId = mockResourceId;

      return venmo
        .processHashChangeFlowResults(
          `venmoSuccess=1&paymentMethodNonce=nonce-from-hash&username=name-from-hash&resource_id=${mockResourceId}`
        )
        .catch((error) => {
          expect(error).toBeInstanceOf(BraintreeError);
          expect(error.code).toBe("VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED");
          expect(testContext.client.request).toBeCalledTimes(1);

          // Add this new assertion to check the context ID is passed correctly
          expect(testContext.client.request).toBeCalledWith({
            api: "graphQLApi",
            data: {
              query: expect.stringMatching("on VenmoPaymentContext"),
              variables: {
                id: "context-id-from-hash",
              },
            },
          });
        });
    });

    it("resolves with nonce payload on successful result when params include a resource id but sdk is initialized to use legacy flow", () => {
      const venmo = new Venmo(createOptions);

      return venmo
        .processHashChangeFlowResults(
          "venmoSuccess=1&paymentMethodNonce=nonce-from-hash&username=name-from-hash&resource_id=context-id-from-hash"
        )
        .then((payload) => {
          expect(payload.paymentMethodNonce).toBe("nonce-from-hash");
          expect(payload.username).toBe("name-from-hash");
        });
    });

    it("rejects with error for error result", () => {
      const venmo = new Venmo(createOptions);

      return venmo
        .processHashChangeFlowResults(
          "venmoError=1&errorMessage=This%20is%20an%20error%20message.&errorCode=42"
        )
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("UNKNOWN");
          expect(err.code).toBe("VENMO_APP_FAILED");
          expect(err.message).toBe("Venmo app encountered a problem.");
          expect(err.details.originalError.message).toBe(
            "This is an error message."
          );
          expect(err.details.originalError.code).toBe("42");
        });
    });

    it("rejects with cancellation error on Venmo app cancel", () => {
      const venmo = new Venmo(createOptions);

      return venmo
        .processHashChangeFlowResults("venmoCancel=1")
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("CUSTOMER");
          expect(err.code).toBe("VENMO_APP_CANCELED");
          expect(err.message).toBe("Venmo app authorization was canceled.");
        });
    });

    it("rejects with cancellation error when app switch result not found", () => {
      const venmo = new Venmo(createOptions);

      return venmo.processHashChangeFlowResults().catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("CUSTOMER");
        expect(err.code).toBe("VENMO_CANCELED");
        expect(err.message).toBe(
          "User canceled Venmo authorization, or Venmo app is not available."
        );
      });
    });

    it("consumes URL fragment parameters on Success result", async () => {
      const venmo = new Venmo(createOptions);

      history.replaceState({}, "", `${testContext.location}#venmoSuccess=1`);

      await venmo.processHashChangeFlowResults();

      expect(window.location.href.indexOf("#")).toBe(-1);
    });

    it.each([["Error"], ["Cancel"]])(
      "consumes URL fragment parameters on %p result",
      async (result) => {
        const venmo = new Venmo(createOptions);

        history.replaceState(
          {},
          "",
          `${testContext.location}#venmo${result}=1`
        );

        await expect(venmo.processHashChangeFlowResults()).rejects.toThrow();

        expect(window.location.href.indexOf("#")).toBe(-1);
      }
    );

    it("does not modify history state on Success if configured", async () => {
      createOptions.ignoreHistoryChanges = true;

      const venmo = new Venmo(createOptions);

      history.replaceState({}, "", `${testContext.location}#venmoSuccess=1`);

      await venmo.processHashChangeFlowResults();

      expect(window.location.hash).toBe("#venmoSuccess=1");
    });

    it.each([["Error"], ["Cancel"]])(
      "does not modify history state on %p result if configured",
      async (result) => {
        createOptions.ignoreHistoryChanges = true;

        const venmo = new Venmo(createOptions);

        history.replaceState(
          {},
          "",
          `${testContext.location}#venmo${result}=1`
        );

        await expect(venmo.processHashChangeFlowResults()).rejects.toThrow();

        expect(window.location.hash).toBe(`#venmo${result}=1`);
      }
    );
  });

  describe("appSwitch", () => {
    let originalNavigator, originalLocation, originalTop, venmoOptions;

    beforeEach(() => {
      venmoOptions = {
        createPromise: new Promise((resolve) => resolve(testContext.client)),
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
        jest.spyOn(browserDetection, "isIos").mockReturnValue(false);

        const venmo = new Venmo(venmoOptions);

        await venmo.appSwitch("https://venmo.com/braintree");

        expect(window.open).toBeCalledWith("https://venmo.com/braintree");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("calls window.open when device is ios but is not configured to use ios redirect strategy", async () => {
        jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

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
        jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

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
        jest
          .spyOn(browserDetection, "doesNotSupportWindowOpenInIos")
          .mockReturnValue(true);

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
        jest.spyOn(browserDetection, "isAndroid").mockReturnValue(true);
        jest.spyOn(browserDetection, "isChrome").mockReturnValue(true);

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
        jest.spyOn(browserDetection, "isAndroid").mockReturnValue(true);
        jest.spyOn(browserDetection, "isChrome").mockReturnValue(true);

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
          open: jest.fn(),
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

        jest.spyOn(browserDetection, "isAndroidWebview").mockReturnValue(true);

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

        jest.spyOn(browserDetection, "isAndroidWebview").mockReturnValue(true);
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
          open: jest.fn(),
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
          open: jest.fn(),
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
      });
      jest.spyOn(supportsVenmo, "isBrowserSupported");
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

  describe("hasTokenizationResult", () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      });
    });

    afterEach(() => {
      history.replaceState({}, "", testContext.location);
    });

    it.each([["Success"], ["Error"], ["Cancel"]])(
      "returns true when URL has %p payload",
      (payload) => {
        history.replaceState(
          {},
          "",
          `${testContext.location}#venmo${payload}=1`
        );

        expect(venmo.hasTokenizationResult()).toBe(true);
      }
    );

    it("returns false when URL has no Venmo payload", () => {
      expect(venmo.hasTokenizationResult()).toBe(false);
    });

    it("sets the _venmoPaymentContextId from the resource_id", () => {
      urlParams.getUrlParams.mockReturnValue({
        resource_id: "test-resource-id",
      });

      venmo.hasTokenizationResult();

      expect(venmo._venmoPaymentContextId).toBe("test-resource-id");
    });

    it("sets the _venmoPaymentContextId from the hash fragment id", () => {
      urlParams.getUrlParams.mockReturnValue({});
      history.replaceState(
        {},
        "",
        `${testContext.location}#venmoSuccess=1&resource_id=test-hash-id`
      );

      venmo.hasTokenizationResult();

      expect(venmo._venmoPaymentContextId).toBe("test-hash-id");
    });
  });

  describe("tokenize", () => {
    it("errors if another tokenization request is active", () => {
      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
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
        });
      });

      afterEach(() => {
        /*
         * Some tests use replaceState to simulate app switch returns rather
         * than updating window.location manually because this causes errors.
         * The window state needs to be reset after those tests.
         * */
        history.replaceState({}, "", testContext.location);

        jest.runAllTimers();
      });

      it("includes paymentContextId for mobile flow with hash change listeners", () => {
        const expectedContextId = "muh-context-id-666";
        const promise = venmo.tokenize().then((resp) => {
          expect(resp.details.paymentContextId).toBe(expectedContextId);
        });

        expect.assertions(1);
        history.replaceState(
          {},
          "",
          `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu&id=${expectedContextId}`
        );
        triggerHashChangeHandler(venmo);

        return promise;
      });

      it("errors if getUrl fails", () => {
        jest
          .spyOn(venmo, "getUrl")
          .mockRejectedValue(new Error("client error"));

        return expect(venmo.tokenize()).rejects.toThrow("client error");
      });

      it("processes results instead of doing app switch when url has venmo results", () => {
        jest.spyOn(venmo, "processHashChangeFlowResults");
        jest.spyOn(venmo, "appSwitch");

        history.replaceState(
          {},
          "",
          `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`
        );

        return venmo.tokenize().then(() => {
          expect(venmo.processHashChangeFlowResults).toBeCalledTimes(1);
          expect(venmo.appSwitch).not.toBeCalled();
        });
      });

      it("app switches to venmo", () => {
        jest.spyOn(venmo, "appSwitch");

        const promise = venmo.tokenize().then(() => {
          expect(venmo.appSwitch).toBeCalledTimes(1);
          expect(venmo.appSwitch).toBeCalledWith(
            expect.stringContaining("https://venmo.com/braintree")
          );
        });

        expect.assertions(2);
        history.replaceState(
          {},
          "",
          `${testContext.location}#venmoSuccess=1&paymentMethodNonce=abc&username=keanu`
        );
        triggerHashChangeHandler(venmo);

        return promise;
      });

      describe("when visibility listener triggers", () => {
        it("resolves with nonce payload on success", () => {
          jest.spyOn(venmo, "processHashChangeFlowResults").mockResolvedValue({
            paymentMethodNonce: "abc",
            username: "keanu",
          });

          const promise = venmo.tokenize().then(({ details, nonce, type }) => {
            expect(nonce).toBe("abc");
            expect(type).toBe("VenmoAccount");
            expect(details.username).toBe("@keanu");
          });

          expect.assertions(3);
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("rejects with error on Venmo app error", () => {
          const err = new Error("fail");

          jest
            .spyOn(venmo, "processHashChangeFlowResults")
            .mockRejectedValue(err);

          const promise = venmo.tokenize().catch((tokenizeError) => {
            expect(tokenizeError).toBe(err);
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("sets _tokenizationInProgress to false when app switch result not found", () => {
          const promise = venmo.tokenize().catch(() => {
            expect(venmo._tokenizationInProgress).toBe(false);
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("restores the previous URL fragment after consuming Venmo results", () => {
          let promise;

          history.replaceState({}, "", `${testContext.location}#foo`);

          promise = venmo
            .tokenize()
            .catch(() => {
              jest.runAllTimers();
            })
            .then(() => {
              expect(window.location.hash).toBe("#foo");
            });

          history.replaceState({}, "", `${testContext.location}#venmoCancel=1`);

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("preserves URL if fragments are never set", () => {
          const promise = venmo.tokenize().catch(() => {
            expect(window.location.href).toBe(testContext.location);
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("delays processing results by 1 second by default", () => {
          const originalTimeout = window.setTimeout;

          window.setTimeout = jest.fn().mockImplementation((fn) => {
            fn();
          });

          const promise = venmo.tokenize().then(() => {
            // document visibility change event delay
            expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
            // process results
            expect(setTimeout).toBeCalledWith(expect.any(Function), 1000);

            window.setTimeout = originalTimeout;
          });

          history.replaceState(
            {},
            "",
            `${testContext.location}#venmoSuccess=1`
          );
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("can configure processing delay", () => {
          const originalTimeout = window.setTimeout;

          window.setTimeout = jest.fn().mockImplementation((fn) => {
            fn();
          });

          const promise = venmo
            .tokenize({
              processResultsDelay: 3000,
            })
            .then(() => {
              // document visibility change event delay
              expect(setTimeout).toBeCalledWith(expect.any(Function), 500);
              // process results
              expect(setTimeout).toBeCalledWith(expect.any(Function), 3000);

              window.setTimeout = originalTimeout;
            });

          history.replaceState(
            {},
            "",
            `${testContext.location}#venmoSuccess=1`
          );
          triggerVisibilityHandler(venmo);

          return promise;
        });

        it("creates a new payment context upon succesfull tokenization", async () => {
          testContext.client.request.mockResolvedValue({
            data: {
              createVenmoQRCodePaymentContext: {
                venmoQRCodePaymentContext: {
                  status: "CREATED",
                  id: "new-context-id",
                  createdAt: new Date().toString(),
                  expiresAt: new Date(Date.now() + 30000000).toString(),
                },
              },
            },
          });
          venmo._shouldCreateVenmoPaymentContext = true;
          venmo._venmoPaymentContextId = "old-context-id";

          const promise = venmo.tokenize();

          history.replaceState(
            {},
            "",
            `${testContext.location}#venmoSuccess=1`
          );
          triggerVisibilityHandler(venmo);

          await promise;

          expect(venmo._venmoPaymentContextId).toBe("new-context-id");
          expect(testContext.client.request).toBeCalledWith({
            api: "graphQLApi",
            data: expect.objectContaining({
              query: expect.stringMatching(
                "mutation CreateVenmoQRCodePaymentContext"
              ),
            }),
          });
        });

        it("creates a new payment context upon unsuccesfull tokenization", async () => {
          expect.assertions(2);

          testContext.client.request.mockResolvedValue({
            data: {
              createVenmoQRCodePaymentContext: {
                venmoQRCodePaymentContext: {
                  status: "CREATED",
                  id: "new-context-id",
                  createdAt: new Date().toString(),
                  expiresAt: new Date(Date.now() + 30000000).toString(),
                },
              },
            },
          });

          venmo._shouldCreateVenmoPaymentContext = true;
          venmo._venmoPaymentContextId = "old-context-id";

          const promise = venmo.tokenize();

          history.replaceState({}, "", `${testContext.location}#venmoCancel=1`);
          triggerVisibilityHandler(venmo);

          try {
            await promise;
          } catch (err) {
            expect(venmo._venmoPaymentContextId).toBe("new-context-id");
            expect(testContext.client.request).toBeCalledWith({
              api: "graphQLApi",
              data: expect.objectContaining({
                query: expect.stringMatching(
                  "mutation CreateVenmoQRCodePaymentContext"
                ),
              }),
            });
          }
        });
      });

      describe("analytics events", () => {
        it("sends an event that the mobile flow is used", async () => {
          const promise = venmo.tokenize();

          history.replaceState(
            {},
            "",
            `${testContext.location}#venmoSuccess=1`
          );
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.mobile.start"
          );
        });

        it("sends an event on app switch return Success", async () => {
          const promise = venmo.tokenize();

          history.replaceState(
            {},
            "",
            `${testContext.location}#venmoSuccess=1`
          );
          triggerVisibilityHandler(venmo);

          await promise;

          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.appswitch.handle.success"
          );
        });

        it.each([["Error"], ["Cancel"]])(
          "sends an event on app switch return %p",
          async (result) => {
            const promise = expect(venmo.tokenize()).rejects.toThrow();

            history.replaceState(
              {},
              "",
              `${testContext.location}#venmo${result}=1`
            );
            triggerVisibilityHandler(venmo);

            await promise;

            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              `venmo.appswitch.handle.${result.toLowerCase()}`
            );
          }
        );

        it("sends an event when there's no app switch result before timeout", () => {
          expect.assertions(1);

          const promise = venmo.tokenize().catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "venmo.appswitch.cancel-or-unavailable"
            );
          });

          triggerVisibilityHandler(venmo);

          return promise;
        });
      });
    });

    describe("mobile flow with polling", () => {
      let venmo;

      beforeEach(() => {
        jest.useRealTimers();

        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoQRCodePaymentContext: {
                  venmoQRCodePaymentContext: {
                    status: "CREATED",
                    id: "context-id",
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.resolve({
            data: {
              node: {
                status: "APPROVED",
              },
            },
          });
        });

        inIframe.mockReturnValue(true);
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
        });
        venmo._mobilePollingInterval = 10;
        venmo._mobilePollingExpiresThreshold = 50;
      });

      it("polls for status using the legacy flow", async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
            },
          },
        });

        await venmo.tokenize();

        expect(testContext.client.request).toBeCalledWith({
          api: "graphQLApi",
          data: {
            query: expect.stringMatching("on VenmoQRCodePaymentContext"),
            variables: {
              id: "context-id",
            },
          },
        });
      });

      it("polls for status", async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
            },
          },
        });
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

        venmo._paymentMethodUsage = "single_use";
        venmo._shouldUseLegacyFlow = false;

        await venmo.tokenize();

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
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
            },
          },
        });

        jest.spyOn(venmo, "appSwitch");

        await venmo.tokenize();

        expect(venmo.appSwitch).toBeCalledTimes(1);
        expect(venmo.appSwitch).toBeCalledWith(
          expect.stringContaining(
            "braintree_access_token=pwv-access-token%7Cpcid%3Acontext-id"
          )
        );
      });

      it("app switches to the Venmo app on mobile web fallback", async () => {
        const mockPaymentContextId = "mockPaymentContextId";

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
              node: {
                status: "APPROVED",
                paymentMethodId: "fake-nonce",
                userName: "some-name",
              },
            },
          });
        });

        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          mobileWebFallBack: true,
          paymentMethodUsage: "single_use",
        });

        // hasTokenizationResult should have extracted this in real-life usage
        venmo._venmoPaymentContextId = mockPaymentContextId;

        jest.spyOn(venmo, "appSwitch");

        await venmo.tokenize();

        expect(venmo.appSwitch).toBeCalledWith(
          expect.stringContaining(venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL)
        );
        expect(window.open).toBeCalledWith(
          expect.stringContaining(venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL)
        );
      });

      it("resolves when polling concludes", async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
            },
          },
        });

        const payload = await venmo.tokenize();

        expect(payload.nonce).toBe("fake-nonce");
        expect(payload.type).toBe("VenmoAccount");
        expect(payload.details.username).toBe("@some-name");
        expect(payload.details.paymentContextId).toBe("context-id");

        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.start",
          {
            context_id: "context-id",
          }
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.success",
          { context_id: "context-id" }
        );
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "venmo.appswitch.start.browser"
        );
      });

      it("includes payerInfo if included in the query", async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
              payerInfo: {
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
              },
            },
          },
        });

        const payload = await venmo.tokenize();

        expect(payload.details.payerInfo).toEqual({
          userName: "@some-name",
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
        });
      });

      it("creates a new payment context upon successful tokenization", async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
            },
          },
        });
        testContext.client.request.mockResolvedValueOnce({
          data: {
            createVenmoQRCodePaymentContext: {
              venmoQRCodePaymentContext: {
                status: "CREATED",
                id: "new-context-id",
                createdAt: new Date().toString(),
                expiresAt: new Date(Date.now() + 30000000).toString(),
              },
            },
          },
        });

        expect(venmo._venmoPaymentContextId).toBe("context-id");

        await venmo.tokenize();

        expect(venmo._venmoPaymentContextId).toBe("new-context-id");
      });

      it("creates a new payment context upon unsuccessful tokenization", async () => {
        expect.assertions(2);

        testContext.client.request.mockRejectedValueOnce(
          new Error("network error")
        );
        testContext.client.request.mockResolvedValueOnce({
          data: {
            createVenmoQRCodePaymentContext: {
              venmoQRCodePaymentContext: {
                status: "CREATED",
                id: "new-context-id",
                createdAt: new Date().toString(),
                expiresAt: new Date(Date.now() + 30000000).toString(),
              },
            },
          },
        });

        expect(venmo._venmoPaymentContextId).toBe("context-id");

        try {
          await venmo.tokenize();
        } catch (err) {
          expect(venmo._venmoPaymentContextId).toBe("new-context-id");
        }
      });

      it("rejects when a network error occurs", async () => {
        expect.assertions(4);

        const networkError = new Error("network error");

        testContext.client.request.mockRejectedValueOnce(networkError);

        await venmo.tokenize().catch((err) => {
          expect(analytics.sendEvent).not.toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.success"
          );
          expect(analytics.sendEventPlus).toBeCalledWith(
            expect.anything(),
            "venmo.tokenize.manual-return.failure",
            {
              context_id: "context-id",
            }
          );

          expect(err.code).toBe(
            "VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR"
          );
          expect(err.details.originalError).toBe(networkError);
        });
      });

      it.each(["EXPIRED", "FAILED", "CANCELED"])(
        "rejects for %s status",
        async (status) => {
          expect.assertions(2);

          testContext.client.request.mockResolvedValueOnce({
            data: {
              node: {
                status,
              },
            },
          });

          await venmo.tokenize().catch((err) => {
            expect(err.code).toBe(
              `VENMO_MOBILE_POLLING_TOKENIZATION_${status}`
            );
            expect(analytics.sendEventPlus).toBeCalledWith(
              expect.anything(),
              `venmo.tokenize.manual-return.status-change.${status.toLowerCase()}`,
              {
                context_id: "context-id",
              }
            );
          });
        }
      );

      it("rejects with cancellation error when tab/window is closed", async () => {
        expect.assertions(3);

        const mockWindow = { closed: true };
        venmo._venmoWindow = mockWindow;
        venmo._venmoPaymentContextStatus = "CREATED";

        await venmo.tokenize().catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED");
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.appswitch.browser-window.closed",
            { context_id: "context-id" }
          );
        });
      });

      it("does not trigger cancellation when window is closed but payment context status is APPROVED", async () => {
        const mockWindow = { closed: true };
        venmo._venmoWindow = mockWindow;
        venmo._venmoPaymentContextStatus = "SCANNED";

        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              userName: "some-name",
            },
          },
        });

        const result = await venmo.tokenize();

        expect(result.nonce).toBe("fake-nonce");
        expect(analytics.sendEventPlus).not.toHaveBeenCalledWith(
          expect.anything(),
          "venmo.appswitch.browser-window.closed",
          { context_id: "context-id" }
        );
      });

      it("sends an analytics event for each status change", async () => {
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "SCANNED",
            },
          },
        });
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "UNKNOWN_STATUS_WE_DO_NOT_ACCOUNT_FOR",
            },
          },
        });
        testContext.client.request.mockResolvedValueOnce({
          data: {
            node: {
              status: "APPROVED",
              paymentMethodId: "fake-nonce",
              username: "some-name",
            },
          },
        });

        await venmo.tokenize();

        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.status-change.scanned",
          { context_id: "context-id" }
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.status-change.unknown_status_we_do_not_account_for",
          { context_id: "context-id" }
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.status-change.approved",
          { context_id: "context-id" }
        );
        expect(analytics.sendEventPlus).toBeCalledWith(
          expect.anything(),
          "venmo.tokenize.manual-return.success",
          { context_id: "context-id" }
        );

        // once to create the payment context
        // three times for polling the status
        // once to create a new payment context to replace the original one
        expect(testContext.client.request).toBeCalledTimes(5);
      });

      it("rejects if polling lasts for 5 minutes with no results", async () => {
        testContext.client.request.mockImplementation((options) => {
          if (options.data.query.includes("mutation CreateVenmo")) {
            return Promise.resolve({
              data: {
                createVenmoQRCodePaymentContext: {
                  venmoQRCodePaymentContext: {
                    status: "CREATED",
                    id: "context-id",
                    createdAt: new Date().toString(),
                    expiresAt: new Date(Date.now() + 30000000).toString(),
                  },
                },
              },
            });
          }

          return Promise.resolve({
            data: {
              node: {
                status: "SCANNED",
              },
            },
          });
        });

        const promise = venmo.tokenize().catch((err) => {
          expect(err.code).toBe("VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT");
        });

        await promise;
      });
    });

    describe("Desktop QR Code Flow", () => {
      let venmo, fakeVenmoDesktop;

      beforeEach(() => {
        jest.useRealTimers();

        fakeVenmoDesktop = {
          hideDesktopFlow: jest.fn().mockResolvedValue(),
          launchDesktopFlow: jest.fn().mockResolvedValue({
            paymentMethodNonce: "fake-venmo-account-nonce",
            username: "@username",
          }),
        };
        createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);
        venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          allowDesktop: true,
        });
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
            username: "@username",
          },
        });
      });

      it("sends an event when the desktop flow succeeds", async () => {
        await venmo.tokenize();

        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "venmo.tokenize.desktop.success"
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
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "venmo.tokenize.desktop.failure"
          );
        }
      });
    });

    describe("Desktop Web Login Flow", () => {
      const flowSpecificConfig = {
        allowDesktopWebLogin: true,
        paymentMethodUsage: "single",
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
        jest.spyOn(browserDetection, "isIos").mockReturnValue(false);

        jest.clearAllMocks();
        jest.useFakeTimers();
        inIframe.mockReturnValue(true);
        window.open = jest.fn();
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
        jest.useRealTimers();
      });

      it("launches the desktop web login flow with approval", async () => {
        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

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
                paymentMethodUsage: "SINGLE",
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
          expectedCreateVenmoPaymentContextArgs
        );
        expect(result.nonce).toBe(mockNonce);
        expect(result.type).toBe("VenmoAccount");
        expect(result.details.username).toBe(`@${mockVenmoUserName}`);
        expect(result.details.paymentContextId).toBe(mockPaymentContextId);
      });

      it("use the correct url for web login", async () => {
        let venmo = new Venmo({
          createPromise: new Promise((resolve) => resolve(testContext.client)),
          ...flowSpecificConfig,
        });

        await venmo.tokenize();
        expect(runWebLogin).toHaveBeenCalledWith({
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

        await venmo.tokenize();
        expect(runWebLogin).toHaveBeenCalledWith({
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

        it("sends analytics events on start and approval", async () => {
          const expectedStartEvent = "venmo.tokenize.web-login.start";
          const expectedApprovedEvent = "venmo.tokenize.web-login.success";

          await venmo._tokenizeWebLoginWithRedirect();

          expect(analytics.sendEventPlus).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            expectedStartEvent,
            { context_id: "some-context-id" }
          );
          expect(analytics.sendEventPlus).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            expectedApprovedEvent,
            { context_id: "some-context-id" }
          );
        });

        it("sends analytics events on rejection", async () => {
          expect.assertions(1);
          runWebLogin.mockRejectedValueOnce(new Error("some error!"));

          const expectedApprovedEvent = "venmo.tokenize.web-login.failure";

          await venmo._tokenizeWebLoginWithRedirect().catch(() => {
            expect(analytics.sendEventPlus).toHaveBeenNthCalledWith(
              2,
              expect.anything(),
              expectedApprovedEvent,
              { context_id: "some-context-id" }
            );
          });
        });

        it("sends analytics on gateway status change", async () => {
          const expectedApprovedEvent =
            "venmo.tokenize.web-login.status-change";

          await venmo._checkPaymentContextStatusAndProcessResult();

          expect(analytics.sendEventPlus).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            expectedApprovedEvent,
            { context_id: "some-context-id" }
          );
        });
      });
    });
  });

  describe("cancelTokenization", () => {
    it("errors if no tokenization is in process", () => {
      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
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
      });

      jest.spyOn(window, "addEventListener").mockImplementation();
      jest.spyOn(window.document, "addEventListener").mockImplementation();
      jest.spyOn(window, "open").mockImplementation();

      const promise = venmo.tokenize().catch((err) => {
        expect(err.code).toBe("VENMO_TOKENIZATION_CANCELED_BY_MERCHANT");
      });

      jest.spyOn(window, "removeEventListener").mockImplementation();
      jest.spyOn(window.document, "removeEventListener").mockImplementation();

      return venmo.cancelTokenization().then(() => {
        return promise;
      });
    });

    it("removes event listeners for event listener mobile flow", () => {
      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      });

      jest.spyOn(window, "addEventListener").mockImplementation();
      jest.spyOn(window.document, "addEventListener").mockImplementation();
      jest.spyOn(window, "open").mockImplementation();

      venmo.tokenize().catch(() => {
        // noop
      });

      jest.spyOn(window, "removeEventListener").mockImplementation();
      jest.spyOn(window.document, "removeEventListener").mockImplementation();

      return venmo.cancelTokenization().then(() => {
        expect(window.removeEventListener).toBeCalledTimes(1);
        expect(window.removeEventListener).toBeCalledWith(
          "hashchange",
          expect.any(Function)
        );
        expect(window.document.removeEventListener).toBeCalledTimes(1);
        expect(window.document.removeEventListener).toBeCalledWith(
          "visibilitychange",
          expect.any(Function)
        );
      });
    });

    it("cancels the payment context in mobile polling legacy flow", () => {
      testContext.client.request.mockResolvedValue({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
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
      });

      venmo.tokenize().catch(() => {
        // noop
      });

      return venmo.cancelTokenization().then(() => {
        expect(testContext.client.request).toBeCalledWith({
          api: "graphQLApi",
          data: {
            query: expect.stringMatching(
              "mutation UpdateVenmoQRCodePaymentContext"
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

    it("cancels the venmo desktop flow", () => {
      const fakeVenmoDesktop = {
        hideDesktopFlow: jest.fn().mockResolvedValue(),
        updateVenmoDesktopPaymentContext: jest.fn().mockResolvedValue(),
        launchDesktopFlow: jest.fn().mockResolvedValue({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "@username",
        }),
      };

      createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);

      const venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowDesktop: true,
      });

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
      });
      await flushPromises();
    });

    it("returns true when on iOS, in iframe, without Venmo app", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(true);
    });

    it("returns false when not on iOS", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(false);
      inIframe.mockReturnValue(true);
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });

    it("returns false when not in iframe", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(false);
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });

    it("returns false when Venmo app is installed", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(true);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });

    it("returns false when requireManualReturn is true (respects merchant override)", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);

      venmo._requireManualReturn = true;
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });
  });

  describe("iOS iframe flow bypass", () => {
    let venmo;

    beforeEach(async () => {
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
      });
      await flushPromises();
    });

    it("detects the correct scenario for iOS iframe without Venmo app", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(true);
    });

    it("respects requireManualReturn flag even on iOS iframe without app", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      inIframe.mockReturnValue(true);

      venmo._requireManualReturn = true;
      jest.spyOn(venmo, "_venmoNativeAppIsInstalled").mockReturnValue(false);

      expect(venmo._isIOSIframeWithoutVenmoApp()).toBe(false);
    });
  });

  describe("teardown", () => {
    let venmo;

    beforeEach(() => {
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
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

    it("tears down venmo desktop instance if it exists", () => {
      const fakeVenmoDesktop = {
        teardown: jest.fn().mockResolvedValue(),
      };

      createVenmoDesktop.mockResolvedValue(fakeVenmoDesktop);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        allowDesktop: true,
      });

      return venmo.teardown().then(() => {
        expect(fakeVenmoDesktop.teardown).toBeCalledTimes(1);
      });
    });

    it("cancels mobile polling venmo payment context if it exists using the legacy flow", async () => {
      testContext.client.request.mockResolvedValueOnce({
        data: {
          createVenmoQRCodePaymentContext: {
            venmoQRCodePaymentContext: {
              status: "CREATED",
              id: "context-id",
              createdAt: new Date().toString(),
              expiresAt: new Date(Date.now() + 30000000).toString(),
            },
          },
        },
      });

      inIframe.mockReturnValue(true);
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
      });

      await flushPromises();

      return venmo.teardown().then(() => {
        expect(testContext.client.request).toBeCalledWith({
          api: "graphQLApi",
          data: {
            query: expect.stringMatching(
              "mutation UpdateVenmoQRCodePaymentContext"
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

    it("cancels mobile polling venmo payment context if it exists", async () => {
      testContext.client.request.mockResolvedValueOnce({
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
      testContext.client.request.mockResolvedValueOnce({
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
      venmo = new Venmo({
        createPromise: new Promise((resolve) => resolve(testContext.client)),
        paymentMethodUsage: "single_use",
      });

      await flushPromises();

      return venmo.teardown().then(() => {
        testContext.client.request.mockReset();

        jest.runAllTimers();

        expect(testContext.client.request).not.toBeCalledWith({
          api: "graphQLApi",
          data: expect.objectContaining({
            query: expect.stringMatching("mutation CreateVenmoPaymentContext"),
          }),
        });
      });
    });
  });

  describe("_shouldIncludeReturnUrls", () => {
    beforeEach(() => {
      // Set up default mocks for browser detection
      jest.spyOn(browserDetection, "isWebview").mockReturnValue(false);
      jest.spyOn(browserDetection, "isAndroid").mockReturnValue(false);
      jest.spyOn(browserDetection, "isIosSafari").mockReturnValue(false);

      // Set up default mocks for other conditions
      inIframe.mockReturnValue(false);
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(false);
    });

    it("returns true when _deepLinkReturnUrl is set", () => {
      const instance = new Venmo({
        client: testContext.client,
        deepLinkReturnUrl: "myapp://return",
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when in a non-default browser that is not webview and not Android", () => {
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);

      const instance = new Venmo({
        client: testContext.client,
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns true when in a non-default browser that is a webview", () => {
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);
      jest.spyOn(browserDetection, "isWebview").mockReturnValue(true);

      const instance = new Venmo({
        client: testContext.client,
        _isIncognito: false,
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns true when in a non-default browser on Android", () => {
      supportsVenmo.isNonDefaultBrowser.mockReturnValue(true);
      jest.spyOn(browserDetection, "isAndroid").mockReturnValue(true);

      const instance = new Venmo({
        client: testContext.client,
        _isIncognito: false,
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when _cannotHaveReturnUrls is true (in iframe)", () => {
      inIframe.mockReturnValue(true);

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
      });

      // Prevent async initialization from causing unhandled promise rejections
      jest.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns false when _isIncognito is true", () => {
      const instance = new Venmo({
        _isIncognito: true,
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns true when _isIncognito is true and in iOS Safari", () => {
      jest.spyOn(browserDetection, "isIosSafari").mockReturnValue(true);

      const instance = new Venmo({
        _isIncognito: true,
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when _isIncognito is true and in iOS Safari but in iframe", () => {
      inIframe.mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosSafari").mockReturnValue(true);

      const instance = new Venmo({
        _isIncognito: true,
        createPromise: Promise.resolve(testContext.client),
      });

      // Prevent async initialization from causing unhandled promise rejections
      jest.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
    });

    it("returns true when all conditions allow return URLs", () => {
      const instance = new Venmo({
        _isIncognito: false,
      });

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns true when _deepLinkReturnUrl is set even if other conditions would prevent return URLs", () => {
      inIframe.mockReturnValue(true);
      jest.spyOn(browserDetection, "isWebview").mockReturnValue(true); // Make it webview to bypass first condition

      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        deepLinkReturnUrl: "myapp://return",
        _isIncognito: true,
      });

      // Prevent async initialization from causing unhandled promise rejections
      jest.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(true);
    });

    it("returns false when requireManualReturn is true", () => {
      const instance = new Venmo({
        createPromise: Promise.resolve(testContext.client),
        requireManualReturn: true,
        _isIncognito: false,
      });

      // Prevent async initialization from causing unhandled promise rejections
      jest.spyOn(instance, "_createVenmoPaymentContext").mockResolvedValue();

      expect(instance._shouldIncludeReturnUrls()).toBe(false);
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

    beforeEach(() => {
      jest.clearAllMocks();
      venmo = new Venmo({
        createPromise: Promise.resolve(testContext.client),
      });
      venmo._venmoPaymentContextStatus = "CREATED";
      venmo._venmoPaymentContextId = "test-context-id";
      venmo._cancelMobilePaymentContext = jest.fn().mockResolvedValue();
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
      it.each(["cancel", "error", "success"])(
        "does not cancel if Venmo %s parameter is present",
        async (param) => {
          setupVenmoForCancellation({
            locationHash: `#venmo${param.charAt(0).toUpperCase()}${param.slice(1)}=true`,
          });

          await venmo._handleCancelOnReturn();

          expectNoCancellation();
        }
      );

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
        venmo._cancelMobilePaymentContext = jest
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
