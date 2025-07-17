"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/in-iframe");

const analytics = require("../../../src/lib/analytics");
const methods = require("../../../src/lib/methods");
const inIframe = require("../../../src/lib/in-iframe");
const ApplePay = require("../../../src/apple-pay/apple-pay");
const BraintreeError = require("../../../src/lib/braintree-error");
const { fake } = require("../../helpers");

describe("ApplePay", () => {
  let testContext;

  beforeEach(() => {
    jest.clearAllMocks();

    const configuration = fake.configuration();

    testContext = {};
    jest.spyOn(analytics, "sendEvent").mockImplementation();
    jest.spyOn(analytics, "sendEventPlus").mockImplementation();
    testContext.configuration = configuration;
    testContext.client = fake.client({
      configuration,
    });
    jest.spyOn(testContext.client, "request").mockResolvedValue(null);
    testContext.applePay = new ApplePay({
      createPromise: Promise.resolve(testContext.client),
      client: testContext.client,
      displayName: "Awesome Merchant",
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
          supportedNetworks: ["visa", "amex", "mastercard"],
        },
      };

      testContext.client.getConfiguration = () => ({
        gatewayConfiguration: testContext.gatewayConfiguration,
      });
    });

    it("returns a promise that resolves with the data request object if instance was instanitated with an authorization", () => {
      const ap = new ApplePay({
        useDeferredClient: true,
        createPromise: Promise.resolve(testContext.client),
      });

      return ap.createPaymentRequest({}).then((dataRquest) => {
        expect(dataRquest).toMatchObject({
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

    it("applies supportedNetworks when undefined", () => {
      expect(
        testContext.applePay.createPaymentRequest({}).supportedNetworks
      ).toEqual(["visa", "amex", "masterCard"]);
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

      testContext.client.request = jest.fn().mockImplementation((options) => {
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
          _waitForClient: jest.fn().mockResolvedValue(testContext.client),
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
              _waitForClient: jest.fn().mockResolvedValue(testContext.client),
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
              _waitForClient: jest.fn().mockResolvedValue(testContext.client),
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
            _waitForClient: jest.fn().mockResolvedValue(testContext.client),
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
              _waitForClient: jest.fn().mockResolvedValue(testContext.client),
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
    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      const instance = testContext.applePay;

      instance.teardown(() => {
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

        done();
      });
    });
  });
});
