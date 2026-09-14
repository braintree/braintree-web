vi.mock("../../../src/lib/analytics");
vi.mock("../../../src/lib/in-iframe");
vi.mock("../../../src/lib/assets");

import analytics from "../../../src/lib/analytics";
import methods from "../../../src/lib/methods";
import inIframe from "../../../src/lib/in-iframe";
import assets from "../../../src/lib/assets";
import ApplePay from "../../../src/apple-pay/apple-pay";
import BraintreeError from "../../../src/lib/braintree-error";
import { fake } from "../../helpers";

describe("ApplePay", () => {
  let testContext;

  beforeEach(() => {
    vi.clearAllMocks();

    const configuration = fake.configuration();

    testContext = {};
    vi.spyOn(analytics, "sendEvent").mockImplementation();
    vi.spyOn(analytics, "sendEventPlus").mockImplementation();
    testContext.configuration = configuration;
    testContext.client = fake.client({
      configuration,
    });
    vi.spyOn(testContext.client, "request").mockResolvedValue(null);
    assets.loadScript.mockResolvedValue(document.createElement("script"));
    testContext.applePay = new ApplePay({
      createPromise: Promise.resolve(testContext.client),
      client: testContext.client,
      displayName: "Awesome Merchant",
    });
  });

  describe("Apple Pay SDK loading", () => {
    beforeEach(() =>
      // Flush the load kicked off by the shared instance, then reset so each
      // test starts from a clean slate.
      testContext.applePay._sdkLoadPromise.then(() => {
        assets.loadScript.mockClear();
        analytics.sendEvent.mockClear();
      })
    );

    it("injects Apple's Apple Pay JS SDK on construction", () => {
      const instance = new ApplePay({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return instance._sdkLoadPromise.then(() => {
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js",
          crossorigin: "anonymous",
        });
      });
    });

    it("sends started and succeeded analytics events", () => {
      const instance = new ApplePay({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return instance._sdkLoadPromise.then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "applepay.sdk.load.started"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "applepay.sdk.load.succeeded"
        );
      });
    });

    it("does not load the SDK when loadApplePaySDK is false", () => {
      const instance = new ApplePay({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
        loadApplePaySDK: false,
      });

      return instance._sdkLoadPromise.then(() => {
        expect(assets.loadScript).not.toHaveBeenCalled();
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "applepay.sdk.load.skipped"
        );
      });
    });

    it("sends a failed analytics event and resolves when the SDK fails to load", () => {
      assets.loadScript.mockRejectedValueOnce(new Error("cdn unreachable"));

      const instance = new ApplePay({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return instance._sdkLoadPromise.then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "applepay.sdk.load.failed"
        );
        expect(analytics.sendEvent).not.toHaveBeenCalledWith(
          testContext.client,
          "applepay.sdk.load.succeeded"
        );
      });
    });

    it("does not load the SDK when the deferred client fails", () => {
      const instance = new ApplePay({
        createPromise: Promise.reject(new Error("client failed")),
        useDeferredClient: true,
      });

      return instance._sdkLoadPromise.then(() => {
        expect(assets.loadScript).not.toHaveBeenCalled();
        expect(analytics.sendEvent).not.toHaveBeenCalledWith(
          expect.anything(),
          "applepay.sdk.load.started"
        );
      });
    });
  });

  it("exposes a readonly merchantIdentifier property", () => {
    let err;

    expect(testContext.applePay.merchantIdentifier).toBe(
      "com.example.test-merchant-identifier"
    );

    try {
      testContext.applePay.merchantIdentifier = "something wrong";
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(
      "Cannot assign to read only property 'merchantIdentifier' of object '#<ApplePay>'"
    );
    expect(testContext.applePay.merchantIdentifier).toBe(
      "com.example.test-merchant-identifier"
    );
  });

  describe("applePayCapabilities", () => {
    let originalApplePaySession;
    let hadApplePaySession;

    beforeEach(() => {
      hadApplePaySession = "ApplePaySession" in window;
      originalApplePaySession = window.ApplePaySession;
    });

    afterEach(() => {
      if (hadApplePaySession) {
        window.ApplePaySession = originalApplePaySession;
      } else {
        delete window.ApplePaySession;
      }
    });

    it("resolves with Apple's capability result using the merchantIdentifier", () => {
      const result = { paymentCredentialStatus: "paymentCredentialsAvailable" };

      window.ApplePaySession = {
        applePayCapabilities: vi.fn().mockResolvedValue(result),
      };

      return testContext.applePay.applePayCapabilities().then((res) => {
        expect(res).toBe(result);
        expect(
          window.ApplePaySession.applePayCapabilities
        ).toHaveBeenCalledWith("com.example.test-merchant-identifier");
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "applepay.capabilities.succeeded"
        );
      });
    });

    it("calls Apple only after the SDK load promise resolves", async () => {
      const events = [];
      let resolveLoad;

      window.ApplePaySession = {
        applePayCapabilities: vi.fn(() => {
          events.push("apple-called");

          return Promise.resolve({
            paymentCredentialStatus: "applePayUnsupported",
          });
        }),
      };
      testContext.applePay._sdkLoadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      const promise = testContext.applePay.applePayCapabilities();

      // Macrotask boundary drains all pending microtasks, so only the pending
      // _sdkLoadPromise can be holding the Apple call back.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(
        window.ApplePaySession.applePayCapabilities
      ).not.toHaveBeenCalled();

      events.push("load-resolved");
      resolveLoad();

      await promise;
      expect(events).toEqual(["load-resolved", "apple-called"]);
      expect(window.ApplePaySession.applePayCapabilities).toHaveBeenCalledTimes(
        1
      );
    });

    it("rejects with APPLE_PAY_SDK_NOT_LOADED when ApplePaySession is missing", () => {
      delete window.ApplePaySession;

      return testContext.applePay.applePayCapabilities().then(
        () => {
          throw new Error("should not resolve");
        },
        (err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("APPLE_PAY_SDK_NOT_LOADED");
        }
      );
    });

    it("rejects with APPLE_PAY_SDK_NOT_LOADED when applePayCapabilities is not a function", () => {
      window.ApplePaySession = {};

      return testContext.applePay.applePayCapabilities().then(
        () => {
          throw new Error("should not resolve");
        },
        (err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("APPLE_PAY_SDK_NOT_LOADED");
        }
      );
    });

    it("propagates a rejection from Apple's applePayCapabilities", () => {
      const appleError = new Error("apple boom");

      window.ApplePaySession = {
        applePayCapabilities: vi.fn().mockRejectedValue(appleError),
      };

      return testContext.applePay.applePayCapabilities().then(
        () => {
          throw new Error("should not resolve");
        },
        (err) => {
          expect(err).toBe(appleError);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "applepay.capabilities.failed"
          );
        }
      );
    });

    it("rejects (not silently resolves applePayUnsupported) when a deferred client is not Apple Pay enabled", () => {
      const notEnabled = new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        code: "APPLE_PAY_NOT_ENABLED",
        message: "Apple Pay is not enabled for this merchant.",
      });

      window.ApplePaySession = {
        applePayCapabilities: vi.fn().mockResolvedValue({
          paymentCredentialStatus: "applePayUnsupported",
        }),
      };

      const applePay = new ApplePay({
        createPromise: Promise.reject(notEnabled),
        useDeferredClient: true,
      });

      return applePay.applePayCapabilities().then(
        () => {
          throw new Error("should not resolve");
        },
        (err) => {
          expect(err).toBe(notEnabled);
          expect(
            window.ApplePaySession.applePayCapabilities
          ).not.toHaveBeenCalled();
        }
      );
    });
  });

  describe("createPaymentRequest", () => {
    beforeEach(() => {
      testContext.paymentRequest = {
        countryCode: "defined",
        currencyCode: "defined",
        merchantCapabilities: ["defined"],
        supportedNetworks: ["defined"],
      };

      testContext.gatewayConfiguration = {
        applePayWeb: {
          countryCode: "decorated",
          currencyCode: "decorated",
          merchantCapabilities: ["decorated"],
          supportedCardBrands: ["VISA", "AMERICAN_EXPRESS", "MASTERCARD"],
        },
      };

      testContext.client.getConfiguration = () => ({
        gatewayConfiguration: testContext.gatewayConfiguration,
      });
    });

    it("returns a promise that resolves with the data request object if instance was instantiated with an authorization", () => {
      const ap = new ApplePay({
        useDeferredClient: true,
        createPromise: Promise.resolve(testContext.client),
      });

      return ap.createPaymentRequest({}).then((dataRequest) => {
        expect(dataRequest).toMatchObject({
          countryCode: "decorated",
          currencyCode: "decorated",
          merchantCapabilities: ["decorated"],
        });
      });
    });

    it("does not mutate the argument", () => {
      const arg = { foo: "boo" };

      testContext.applePay.createPaymentRequest(arg);
      expect(arg).toEqual({ foo: "boo" });
    });

    it("leaves properties intact", () => {
      expect(
        testContext.applePay.createPaymentRequest({ foo: "boo" }).foo
      ).toBe("boo");
    });

    it("applies countryCode when undefined", () => {
      expect(testContext.applePay.createPaymentRequest({}).countryCode).toBe(
        "decorated"
      );
    });

    it("applies currencyCode when undefined", () => {
      expect(testContext.applePay.createPaymentRequest({}).currencyCode).toBe(
        "decorated"
      );
    });

    it("applies gateway merchantCapabilities when not defined on argument but defined on gateway", () => {
      expect(
        testContext.applePay.createPaymentRequest({}).merchantCapabilities
      ).toEqual(["decorated"]);
    });

    it("applies default merchantCapabilities when not defined on argument and gateway", () => {
      delete testContext.gatewayConfiguration.applePayWeb.merchantCapabilities;

      expect(
        testContext.applePay.createPaymentRequest({}).merchantCapabilities
      ).toEqual(["supports3DS"]);
    });

    it("maps supportedCardBrands to Apple Pay supportedNetworks when undefined", () => {
      expect(
        testContext.applePay.createPaymentRequest({}).supportedNetworks
      ).toEqual(["visa", "amex", "masterCard"]);
    });

    it("omits supportedCardBrands with no Apple Pay network equivalent", () => {
      testContext.gatewayConfiguration.applePayWeb.supportedCardBrands = [
        "VISA",
        "SOME_UNKNOWN_BRAND",
        "ELO",
      ];

      expect(
        testContext.applePay.createPaymentRequest({}).supportedNetworks
      ).toEqual(["visa", "elo"]);
    });

    it("does not apply countryCode when defined", () => {
      expect(
        testContext.applePay.createPaymentRequest(testContext.paymentRequest)
          .countryCode
      ).toBe("defined");
    });

    it("does not apply currencyCode when defined", () => {
      expect(
        testContext.applePay.createPaymentRequest(testContext.paymentRequest)
          .currencyCode
      ).toBe("defined");
    });

    it("does not apply merchantCapabilities when defined", () => {
      expect(
        testContext.applePay.createPaymentRequest(testContext.paymentRequest)
          .merchantCapabilities
      ).toEqual(["defined"]);
    });

    it("does not apply supportedNetworks when defined", () => {
      expect(
        testContext.applePay.createPaymentRequest(testContext.paymentRequest)
          .supportedNetworks
      ).toEqual(["defined"]);
    });
  });

  describe("performValidation", () => {
    it("rejects with error when event is undefined", () =>
      testContext.applePay.performValidation(false).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("APPLE_PAY_VALIDATION_URL_REQUIRED");
        expect(err.type).toBe("MERCHANT");
        expect(err.message).toBe(
          "performValidation must be called with a validationURL."
        );
      }));

    it("rejects with error when event.validationURL is undefined", () =>
      testContext.applePay
        .performValidation({ some: "property" })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("APPLE_PAY_VALIDATION_URL_REQUIRED");
          expect(err.type).toBe("MERCHANT");
          expect(err.message).toBe(
            "performValidation must be called with a validationURL."
          );
        }));

    it("overrides merchantIdentifier from the options", () =>
      testContext.applePay
        .performValidation({
          merchantIdentifier: "override.merchant.identifier",
          validationURL: "something",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                applePayWebSession: expect.objectContaining({
                  merchantIdentifier: "override.merchant.identifier",
                }),
              }),
            })
          );
        }));

    it.each([
      [
        "an invalid request",
        new BraintreeError({
          type: "NETWORK",
          code: "CLIENT_REQUEST_ERROR",
          message: "This is a fake client error",
          details: { originalError: new Error("Validation failed") },
        }),
        {
          code: "APPLE_PAY_MERCHANT_VALIDATION_FAILED",
          type: "MERCHANT",
          message:
            "Make sure you have registered your domain name in the Braintree Control Panel.",
          originalMessage: "Validation failed",
        },
      ],
      [
        "a network error",
        new BraintreeError({
          type: "NETWORK",
          code: "CLIENT_REQUEST_TIMEOUT",
          message: "This is a fake client error",
        }),
        {
          code: "APPLE_PAY_MERCHANT_VALIDATION_NETWORK",
          type: "NETWORK",
          message:
            "A network error occurred when validating the Apple Pay merchant.",
          originalMessage: "This is a fake client error",
        },
      ],
    ])(
      "makes a request to the gateway and rejects if it fails due to %s",
      (n, requestError, expectedError) => {
        const validationOptions = {
          validationURL:
            "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
          displayName: "Awesome Merchant",
        };

        testContext.client.request = (options) => {
          expect(options.method).toBe("post");
          expect(options.endpoint).toBe("apple_pay_web/sessions");
          expect(options.data._meta.source).toBe("apple-pay");
          expect(options.data.applePayWebSession.merchantIdentifier).toBe(
            "com.example.test-merchant-identifier"
          );
          expect(options.data.applePayWebSession.domainName).toBe("localhost");
          expect(options.data.applePayWebSession.displayName).toBe(
            "Awesome Merchant"
          );
          expect(options.data.applePayWebSession.validationUrl).toBe(
            "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession"
          );

          return Promise.reject(requestError);
        };

        return expect(
          testContext.applePay.performValidation(validationOptions)
        ).rejects.toMatchObject({
          code: expectedError.code,
          type: expectedError.type,
          message: expectedError.message,
          details: {
            originalError: expect.objectContaining({
              message: expectedError.originalMessage,
            }),
          },
        });
      }
    );

    it("makes a request to the gateway and resolves if it succeeds", () => {
      const fakeResponseData = { foo: "boo" };
      const validationOptions = {
        validationURL:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
        displayName: "Awesome Merchant",
      };

      testContext.client.request = (options) => {
        expect(options.method).toBe("post");
        expect(options.endpoint).toBe("apple_pay_web/sessions");
        expect(options.endpoint).toBe("apple_pay_web/sessions");
        expect(options.data._meta.source).toBe("apple-pay");
        expect(options.data.applePayWebSession.merchantIdentifier).toBe(
          "com.example.test-merchant-identifier"
        );
        expect(options.data.applePayWebSession.domainName).toBe("localhost");
        expect(options.data.applePayWebSession.displayName).toBe(
          "Awesome Merchant"
        );
        expect(options.data.applePayWebSession.validationUrl).toBe(
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession"
        );

        return Promise.resolve(fakeResponseData);
      };

      return testContext.applePay
        .performValidation(validationOptions)
        .then((response) => {
          expect(response).toBe(fakeResponseData);
        });
    });

    it("the domainName used in the request will be the parents location when in an iframe", async () => {
      const fakeResponseData = { foo: "boo" };
      const validationOptions = {
        validationURL:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
        displayName: "Awesome Merchant",
      };
      const iframeParentHostname = "iframe-parent-hostname";

      inIframe.mockReturnValue(true);

      Object.defineProperty(window, "parent", {
        configurable: true,
        value: {
          location: {
            hostname: iframeParentHostname,
          },
        },
      });

      expect(testContext.applePay._client).toBe(testContext.client);

      testContext.client.request = vi.fn().mockImplementation((options) => {
        expect(options.method).toBe("post");
        expect(options.endpoint).toBe("apple_pay_web/sessions");
        expect(options.data._meta.source).toBe("apple-pay");
        expect(options.data.applePayWebSession.merchantIdentifier).toBe(
          "com.example.test-merchant-identifier"
        );
        expect(options.data.applePayWebSession.domainName).toBe(
          iframeParentHostname
        );
        expect(options.data.applePayWebSession.displayName).toBe(
          "Awesome Merchant"
        );
        expect(options.data.applePayWebSession.validationUrl).toBe(
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession"
        );

        return Promise.resolve(fakeResponseData);
      });

      const response =
        await testContext.applePay.performValidation(validationOptions);

      // Clean up after test
      delete window.parent;

      expect(response).toBe(fakeResponseData);
    });
  });

  describe("tokenize", () => {
    it("rejects with error when token is undefined", () =>
      testContext.applePay.tokenize(false).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("APPLE_PAY_PAYMENT_TOKEN_REQUIRED");
        expect(err.type).toBe("MERCHANT");
        expect(err.message).toBe(
          "tokenize must be called with a payment token."
        );
      }));

    it("makes a request to the gateway and rejects if it fails", () => {
      const fakeResponseError = "error";
      const token = {
        foo: "boo",
        paymentData: {
          bar: "yar",
        },
      };

      testContext.client.request = (options) => {
        expect(options.method).toBe("post");
        expect(options.endpoint).toBe("payment_methods/apple_payment_tokens");
        expect(options.data).toEqual({
          _meta: {
            source: "apple-pay",
          },
          applePaymentToken: {
            foo: "boo",
            paymentData: btoa('{"bar":"yar"}'),
          },
        });

        return Promise.reject(fakeResponseError);
      };

      return testContext.applePay.tokenize({ token: token }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("APPLE_PAY_TOKENIZATION");
        expect(err.type).toBe("NETWORK");
        expect(err.message).toBe(
          "A network error occurred when processing the Apple Pay payment."
        );
      });
    });

    it("makes a request to the gateway and resolves if it succeeds", () => {
      const fakeResponseData = { applePayCards: [{}] };
      const token = {
        foo: "boo",
        paymentData: {
          data: "encrypted-payment-data",
          signature: "cryptographic-signature",
          header: {},
          version: "EC_v1",
        },
      };
      const payment = {
        token: token,
        shippingContact: {
          locality: "Test",
          country: "United States",
          postalCode: "Test",
          administrativeArea: "Test",
          familyName: "Tree",
          addressLines: ["Test", "Test"],
          givenName: "Brian",
          countryCode: "US",
        },
      };

      testContext.client.request = (options) => {
        expect(options.method).toBe("post");
        expect(options.endpoint).toBe("payment_methods/apple_payment_tokens");
        expect(options.data).toEqual({
          _meta: {
            source: "apple-pay",
          },
          applePaymentToken: {
            foo: "boo",
            paymentData: btoa(JSON.stringify(token.paymentData)),
          },
        });

        return Promise.resolve(fakeResponseData);
      };

      return testContext.applePay
        .tokenize({
          token: payment.token,
        })
        .then((response) => {
          expect(response).toBe(fakeResponseData.applePayCards[0]);
        });
    });

    describe("returns", () => {
      const fakeResponseData = {
        applePayCards: [
          {
            nonce: "nonce",
            details: {
              isDeviceToken: true,
            },
          },
        ],
      };
      var testClient, token;

      beforeEach(() => {
        testClient = {
          _client: testContext.client,
          _waitForClient: vi.fn().mockResolvedValue(testContext.client),
        };
        token = {
          token: "token",
        };
        testContext.client.request = () => Promise.resolve(fakeResponseData);
      });

      it("payload including `is_device_token`", () => {
        return ApplePay.prototype.tokenize
          .call(testClient, token)
          .then((response) => {
            expect(response).toBe(fakeResponseData.applePayCards[0]);
          });
      });
    });
  });

  describe("analytics", () => {
    describe("performValidation", () => {
      it("submits succeeded", () => {
        testContext.client.request = () => Promise.resolve({});
        inIframe.mockReturnValue(false);

        return ApplePay.prototype.performValidation
          .call(
            {
              _client: testContext.client,
              _waitForClient: vi.fn().mockResolvedValue(testContext.client),
            },
            {
              validationURL: "validationURL",
              displayName: "JS SDK Integration",
            }
          )
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.client,
              "applepay.performValidation.succeeded"
            );
          });
      });

      it("submits failed", () => {
        testContext.client.request = () => Promise.reject({});

        return ApplePay.prototype.performValidation
          .call(
            {
              _client: testContext.client,
              _waitForClient: vi.fn().mockResolvedValue(testContext.client),
            },
            {
              validationURL: "validationURL",
              displayName: "JS SDK Integration",
            }
          )
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.client,
              "applepay.performValidation.failed"
            );
          });
      });
    });

    describe("tokenize", () => {
      describe("submits succeeded", () => {
        var testClient, token;

        beforeEach(() => {
          testClient = {
            _client: testContext.client,
            _waitForClient: vi.fn().mockResolvedValue(testContext.client),
          };
          token = {
            token: "token",
          };
          testContext.client.request = () =>
            Promise.resolve({
              applePayCards: [
                {
                  nonce: "nonce",
                  details: {
                    isDeviceToken: true,
                  },
                },
              ],
            });
        });

        it("sends success event", () => {
          return ApplePay.prototype.tokenize
            .call(testClient, token)
            .then(() => {
              expect(analytics.sendEvent).toHaveBeenCalledWith(
                testContext.client,
                "applepay.tokenize.succeeded"
              );
            });
        });
      });

      it("submits failed", () => {
        testContext.client.request = () => Promise.reject({});

        return ApplePay.prototype.tokenize
          .call(
            {
              _client: testContext.client,
              _waitForClient: vi.fn().mockResolvedValue(testContext.client),
            },
            {
              token: "token",
            }
          )
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.client,
              "applepay.tokenize.failed"
            );
          });
      });
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", () =>
      new Promise((resolve) => {
        const instance = testContext.applePay;

        instance.teardown().then(() => {
          methods(ApplePay.prototype).forEach((method) => {
            let err;

            try {
              instance[method]();
            } catch (e) {
              err = e;
            }

            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe(BraintreeError.types.MERCHANT);
            expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(err.message).toBe(
              `${method} cannot be called after teardown.`
            );
          });

          resolve();
        });
      }));
  });
});
