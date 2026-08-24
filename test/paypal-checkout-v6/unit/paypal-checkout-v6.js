"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/assets");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const analytics = require("../../../src/lib/analytics");
const assets = require("../../../src/lib/assets");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const BraintreeError = require("../../../src/lib/braintree-error");
const PayPalCheckoutV6 = require("../../../src/paypal-checkout-v6/paypal-checkout-v6");
const frameService = require("../../../src/lib/frame-service/external");
const fake = require("../../helpers").fake;
const yieldsAsync = require("../../helpers").yieldsAsync;

describe("PayPalCheckoutV6", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.configuration.gatewayConfiguration.paypalEnabled = true;
    testContext.configuration.gatewayConfiguration.paypal = {
      clientId: "test-client-id",
      unvettedMerchant: false,
      environmentNoNetwork: false,
      assetsUrl: "https://example.com/assets",
      displayName: "Test Merchant",
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
        agreementSetup: { tokenId: "BA-TEST-TOKEN" },
      }),
      getConfiguration: jest.fn().mockReturnValue(testContext.configuration),
    };

    testContext.fakeFrameService = {
      close: jest.fn(),
      focus: jest.fn(),
      open: jest.fn().mockImplementation(
        yieldsAsync(null, {
          token: "token",
          PayerID: "payer-id",
          paymentId: "payment-id",
          orderId: "order-id",
        })
      ),
      redirect: jest.fn(),
      _serviceId: "service-id",
    };

    jest
      .spyOn(frameService, "create")
      .mockImplementation(yieldsAsync(testContext.fakeFrameService));
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.client);

    testContext.paypalCheckoutV6 = new PayPalCheckoutV6({});

    return testContext.paypalCheckoutV6._initialize({
      client: testContext.client,
    });
  });

  describe("_initialize", () => {
    it("rejects if authorization is a tokenization key", () => {
      const instance = new PayPalCheckoutV6({});

      testContext.configuration.authorizationType = "TOKENIZATION_KEY";

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "PAYPAL_CHECKOUT_V6_TOKENIZATION_KEY_NOT_SUPPORTED"
          );
        });
    });

    it("rejects if PayPal is not enabled", () => {
      const instance = new PayPalCheckoutV6({});

      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_NOT_ENABLED");
        });
    });

    it("sends analytics event", () => {
      const instance = new PayPalCheckoutV6({});

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.initialized"
          );
        });
    });

    it("resolves with instance", () => {
      const instance = new PayPalCheckoutV6({});

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then((result) => {
          expect(result).toBe(instance);
        });
    });
  });

  describe("getClientId", () => {
    it("returns client ID from configuration", () => {
      const instance = new PayPalCheckoutV6({});

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then(() => {
          return instance.getClientId();
        })
        .then((clientId) => {
          expect(clientId).toBe("test-client-id");
        });
    });
  });

  describe("loadPayPalSDK", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      delete window.paypal;

      testContext.fakeScript = document.createElement("script");
      assets.loadScript.mockReset();
      assets.loadScript.mockResolvedValue(testContext.fakeScript);

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("sends analytics event when SDK loads", () =>
      testContext.instance.loadPayPalSDK().then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.load-sdk.started"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.sdk-load.succeeded"
        );
      }));

    it("loads the SDK script through the shared loader and keeps the element", () =>
      testContext.instance.loadPayPalSDK().then((result) => {
        expect(result).toBe(testContext.instance);
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: expect.stringContaining("sandbox.paypal.com/web-sdk/v6/core"),
          forceScriptReload: true,
        });
        expect(testContext.instance._paypalScript).toBe(testContext.fakeScript);
      }));

    it("uses production URL for production environment", () => {
      testContext.configuration.gatewayConfiguration.environment = "production";

      return testContext.instance.loadPayPalSDK().then(() => {
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: "https://www.paypal.com/web-sdk/v6/core",
          forceScriptReload: true,
        });
      });
    });

    it("uses sandbox URL for sandbox environment", () => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      return testContext.instance.loadPayPalSDK().then(() => {
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: "https://www.sandbox.paypal.com/web-sdk/v6/core",
          forceScriptReload: true,
        });
      });
    });

    it("resolves immediately if SDK is already loaded", () => {
      window.paypal = { version: "6.0.0" };

      return testContext.instance.loadPayPalSDK().then((result) => {
        expect(result).toBe(testContext.instance);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.sdk-already-loaded"
        );
        expect(assets.loadScript).not.toHaveBeenCalled();
      });
    });

    it("reports enriched detail and rejects with a BraintreeError when the SDK script fails to load", () => {
      const originalError = new Error(
        "https://www.sandbox.paypal.com/web-sdk/v6/core failed to load."
      );

      originalError.failureKind = "error";
      originalError.src = "https://www.sandbox.paypal.com/web-sdk/v6/core";
      originalError.timing = 12;
      originalError.onLine = true;

      assets.loadScript.mockRejectedValueOnce(originalError);

      return testContext.instance.loadPayPalSDK().catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("PAYPAL_CHECKOUT_V6_SDK_SCRIPT_LOAD_FAILED");
        expect(err.details.originalError).toBe(originalError);
        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.sdk-load.failed",
          expect.objectContaining({
            failure_kind: "error",
            src: "https://www.sandbox.paypal.com/web-sdk/v6/core",
          })
        );
      });
    });

    it("uses teBraintree URL when env option is teBraintree", () =>
      testContext.instance.loadPayPalSDK({ env: "teBraintree" }).then(() => {
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: "https://www.braintree.stage.paypal.com/web-sdk/v6/core",
          forceScriptReload: true,
        });
      }));

    it("uses stage URL when env option is stage", () =>
      testContext.instance.loadPayPalSDK({ env: "stage" }).then(() => {
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: "https://www.msmaster.qa.paypal.com/web-sdk/v6/core",
          forceScriptReload: true,
        });
      }));

    it("falls back to default URL when env option is unknown", () => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      return testContext.instance
        .loadPayPalSDK({ env: "unknown-env" })
        .then(() => {
          expect(assets.loadScript).toHaveBeenCalledWith({
            src: "https://www.sandbox.paypal.com/web-sdk/v6/core",
            forceScriptReload: true,
          });
        });
    });

    it("falls back to default URL when options object is empty", () => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      return testContext.instance.loadPayPalSDK({}).then(() => {
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: "https://www.sandbox.paypal.com/web-sdk/v6/core",
          forceScriptReload: true,
        });
      });
    });
  });

  describe("startVaultInitiatedCheckout", () => {
    beforeEach(() => {
      testContext.options = {
        amount: "100.00",
        currency: "USD",
        vaultInitiatedCheckoutPaymentMethodToken: "fake-nonce",
      };
      testContext.client.request.mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com/redirect",
        },
      });

      jest
        .spyOn(testContext.paypalCheckoutV6, "tokenizePayment")
        .mockResolvedValue({
          nonce: "new-fake-nonce",
          type: "PayPalAccount",
        });

      jest
        .spyOn(testContext.paypalCheckoutV6, "_createPaymentResource")
        .mockResolvedValue({
          paymentResource: {
            redirectUrl: "https://example.com/redirect",
          },
        });
    });

    it("rejects if auth is already in progress", async () => {
      const firstAttempt =
        testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
          testContext.options
        );

      await expect(
        testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toMatchObject({
        code: "PAYPAL_CHECKOUT_V6_VIC_IN_PROGRESS",
        message: "Vault initiated checkout already in progress.",
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.client,
        "paypal-checkout-v6.vic.error.already-in-progress"
      );

      await firstAttempt;

      // can run again when auth is completed
      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );
    });

    it.each(["amount", "currency", "vaultInitiatedCheckoutPaymentMethodToken"])(
      "rejects with an error if %param is not present",
      async (param) => {
        delete testContext.options[param];

        await expect(
          testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
            testContext.options
          )
        ).rejects.toMatchObject({
          code: "PAYPAL_CHECKOUT_V6_VIC_PARAM_REQUIRED",
          message: `Required param ${param} is missing.`,
        });
      }
    );

    it.each(["amount", "currency", "vaultInitiatedCheckoutPaymentMethodToken"])(
      "rejects with an error if %param is null",
      async (param) => {
        testContext.options[param] = null;

        await expect(
          testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
            testContext.options
          )
        ).rejects.toMatchObject({
          code: "PAYPAL_CHECKOUT_V6_VIC_PARAM_REQUIRED",
          message: `Required param ${param} is missing.`,
        });
      }
    );

    it.each(["amount", "currency", "vaultInitiatedCheckoutPaymentMethodToken"])(
      "rejects with an error if %param is undefined",
      async (param) => {
        testContext.options[param] = undefined;

        await expect(
          testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
            testContext.options
          )
        ).rejects.toMatchObject({
          code: "PAYPAL_CHECKOUT_V6_VIC_PARAM_REQUIRED",
          message: `Required param ${param} is missing.`,
        });
      }
    );

    it.each(["amount", "currency", "vaultInitiatedCheckoutPaymentMethodToken"])(
      "rejects with an error if %param is an empty string",
      async (param) => {
        testContext.options[param] = "";

        await expect(
          testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
            testContext.options
          )
        ).rejects.toMatchObject({
          code: "PAYPAL_CHECKOUT_V6_VIC_PARAM_REQUIRED",
          message: `Required param ${param} is missing.`,
        });
      }
    );

    it("requests a payment resource with VIC token", async () => {
      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        testContext.paypalCheckoutV6._createPaymentResource
      ).toHaveBeenCalledTimes(1);
      expect(
        testContext.paypalCheckoutV6._createPaymentResource
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: "100.00",
          currency: "USD",
          vaultInitiatedCheckoutPaymentMethodToken: "fake-nonce",
          flow: "checkout",
          returnUrl: expect.stringContaining(
            "/redirect-frame.min.html?channel=service-id"
          ),
          cancelUrl: expect.stringContaining(
            "/cancel-frame.min.html?channel=service-id"
          ),
        })
      );
    });

    it("opens frame service and redirects", async () => {
      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(testContext.fakeFrameService.open).toHaveBeenCalledTimes(1);
      expect(testContext.fakeFrameService.open).toHaveBeenCalledWith(
        {},
        expect.any(Function)
      );
      expect(testContext.fakeFrameService.redirect).toHaveBeenCalledTimes(2);
      expect(testContext.fakeFrameService.redirect).toHaveBeenCalledWith(
        "https://example.com/redirect"
      );
      expect(testContext.fakeFrameService.redirect).toHaveBeenCalledWith(
        expect.stringContaining("/paypal-landing-frame.min.html")
      );
    });

    it("tokenizes data from frameservice", async () => {
      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        testContext.paypalCheckoutV6.tokenizePayment
      ).toHaveBeenCalledTimes(1);
      expect(testContext.paypalCheckoutV6.tokenizePayment).toHaveBeenCalledWith(
        {
          paymentToken: "token",
          payerID: "payer-id",
          paymentID: "payment-id",
          orderID: "order-id",
        }
      );
    });

    it("works when PayPal returns only paymentId (no orderId) for VIC", async () => {
      // Simulate PayPal VIC response with paymentId but no orderId
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          token: "EC-TOKEN123",
          PayerID: "PAYER123",
          paymentId: "PAYID-NH6NK6Y4PF14329T4986581G",
          // orderId is undefined for VIC flows
        })
      );

      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(testContext.paypalCheckoutV6.tokenizePayment).toHaveBeenCalledWith(
        {
          paymentToken: "EC-TOKEN123",
          payerID: "PAYER123",
          paymentID: "PAYID-NH6NK6Y4PF14329T4986581G",
          orderID: undefined,
        }
      );

      // Verify tokenizePayment was successfully called and resolved
      expect(
        testContext.paypalCheckoutV6.tokenizePayment
      ).toHaveBeenCalledTimes(1);
    });

    it("closes frame service and resolves data from tokenization", async () => {
      const data =
        await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
          testContext.options
        );

      expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
      expect(data.nonce).toBe("new-fake-nonce");
      expect(data.type).toBe("PayPalAccount");
    });

    it("sends analytic event for started", async () => {
      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.client,
        "paypal-checkout-v6.vic.started"
      );
    });

    it("sends analytic event for success", async () => {
      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.client,
        "paypal-checkout-v6.vic.succeeded"
      );
    });

    it("opens a modal backdrop in the background", async () => {
      const promise = testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeTruthy();

      await promise;

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("closes modal when user cancels", async () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync({
          code: "FRAME_SERVICE_FRAME_CLOSED",
        })
      );

      const promise = testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeTruthy();

      await expect(promise).rejects.toMatchObject({
        code: "PAYPAL_CHECKOUT_V6_VIC_CANCELED",
        message: "Customer closed PayPal popup before authorizing.",
      });

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("closes modal when startVaultInitiatedCheckout fails", async () => {
      testContext.paypalCheckoutV6.tokenizePayment.mockRejectedValue(
        new Error("tokenization failed")
      );

      const promise = testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeTruthy();

      await expect(promise).rejects.toThrow("tokenization failed");

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("can opt out of the modal", async () => {
      testContext.options.optOutOfModalBackdrop = true;
      const promise = testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();

      await promise;

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("clicking on the modal focuses the PayPal window", async () => {
      jest
        .spyOn(
          testContext.paypalCheckoutV6,
          "focusVaultInitiatedCheckoutWindow"
        )
        .mockImplementation();
      const promise = testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      const modal = document.querySelector(
        "[data-braintree-paypal-vault-initiated-checkout-modal]"
      );

      modal.click();

      expect(
        testContext.paypalCheckoutV6.focusVaultInitiatedCheckoutWindow
      ).toHaveBeenCalledTimes(1);

      await promise;
    });

    it("only creates the modal once", async () => {
      jest.spyOn(document, "createElement");

      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(document.createElement).toHaveBeenCalledTimes(1);

      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(document.createElement).toHaveBeenCalledTimes(1);
    });

    it("rejects when popup fails to open", async () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync({
          code: "FRAME_SERVICE_FRAME_OPEN_FAILED",
        })
      );

      await expect(
        testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toMatchObject({
        code: "PAYPAL_CHECKOUT_V6_VIC_POPUP_OPEN_FAILED",
        message:
          "PayPal popup failed to open, make sure to initiate in response to a user action.",
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.client,
        "paypal-checkout-v6.vic.failed.popup-not-opened"
      );
    });

    it("passes through additional options", async () => {
      testContext.options.intent = "authorize";
      testContext.options.lineItems = [
        {
          quantity: "1",
          unitAmount: "100.00",
          name: "Item",
          kind: "debit",
        },
      ];

      await testContext.paypalCheckoutV6.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        testContext.paypalCheckoutV6._createPaymentResource
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: "authorize",
          lineItems: [
            {
              quantity: "1",
              unitAmount: "100.00",
              name: "Item",
              kind: "debit",
            },
          ],
          returnUrl: expect.stringContaining("/redirect-frame.min.html"),
          cancelUrl: expect.stringContaining("/cancel-frame.min.html"),
        })
      );
    });
  });

  describe("closeVaultInitiatedCheckoutWindow", () => {
    beforeEach(() => {
      testContext.paypalCheckoutV6._vaultInitiatedCheckoutInProgress = false;
    });

    it("closes the frame service", async () => {
      await testContext.paypalCheckoutV6.closeVaultInitiatedCheckoutWindow();

      expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
    });

    it("sends analytics event if VIC is in progress", async () => {
      testContext.paypalCheckoutV6._vaultInitiatedCheckoutInProgress = true;

      await testContext.paypalCheckoutV6.closeVaultInitiatedCheckoutWindow();

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.client,
        "paypal-checkout-v6.vic.canceled-by-merchant"
      );
    });
  });

  describe("focusVaultInitiatedCheckoutWindow", () => {
    it("focuses the frame service", async () => {
      await testContext.paypalCheckoutV6.focusVaultInitiatedCheckoutWindow();

      expect(testContext.fakeFrameService.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe("_constructVaultCheckoutUrl", () => {
    it("constructs redirect frame URL", () => {
      const url =
        testContext.paypalCheckoutV6._constructVaultCheckoutUrl(
          "redirect-frame"
        );

      expect(url).toContain("/html/redirect-frame.min.html?channel=service-id");
    });

    it("constructs cancel frame URL", () => {
      const url =
        testContext.paypalCheckoutV6._constructVaultCheckoutUrl("cancel-frame");

      expect(url).toContain("/html/cancel-frame.min.html?channel=service-id");
    });
  });

  describe("teardown", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("removes script tag if exists", () => {
      const mockScript = document.createElement("script");

      document.head.appendChild(mockScript);
      testContext.instance._paypalScript = mockScript;

      return testContext.instance.teardown().then(() => {
        expect(mockScript.parentNode).toBeNull();
      });
    });

    it("sends analytics event", () => {
      return testContext.instance.teardown().then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.teardown"
        );
      });
    });
  });

  describe("_initializePayPalInstance", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      window.paypal = {
        createInstance: jest.fn().mockResolvedValue({ mockInstance: true }),
      };

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("creates and caches a promise when instance and promise don't exist", () => {
      testContext.instance._initializePayPalInstance("checkout");

      expect(testContext.instance._checkoutInstancePromise).toBeDefined();
      expect(testContext.instance._checkoutInstancePromise).toBeInstanceOf(
        Promise
      );
    });

    it("does nothing when instance already exists", () => {
      testContext.instance._paypalInstance = { existing: true };

      testContext.instance._initializePayPalInstance("checkout");

      expect(testContext.instance._checkoutInstancePromise).toBeUndefined();
    });

    it("does nothing when promise already exists", () => {
      testContext.instance._checkoutInstancePromise = Promise.resolve({
        existing: true,
      });

      testContext.instance._initializePayPalInstance("checkout");

      // Should not create a new promise
      expect(window.paypal.createInstance).not.toHaveBeenCalled();
    });

    it("does nothing when PayPal SDK is not available", () => {
      delete window.paypal;

      testContext.instance._initializePayPalInstance("checkout");

      expect(testContext.instance._checkoutInstancePromise).toBeUndefined();
    });

    it("stores resolved instance in the instance key", () => {
      testContext.instance._initializePayPalInstance("vault");

      return testContext.instance._vaultInstancePromise.then(() => {
        expect(testContext.instance._paypalVaultInstance).toEqual({
          mockInstance: true,
        });
      });
    });

    it("configures correct components for each instance type", () => {
      testContext.instance._initializePayPalInstance("messages");

      return testContext.instance._messagesInstancePromise.then(() => {
        expect(window.paypal.createInstance).toHaveBeenCalledWith(
          expect.objectContaining({
            components: ["paypal-messages"],
          })
        );
      });
    });

    it("clears promise cache on rejection to allow retry", () => {
      var error = new Error("SDK initialization failed");

      window.paypal.createInstance = jest.fn().mockRejectedValue(error);

      testContext.instance._initializePayPalInstance("messages");

      return testContext.instance._messagesInstancePromise.catch(() => {
        // Promise should be cleared after rejection
        expect(testContext.instance._messagesInstancePromise).toBeNull();

        // Reset mock to succeed on retry
        window.paypal.createInstance = jest.fn().mockResolvedValue({
          mockInstance: true,
        });

        // Should be able to retry after clearing
        testContext.instance._initializePayPalInstance("messages");

        expect(testContext.instance._messagesInstancePromise).toBeDefined();
        expect(testContext.instance._messagesInstancePromise).toBeInstanceOf(
          Promise
        );
      });
    });
  });

  describe("createMessages", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      testContext.mockMessagesInstance = {
        render: jest.fn(),
      };
      testContext.mockPayPalInstance = {
        createPayPalMessages: jest
          .fn()
          .mockReturnValue(testContext.mockMessagesInstance),
      };

      window.paypal = {
        createInstance: jest
          .fn()
          .mockResolvedValue(testContext.mockPayPalInstance),
      };

      // Clear analytics mock to avoid false positives from earlier tests
      analytics.sendEvent.mockClear();

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("creates a PayPal instance with paypal-messages component", () => {
      return testContext.instance
        .createMessages({
          buyerCountry: "US",
          currencyCode: "USD",
        })
        .then(() => {
          expect(window.paypal.createInstance).toHaveBeenCalledWith(
            expect.objectContaining({
              components: ["paypal-messages"],
            })
          );
        });
    });

    it("calls createPayPalMessages on the PayPal SDK instance", () => {
      const options = {
        buyerCountry: "US",
        currencyCode: "USD",
      };

      return testContext.instance.createMessages(options).then(() => {
        expect(
          testContext.mockPayPalInstance.createPayPalMessages
        ).toHaveBeenCalledWith(options);
      });
    });

    it("returns the messages instance from createPayPalMessages", () => {
      return testContext.instance
        .createMessages({
          buyerCountry: "US",
          currencyCode: "USD",
        })
        .then((messagesInstance) => {
          expect(messagesInstance).toBe(testContext.mockMessagesInstance);
        });
    });

    it("reuses PayPal SDK instance on subsequent calls", () => {
      return testContext.instance
        .createMessages({ buyerCountry: "US", currencyCode: "USD" })
        .then(() => {
          window.paypal.createInstance.mockClear();

          return testContext.instance.createMessages({
            buyerCountry: "GB",
            currencyCode: "GBP",
          });
        })
        .then(() => {
          expect(window.paypal.createInstance).not.toHaveBeenCalled();
          expect(
            testContext.mockPayPalInstance.createPayPalMessages
          ).toHaveBeenCalledTimes(2);
        });
    });

    it("deduplicates concurrent calls to createMessages", () => {
      // Call createMessages twice concurrently without waiting
      const promise1 = testContext.instance.createMessages({
        buyerCountry: "US",
        currencyCode: "USD",
      });
      const promise2 = testContext.instance.createMessages({
        buyerCountry: "GB",
        currencyCode: "GBP",
      });

      return Promise.all([promise1, promise2]).then(() => {
        // Should only create one PayPal SDK instance despite concurrent calls
        expect(window.paypal.createInstance).toHaveBeenCalledTimes(1);
        // Should call createPayPalMessages twice (once per createMessages call)
        expect(
          testContext.mockPayPalInstance.createPayPalMessages
        ).toHaveBeenCalledTimes(2);
      });
    });

    it("allows retry after SDK initialization failure", () => {
      var error = new Error("Network error");
      var createInstanceMock = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(testContext.mockPayPalInstance);

      // Create a fresh instance for this test
      var freshInstance = new PayPalCheckoutV6({});

      window.paypal.createInstance = createInstanceMock;

      return freshInstance
        ._initialize({ client: testContext.client })
        .then(() => {
          return freshInstance.createMessages({
            buyerCountry: "US",
            currencyCode: "USD",
          });
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err.message).toContain("PayPal");

          // Verify the promise was cleared
          expect(freshInstance._messagesInstancePromise).toBeNull();

          // Retry should succeed
          return freshInstance.createMessages({
            buyerCountry: "US",
            currencyCode: "USD",
          });
        })
        .then((messagesInstance) => {
          expect(messagesInstance).toBe(testContext.mockMessagesInstance);
          // Should have attempted createInstance twice (once failed, once succeeded)
          expect(createInstanceMock).toHaveBeenCalledTimes(2);
        });
    });

    it("sends analytics events when creating messages", () => {
      return testContext.instance
        .createMessages({
          buyerCountry: "US",
          currencyCode: "USD",
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-messages.started"
          );
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-messages.succeeded"
          );
        });
    });

    it("rejects if PayPal SDK is not loaded", () => {
      delete window.paypal;

      return testContext.instance
        .createMessages({
          buyerCountry: "US",
          currencyCode: "USD",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_SDK_NOT_INITIALIZED");
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-messages.failed"
          );
        });
    });

    it("rejects if PayPal SDK instance does not support createPayPalMessages", () => {
      window.paypal.createInstance.mockResolvedValue({});

      return testContext.instance
        .createMessages({
          buyerCountry: "US",
          currencyCode: "USD",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_SDK_NOT_INITIALIZED");
        });
    });

    it("rejects with BraintreeError on PayPal SDK error", () => {
      testContext.mockPayPalInstance.createPayPalMessages.mockImplementation(
        function () {
          throw new Error("SDK error");
        }
      );

      return testContext.instance
        .createMessages({
          amount: 99.99,
          placement: "product",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_MESSAGES_CREATION_FAILED");
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-messages.failed"
          );
        });
    });

    it("passes style options to createPayPalMessages", () => {
      const options = {
        amount: 99.99,
        placement: "product",
        style: {
          layout: "flex",
          logo: {
            type: "inline",
          },
        },
      };

      return testContext.instance.createMessages(options).then(() => {
        expect(
          testContext.mockPayPalInstance.createPayPalMessages
        ).toHaveBeenCalledWith(options);
      });
    });
  });

  describe("createOneTimePaymentSession", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      testContext.paypalInstance = {
        createPayPalOneTimePaymentSession: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
        createPayPalCreditOneTimePaymentSession: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
      };
      testContext.instance._paypalInstance = testContext.paypalInstance;

      window.paypal = {
        createInstance: jest.fn().mockResolvedValue(testContext.paypalInstance),
      };

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("returns a session object", () => {
      const session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(typeof session.start).toBe("function");
    });

    it("requires amount option", () => {
      expect(() => {
        testContext.instance.createOneTimePaymentSession({
          currency: "USD",
          onApprove: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("requires currency option", () => {
      expect(() => {
        testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          onApprove: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("requires onApprove callback", () => {
      expect(() => {
        testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
        });
      }).toThrow(BraintreeError);
    });

    it("throws error when both shippingCallbackUrl and onShippingAddressChange are provided", () => {
      expect(() => {
        testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          shippingCallbackUrl: "https://example.com/shipping-callback",
          onShippingAddressChange: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("throws error when both shippingCallbackUrl and onShippingOptionsChange are provided", () => {
      expect(() => {
        testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          shippingCallbackUrl: "https://example.com/shipping-callback",
          onShippingOptionsChange: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("allows shippingCallbackUrl without client-side shipping callbacks", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
        shippingCallbackUrl: "https://example.com/shipping-callback",
      });

      return session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              shippingCallbackUrl: "https://example.com/shipping-callback",
            }),
          })
        );
      });
    });

    it("sets flow to checkout", () => {
      testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(testContext.instance._flow).toBe("checkout");
    });

    it("supports offerCredit option", () => {
      const session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        offerCredit: true,
        onApprove: jest.fn(),
      });

      expect(testContext.instance._sessionType).toBe("paypal-credit");
    });

    it("defaults intent to capture", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              intent: "sale",
            }),
          })
        );
        done();
      });
    });

    it("sends analytics event when session is created", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      session
        .start()
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.payment.started"
          );
          done();
        })
        .catch(done);
    });

    describe("direct-app-switch URL validation", () => {
      it("rejects when returnUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when cancelUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          returnUrl: "https://example.com/return",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when both URLs are missing for direct-app-switch mode", () => {
        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
          });
      });

      it("does not reject for direct-app-switch mode when both URLs are provided", (done) => {
        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest
              .fn()
              .mockResolvedValue({ redirectURL: "https://paypal.com" }),
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          returnUrl: "https://example.com/return",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            done();
          })
          .catch(done);
      });

      it("does not validate URLs for non-app-switch presentation modes", (done) => {
        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest.fn().mockResolvedValue({}),
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            done();
          })
          .catch(done);
      });

      it("does not validate URLs for auto presentation mode", (done) => {
        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest.fn().mockResolvedValue({}),
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start()
          .then(() => {
            done();
          })
          .catch(done);
      });
    });

    describe("session callbacks", () => {
      it("does not include onShippingAddressChange when user does not provide one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onApprove).toBeDefined();
            expect(capturedCallbacks.onCancel).toBeDefined();
            expect(
              Object.prototype.hasOwnProperty.call(
                capturedCallbacks,
                "onShippingAddressChange"
              )
            ).toBe(false);
            done();
          })
          .catch(done);
      });

      it("does not include onError when user does not provide one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(
              Object.prototype.hasOwnProperty.call(capturedCallbacks, "onError")
            ).toBe(false);
            done();
          })
          .catch(done);
      });

      it("includes onShippingAddressChange when user provides one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onShippingAddressChange: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onShippingAddressChange).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("includes onError when user provides one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onError: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onError).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("does not include onShippingOptionsChange when user does not provide one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onApprove).toBeDefined();
            expect(capturedCallbacks.onCancel).toBeDefined();
            expect(
              Object.prototype.hasOwnProperty.call(
                capturedCallbacks,
                "onShippingOptionsChange"
              )
            ).toBe(false);
            done();
          })
          .catch(done);
      });

      it("includes onShippingOptionsChange when user provides one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onShippingOptionsChange: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onShippingOptionsChange).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("invokes the user-provided onShippingOptionsChange and passes through return value", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const mockShippingData = {
          errors: {},
          orderId: "ORDER123",
          selectedShippingOption: {
            id: "express",
            label: "Express Shipping",
            amount: { currencyCode: "USD", value: "10.00" },
            type: "SHIPPING",
            selected: true,
          },
        };
        const mockReturnValue = Promise.resolve({ success: true });
        const userCallback = jest.fn().mockReturnValue(mockReturnValue);

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onShippingOptionsChange: userCallback,
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            const result =
              capturedCallbacks.onShippingOptionsChange(mockShippingData);

            expect(userCallback).toHaveBeenCalledWith(mockShippingData);
            expect(result).toBe(mockReturnValue);
            done();
          })
          .catch(done);
      });

      it("always includes onCancel for analytics tracking", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onCancel).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("defaults commit to true when not specified", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.commit).toBe(true);
            done();
          })
          .catch(done);
      });

      it("passes commit: true when explicitly set", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          commit: true,
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.commit).toBe(true);
            done();
          })
          .catch(done);
      });

      it("passes commit: false when explicitly set", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createOneTimePaymentSession({
          amount: "10.00",
          currency: "USD",
          commit: false,
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.commit).toBe(false);
            done();
          })
          .catch(done);
      });
    });
  });

  describe("Transient Activation - Synchronous Start", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      testContext.paypalInstance = {
        createPayPalOneTimePaymentSession: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
        createPayPalCreditOneTimePaymentSession: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
        createPayPalBillingAgreementWithoutPurchase: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
        createPayPalCreditBillingAgreementWithoutPurchase: jest
          .fn()
          .mockReturnValue({
            start: jest.fn().mockResolvedValue(),
          }),
      };

      window.paypal = {
        createInstance: jest.fn().mockResolvedValue(testContext.paypalInstance),
      };

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    afterEach(() => {
      delete window.paypal;
    });

    it("creates eager checkout instance promise when session is created", () => {
      testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      // Instance creation should have started since window.paypal exists
      expect(testContext.instance._checkoutInstancePromise).toBeDefined();
    });

    it("creates eager vault instance promise when billing agreement session is created", () => {
      testContext.instance.createBillingAgreementSession({
        billingAgreementDescription: "Monthly subscription",
        onApprove: jest.fn(),
      });

      // Instance creation should have started since window.paypal exists
      expect(testContext.instance._vaultInstancePromise).toBeDefined();
    });

    it("does not create eager instance if window.paypal is not loaded", () => {
      delete window.paypal;

      testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      // Instance creation should not start if SDK isn't loaded
      expect(testContext.instance._checkoutInstancePromise).toBeUndefined();
    });

    it("calls PayPal session.start() synchronously when checkout instance is ready", () => {
      // Pre-set the instance as ready (simulating SDK already loaded and instance created)
      testContext.instance._paypalInstance = testContext.paypalInstance;

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      var mockSession = {
        start: jest.fn().mockResolvedValue(),
      };

      testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
        .fn()
        .mockReturnValue(mockSession);

      var session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      // Start the session - this should be synchronous path
      session.start();

      // session.start on PayPal SDK should be called immediately (synchronously)
      expect(mockSession.start).toHaveBeenCalledTimes(1);

      // Second arg should be a Promise (the order creation promise)
      var secondArg = mockSession.start.mock.calls[0][1];

      expect(secondArg).toBeInstanceOf(Promise);
    });

    it("calls PayPal session.start() synchronously when vault instance is ready", () => {
      // Pre-set the vault instance as ready
      testContext.instance._paypalVaultInstance = testContext.paypalInstance;

      jest.spyOn(testContext.instance, "createPayment").mockResolvedValue({
        billingToken: "BA-TOKEN-123",
      });

      var mockSession = {
        start: jest.fn().mockResolvedValue(),
      };

      testContext.paypalInstance.createPayPalBillingAgreementWithoutPurchase =
        jest.fn().mockReturnValue(mockSession);

      var session = testContext.instance.createBillingAgreementSession({
        billingAgreementDescription: "Monthly subscription",
        onApprove: jest.fn(),
      });

      // Start the session - this should be synchronous path
      session.start();

      // session.start on PayPal SDK should be called immediately
      expect(mockSession.start).toHaveBeenCalledTimes(1);

      // Second arg should be a Promise (the billing token promise)
      var secondArg = mockSession.start.mock.calls[0][1];

      expect(secondArg).toBeInstanceOf(Promise);
    });

    it("returns INSTANCE_NOT_READY error when start() called without SDK loaded", () => {
      delete window.paypal;

      // Create session (no eager instance creation happens since SDK not loaded)
      var session = testContext.instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      // Neither sync path nor async path available
      testContext.instance._paypalInstance = null;
      testContext.instance._checkoutInstancePromise = null;

      return session.start().catch(function (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("PAYPAL_CHECKOUT_V6_INSTANCE_NOT_READY");
      });
    });
  });

  describe("_verifyConsistentCurrency", () => {
    beforeEach(async () => {
      testContext.instance = new PayPalCheckoutV6({});

      await testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("returns true when currency is not provided", () => {
      const options = {
        amount: "10.00",
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns true when no currency-related fields are present", () => {
      const options = {
        amount: "10.00",
        currency: "USD",
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns true when shipping options currencies match base currency", () => {
      const options = {
        amount: "10.00",
        currency: "USD",
        shippingOptions: [
          {
            id: "standard",
            label: "Standard",
            selected: true,
            type: "SHIPPING",
            amount: {
              currency: "USD",
              value: "0.00",
            },
          },
          {
            id: "express",
            label: "Express",
            selected: false,
            type: "SHIPPING",
            amount: {
              currency: "USD",
              value: "5.00",
            },
          },
        ],
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns false when any shipping option currency doesn't match", () => {
      const options = {
        amount: "10.00",
        currency: "USD",
        shippingOptions: [
          {
            id: "standard",
            label: "Standard",
            selected: true,
            type: "SHIPPING",
            amount: {
              currency: "USD",
              value: "0.00",
            },
          },
          {
            id: "express",
            label: "Express",
            selected: false,
            type: "SHIPPING",
            amount: {
              currency: "EUR",
              value: "5.00",
            },
          },
        ],
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(false);
    });

    it("returns true when line items have no currency-specific fields", () => {
      const options = {
        amount: "10.00",
        currency: "USD",
        lineItems: [
          {
            quantity: "1",
            unitAmount: "10.00",
            name: "Item",
            kind: "debit",
          },
        ],
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns true when line items currencies match base currency", () => {
      const options = {
        amount: "12.00",
        currency: "USD",
        lineItems: [
          {
            quantity: "1",
            unitAmount: "10.00",
            unitTaxAmount: "2.00",
            unitTaxAmountCurrency: "USD",
            name: "Item",
            kind: "debit",
          },
        ],
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns true when mixing line items with and without unitTaxAmountCurrency", () => {
      const options = {
        amount: "20.00",
        currency: "USD",
        lineItems: [
          {
            quantity: "1",
            unitAmount: "10.00",
            name: "Item without tax currency",
            kind: "debit",
          },
          {
            quantity: "1",
            unitAmount: "8.00",
            unitTaxAmount: "2.00",
            unitTaxAmountCurrency: "USD",
            name: "Item with tax currency",
            kind: "debit",
          },
        ],
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns false when any line item currency doesn't match", () => {
      const options = {
        amount: "12.00",
        currency: "USD",
        lineItems: [
          {
            quantity: "1",
            unitAmount: "10.00",
            unitTaxAmount: "2.00",
            unitTaxAmountCurrency: "EUR",
            name: "Item",
            kind: "debit",
          },
        ],
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(false);
    });

    it("returns true when amount breakdown has no currency-specific fields", () => {
      const options = {
        amount: "15.00",
        currency: "USD",
        amountBreakdown: {
          itemTotal: "10.00",
          shipping: "5.00",
        },
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns true when amount breakdown currencies match base currency", () => {
      const options = {
        amount: "15.00",
        currency: "USD",
        amountBreakdown: {
          itemTotal: "10.00",
          shipping: "5.00",
          shippingCurrency: "USD",
          handlingCurrency: "USD",
        },
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("returns false when any amount breakdown currency doesn't match", () => {
      const options = {
        amount: "15.00",
        currency: "USD",
        amountBreakdown: {
          itemTotal: "10.00",
          shipping: "5.00",
          shippingCurrency: "EUR",
        },
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(false);
    });

    it("validates all components together correctly", () => {
      const options = {
        amount: "15.00",
        currency: "USD",
        shippingOptions: [
          {
            id: "express",
            label: "Express",
            type: "SHIPPING",
            amount: {
              currency: "USD",
              value: "5.00",
            },
          },
        ],
        lineItems: [
          {
            quantity: "1",
            unitAmount: "10.00",
            unitTaxAmount: "2.00",
            unitTaxAmountCurrency: "USD",
            name: "Item",
            kind: "debit",
          },
        ],
        amountBreakdown: {
          itemTotal: "10.00",
          shipping: "5.00",
          shippingCurrency: "USD",
        },
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(true);
    });

    it("detects mismatches across any components", () => {
      const options = {
        amount: "15.00",
        currency: "USD",
        shippingOptions: [
          {
            id: "express",
            label: "Express",
            type: "SHIPPING",
            amount: {
              currency: "USD",
              value: "5.00",
            },
          },
        ],
        lineItems: [
          {
            quantity: "1",
            unitAmount: "10.00",
            name: "Item",
            kind: "debit",
          },
        ],
        amountBreakdown: {
          itemTotal: "10.00",
          shipping: "5.00",
          shippingCurrency: "EUR",
        },
      };

      const result = testContext.instance._verifyConsistentCurrency(options);

      expect(result).toBe(false);
    });
  });

  describe("tokenizePayment", function () {
    beforeEach(function () {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("requires payerID", () => {
      return testContext.instance
        .tokenizePayment({
          orderID: "ORDER123",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_MISSING_TOKENIZATION_DATA");
        });
    });

    it("requires orderID", () => {
      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_MISSING_TOKENIZATION_DATA");
        });
    });

    it("accepts paymentID as alternative to orderID (for VIC flows)", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          paymentID: "PAYID-123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "payment_methods/paypal_accounts",
              method: "post",
              data: expect.objectContaining({
                paypalAccount: expect.objectContaining({
                  paymentToken: "PAYID-123",
                  payerId: "PAYER123",
                  correlationId: "PAYID-123",
                }),
              }),
            })
          );
        });
    });

    it("accepts camelCase paymentId as alternative to orderID", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerId: "PAYER123",
          paymentId: "PAYID-123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "payment_methods/paypal_accounts",
              method: "post",
              data: expect.objectContaining({
                paypalAccount: expect.objectContaining({
                  paymentToken: "PAYID-123",
                  payerId: "PAYER123",
                  correlationId: "PAYID-123",
                }),
              }),
            })
          );
        });
    });

    it("prefers paymentID over orderID when both provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
          paymentID: "PAYID-123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "payment_methods/paypal_accounts",
              method: "post",
              data: expect.objectContaining({
                paypalAccount: expect.objectContaining({
                  paymentToken: "PAYID-123",
                  payerId: "PAYER123",
                  correlationId: "ORDER123",
                }),
              }),
            })
          );
        });
    });

    it("accepts camelCase payerId from onApprove payload", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerId: "PAYER123",
          orderId: "ORDER123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "payment_methods/paypal_accounts",
              method: "post",
              data: expect.objectContaining({
                paypalAccount: expect.objectContaining({
                  paymentToken: "ORDER123",
                  payerId: "PAYER123",
                  correlationId: "ORDER123",
                }),
              }),
            })
          );
        });
    });

    it("prefers uppercase payerID/orderID over camelCase", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "UPPERCASE_PAYER",
          orderID: "UPPERCASE_ORDER",
          payerId: "lowercase_payer",
          orderId: "lowercase_order",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "payment_methods/paypal_accounts",
              method: "post",
              data: expect.objectContaining({
                paypalAccount: expect.objectContaining({
                  paymentToken: "UPPERCASE_ORDER",
                  payerId: "UPPERCASE_PAYER",
                  correlationId: "UPPERCASE_ORDER",
                }),
              }),
            })
          );
        });
    });

    it("sends tokenization request to client", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith({
            endpoint: "payment_methods/paypal_accounts",
            method: "post",
            data: expect.any(Object),
          });
        });
    });

    it("sends analytics event on tokenization start", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            testContext.instance._clientPromise,
            "paypal-checkout-v6.tokenize-payment.started",
            expect.any(Object)
          );
        });
    });

    it("sends analytics event on tokenization success", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            testContext.instance._clientPromise,
            "paypal-checkout-v6.tokenize-payment.success",
            expect.any(Object)
          );
        });
    });

    it("returns formatted payload with nonce", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            type: "PayPalAccount",
            details: {
              email: "test@example.com",
              payerInfo: {
                firstName: "Test",
                lastName: "User",
                email: "test@example.com",
              },
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then((payload) => {
          expect(payload.nonce).toBe("nonce-123");
          expect(payload.type).toBe("PayPalAccount");
          expect(payload.details.firstName).toBe("Test");
        });
    });

    it("sends credit.accepted event if creditFinancingOffered present", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
              creditFinancingOffered: {
                totalCost: {
                  value: "100.00",
                  currency: "USD",
                },
              },
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            testContext.instance._clientPromise,
            "paypal-checkout-v6.credit.accepted",
            expect.any(Object)
          );
        });
    });

    it("does not resolve with creditFinancingOffered when not available", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            type: "PayPalAccount",
            details: {
              email: "test@example.com",
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then((payload) => {
          expect(payload.details.creditFinancingOffered).toBeUndefined();
        });
    });

    it("resolves with blank account details if unavailable", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            type: "PayPalAccount",
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then((payload) => {
          expect(payload.nonce).toBe("nonce-123");
          expect(payload.type).toBe("PayPalAccount");
          expect(payload.details).toEqual({});
        });
    });

    it("resolves with account details from payerInfo if available", () => {
      const accountDetails = {
        payerInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            type: "PayPalAccount",
            details: accountDetails,
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then((payload) => {
          expect(payload.details.firstName).toBe("John");
          expect(payload.details.lastName).toBe("Doe");
          expect(payload.details.email).toBe("john@example.com");
        });
    });

    it("rejects with BraintreeError if non-Braintree error comes back", () => {
      const error = new Error("Network error");

      jest.spyOn(testContext.client, "request").mockRejectedValue(error);

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_TOKENIZATION_FAILED");
          expect(err.details.originalError).toBe(error);
        });
    });

    it("rejects with the error if client error is BraintreeError", () => {
      const btError = new BraintreeError({
        type: "MERCHANT",
        code: "SOME_CODE",
        message: "Some message",
      });

      jest.spyOn(testContext.client, "request").mockRejectedValue(btError);

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBe(btError);
        });
    });

    describe("vault flow", () => {
      it("tokenizes billing agreement with billing token", () => {
        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "vault-nonce-123",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            billingToken: "BA-APPROVED-TOKEN",
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    billingAgreementToken: "BA-APPROVED-TOKEN",
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("vault-nonce-123");
          });
      });

      it("uses billingAgreementToken when both orderID and billingToken are present", () => {
        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "vault-nonce-456",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
                implicitlyVaultedPaymentMethodToken: "IVPMT-TOKEN-123",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            payerID: "PAYER123",
            orderID: "ORDER123",
            billingToken: "BA-TOKEN-789",
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    billingAgreementToken: "BA-TOKEN-789",
                    paymentToken: "ORDER123",
                    payerId: "PAYER123",
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("vault-nonce-456");
            expect(payload.implicitlyVaultedPaymentMethodToken).toBe(
              "IVPMT-TOKEN-123"
            );
          });
      });

      it("respects vault: false option for billing agreements", () => {
        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "vault-nonce-no-vault",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            billingToken: "BA-TOKEN-NO-VAULT",
            vault: false,
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    billingAgreementToken: "BA-TOKEN-NO-VAULT",
                    vault: false,
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("vault-nonce-no-vault");
          });
      });

      it("includes correlationId in billing agreement tokenization when riskCorrelationId was set", () => {
        // Set riskCorrelationId on instance (as would happen during billing agreement creation)
        testContext.instance._riskCorrelationId = "risk-correlation-id-789";

        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "vault-nonce-with-risk",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            billingToken: "BA-TOKEN-WITH-RISK",
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    billingAgreementToken: "BA-TOKEN-WITH-RISK",
                    correlationId: "risk-correlation-id-789",
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("vault-nonce-with-risk");
          });
      });

      it("uses billingToken as fallback for correlationId when riskCorrelationId is not set", () => {
        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "vault-nonce-fallback",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            billingToken: "BA-TOKEN-FALLBACK",
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    billingAgreementToken: "BA-TOKEN-FALLBACK",
                    correlationId: "BA-TOKEN-FALLBACK",
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("vault-nonce-fallback");
          });
      });
    });

    describe("checkout flow", () => {
      it("includes correlationId in one-time payment tokenization when riskCorrelationId was set", () => {
        // Set riskCorrelationId on instance (as would happen during payment creation)
        testContext.instance._riskCorrelationId =
          "risk-correlation-id-one-time";

        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "checkout-nonce-with-risk",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            payerID: "PAYER123",
            orderID: "ORDER-WITH-RISK",
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    paymentToken: "ORDER-WITH-RISK",
                    payerId: "PAYER123",
                    correlationId: "risk-correlation-id-one-time",
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("checkout-nonce-with-risk");
          });
      });

      it("uses orderID as fallback for correlationId when riskCorrelationId is not set", () => {
        jest.spyOn(testContext.client, "request").mockResolvedValue({
          paypalAccounts: [
            {
              nonce: "checkout-nonce-fallback",
              type: "PayPalAccount",
              details: {
                email: "buyer@example.com",
              },
            },
          ],
        });

        return testContext.instance
          .tokenizePayment({
            payerID: "PAYER456",
            orderID: "ORDER-FALLBACK",
          })
          .then((payload) => {
            expect(testContext.client.request).toHaveBeenCalledWith(
              expect.objectContaining({
                endpoint: "payment_methods/paypal_accounts",
                method: "post",
                data: expect.objectContaining({
                  paypalAccount: expect.objectContaining({
                    paymentToken: "ORDER-FALLBACK",
                    payerId: "PAYER456",
                    correlationId: "ORDER-FALLBACK",
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("checkout-nonce-fallback");
          });
      });
    });
  });

  describe("_createPaymentResource", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("sends create order request to backend", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith({
            endpoint: "paypal_hermes/create_payment_resource",
            method: "post",
            data: expect.objectContaining({
              amount: "10.00",
              currencyIsoCode: "USD",
            }),
          });
        });
    });

    it("uses default returnUrl and cancelUrl in payload when not provided", function () {
      var options = {
        amount: "10.00",
        currency: "USD",
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource(options)
        .then(function () {
          expect(testContext.client.request).toHaveBeenCalled();
          const requestData = testContext.client.request.mock.calls[0][0].data;
          expect(requestData.returnUrl).toBe(
            "https://www.paypal.com/checkoutnow/error"
          );
          expect(requestData.cancelUrl).toBe(
            "https://www.paypal.com/checkoutnow/error"
          );
        });
    });

    it("passes both returnUrl and cancelUrl to backend when both are provided", function () {
      var options = {
        amount: "10.00",
        currency: "USD",
        returnUrl: "https://example.com/return",
        cancelUrl: "https://example.com/cancel",
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource(options)
        .then(function () {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                returnUrl: "https://example.com/return",
                cancelUrl: "https://example.com/cancel",
              }),
            })
          );
        });
    });

    it("converts capture intent to sale", function () {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
          intent: "capture",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                intent: "sale",
              }),
            })
          );
        });
    });

    it("includes offerPaypalCredit when offerCredit is true", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
          offerCredit: true,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                offerPaypalCredit: true,
              }),
            })
          );
        });
    });

    it("uses displayName override when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
          displayName: "OVERRIDE NAME",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  brandName: "OVERRIDE NAME",
                }),
              }),
            })
          );
        });
    });

    it("sends analytics event on order creation", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-order.started"
          );
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-order.succeeded"
          );
        });
    });

    it("extracts order ID from redirect URL", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123&foo=bar",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.orderId).toBe("ORDER123");
        });
    });

    it("includes shippingCallbackUrl when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
          shippingCallbackUrl: "https://example.com/shipping-callback",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                shippingCallbackUrl: "https://example.com/shipping-callback",
              }),
            })
          );
        });
    });

    it("includes contactPreference when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
          contactPreference: "UPDATE_CONTACT_INFO",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                contactPreference: "UPDATE_CONTACT_INFO",
              }),
            })
          );
        });
    });

    it("spreads shippingAddressOverride properties onto payload", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      return testContext.instance
        ._createPaymentResource({
          amount: "10.00",
          currency: "USD",
          shippingAddressOverride: {
            recipientName: "Jane Recipient",
            recipientEmail: "jane@example.com",
            line1: "456 Gift Lane",
            city: "Seattle",
            state: "WA",
            postalCode: "98101",
            countryCode: "US",
          },
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                recipientName: "Jane Recipient",
                recipientEmail: "jane@example.com",
                line1: "456 Gift Lane",
                city: "Seattle",
                state: "WA",
                postalCode: "98101",
                countryCode: "US",
              }),
            })
          );
        });
    });
  });

  describe("updatePayment", function () {
    beforeEach(function () {
      testContext.instance = new PayPalCheckoutV6({});
      testContext.instance._contextId = "test-order-id";
      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("sends analytics event and resolves with response on success", function () {
      var expectedPayload = {
        amount: "15.00",
        currencyIsoCode: "USD",
        paymentId: "test-order-id",
        lineItems: [
          { name: "Item", quantity: "1", unitAmount: "15.00", kind: "debit" },
        ],
      };

      var mockResponse = {
        updates: { success: true },
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue(mockResponse);

      return testContext.instance
        .updatePayment({
          paymentId: "test-order-id",
          amount: "15.00",
          currency: "USD",
          lineItems: [
            { name: "Item", quantity: "1", unitAmount: "15.00", kind: "debit" },
          ],
        })
        .then(function (response) {
          expect(testContext.client.request).toHaveBeenCalledWith({
            endpoint: "paypal_hermes/patch_payment_resource",
            method: "post",
            data: expectedPayload,
          });

          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.update-payment.started"
          );

          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.update-payment.succeeded"
          );

          expect(response).toEqual({
            success: true,
            orderId: "test-order-id",
            updates: mockResponse.updates,
          });
        });
    });

    it("rejects with BraintreeError if required parameters are missing", function () {
      return testContext.instance
        .updatePayment({
          // Missing required parameters
        })
        .catch(function (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_INVALID_UPDATE_OPTIONS");
        });
    });

    it("rejects if payment ID does not match current context", function () {
      return testContext.instance
        .updatePayment({
          paymentId: "wrong-order-id",
          amount: "15.00",
          currency: "USD",
        })
        .catch(function (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_PAYMENT_NOT_FOUND");
        });
    });

    it("handles API errors and sends analytics event", function () {
      var mockError = new Error("API Error");

      jest.spyOn(testContext.client, "request").mockRejectedValue(mockError);

      return testContext.instance
        .updatePayment({
          paymentId: "test-order-id",
          amount: "15.00",
          currency: "USD",
        })
        .catch(function (err) {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.update-payment.failed"
          );

          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_UPDATE_FAILED");
        });
    });
  });
  describe("createBillingAgreementSession", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });
    it("creates a billing agreement session with required options", () => {
      const session = testContext.instance.createBillingAgreementSession({
        billingAgreementDescription: "Monthly subscription",
        onApprove: () => {},
        onCancel: () => {},
        onError: () => {},
      });

      expect(typeof session.start).toBe("function");
    });

    it("throws error if onApprove callback is missing", () => {
      expect(() => {
        testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
        });
      }).toThrow(BraintreeError);
    });

    it("sends analytics event when session is created", () => {
      testContext.instance.createBillingAgreementSession({
        billingAgreementDescription: "Monthly subscription",
        onApprove: () => {},
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.instance._clientPromise,
        "paypal-checkout-v6.session.vault.created"
      );
    });

    it("supports all plan types", () => {
      const planTypes = [
        "UNSCHEDULED",
        "RECURRING",
        "SUBSCRIPTION",
        "INSTALLMENTS",
      ];

      planTypes.forEach((planType) => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Test plan",
          planType: planType,
          onApprove: () => {},
        });

        expect(typeof session.start).toBe("function");
      });
    });

    it("supports vault-with-purchase flow with amount and currency", () => {
      const session = testContext.instance.createBillingAgreementSession({
        billingAgreementDescription: "Monthly subscription",
        amount: "10.00",
        currency: "USD",
        onApprove: () => {},
      });

      expect(typeof session.start).toBe("function");
    });

    it.each(["CONTINUE", "SETUP_NOW"])(
      "supports userAction option: %s",
      (userAction) => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Test plan",
          userAction: userAction,
          onApprove: () => {},
        });

        expect(typeof session.start).toBe("function");
      }
    );

    describe("session.start() integration", () => {
      let mockPayPalInstance, mockPayPalSession;

      beforeEach(() => {
        mockPayPalSession = {
          start: jest.fn().mockResolvedValue({ success: true }),
        };

        mockPayPalInstance = {
          createPayPalBillingAgreementWithoutPurchase: jest
            .fn()
            .mockReturnValue(mockPayPalSession),
          createPayPalCreditBillingAgreementWithoutPurchase: jest
            .fn()
            .mockReturnValue(mockPayPalSession),
        };

        window.paypal = {
          createInstance: jest.fn().mockResolvedValue(mockPayPalInstance),
        };

        jest
          .spyOn(testContext.instance, "createPayment")
          .mockResolvedValue("BA-TOKEN-123");

        jest
          .spyOn(testContext.instance, "_createPayPalInstance")
          .mockResolvedValue(mockPayPalInstance);
      });

      afterEach(() => {
        delete window.paypal;
      });

      it("throws error if PayPal SDK is not loaded", () => {
        delete window.paypal;

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
        });

        return session.start().catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_SDK_INITIALIZATION_FAILED");
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.sdk-not-loaded"
          );
        });
      });

      it("sends analytics events through the full flow", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.started"
          );
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.instance-created"
          );
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.session-created"
          );
        });
      });

      it("creates PayPal instance with billing agreements component", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(
            testContext.instance._createPayPalInstance
          ).toHaveBeenCalledWith({
            components: ["paypal-billing-agreements"],
          });
        });
      });

      it("creates billing agreement session with correct config", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
          onCancel: () => {},
          onError: () => {},
        });

        return session.start().then(() => {
          expect(
            mockPayPalInstance.createPayPalBillingAgreementWithoutPurchase
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              onApprove: expect.any(Function),
              onCancel: expect.any(Function),
              onError: expect.any(Function),
            })
          );
        });
      });

      it("calls createPayment with vault flow and options", () => {
        const planMetadata = {
          name: "Premium Plan",
          currencyIsoCode: "USD",
        };

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          planType: "SUBSCRIPTION",
          planMetadata: planMetadata,
          amount: "10.00",
          currency: "USD",
          userAction: "SETUP_NOW",
          onApprove: () => {},
        });

        return session.start().then(() => {
          var createPaymentArgs =
            testContext.instance.createPayment.mock.calls[0][0];

          expect(createPaymentArgs).toEqual(
            expect.objectContaining({
              flow: "vault",
              billingAgreementDescription: "Monthly subscription",
              planType: "SUBSCRIPTION",
              amount: "10.00",
              currency: "USD",
              userAction: "SETUP_NOW",
            })
          );
          expect(createPaymentArgs.returnUrl).toBeUndefined();
          expect(createPaymentArgs.cancelUrl).toBeUndefined();
        });
      });

      it("passes returnUrl and cancelUrl to createPayment", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          returnUrl: "https://merchant.com/success",
          cancelUrl: "https://merchant.com/cancel",
          onApprove: () => {},
        });

        return session.start().then(() => {
          var createPaymentArgs =
            testContext.instance.createPayment.mock.calls[0][0];

          expect(createPaymentArgs.returnUrl).toBe(
            "https://merchant.com/success"
          );
          expect(createPaymentArgs.cancelUrl).toBe(
            "https://merchant.com/cancel"
          );
        });
      });

      it("passes returnUrl and cancelUrl through to createPayment", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          returnUrl: "https://example.com/return",
          cancelUrl: "https://example.com/cancel",
          onApprove: () => {},
        });

        return session.start().then(() => {
          // Verify returnUrl and cancelUrl were passed through the chain
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              returnUrl: "https://example.com/return",
              cancelUrl: "https://example.com/cancel",
            })
          );
        });
      });

      it("passes presentation mode to PayPal session start", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          presentationMode: "popup",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(mockPayPalSession.start).toHaveBeenCalledWith(
            expect.objectContaining({ presentationMode: "popup" }),
            expect.any(Promise)
          );
        });
      });

      it("handles onApprove callback", () => {
        const onApproveMock = jest.fn().mockResolvedValue();
        const approveData = { billingToken: "BA-TOKEN-123" };

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: onApproveMock,
        });

        return session.start().then(() => {
          const sessionConfig =
            mockPayPalInstance.createPayPalBillingAgreementWithoutPurchase.mock
              .calls[0][0];

          return sessionConfig.onApprove(approveData).then(() => {
            expect(onApproveMock).toHaveBeenCalledWith(approveData);
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.client,
              "paypal-checkout-v6.create-billing-agreement-session.approved"
            );
          });
        });
      });

      it("handles onCancel callback", () => {
        const onCancelMock = jest.fn();
        const cancelData = { cancelled: true };

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
          onCancel: onCancelMock,
        });

        return session.start().then(() => {
          const sessionConfig =
            mockPayPalInstance.createPayPalBillingAgreementWithoutPurchase.mock
              .calls[0][0];

          sessionConfig.onCancel(cancelData);

          expect(onCancelMock).toHaveBeenCalledWith(cancelData);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.canceled"
          );
        });
      });

      it("handles onError callback", () => {
        const onErrorMock = jest.fn();
        const error = new Error("Payment failed");

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
          onError: onErrorMock,
        });

        return session.start().then(() => {
          const sessionConfig =
            mockPayPalInstance.createPayPalBillingAgreementWithoutPurchase.mock
              .calls[0][0];

          sessionConfig.onError(error);

          expect(onErrorMock).toHaveBeenCalledWith(error);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.failed"
          );
        });
      });

      it("handles errors during session creation", () => {
        const testError = new Error("Instance creation failed");

        testContext.instance._createPayPalInstance.mockRejectedValue(testError);

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
        });

        return session.start().catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe(
            "PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CREATION_FAILED"
          );
          expect(err.details.originalError).toBe(testError);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-session.failed"
          );
        });
      });

      it("supports vault-with-purchase flow with amount and currency", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          amount: "10.00",
          currency: "USD",
          planType: "SUBSCRIPTION",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              flow: "vault",
              amount: "10.00",
              currency: "USD",
              planType: "SUBSCRIPTION",
            })
          );
        });
      });

      it("supports offerCredit option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          offerCredit: true,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              offerCredit: true,
            })
          );
        });
      });

      it("calls createPayPalCreditBillingAgreementWithoutPurchase when offerCredit is true", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          offerCredit: true,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(
            mockPayPalInstance.createPayPalCreditBillingAgreementWithoutPurchase
          ).toHaveBeenCalled();
          expect(
            mockPayPalInstance.createPayPalBillingAgreementWithoutPurchase
          ).not.toHaveBeenCalled();
        });
      });

      it("calls createPayPalBillingAgreementWithoutPurchase when offerCredit is false", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          offerCredit: false,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(
            mockPayPalInstance.createPayPalBillingAgreementWithoutPurchase
          ).toHaveBeenCalled();
          expect(
            mockPayPalInstance.createPayPalCreditBillingAgreementWithoutPurchase
          ).not.toHaveBeenCalled();
        });
      });

      it("supports shipping address override", () => {
        const shippingAddress = {
          line1: "123 Main St",
          city: "San Francisco",
          state: "CA",
          postalCode: "94107",
          countryCode: "US",
        };

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          shippingAddressOverride: shippingAddress,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              shippingAddressOverride: shippingAddress,
            })
          );
        });
      });

      it("supports locale option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          locale: "fr_FR",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              locale: "fr_FR",
            })
          );
        });
      });

      it("supports landingPageType option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          landingPageType: "login",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              landingPageType: "login",
            })
          );
        });
      });

      it("supports enableShippingAddress option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          enableShippingAddress: true,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              enableShippingAddress: true,
            })
          );
        });
      });

      it("supports shippingAddressEditable option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          shippingAddressEditable: false,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              shippingAddressEditable: false,
            })
          );
        });
      });

      it("supports riskCorrelationId option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          riskCorrelationId: "risk-correlation-id-123",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              riskCorrelationId: "risk-correlation-id-123",
            })
          );
        });
      });

      it("supports displayName option", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          displayName: "Custom Merchant Name",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              displayName: "Custom Merchant Name",
            })
          );
        });
      });

      it("supports plan metadata with billing cycles", () => {
        const planMetadata = {
          name: "Premium Subscription",
          currencyIsoCode: "USD",
          billingCycles: [
            {
              billingFrequency: 1,
              billingFrequencyUnit: "MONTH",
              numberOfExecutions: 12,
              sequence: 1,
              trial: false,
              pricingScheme: {
                pricingModel: "FIXED",
                price: "29.99",
              },
            },
          ],
        };

        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          planType: "SUBSCRIPTION",
          planMetadata: planMetadata,
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              planType: "SUBSCRIPTION",
              planMetadata: expect.objectContaining({
                billingCycles: expect.any(Array),
              }),
            })
          );
        });
      });
    });

    describe("direct-app-switch URL validation", () => {
      it("rejects when returnUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when cancelUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          returnUrl: "https://example.com/return",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when both URLs are missing for direct-app-switch mode via session options", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          presentationMode: "direct-app-switch",
          onApprove: jest.fn(),
        });

        return session
          .start()
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
          });
      });
    });
  });

  describe("createPayLaterSession", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      testContext.paypalInstance = {
        createPayLaterOneTimePaymentSession: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
      };
      testContext.instance._paypalInstance = testContext.paypalInstance;

      window.paypal = {
        createInstance: jest.fn().mockResolvedValue(testContext.paypalInstance),
      };

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("throws an error if required options are missing", () => {
      expect(() => {
        testContext.instance.createPayLaterSession({
          amount: "100.00",
          currency: "USD",
        });
      }).toThrow(BraintreeError);

      expect(() => {
        testContext.instance.createPayLaterSession({
          currency: "USD",
          onApprove: jest.fn(),
        });
      }).toThrow(BraintreeError);

      expect(() => {
        testContext.instance.createPayLaterSession({
          amount: "100.00",
          onApprove: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("returns an object with a start method", () => {
      const session = testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(session).toHaveProperty("start");
      expect(typeof session.start).toBe("function");
    });

    it("sets session type to pay-later", () => {
      testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(testContext.instance._sessionType).toBe("pay-later");
    });

    it("sets flow to checkout", () => {
      testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(testContext.instance._flow).toBe("checkout");
    });

    it("sends analytics event when session is created", () => {
      testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        expect.anything(),
        "paypal-checkout-v6.session.checkout.created"
      );
    });

    it("sends analytics event for Pay Later offered", () => {
      testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        expect.anything(),
        "paypal-checkout-v6.pay-later.offered"
      );
    });

    it("calls createPayLaterOneTimePaymentSession on PayPal instance", (done) => {
      const session = testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      session
        .start()
        .then(() => {
          expect(
            testContext.paypalInstance.createPayLaterOneTimePaymentSession
          ).toHaveBeenCalled();
          done();
        })
        .catch(done);
    });

    it("supports line items", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const lineItems = [
        {
          quantity: "1",
          unitAmount: "100.00",
          name: "Product Name",
          kind: "debit",
        },
      ];

      const session = testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        lineItems: lineItems,
        onApprove: jest.fn(),
      });

      session
        .start()
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                lineItems: lineItems,
              }),
            })
          );
          done();
        })
        .catch(done);
    });

    it("supports shipping options", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const shippingOptions = [
        {
          id: "SHIP_FRE",
          label: "Free Shipping",
          type: "SHIPPING",
          selected: true,
          amount: {
            value: "0.00",
            currency: "USD",
          },
        },
      ];

      const session = testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        shippingOptions: shippingOptions,
        onApprove: jest.fn(),
      });

      session
        .start()
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                shippingOptions: shippingOptions,
              }),
            })
          );
          done();
        })
        .catch(done);
    });

    describe("direct-app-switch URL validation", () => {
      it("rejects when returnUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createPayLaterSession({
          amount: "100.00",
          currency: "USD",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when cancelUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createPayLaterSession({
          amount: "100.00",
          currency: "USD",
          returnUrl: "https://example.com/return",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("does not reject for direct-app-switch mode when both URLs are provided", (done) => {
        testContext.paypalInstance.createPayLaterOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest
              .fn()
              .mockResolvedValue({ redirectURL: "https://paypal.com" }),
          });

        const session = testContext.instance.createPayLaterSession({
          amount: "100.00",
          currency: "USD",
          returnUrl: "https://example.com/return",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            done();
          })
          .catch(done);
      });

      it("does not validate URLs for non-app-switch presentation modes", (done) => {
        testContext.paypalInstance.createPayLaterOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest.fn().mockResolvedValue({}),
          });

        const session = testContext.instance.createPayLaterSession({
          amount: "100.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "auto" })
          .then(() => {
            done();
          })
          .catch(done);
      });
    });

    it("sends pay-later.accepted event when tokenizing with creditFinancingOffered", () => {
      // Setup Pay Later session
      testContext.instance.createPayLaterSession({
        amount: "100.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce-123",
            details: {
              email: "test@example.com",
              creditFinancingOffered: {
                totalCost: {
                  value: "100.00",
                  currency: "USD",
                },
              },
            },
          },
        ],
      });

      return testContext.instance
        .tokenizePayment({
          payerID: "PAYER123",
          orderID: "ORDER123",
        })
        .then(() => {
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            testContext.instance._clientPromise,
            "paypal-checkout-v6.pay-later.accepted",
            expect.any(Object)
          );
        });
    });
  });

  describe("createCheckoutWithVaultSession", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      testContext.paypalInstance = {
        createPayPalOneTimePaymentSession: jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(),
        }),
      };
      testContext.instance._paypalInstance = testContext.paypalInstance;

      window.paypal = {
        createInstance: jest.fn().mockResolvedValue(testContext.paypalInstance),
      };

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("returns a session object", () => {
      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      expect(typeof session.start).toBe("function");
    });

    it("requires amount option", () => {
      expect(() => {
        testContext.instance.createCheckoutWithVaultSession({
          currency: "USD",
          onApprove: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("requires currency option", () => {
      expect(() => {
        testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          onApprove: jest.fn(),
        });
      }).toThrow(BraintreeError);
    });

    it("requires onApprove callback", () => {
      expect(() => {
        testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
        });
      }).toThrow(BraintreeError);
    });

    it("forces requestBillingAgreement to true", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              requestBillingAgreement: true,
            }),
          })
        );
        done();
      });
    });

    it("defaults intent to capture", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              intent: "sale",
            }),
          })
        );
        done();
      });
    });

    it("sends analytics event when session is created", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        onApprove: jest.fn(),
      });

      session
        .start()
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.checkout-with-vault.started"
          );
          done();
        })
        .catch(done);
    });

    it("supports billingAgreementDetails option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        billingAgreementDetails: {
          description: "Monthly subscription to Totally Real Products!",
        },
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              billingAgreementDetails: {
                description: "Monthly subscription to Totally Real Products!",
              },
            }),
          })
        );
        done();
      });
    });

    it("supports lineItems option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const lineItems = [
        {
          quantity: "1",
          unitAmount: "10.00",
          name: "Premium Subscription",
          kind: "debit",
        },
      ];

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        lineItems: lineItems,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              lineItems: lineItems,
            }),
          })
        );
        done();
      });
    });

    it("supports shippingOptions option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const shippingOptions = [
        {
          id: "standard",
          label: "Standard Shipping",
          selected: true,
          type: "SHIPPING",
          amount: {
            currency: "USD",
            value: "5.00",
          },
        },
      ];

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "15.00",
        currency: "USD",
        shippingOptions: shippingOptions,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              shippingOptions: shippingOptions,
            }),
          })
        );
        done();
      });
    });

    it("supports amountBreakdown option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const amountBreakdown = {
        itemTotal: "10.00",
        shipping: "5.00",
      };

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "15.00",
        currency: "USD",
        amountBreakdown: amountBreakdown,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              amountBreakdown: amountBreakdown,
            }),
          })
        );
        done();
      });
    });

    it("supports userAuthenticationEmail option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        userAuthenticationEmail: "buyer@example.com",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              payer_email: "buyer@example.com",
            }),
          })
        );
        done();
      });
    });

    it("supports intent option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        intent: "authorize",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              intent: "authorize",
            }),
          })
        );
        done();
      });
    });

    it("converts capture intent to sale", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        intent: "capture",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              intent: "sale",
            }),
          })
        );
        done();
      });
    });

    it("supports displayName option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        displayName: "My Custom Store Name",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                brandName: "My Custom Store Name",
              }),
            }),
          })
        );
        done();
      });
    });

    it("supports planType option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        planType: "SUBSCRIPTION",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              planType: "SUBSCRIPTION",
            }),
          })
        );
        done();
      });
    });

    it("supports planMetadata option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const planMetadata = {
        name: "Premium Plan",
        currencyIsoCode: "USD",
        billingCycles: [
          {
            billingFrequency: 1,
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: 12,
            sequence: 1,
            trial: false,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "29.99",
            },
          },
        ],
      };

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        planType: "SUBSCRIPTION",
        planMetadata: planMetadata,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              planType: "SUBSCRIPTION",
              planMetadata: expect.objectContaining({
                billingCycles: expect.any(Array),
              }),
            }),
          })
        );
        done();
      });
    });

    it("supports locale option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        locale: "fr_FR",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                localeCode: "fr_FR",
              }),
            }),
          })
        );
        done();
      });
    });

    it("supports landingPageType option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        landingPageType: "login",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                landingPageType: "login",
              }),
            }),
          })
        );
        done();
      });
    });

    it("supports userAction option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        userAction: "pay_now",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                userAction: "pay_now",
              }),
            }),
          })
        );
        done();
      });
    });

    it("sets noShipping to false when enableShippingAddress is true", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        enableShippingAddress: true,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                noShipping: "false",
              }),
            }),
          })
        );
        done();
      });
    });

    it("sets noShipping to true when enableShippingAddress is false", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        enableShippingAddress: false,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                noShipping: "true",
              }),
            }),
          })
        );
        done();
      });
    });

    it("sets addressOverride to true when shippingAddressEditable is false", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        shippingAddressEditable: false,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                addressOverride: true,
              }),
            }),
          })
        );
        done();
      });
    });

    it("sets addressOverride to false when shippingAddressEditable is true", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        shippingAddressEditable: true,
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experienceProfile: expect.objectContaining({
                addressOverride: false,
              }),
            }),
          })
        );
        done();
      });
    });

    it("supports riskCorrelationId option", (done) => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com?token=ORDER123",
        },
      });

      const session = testContext.instance.createCheckoutWithVaultSession({
        amount: "10.00",
        currency: "USD",
        riskCorrelationId: "risk-id-123",
        onApprove: jest.fn(),
      });

      session.start().then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              correlationId: "risk-id-123",
            }),
          })
        );
        done();
      });
    });

    describe("direct-app-switch URL validation", () => {
      it("rejects when returnUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when cancelUrl is missing for direct-app-switch mode", () => {
        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          returnUrl: "https://example.com/return",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
            expect(err.type).toBe("MERCHANT");
          });
      });

      it("rejects when both URLs are missing for direct-app-switch mode", () => {
        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        return session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            throw new Error("should not resolve");
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe(
              "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED"
            );
          });
      });

      it("does not reject for direct-app-switch mode when both URLs are provided", (done) => {
        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest
              .fn()
              .mockResolvedValue({ redirectURL: "https://paypal.com" }),
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          returnUrl: "https://example.com/return",
          cancelUrl: "https://example.com/cancel",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "direct-app-switch" })
          .then(() => {
            done();
          })
          .catch(done);
      });

      it("does not validate URLs for non-app-switch presentation modes", (done) => {
        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest.fn().mockResolvedValue({}),
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            done();
          })
          .catch(done);
      });

      it("does not validate URLs for auto presentation mode", (done) => {
        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockReturnValue({
            start: jest.fn().mockResolvedValue({}),
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start()
          .then(() => {
            done();
          })
          .catch(done);
      });
    });

    describe("session callbacks", () => {
      it("does not include onShippingAddressChange when user does not provide one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onApprove).toBeDefined();
            expect(capturedCallbacks.onCancel).toBeDefined();
            expect(
              Object.prototype.hasOwnProperty.call(
                capturedCallbacks,
                "onShippingAddressChange"
              )
            ).toBe(false);
            done();
          })
          .catch(done);
      });

      it("does not include onError when user does not provide one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(
              Object.prototype.hasOwnProperty.call(capturedCallbacks, "onError")
            ).toBe(false);
            done();
          })
          .catch(done);
      });

      it("includes onShippingAddressChange when user provides one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onShippingAddressChange: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onShippingAddressChange).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("includes onError when user provides one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onError: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onError).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("does not include onShippingOptionsChange when user does not provide one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onApprove).toBeDefined();
            expect(capturedCallbacks.onCancel).toBeDefined();
            expect(
              Object.prototype.hasOwnProperty.call(
                capturedCallbacks,
                "onShippingOptionsChange"
              )
            ).toBe(false);
            done();
          })
          .catch(done);
      });

      it("includes onShippingOptionsChange when user provides one", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onShippingOptionsChange: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onShippingOptionsChange).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("invokes the user-provided onShippingOptionsChange and passes through return value", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const mockShippingData = {
          errors: {},
          orderId: "ORDER456",
          selectedShippingOption: {
            id: "standard",
            label: "Standard Shipping",
            amount: { currencyCode: "USD", value: "5.00" },
            type: "SHIPPING",
            selected: true,
          },
        };
        const mockReturnValue = Promise.resolve({ success: true });
        const userCallback = jest.fn().mockReturnValue(mockReturnValue);

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
          onShippingOptionsChange: userCallback,
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            const result =
              capturedCallbacks.onShippingOptionsChange(mockShippingData);

            expect(userCallback).toHaveBeenCalledWith(mockShippingData);
            expect(result).toBe(mockReturnValue);
            done();
          })
          .catch(done);
      });

      it("always includes onCancel for analytics tracking", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.onCancel).toBeDefined();
            done();
          })
          .catch(done);
      });

      it("defaults commit to true when not specified", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.commit).toBe(true);
            done();
          })
          .catch(done);
      });

      it("passes commit: true when explicitly set", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          commit: true,
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.commit).toBe(true);
            done();
          })
          .catch(done);
      });

      it("passes commit: false when explicitly set", (done) => {
        let capturedCallbacks;

        testContext.paypalInstance.createPayPalOneTimePaymentSession = jest
          .fn()
          .mockImplementation((callbacks) => {
            capturedCallbacks = callbacks;
            return {
              start: jest.fn().mockResolvedValue({}),
            };
          });

        const session = testContext.instance.createCheckoutWithVaultSession({
          amount: "10.00",
          currency: "USD",
          commit: false,
          onApprove: jest.fn(),
        });

        session
          .start({ presentationMode: "popup" })
          .then(() => {
            expect(capturedCallbacks).toBeDefined();
            expect(capturedCallbacks.commit).toBe(false);
            done();
          })
          .catch(done);
      });
    });
  });

  describe("_buildBillingAgreementRequest", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("does not include planType when not provided", () => {
      var result = testContext.instance._buildBillingAgreementRequest({
        billingAgreementDescription: "Monthly subscription",
      });

      expect(result.planType).toBeUndefined();
    });

    it("includes planType when provided", () => {
      var result = testContext.instance._buildBillingAgreementRequest({
        billingAgreementDescription: "Monthly subscription",
        planType: "RECURRING",
      });

      expect(result.planType).toBe("RECURRING");
    });

    it("includes description when billingAgreementDescription is provided", () => {
      var result = testContext.instance._buildBillingAgreementRequest({
        billingAgreementDescription: "Monthly subscription",
      });

      expect(result.description).toBe("Monthly subscription");
    });

    it("includes planMetadata when provided", () => {
      var planMetadata = {
        name: "Premium Plan",
        currencyIsoCode: "USD",
        billingCycles: [
          {
            billingFrequency: 1,
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: 12,
            sequence: 1,
            trial: false,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "10.00",
            },
          },
        ],
      };
      var result = testContext.instance._buildBillingAgreementRequest({
        planType: "SUBSCRIPTION",
        planMetadata: planMetadata,
      });

      expect(result.planMetadata).toBeDefined();
      expect(result.planMetadata.name).toBe("Premium Plan");
      expect(result.planMetadata.currencyIsoCode).toBe("USD");
      expect(result.planMetadata.billingCycles).toHaveLength(1);
      expect(result.planMetadata.billingCycles[0].billingFrequency).toBe(1);
      expect(result.planMetadata.billingCycles[0].billingFrequencyUnit).toBe(
        "MONTH"
      );
      expect(result.planMetadata.billingCycles[0].numberOfExecutions).toBe(12);
      expect(result.planMetadata.billingCycles[0].sequence).toBe(1);
      expect(result.planMetadata.billingCycles[0].trial).toBe(false);
      expect(result.planMetadata.billingCycles[0].pricingScheme).toEqual({
        pricingModel: "FIXED",
        price: "10.00",
      });
    });

    it("includes amount and currency when provided", () => {
      var result = testContext.instance._buildBillingAgreementRequest({
        amount: "10.00",
        currency: "USD",
      });

      expect(result.amount).toBe("10.00");
      expect(result.currency).toBe("USD");
    });

    it("builds a minimal request with no optional fields", () => {
      var result = testContext.instance._buildBillingAgreementRequest({});

      expect(result).toEqual({});
    });
  });

  describe("_createBillingAgreementToken", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("makes request to setup_billing_agreement endpoint", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "paypal_hermes/setup_billing_agreement",
              method: "post",
            })
          );
        });
    });

    it("returns approval token ID", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
        })
        .then((result) => {
          expect(result.approvalTokenId).toBe("BA-TEST-TOKEN");
          expect(result.agreementSetup).toBeDefined();
        });
    });

    it("sends analytics event on success", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-token.succeeded"
          );
        });
    });

    it("sends analytics event on failure", () => {
      const error = new Error("API error");

      jest.spyOn(testContext.client, "request").mockRejectedValue(error);

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.create-billing-agreement-token.failed"
          );
        });
    });

    it("does not send planType and planMetadata if they do not exist", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
        })
        .then(() => {
          const requestData = testContext.client.request.mock.calls[0][0].data;

          expect(requestData.planType).toBeUndefined();
          expect(requestData.planMetadata).toBeUndefined();
        });
    });

    it("includes description in request when billingAgreementDescription is provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
        })
        .then(() => {
          const requestData = testContext.client.request.mock.calls[0][0].data;

          expect(requestData.description).toBe("Monthly subscription");
        });
    });

    it("includes description in request when description property is provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Premium subscription plan",
        })
        .then(() => {
          const requestData = testContext.client.request.mock.calls[0][0].data;

          expect(requestData.description).toBe("Premium subscription plan");
        });
    });

    it("does not send planMetadata if it does not exist", () => {
      const planType = "RECURRING";

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
          planType: planType,
        })
        .then(() => {
          const requestData = testContext.client.request.mock.calls[0][0].data;

          expect(requestData.planType).toBe(planType);
          expect(requestData.planMetadata).toBeUndefined();
        });
    });

    it("sends both planType and planMetadata when they exist", () => {
      const planType = "SUBSCRIPTION";
      const planMetadata = {
        name: "Premium Plan",
        currencyIsoCode: "USD",
        billingCycles: [
          {
            billingFrequency: 1,
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: 12,
            sequence: 1,
            trial: false,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "29.99",
            },
          },
        ],
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
          planType: planType,
          planMetadata: planMetadata,
        })
        .then(() => {
          const requestData = testContext.client.request.mock.calls[0][0].data;

          expect(requestData.planType).toBe(planType);
          expect(requestData.planMetadata).toBeDefined();
          expect(requestData.planMetadata.name).toBe("Premium Plan");
          expect(requestData.planMetadata.currencyIsoCode).toBe("USD");
        });
    });

    it("includes shipping address override in request", () => {
      const shippingAddress = {
        line1: "123 Main St",
        line2: "Apt 4",
        city: "San Francisco",
        state: "CA",
        postalCode: "94107",
        countryCode: "US",
        recipientName: "John Doe",
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
          shippingAddressOverride: shippingAddress,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                shippingAddress: shippingAddress,
              }),
            })
          );
        });
    });

    it("includes offerPaypalCredit: false when offerCredit is explicitly set to false", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          offerCredit: false,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                offerPaypalCredit: false,
              }),
            })
          );
        });
    });

    it("includes plan metadata in request", () => {
      const planMetadata = {
        name: "Premium Plan",
        currencyIsoCode: "USD",
        billingCycles: [
          {
            billingFrequency: 1,
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: 12,
            sequence: 1,
            trial: false,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "29.99",
            },
          },
        ],
      };

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
          planType: "SUBSCRIPTION",
          planMetadata: planMetadata,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                planMetadata: expect.objectContaining({
                  name: "Premium Plan",
                  currencyIsoCode: "USD",
                }),
              }),
            })
          );
        });
    });

    it("includes locale in request when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          locale: "fr_FR",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  localeCode: "fr_FR",
                }),
              }),
            })
          );
        });
    });

    it("includes landingPageType in experienceProfile when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          landingPageType: "login",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  landingPageType: "login",
                }),
              }),
            })
          );
        });
    });

    it("sets experienceProfile.noShipping to false when enableShippingAddress is true", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          enableShippingAddress: true,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  noShipping: "false",
                }),
              }),
            })
          );
        });
    });

    it("sets experienceProfile.noShipping to true when enableShippingAddress is false", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          enableShippingAddress: false,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  noShipping: "true",
                }),
              }),
            })
          );
        });
    });

    it("sets experienceProfile.addressOverride to true when shippingAddressEditable is false", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          shippingAddressEditable: false,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  addressOverride: true,
                }),
              }),
            })
          );
        });
    });

    it("sets experienceProfile.addressOverride to false when shippingAddressEditable is true", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          shippingAddressEditable: true,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  addressOverride: false,
                }),
              }),
            })
          );
        });
    });

    it("includes correlationId in request when riskCorrelationId is provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          riskCorrelationId: "risk-id-123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                correlationId: "risk-id-123",
              }),
            })
          );
        });
    });

    it("includes displayName in experienceProfile.brandName when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          displayName: "Custom Merchant Name",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  brandName: "Custom Merchant Name",
                }),
              }),
            })
          );
        });
    });

    it("stores riskCorrelationId on instance for later use in tokenization", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          riskCorrelationId: "risk-id-456",
        })
        .then(() => {
          expect(testContext.instance._riskCorrelationId).toBe("risk-id-456");
        });
    });

    it("resets riskCorrelationId to undefined when not provided to prevent stale values", () => {
      // Set initial riskCorrelationId
      testContext.instance._riskCorrelationId = "old-risk-id";

      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
          // riskCorrelationId intentionally not provided
        })
        .then(() => {
          // Should be reset to undefined to prevent using stale value in tokenization
          expect(testContext.instance._riskCorrelationId).toBeUndefined();
        });
    });

    it("uses displayName override when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
          displayName: "OVERRIDE NAME",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                experienceProfile: expect.objectContaining({
                  brandName: "OVERRIDE NAME",
                }),
              }),
            })
          );
        });
    });

    it("includes returnUrl and cancelUrl in backend request when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          description: "Monthly subscription",
          returnUrl: "https://merchant.com/success",
          cancelUrl: "https://merchant.com/cancel",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "paypal_hermes/setup_billing_agreement",
              method: "post",
              data: expect.objectContaining({
                returnUrl: "https://merchant.com/success",
                cancelUrl: "https://merchant.com/cancel",
              }),
            })
          );
        });
    });
  });

  describe("_formatPlanMetadata", () => {
    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("formats a complete plan with billing cycles", () => {
      const inputPlan = {
        currencyIsoCode: "USD",
        name: "Monthly Subscription",
        oneTimeFeeAmount: "10.00",
        productDescription: "Pro Plan",
        totalAmount: "29.99",
        billingCycles: [
          {
            billingFrequency: "7",
            billingFrequencyUnit: "DAY",
            numberOfExecutions: "1",
            sequence: "1",
            startDate: "2024-04-06T00:00:00Z",
            trial: true,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "0.00",
            },
            extraProperty: "should be filtered out",
          },
          {
            billingFrequency: "1",
            billingFrequencyUnit: "MONTH",
            sequence: "2",
            numberOfExecutions: null,
            startDate: null,
            trial: false,
            pricingScheme: {
              pricingModel: "FIXED",
              price: "29.99",
            },
          },
        ],
        unrelatedProperty: "should not be included",
      };

      const result = testContext.instance._formatPlanMetadata(inputPlan);

      expect(result.currencyIsoCode).toBe("USD");
      expect(result.name).toBe("Monthly Subscription");
      expect(result.oneTimeFeeAmount).toBe("10.00");
      expect(result.productDescription).toBe("Pro Plan");
      expect(result.totalAmount).toBe("29.99");
      expect(result.unrelatedProperty).toBeUndefined();

      expect(result.billingCycles.length).toBe(2);

      expect(result.billingCycles[0].billingFrequency).toBe("7");
      expect(result.billingCycles[0].billingFrequencyUnit).toBe("DAY");
      expect(result.billingCycles[0].numberOfExecutions).toBe("1");
      expect(result.billingCycles[0].sequence).toBe("1");
      expect(result.billingCycles[0].startDate).toBe("2024-04-06T00:00:00Z");
      expect(result.billingCycles[0].trial).toBe(true);
      expect(result.billingCycles[0].pricingScheme).toEqual({
        pricingModel: "FIXED",
        price: "0.00",
      });
      expect(result.billingCycles[0].extraProperty).toBeUndefined();

      expect(result.billingCycles[1].billingFrequency).toBe("1");
      expect(result.billingCycles[1].billingFrequencyUnit).toBe("MONTH");
      expect(result.billingCycles[1].sequence).toBe("2");
      expect(result.billingCycles[1].numberOfExecutions).toBeNull();
      expect(result.billingCycles[1].trial).toBe(false);
    });

    it("handles a plan with no billing cycles", () => {
      const inputPlan = {
        currencyIsoCode: "USD",
        name: "Basic Plan",
        totalAmount: "19.99",
      };

      const result = testContext.instance._formatPlanMetadata(inputPlan);

      expect(result.currencyIsoCode).toBe("USD");
      expect(result.name).toBe("Basic Plan");
      expect(result.totalAmount).toBe("19.99");
      expect(result.billingCycles.length).toBe(0);
    });

    it("only includes specified plan properties", () => {
      const inputPlan = {
        currencyIsoCode: "EUR",
        name: "Premium Plan",
        unrelatedProperty: "should not be included",
        anotherProperty: "also not included",
      };

      const result = testContext.instance._formatPlanMetadata(inputPlan);

      expect(result.currencyIsoCode).toBe("EUR");
      expect(result.name).toBe("Premium Plan");
      expect(result.unrelatedProperty).toBeUndefined();
      expect(result.anotherProperty).toBeUndefined();
    });
  });

  describe("findEligibleMethods", () => {
    let mockPayPalInstance;

    beforeEach(() => {
      testContext.instance = new PayPalCheckoutV6({});
      mockPayPalInstance = {
        findEligibleMethods: jest.fn().mockResolvedValue({
          paypal: true,
          paylater: true,
          credit: true,
        }),
      };

      window.paypal = {
        createInstance: jest.fn().mockResolvedValue(mockPayPalInstance),
        version: "6.0.0",
      };

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("rejects if PayPal SDK is not loaded", () => {
      delete window.paypal;

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          // When window.paypal is undefined, accessing createInstance throws TypeError
          // This is expected since loadPayPalSDK() should be called first
          expect(err).toBeInstanceOf(TypeError);
        });
    });

    it("rejects if findEligibleMethods is not available on instance", () => {
      window.paypal = {
        createInstance: jest.fn().mockResolvedValue({
          // No findEligibleMethods method
          version: "6.0.0",
        }),
        version: "6.0.0",
      };

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_SDK_NOT_INITIALIZED");
        });
    });

    it("rejects if options are not provided", () => {
      return testContext.instance
        .findEligibleMethods()
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "PAYPAL_CHECKOUT_V6_INVALID_ELIGIBILITY_OPTIONS"
          );
        });
    });

    it("rejects if currency is missing", () => {
      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "PAYPAL_CHECKOUT_V6_INVALID_ELIGIBILITY_OPTIONS"
          );
        });
    });

    it("calls PayPal instance findEligibleMethods with currencyCode", () => {
      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          expect(mockPayPalInstance.findEligibleMethods).toHaveBeenCalledWith({
            currencyCode: "USD",
            amount: "10.00",
          });
        });
    });

    it("returns eligibility result with all methods eligible (direct boolean response)", () => {
      mockPayPalInstance.findEligibleMethods.mockResolvedValue({
        paypal: true,
        paylater: true,
        credit: true,
      });

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.paypal).toBe(true);
          expect(result.paylater).toBe(true);
          expect(result.credit).toBe(true);
        });
    });

    it("returns eligibility result using isEligible method when available", () => {
      mockPayPalInstance.findEligibleMethods.mockResolvedValue({
        isEligible: jest.fn().mockImplementation((method) => {
          if (method === "paypal") return true;
          if (method === "paylater") return false;
          if (method === "credit") return true;
        }),
      });

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.paypal).toBe(true);
          expect(result.paylater).toBe(false);
          expect(result.credit).toBe(true);
        });
    });

    it("returns eligibility result with only PayPal eligible", () => {
      mockPayPalInstance.findEligibleMethods.mockResolvedValue({
        paypal: true,
        paylater: false,
        credit: false,
      });

      return testContext.instance
        .findEligibleMethods({
          amount: "5.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.paypal).toBe(true);
          expect(result.paylater).toBe(false);
          expect(result.credit).toBe(false);
        });
    });

    it("handles undefined values in eligibility response", () => {
      mockPayPalInstance.findEligibleMethods.mockResolvedValue({});

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.paypal).toBe(false);
          expect(result.paylater).toBe(false);
          expect(result.credit).toBe(false);
        });
    });

    it("handles null eligibility response", () => {
      mockPayPalInstance.findEligibleMethods.mockResolvedValue(null);

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.paypal).toBe(false);
          expect(result.paylater).toBe(false);
          expect(result.credit).toBe(false);
        });
    });

    it("sends started analytics event", () => {
      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.find-eligible-methods.started"
          );
        });
    });

    it("sends succeeded analytics event on success", () => {
      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.find-eligible-methods.succeeded"
          );
        });
    });

    it("sends failed analytics event on error", () => {
      mockPayPalInstance.findEligibleMethods.mockRejectedValue(
        new Error("API Error")
      );

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout-v6.find-eligible-methods.failed"
          );
        });
    });

    it("rejects with BraintreeError on PayPal SDK error", () => {
      mockPayPalInstance.findEligibleMethods.mockRejectedValue(
        new Error("Network error")
      );

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          throw new Error("should not resolve");
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("PAYPAL_CHECKOUT_V6_ELIGIBILITY_CHECK_FAILED");
        });
    });

    it("uses existing paypalInstance if already created", () => {
      // Pre-set the _paypalInstance
      testContext.instance._paypalInstance = mockPayPalInstance;

      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
        })
        .then(() => {
          // Should not call createInstance since we already have one
          expect(window.paypal.createInstance).not.toHaveBeenCalled();
          expect(mockPayPalInstance.findEligibleMethods).toHaveBeenCalledWith({
            currencyCode: "USD",
            amount: "10.00",
          });
        });
    });

    it("passes countryCode to PayPal SDK when provided", () => {
      return testContext.instance
        .findEligibleMethods({
          amount: "10.00",
          currency: "USD",
          countryCode: "US",
        })
        .then(() => {
          expect(mockPayPalInstance.findEligibleMethods).toHaveBeenCalledWith({
            currencyCode: "USD",
            amount: "10.00",
            countryCode: "US",
          });
        });
    });

    it("passes paymentFlow to PayPal SDK when provided", () => {
      return testContext.instance
        .findEligibleMethods({
          currency: "USD",
          paymentFlow: "ONE_TIME_PAYMENT",
        })
        .then(() => {
          expect(mockPayPalInstance.findEligibleMethods).toHaveBeenCalledWith({
            currencyCode: "USD",
            paymentFlow: "ONE_TIME_PAYMENT",
          });
        });
    });

    it("passes both countryCode and paymentFlow when provided", () => {
      return testContext.instance
        .findEligibleMethods({
          amount: "50.00",
          currency: "USD",
          countryCode: "US",
          paymentFlow: "VAULT_WITH_PAYMENT",
        })
        .then(() => {
          expect(mockPayPalInstance.findEligibleMethods).toHaveBeenCalledWith({
            currencyCode: "USD",
            amount: "50.00",
            countryCode: "US",
            paymentFlow: "VAULT_WITH_PAYMENT",
          });
        });
    });

    it("includes getDetails method from SDK", () => {
      var mockDetails = {
        productCode: "PAY_IN_4",
        countryCode: "US",
      };
      var mockGetDetails = jest.fn().mockReturnValue(mockDetails);

      mockPayPalInstance.findEligibleMethods.mockResolvedValue({
        isEligible: jest.fn().mockReturnValue(true),
        getDetails: mockGetDetails,
      });

      return testContext.instance
        .findEligibleMethods({
          amount: "100.00",
          currency: "USD",
          countryCode: "US",
        })
        .then((result) => {
          expect(typeof result.getDetails).toBe("function");

          var details = result.getDetails("paylater");

          expect(mockGetDetails).toHaveBeenCalledWith("paylater");
          expect(details).toEqual(mockDetails);
        });
    });

    it("calls through to SDK getDetails method", () => {
      var mockGetDetails = jest.fn().mockReturnValue({ test: "data" });

      mockPayPalInstance.findEligibleMethods.mockResolvedValue({
        isEligible: jest.fn().mockReturnValue(true),
        getDetails: mockGetDetails,
      });

      return testContext.instance
        .findEligibleMethods({
          currency: "USD",
        })
        .then((result) => {
          expect(typeof result.getDetails).toBe("function");
          var details = result.getDetails("paypal");
          expect(mockGetDetails).toHaveBeenCalledWith("paypal");
          expect(details).toEqual({ test: "data" });
        });
    });

    it("getDetails returns correct data for different payment methods", () => {
      var paylaterDetails = { productCode: "PAY_IN_4", countryCode: "US" };
      var creditDetails = { countryCode: "US" };

      mockPayPalInstance.findEligibleMethods.mockResolvedValue({
        isEligible: jest.fn().mockReturnValue(true),
        getDetails: jest.fn().mockImplementation((method) => {
          if (method === "paylater") return paylaterDetails;
          if (method === "credit") return creditDetails;
          return null;
        }),
      });

      return testContext.instance
        .findEligibleMethods({
          amount: "100.00",
          currency: "USD",
        })
        .then((result) => {
          expect(result.getDetails("paylater")).toEqual(paylaterDetails);
          expect(result.getDetails("credit")).toEqual(creditDetails);
        });
    });
  });
});
