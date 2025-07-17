"use strict";

jest.mock("../../../../src/lib/analytics");
jest.mock("framebus");

const analytics = require("../../../../src/lib/analytics");
const Bus = require("framebus");
const BraintreeError = require("../../../../src/lib/braintree-error");
const {
  INTEGRATION,
  PLATFORM,
  SOURCE,
  VERSION,
} = require("../../../../src/lib/constants");
const methods = require("../../../../src/lib/methods");
const PaymentRequestComponent = require("../../../../src/payment-request/external/payment-request");
const { events } = require("../../../../src/payment-request/shared/constants");
const {
  fake,
  findFirstEventCallback,
  yieldsAsync,
  yieldsByEvents,
  yieldsByEventAsync,
} = require("../../../helpers");
const { version: packageVersion } = require("../../../../package.json");

describe("Payment Request component", () => {
  let testContext;

  beforeEach(() => {
    const configuration = fake.configuration();

    testContext = {};

    testContext.frameCanMakeRequests = () =>
      findFirstEventCallback(
        events.FRAME_CAN_MAKE_REQUESTS,
        Bus.prototype.on.mock.calls
      )();
    configuration.gatewayConfiguration.androidPay = {
      enabled: true,
      googleAuthorizationFingerprint: "fingerprint",
      supportedNetworks: ["visa", "amex"],
    };

    testContext.fakeClient = fake.client({
      configuration: configuration,
    });

    jest.spyOn(analytics, "sendEvent");
    testContext.instance = new PaymentRequestComponent({
      client: testContext.fakeClient,
    });
    jest.spyOn(testContext.instance, "_emit");
    jest.spyOn(testContext.instance, "on");
  });

  describe("constructor", () => {
    it("sets up a bus with a unique channel", () => {
      const instance = new PaymentRequestComponent({
        client: testContext.fakeClient,
      });
      const channel = Bus.mock.calls[0][0].channel;

      expect(channel).toMatch(/\w{8}-\w{4}-4\w{3}-\w{4}-\w{8}/);
      expect(instance._bus).toBeInstanceOf(Bus);
    });

    it("sets default supported payment methods", () => {
      const instance = new PaymentRequestComponent({
        client: testContext.fakeClient,
      });

      expect(
        instance._defaultSupportedPaymentMethods[0].supportedMethods
      ).toEqual("basic-card");
      expect(instance._defaultSupportedPaymentMethods[0].data).toEqual({
        supportedNetworks: ["amex", "discover", "visa"],
      });
      expect(
        instance._defaultSupportedPaymentMethods[1].supportedMethods
      ).toEqual("https://google.com/pay");
      expect(instance._defaultSupportedPaymentMethods[1].data).toEqual({
        merchantId: "18278000977346790994",
        apiVersion: 1,
        environment: "TEST",
        allowedPaymentMethods: ["CARD", "TOKENIZED_CARD"],
        paymentMethodTokenizationParameters: {
          tokenizationType: "PAYMENT_GATEWAY",
          parameters: {
            gateway: "braintree",
            "braintree:merchantId": "merchant-id",
            "braintree:authorizationFingerprint": "fingerprint",
            "braintree:apiVersion": "v1",
            "braintree:sdkVersion": VERSION,
            "braintree:metadata": JSON.stringify({
              source: SOURCE,
              integration: INTEGRATION,
              sessionId: "fakeSessionId",
              version: packageVersion,
              platform: PLATFORM,
            }),
          },
        },
        cardRequirements: {
          allowedCardNetworks: ["VISA", "AMEX"],
        },
      });
    });

    it("filters undefined values from supportedMethods", () => {
      const configuration = fake.configuration();
      let instance, fakeClient;

      configuration.gatewayConfiguration.creditCards.supportedCardTypes = [
        "American Express",
        "Discover",
        "Apple Pay - Visa",
        "Visa",
      ];
      fakeClient = fake.client({
        configuration: configuration,
      });

      instance = new PaymentRequestComponent({
        client: fakeClient,
      });

      expect(
        instance._defaultSupportedPaymentMethods[0].data.supportedNetworks
      ).toEqual(["amex", "discover", "visa"]);
    });

    it("sets pay with google to have a clientKey param when using a tokenization key", () => {
      let instance;
      const conf = testContext.fakeClient.getConfiguration();

      conf.authorization = "authorization";
      conf.authorizationType = "TOKENIZATION_KEY";

      jest
        .spyOn(testContext.fakeClient, "getConfiguration")
        .mockReturnValue(conf);

      instance = new PaymentRequestComponent({
        client: testContext.fakeClient,
      });

      expect(
        instance._defaultSupportedPaymentMethods[1].data
          .paymentMethodTokenizationParameters.parameters["braintree:clientKey"]
      ).toBe("authorization");
    });

    it("can turn off basic-card", () => {
      const instance = new PaymentRequestComponent({
        enabledPaymentMethods: {
          basicCard: false,
        },
        client: testContext.fakeClient,
      });

      expect(instance._defaultSupportedPaymentMethods.length).toBe(1);
      expect(
        instance._defaultSupportedPaymentMethods[0].supportedMethods
      ).toEqual("https://google.com/pay");
    });

    it("can turn off pay with google", () => {
      const instance = new PaymentRequestComponent({
        enabledPaymentMethods: {
          googlePay: false,
        },
        client: testContext.fakeClient,
      });

      expect(instance._defaultSupportedPaymentMethods.length).toBe(1);
      expect(
        instance._defaultSupportedPaymentMethods[0].supportedMethods
      ).toEqual("basic-card");
    });

    it("can use google pay v2 when requested", () => {
      const instance = new PaymentRequestComponent({
        googlePayVersion: 2,
        client: testContext.fakeClient,
      });

      expect(instance._defaultSupportedPaymentMethods.length).toBe(2);
      expect(
        instance._defaultSupportedPaymentMethods[1].supportedMethods
      ).toEqual("https://google.com/pay");
      expect(instance._defaultSupportedPaymentMethods[1].data).toEqual({
        merchantInfo: {
          merchantId: "18278000977346790994",
        },
        apiVersion: 2,
        apiVersionMinor: 0,
        environment: "TEST",
        allowedPaymentMethods: [
          {
            type: "CARD",
            parameters: {
              allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
              allowedCardNetworks: ["VISA", "AMEX"],
            },
            tokenizationSpecification: {
              type: "PAYMENT_GATEWAY",
              parameters: {
                gateway: "braintree",
                "braintree:merchantId": "merchant-id",
                "braintree:apiVersion": "v1",
                "braintree:sdkVersion": packageVersion,
                "braintree:metadata": JSON.stringify({
                  source: SOURCE,
                  integration: INTEGRATION,
                  sessionId: "fakeSessionId",
                  version: packageVersion,
                  platform: PLATFORM,
                }),
                "braintree:authorizationFingerprint": "fingerprint",
              },
            },
          },
        ],
      });
    });

    it("can use paypal closed loop tokens via google pay v2 when authorized", () => {
      let client, instance;
      const configuration = fake.configuration();

      configuration.gatewayConfiguration.androidPay = {
        enabled: true,
        googleAuthorizationFingerprint: "fingerprint",
        supportedNetworks: ["visa", "amex"],
      };
      configuration.gatewayConfiguration.paypalEnabled = true;
      configuration.gatewayConfiguration.paypal = {};
      configuration.gatewayConfiguration.androidPay.paypalClientId =
        "paypal_client_id";
      configuration.gatewayConfiguration.paypal.environmentNoNetwork = false;

      client = fake.client({
        configuration: configuration,
      });

      instance = new PaymentRequestComponent({
        googlePayVersion: 2,
        client: client,
      });

      expect(instance._defaultSupportedPaymentMethods.length).toBe(2);
      expect(
        instance._defaultSupportedPaymentMethods[1].supportedMethods
      ).toEqual("https://google.com/pay");
      expect(instance._defaultSupportedPaymentMethods[1].data).toEqual({
        merchantInfo: {
          merchantId: "18278000977346790994",
        },
        apiVersion: 2,
        apiVersionMinor: 0,
        environment: "TEST",
        allowedPaymentMethods: [
          {
            type: "CARD",
            parameters: {
              allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
              allowedCardNetworks: ["VISA", "AMEX"],
            },
            tokenizationSpecification: {
              type: "PAYMENT_GATEWAY",
              parameters: {
                gateway: "braintree",
                "braintree:merchantId": "merchant-id",
                "braintree:apiVersion": "v1",
                "braintree:sdkVersion": packageVersion,
                "braintree:metadata": JSON.stringify({
                  source: SOURCE,
                  integration: INTEGRATION,
                  sessionId: "fakeSessionId",
                  version: packageVersion,
                  platform: PLATFORM,
                }),
                "braintree:authorizationFingerprint": "fingerprint",
              },
            },
          },
          {
            type: "PAYPAL",
            parameters: {
              purchase_context: {
                purchase_units: [
                  {
                    payee: {
                      client_id: "paypal_client_id",
                    },
                    recurring_payment: true,
                  },
                ],
              },
            },
            tokenizationSpecification: {
              type: "PAYMENT_GATEWAY",
              parameters: {
                gateway: "braintree",
                "braintree:merchantId": "merchant-id",
                "braintree:apiVersion": "v1",
                "braintree:sdkVersion": packageVersion,
                "braintree:metadata": JSON.stringify({
                  source: SOURCE,
                  integration: INTEGRATION,
                  sessionId: "fakeSessionId",
                  version: packageVersion,
                  platform: PLATFORM,
                }),
                "braintree:paypalClientId": "paypal_client_id",
              },
            },
          },
        ],
      });
    });
  });

  describe("initialize", () => {
    beforeEach(() => {
      jest.spyOn(document.body, "appendChild");
    });

    it("resolves with the instance", (done) => {
      testContext.instance.initialize().then((instance) => {
        expect(instance).toBe(testContext.instance);

        done();
      });

      testContext.frameCanMakeRequests();
    });

    it("sends analytics event on initialization", (done) => {
      testContext.instance.initialize().then(({ _client }) => {
        expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          _client,
          "payment-request.initialized"
        );

        done();
      });

      testContext.frameCanMakeRequests();
    });

    it("fails if there are no supported payment methods on merchant account", () => {
      testContext.instance._defaultSupportedPaymentMethods = [];

      return testContext.instance.initialize().catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe(
          "PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS"
        );
        expect(err.message).toBe(
          "There are no supported payment methods associated with this account."
        );
      });
    });

    it("adds an iframe to the page", (done) => {
      testContext.instance.initialize().then(() => {
        const iframe = document.body.appendChild.mock.calls[0][0];

        expect(document.body.appendChild).toHaveBeenCalledTimes(1);
        expect(iframe.getAttribute("src")).toMatch(
          /html\/payment-request-frame\.min\.html#.*/
        );
        expect(iframe.getAttribute("allowPaymentRequest")).toBeDefined();

        done();
      });

      testContext.frameCanMakeRequests();
    });

    it("uses unminified html page when client is set to debug mode", (done) => {
      jest.spyOn(testContext.fakeClient, "getConfiguration").mockReturnValue({
        gatewayConfiguration: {},
        isDebug: true,
      });

      testContext.instance.initialize().then(() => {
        const iframe = document.body.appendChild.mock.calls[0][0];

        expect(document.body.appendChild).toHaveBeenCalledTimes(1);
        expect(iframe.getAttribute("src")).toMatch(
          /payment-request-frame\.html#.*/
        );

        done();
      });

      testContext.frameCanMakeRequests();
    });

    it("sends client to iframe when it is ready", (done) => {
      const fakeClient = testContext.fakeClient;
      let frameReadyHandler;

      testContext.instance.initialize();

      frameReadyHandler = findFirstEventCallback(
        events.FRAME_READY,
        Bus.prototype.on.mock.calls
      );
      expect(Bus.prototype.on).toHaveBeenNthCalledWith(
        1,
        events.FRAME_READY,
        expect.any(Function)
      );
      frameReadyHandler((client) => {
        expect(client).toBe(fakeClient);
        done();
      });
    });

    it("emits events for shipping address change", () => {
      const shippingAddress = { foo: "bar" };

      Bus.prototype.on.mockImplementation(
        yieldsByEvents([
          { event: events.SHIPPING_ADDRESS_CHANGE, args: [shippingAddress] },
          { event: events.FRAME_CAN_MAKE_REQUESTS, args: [null] },
        ])
      );

      return testContext.instance.initialize().then(() => {
        expect(Bus.prototype.on).toHaveBeenNthCalledWith(
          3,
          events.SHIPPING_ADDRESS_CHANGE,
          expect.any(Function)
        );
        expect(testContext.instance._emit).toHaveBeenCalledWith(
          "shippingAddressChange",
          {
            target: {
              shippingAddress: shippingAddress,
            },
            updateWith: expect.any(Function),
          }
        );
        expect(testContext.instance._emit).toHaveBeenCalledWith(
          "shippingaddresschange",
          {
            target: {
              shippingAddress: shippingAddress,
            },
            updateWith: expect.any(Function),
          }
        );
      });
    });

    it("emits events for shipping option change", () => {
      Bus.prototype.on.mockImplementation(
        yieldsByEvents([
          { event: events.SHIPPING_OPTION_CHANGE, args: ["option"] },
          { event: events.FRAME_CAN_MAKE_REQUESTS, args: [null] },
        ])
      );

      return testContext.instance.initialize().then(() => {
        expect(Bus.prototype.on).toHaveBeenLastCalledWith(
          events.SHIPPING_OPTION_CHANGE,
          expect.any(Function)
        );
        expect(testContext.instance._emit).toHaveBeenCalledWith(
          "shippingOptionChange",
          {
            target: {
              shippingOption: "option",
            },
            updateWith: expect.any(Function),
          }
        );
      });
    });
  });

  describe("tokenize", () => {
    beforeEach(() => {
      testContext.configuration = {
        supportedPaymentMethods: [
          {
            supportedMethods: "basic-card",
            data: {
              supportedNetworks: ["amex", "visa"],
            },
          },
        ],
        details: {
          total: "100.00",
        },
        options: {},
      };

      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          null,
          {
            nonce: "a-nonce",
            details: {
              rawPaymentResponse: {},
            },
          },
        ])
      );
    });

    it("uses default supportedPaymentMethods if no supportedPaymentMethods are passed in", () => {
      delete testContext.configuration.supportedPaymentMethods;

      return testContext.instance
        .tokenize(testContext.configuration)
        .then(() => {
          expect(Bus.prototype.emit).toHaveBeenCalledWith(
            events.PAYMENT_REQUEST_INITIALIZED,
            {
              supportedPaymentMethods:
                testContext.instance._defaultSupportedPaymentMethods,
              details: testContext.configuration.details,
              options: testContext.configuration.options,
            },
            expect.any(Function)
          );
        });
    });

    it("emits PAYMENT_REQUEST_INITIALIZED", () => {
      return testContext.instance
        .tokenize(testContext.configuration)
        .then(() => {
          expect(Bus.prototype.emit).toHaveBeenCalledWith(
            events.PAYMENT_REQUEST_INITIALIZED,
            {
              supportedPaymentMethods:
                testContext.configuration.supportedPaymentMethods,
              details: testContext.configuration.details,
              options: testContext.configuration.options,
            },
            expect.any(Function)
          );
        });
    });

    it("sends analytics event on success", () => {
      return testContext.instance
        .tokenize(testContext.configuration)
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.instance._client,
            "payment-request.tokenize.succeeded"
          );
        });
    });

    it("resolves with payload on success", () =>
      testContext.instance
        .tokenize(testContext.configuration)
        .then(({ nonce }) => {
          expect(nonce).toBe("a-nonce");
        }));

    it("rejects with error on failure", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            code: "A_BT_ERROR",
            type: "MERCHANT",
            message: "some error",
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYMENT_REQUEST_NOT_COMPLETED");
          expect(err.message).toBe("Payment request could not be completed.");
          expect(err.details.originalError).toEqual({
            code: "A_BT_ERROR",
            type: "MERCHANT",
            message: "some error",
          });
        });
    });

    it("sends analytics event on failure", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            code: "A_BT_ERROR",
            type: "MERCHANT",
            message: "some error",
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.instance._client,
            "payment-request.tokenize.failed"
          );
        });
    });

    it("sends analytics event on payment request canceled", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            name: "AbortError",
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.instance._client,
            "payment-request.tokenize.canceled"
          );
        });
    });

    it("emits BraintreeError with type customer when customer cancels the payment request", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            name: "AbortError",
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("CUSTOMER");
          expect(err.code).toBe("PAYMENT_REQUEST_CANCELED");
          expect(err.message).toBe("Payment request was canceled.");
          expect(err.details.originalError).toEqual({
            name: "AbortError",
          });
        });
    });

    it("emits BraintreeError with type merchant when merchant misconfigures payment request", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            name: "PAYMENT_REQUEST_INITIALIZATION_FAILED",
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED");
          expect(err.message).toBe(
            "Something went wrong when configuring the payment request."
          );
          expect(err.details.originalError).toEqual({
            name: "PAYMENT_REQUEST_INITIALIZATION_FAILED",
          });
        });
    });

    it("emits BraintreeError with type merchant when emitted error is BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR",
            error: { message: "some-error" },
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE"
          );
          expect(err.message).toBe(
            "Something went wrong when tokenizing the Google Pay card."
          );
          expect(err.details.originalError).toEqual({
            name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR",
            error: { message: "some-error" },
          });
        });
    });

    it("emits BraintreeError with type unknown when emitted error is BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR",
            error: { message: "some-error" },
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("UNKNOWN");
          expect(err.code).toBe("PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR");
          expect(err.message).toBe(
            "Something went wrong when tokenizing the Google Pay card."
          );
          expect(err.details.originalError).toEqual({
            name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR",
            error: { message: "some-error" },
          });
        });
    });

    it("defaults payment request error to customer if not type is passed", () => {
      Bus.prototype.emit.mockImplementation(
        yieldsByEventAsync(events.PAYMENT_REQUEST_INITIALIZED, [
          {
            code: "A_BT_ERROR",
            type: "CUSTOMER",
            message: "some error",
          },
        ])
      );

      return testContext.instance
        .tokenize(testContext.configuration)
        .catch(({ type }) => {
          expect(type).toBe("CUSTOMER");
        });
    });
  });

  describe("createSupportedPaymentMethodsConfiguration", () => {
    it("throws an error if provided type is not provided", (done) => {
      expect.assertions(4);

      try {
        testContext.instance.createSupportedPaymentMethodsConfiguration();
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe(
          "PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_MUST_INCLUDE_TYPE"
        );
        expect(err.message).toBe(
          "createSupportedPaymentMethodsConfiguration must include a type parameter."
        );
        done();
      }
    });

    it("throws an error if provided type is not enabled for the merchant", (done) => {
      expect.assertions(4);

      try {
        testContext.instance.createSupportedPaymentMethodsConfiguration("foo");
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe(
          "PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_TYPE_NOT_ENABLED"
        );
        expect(err.message).toBe(
          "createSupportedPaymentMethodsConfiguration type parameter must be valid or enabled."
        );
        done();
      }
    });

    it("returns the default payment request object for provided type", () => {
      const basicCardConfiguration =
        testContext.instance.createSupportedPaymentMethodsConfiguration(
          "basicCard"
        );
      const googlePaymentConfiguration =
        testContext.instance.createSupportedPaymentMethodsConfiguration(
          "googlePay"
        );

      expect(basicCardConfiguration).toEqual({
        supportedMethods: "basic-card",
        data: {
          supportedNetworks: ["amex", "discover", "visa"],
        },
      });
      expect(googlePaymentConfiguration).toEqual({
        supportedMethods: "https://google.com/pay",
        data: {
          merchantId: "18278000977346790994",
          apiVersion: 1,
          environment: "TEST",
          allowedPaymentMethods: ["CARD", "TOKENIZED_CARD"],
          paymentMethodTokenizationParameters: {
            tokenizationType: "PAYMENT_GATEWAY",
            parameters: {
              gateway: "braintree",
              "braintree:merchantId": "merchant-id",
              "braintree:authorizationFingerprint": "fingerprint",
              "braintree:apiVersion": "v1",
              "braintree:sdkVersion": packageVersion,
              "braintree:metadata": `{"source":"client","integration":"custom","sessionId":"fakeSessionId","version":"${packageVersion}","platform":"web"}`,
            },
          },
          cardRequirements: {
            allowedCardNetworks: ["VISA", "AMEX"],
          },
        },
      });
    });

    it("can overwrite the defaults provided in data", () => {
      const basicCardConfiguration =
        testContext.instance.createSupportedPaymentMethodsConfiguration(
          "basicCard",
          {
            supportedNetworks: ["visa"],
            supportedTypes: ["credit"],
          }
        );
      const googlePaymentConfiguration =
        testContext.instance.createSupportedPaymentMethodsConfiguration(
          "googlePay",
          {
            environment: "PROD",
            apiVersion: 2,
          }
        );

      expect(basicCardConfiguration).toEqual({
        supportedMethods: "basic-card",
        data: {
          supportedNetworks: ["visa"],
          supportedTypes: ["credit"],
        },
      });
      expect(googlePaymentConfiguration).toEqual({
        supportedMethods: "https://google.com/pay",
        data: {
          merchantId: "18278000977346790994",
          apiVersion: 2,
          environment: "PROD",
          allowedPaymentMethods: ["CARD", "TOKENIZED_CARD"],
          paymentMethodTokenizationParameters: {
            tokenizationType: "PAYMENT_GATEWAY",
            parameters: {
              gateway: "braintree",
              "braintree:merchantId": "merchant-id",
              "braintree:authorizationFingerprint": "fingerprint",
              "braintree:apiVersion": "v1",
              "braintree:sdkVersion": packageVersion,
              "braintree:metadata": `{"source":"client","integration":"custom","sessionId":"fakeSessionId","version":"${packageVersion}","platform":"web"}`,
            },
          },
          cardRequirements: {
            allowedCardNetworks: ["VISA", "AMEX"],
          },
        },
      });
    });

    it("will leave default properties if not specified", () => {
      const basicCardConfiguration =
        testContext.instance.createSupportedPaymentMethodsConfiguration(
          "basicCard",
          {
            supportedTypes: ["credit"],
          }
        );
      const googlePaymentConfiguration =
        testContext.instance.createSupportedPaymentMethodsConfiguration(
          "googlePay",
          {
            environment: "PROD",
            apiVersion: 2,
          }
        );

      expect(basicCardConfiguration).toEqual({
        supportedMethods: "basic-card",
        data: {
          supportedNetworks: ["amex", "discover", "visa"],
          supportedTypes: ["credit"],
        },
      });

      expect(googlePaymentConfiguration).toEqual({
        supportedMethods: "https://google.com/pay",
        data: {
          merchantId: "18278000977346790994",
          apiVersion: 2,
          environment: "PROD",
          allowedPaymentMethods: ["CARD", "TOKENIZED_CARD"],
          paymentMethodTokenizationParameters: {
            tokenizationType: "PAYMENT_GATEWAY",
            parameters: {
              gateway: "braintree",
              "braintree:merchantId": "merchant-id",
              "braintree:authorizationFingerprint": "fingerprint",
              "braintree:apiVersion": "v1",
              "braintree:sdkVersion": packageVersion,
              "braintree:metadata": `{"source":"client","integration":"custom","sessionId":"fakeSessionId","version":"${packageVersion}","platform":"web"}`,
            },
          },
          cardRequirements: {
            allowedCardNetworks: ["VISA", "AMEX"],
          },
        },
      });
    });
  });

  describe("canMakePayment", () => {
    beforeEach(() => {
      testContext.originalPaymentRequest = window.PaymentRequest;
      window.PaymentRequest = testContext.originalPaymentRequest || {};

      testContext.configuration = {
        details: {},
        options: {},
      };
      testContext.pr = new PaymentRequestComponent({
        client: testContext.fakeClient,
      });

      Bus.prototype.emit.mockImplementation(yieldsAsync([null, true]));
    });

    afterEach(() => {
      window.PaymentRequest = testContext.originalPaymentRequest;
    });

    it("emits a canMakePayment event", () =>
      testContext.pr.canMakePayment(testContext.configuration).then(() => {
        expect(Bus.prototype.emit).toHaveBeenCalledTimes(1);
        expect(Bus.prototype.emit).toHaveBeenCalledWith(
          events.CAN_MAKE_PAYMENT,
          expect.any(Object),
          expect.any(Function)
        );
        expect(Bus.prototype.emit.mock.calls[0][1]).toMatchObject(
          testContext.configuration
        );
      }));

    it("defaults to default supported payment methods if not passed in with configuration", () => {
      delete testContext.configuration.supportedPaymentMethods;
      testContext.pr._defaultSupportedPaymentMethods = ["googlepay"];

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .then(() => {
          expect(Bus.prototype.emit).toHaveBeenCalledTimes(1);
          expect(Bus.prototype.emit).toHaveBeenCalledWith(
            events.CAN_MAKE_PAYMENT,
            expect.any(Object),
            expect.any(Function)
          );
          expect(Bus.prototype.emit.mock.calls[0][1]).toMatchObject({
            supportedPaymentMethods: ["googlepay"],
          });
        });
    });

    it("resolves with `true` if Bus responds with `true`", () => {
      Bus.prototype.emit.mockImplementation(yieldsAsync([null, true]));

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .then((result) => {
          expect(result).toBe(true);
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "payment-request.can-make-payment.true"
          );
        });
    });

    it("resolves with `false` if Bus responds with `false`", () => {
      Bus.prototype.emit.mockImplementation(yieldsAsync([null, false]));

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .then((result) => {
          expect(result).toBe(false);
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "payment-request.can-make-payment.false"
          );
        });
    });

    it("resolves with `false` if Payment Request global is not present", () => {
      Bus.prototype.emit.mockImplementation(yieldsAsync([null, true]));

      delete window.PaymentRequest;

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .then((result) => {
          expect(result).toBe(false);
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "payment-request.can-make-payment.not-available"
          );
        });
    });

    it("rejects if supportedPaymentMethods that are not compatible with the SDK are passed in", () => {
      testContext.configuration.supportedPaymentMethods = [
        {
          supportedMethods: "basic-card",
        },
        {
          supportedMethods: "foopay",
        },
        {
          supportedMethods: "https://google.com/pay",
        },
      ];

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD");
          expect(err.message).toBe("foopay is not a supported payment method.");
        });
    });

    it("resolves if supportedPaymentMethods that are compatible with the SDK are passed in", () => {
      Bus.prototype.emit.mockImplementation(yieldsAsync([null, true]));

      testContext.configuration.supportedPaymentMethods = [
        {
          supportedMethods: "basic-card",
        },
        {
          supportedMethods: "https://google.com/pay",
        },
      ];

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .then((result) => {
          expect(result).toBe(true);
        });
    });

    it("rejects if supportedPaymentMethods in array notation that are not compatible with the SDK are passed in", () => {
      testContext.configuration.supportedPaymentMethods = [
        {
          supportedMethods: ["basic-card"],
        },
        {
          supportedMethods: ["foopay"],
        },
        {
          supportedMethods: ["https://google.com/pay"],
        },
      ];

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD");
          expect(err.message).toBe("foopay is not a supported payment method.");
        });
    });

    it("resolves if supportedPaymentMethods in array notation that are compatible with the SDK are passed in", () => {
      Bus.prototype.emit.mockImplementation(yieldsAsync([null, true]));

      testContext.configuration.supportedPaymentMethods = [
        {
          supportedMethods: ["basic-card"],
        },
        {
          supportedMethods: ["https://google.com/pay"],
        },
      ];

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .then((result) => {
          expect(result).toBe(true);
        });
    });

    it("rejects if bus replies with an error", () => {
      const error = new Error("error");

      Bus.prototype.emit.mockImplementation(yieldsAsync([error]));

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED");
          expect(err.details.originalError).toBe(error);
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "payment-request.can-make-payment.failed"
          );
        });
    });

    it("rejects with a payment request initialization failed error", () => {
      const error = new Error("error");

      error.name = "PAYMENT_REQUEST_INITIALIZATION_FAILED";

      Bus.prototype.emit.mockImplementation(yieldsAsync([error]));

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED");
          expect(err.details.originalError).toBe(error);
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "payment-request.can-make-payment.failed"
          );
        });
    });

    it("rejects with a not allowed error", () => {
      const error = new Error("error");

      error.name = "NotAllowedError";

      Bus.prototype.emit.mockImplementation(yieldsAsync([error]));

      return testContext.pr
        .canMakePayment(testContext.configuration)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED");
          expect(err.details.originalError).toBe(error);
          expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "payment-request.can-make-payment.failed"
          );
        });
    });
  });

  describe("teardown", () => {
    beforeAll(() => {
      document.body.innerHTML = "";
    });

    beforeEach((done) => {
      Bus.prototype.teardown;
      testContext.instance.initialize().then(() => {
        done();
      });

      testContext.frameCanMakeRequests();
    });

    it("tears down bus", () =>
      testContext.instance.teardown().then(() => {
        expect(Bus.prototype.teardown).toHaveBeenCalledTimes(1);
      }));

    it("removes iframe from page", () => {
      expect(
        document.querySelector('iframe[name="braintree-payment-request-frame"]')
      ).toBeDefined();

      return testContext.instance.teardown().then(() => {
        expect(
          document.querySelector(
            'iframe[name="braintree-payment-request-frame"]'
          )
        ).toBeFalsy();
      });
    });

    it("calls teardown analytics", () =>
      testContext.instance.teardown().then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.instance._client,
          "payment-request.teardown-completed"
        );
      }));

    it("replaces all methods so error is thrown when methods are invoked", () => {
      const instance = testContext.instance;

      expect.assertions(32);

      return instance.teardown().then(() => {
        methods(PaymentRequestComponent.prototype).forEach((method) => {
          try {
            instance[method]();
          } catch (error) {
            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe(BraintreeError.types.MERCHANT);
            expect(error.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(error.message).toBe(
              `${method} cannot be called after teardown.`
            );
          }
        });
      });
    });
  });
});
