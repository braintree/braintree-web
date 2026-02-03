"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const analytics = require("../../../src/lib/analytics");
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

      return testContext.instance._initialize({
        client: testContext.client,
      });
    });

    it("sends analytics event when SDK loads", (done) => {
      testContext.instance.loadPayPalSDK().then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.load-sdk.started"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.sdk-load.succeeded"
        );
        done();
      });

      // Simulate script load on next tick
      setTimeout(() => {
        testContext.instance._paypalScript.onload();
      }, 0);
    });

    it("creates and appends script tag", (done) => {
      testContext.instance.loadPayPalSDK();

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript).toBeDefined();
        expect(testContext.instance._paypalScript.src).toContain(
          "sandbox.paypal.com/web-sdk/v6/core"
        );
        expect(testContext.instance._paypalScript.async).toBe(true);
        done();
      }, 0);
    });

    it("uses production URL for production environment", (done) => {
      testContext.configuration.gatewayConfiguration.environment = "production";

      testContext.instance.loadPayPalSDK();

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript.src).toBe(
          "https://www.paypal.com/web-sdk/v6/core"
        );
        done();
      }, 0);
    });

    it("uses sandbox URL for sandbox environment", (done) => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      testContext.instance.loadPayPalSDK();

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript.src).toBe(
          "https://www.sandbox.paypal.com/web-sdk/v6/core"
        );
        done();
      }, 0);
    });

    it("resolves immediately if SDK is already loaded", () => {
      window.paypal = { version: "6.0.0" };

      return testContext.instance.loadPayPalSDK().then((result) => {
        expect(result).toBe(testContext.instance);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout-v6.sdk-already-loaded"
        );
      });
    });

    it("uses teBraintree URL when env option is teBraintree", (done) => {
      testContext.instance.loadPayPalSDK({ env: "teBraintree" });

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript.src).toBe(
          "https://www.braintree.stage.paypal.com/web-sdk/v6/core"
        );
        done();
      }, 0);
    });

    it("uses stage URL when env option is stage", (done) => {
      testContext.instance.loadPayPalSDK({ env: "stage" });

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript.src).toBe(
          "https://www.msmaster.qa.paypal.com/web-sdk/v6/core"
        );
        done();
      }, 0);
    });

    it("falls back to default URL when env option is unknown", (done) => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      testContext.instance.loadPayPalSDK({ env: "unknown-env" });

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript.src).toBe(
          "https://www.sandbox.paypal.com/web-sdk/v6/core"
        );
        done();
      }, 0);
    });

    it("falls back to default URL when options object is empty", (done) => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      testContext.instance.loadPayPalSDK({});

      // Wait for next tick to allow promise to resolve
      setTimeout(() => {
        expect(testContext.instance._paypalScript.src).toBe(
          "https://www.sandbox.paypal.com/web-sdk/v6/core"
        );
        done();
      }, 0);
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
                  }),
                }),
              })
            );
            expect(payload.nonce).toBe("vault-nonce-456");
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

      it("creates PayPal instance with vault flow", () => {
        const session = testContext.instance.createBillingAgreementSession({
          billingAgreementDescription: "Monthly subscription",
          onApprove: () => {},
        });

        return session.start().then(() => {
          expect(
            testContext.instance._createPayPalInstance
          ).toHaveBeenCalledWith({
            flow: "vault",
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
          expect(testContext.instance.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({
              flow: "vault",
              billingAgreementDescription: "Monthly subscription",
              planType: "SUBSCRIPTION",
              amount: "10.00",
              currency: "USD",
              userAction: "SETUP_NOW",
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
        })
        .then(() => {
          const requestData = testContext.client.request.mock.calls[0][0].data;

          expect(requestData.planType).toBeUndefined();
          expect(requestData.planMetadata).toBeUndefined();
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
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
          billingAgreementDescription: "Monthly subscription",
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

    it("uses displayName override when provided", () => {
      jest.spyOn(testContext.client, "request").mockResolvedValue({
        agreementSetup: {
          tokenId: "BA-TEST-TOKEN",
          approvalUrl: "https://paypal.com/approve",
        },
      });

      return testContext.instance
        ._createBillingAgreementToken({
          billingAgreementDescription: "Monthly subscription",
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
});
