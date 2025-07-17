"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/create-deferred-client");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/basic-component-verification");

const analytics = require("../../../src/lib/analytics");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const BraintreeError = require("../../../src/lib/braintree-error");
const GooglePayment = require("../../../src/google-payment/google-payment");
const { fake } = require("../../helpers");
const methods = require("../../../src/lib/methods");
const { version: VERSION } = require("../../../package.json");

describe("GooglePayment", () => {
  let testContext;

  beforeEach(() => {
    const configuration = fake.configuration();

    testContext = {};
    configuration.gatewayConfiguration.androidPay = {
      enabled: true,
      googleAuthorizationFingerprint: "fingerprint",
      supportedNetworks: ["visa", "amex"],
    };

    testContext.fakeClient = fake.client({
      configuration,
    });
    testContext.googlePayment = new GooglePayment({
      useDeferredClient: true,
      createPromise: Promise.resolve(testContext.fakeClient),
    });
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.fakeClient);
  });

  describe("createPaymentDataRequest", () => {
    describe("GooglePay v1 schema", () => {
      it("returns a payment data request object", () => {
        return testContext.googlePayment
          .createPaymentDataRequest()
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.environment).toBe("TEST");
            expect(paymentDataRequest.allowedPaymentMethods).toEqual([
              "CARD",
              "TOKENIZED_CARD",
            ]);
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters
                .tokenizationType
            ).toBe("PAYMENT_GATEWAY");
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters.parameters
                .gateway
            ).toBe("braintree");
          });
      });

      it("can override parameters with v1 schema overrides and return a v1 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            merchantId: "my-id",
            environment: "PRODUCTION",
            allowedPaymentMethods: ["FOO"],
            cardRequirements: {
              allowedCardNetworks: ["foo", "bar"],
              prop: "value",
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.merchantId).toBe("my-id");
            expect(paymentDataRequest.environment).toBe("PRODUCTION");
            expect(paymentDataRequest.allowedPaymentMethods).toEqual(["FOO"]);
            expect(
              paymentDataRequest.cardRequirements.allowedCardNetworks
            ).toEqual(["foo", "bar"]);
            expect(paymentDataRequest.cardRequirements.prop).toBe("value");
          });
      });

      it("can override existing parameters with v1 schema overrides and return a v1 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            merchantId: "my-id",
            environment: "PRODUCTION",
            allowedPaymentMethods: ["CARD"],
            cardRequirements: {
              allowedCardNetworks: ["foo", "bar"],
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.merchantId).toBe("my-id");
            expect(paymentDataRequest.environment).toBe("PRODUCTION");
            expect(paymentDataRequest.allowedPaymentMethods).toEqual(["CARD"]);
            expect(
              paymentDataRequest.cardRequirements.allowedCardNetworks
            ).toEqual(["foo", "bar"]);
          });
      });

      it("retains allowed card networks from default if not passed in with v1 schema", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            merchantId: "my-id",
            environment: "PRODUCTION",
            allowedPaymentMethods: ["FOO"],
            cardRequirements: {
              prop: "value",
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.cardRequirements.prop).toBe("value");
            expect(
              paymentDataRequest.cardRequirements.allowedCardNetworks
            ).toEqual(["VISA", "AMEX"]);
          });
      });

      it("overrides shipping address info with v1 params and returns a v1 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            shippingAddressRequired: false,
            shippingAddressRequirements: {
              allowedCountryCodes: ["US", "CA"],
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(2);
            expect(paymentDataRequest.shippingAddressRequired).toBe(false);
            expect(paymentDataRequest.shippingAddressRequirements).toEqual({
              allowedCountryCodes: ["US", "CA"],
            });
          });
      });

      it("overrides paymentMethodTokenizationParameters info with v1 params and returns a v1 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            paymentMethodTokenizationParameters: {
              tokenizationType: "TEST_GATEWAY",
              parameters: {
                gateway: "test-gateway",
                gatewayMerchantId: "test-merchant-id",
              },
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(2);
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters
                .tokenizationType
            ).toBe("TEST_GATEWAY");
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters.parameters
                .gateway
            ).toBe("test-gateway");
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters.parameters
                .gatewayMerchantId
            ).toBe("test-merchant-id");
          });
      });

      it("overrides billing address info with v1 params and returns a v1 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            cardRequirements: {
              billingAddressRequired: true,
              billingAddressFormat: "FULL",
            },
            phoneNumberRequired: true,
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(2);
            expect(
              paymentDataRequest.cardRequirements.billingAddressRequired
            ).toBe(true);
            expect(
              paymentDataRequest.cardRequirements.billingAddressFormat
            ).toBe("FULL");
            expect(paymentDataRequest.phoneNumberRequired).toBe(true);
          });
      });

      it("does not include a merchant id by default", () => {
        return testContext.googlePayment
          .createPaymentDataRequest()
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.merchantId).toBeFalsy();
          });
      });

      it("sends an analytics event", () => {
        return testContext.googlePayment.createPaymentDataRequest().then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "google-payment.v1.createPaymentDataRequest"
          );
        });
      });
    });

    describe("GooglePay v2 schema", () => {
      beforeEach(() => {
        const options = {
          useDeferredClient: true,
          createPromise: Promise.resolve(testContext.fakeClient),
          googlePayVersion: 2,
        };

        testContext.googlePayment = new GooglePayment(options);
      });

      it("returns a v2 payment data request object when v2 is specified", () => {
        return testContext.googlePayment
          .createPaymentDataRequest()
          .then((paymentDataRequest) => {
            const cardPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "CARD"
              );

            expect(paymentDataRequest.environment).toBe("TEST");
            expect(cardPaymentMethod.type).toBe("CARD");
            expect(cardPaymentMethod.tokenizationSpecification.type).toBe(
              "PAYMENT_GATEWAY"
            );
            expect(
              cardPaymentMethod.tokenizationSpecification.parameters.gateway
            ).toBe("braintree");
          });
      });

      it("can override existing parameters with v2 schema overrides and return a v2 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            apiVersion: 2,
            merchantInfo: {
              merchantId: "my-id",
            },
            environment: "PRODUCTION",
            allowedPaymentMethods: [
              {
                type: "CARD",
                parameters: {
                  allowedAuthMethods: ["foo", "bar"],
                  billingAddressRequired: true,
                },
              },
            ],
          })
          .then((paymentDataRequest) => {
            const cardPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "CARD"
              );

            expect(paymentDataRequest.merchantInfo.merchantId).toBe("my-id");
            expect(paymentDataRequest.environment).toBe("PRODUCTION");
            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(1);
            expect(cardPaymentMethod.type).toBe("CARD");
            expect(cardPaymentMethod.parameters.allowedAuthMethods).toEqual([
              "foo",
              "bar",
            ]);
            expect(cardPaymentMethod.parameters.billingAddressRequired).toBe(
              true
            );
            expect(cardPaymentMethod.parameters.allowedCardNetworks).toEqual([
              "VISA",
              "AMEX",
            ]);
            expect(cardPaymentMethod.tokenizationSpecification).toBeDefined();
          });
      });

      it("can add new parameters with v2 schema overrides and return a v2 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            apiVersion: 2,
            merchantInfo: {
              merchantId: "my-id",
            },
            environment: "PRODUCTION",
            allowedPaymentMethods: [
              {
                type: "FOO",
                parameters: {
                  allowedCardNetworks: ["foo", "bar"],
                },
              },
            ],
          })
          .then((paymentDataRequest) => {
            const fooPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "FOO"
              );

            expect(paymentDataRequest.merchantInfo.merchantId).toBe("my-id");
            expect(paymentDataRequest.environment).toBe("PRODUCTION");
            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(1);
            expect(fooPaymentMethod.type).toBe("FOO");
            expect(fooPaymentMethod.parameters.allowedCardNetworks).toEqual([
              "foo",
              "bar",
            ]);
          });
      });

      it("transfers allowed card networks from default to new CARD but not others if not passed in with v2 schema", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            apiVersion: 2,
            merchantInfo: {
              merchantId: "my-id",
            },
            environment: "PRODUCTION",
            allowedPaymentMethods: [
              {
                type: "CARD",
              },
              {
                type: "FOO",
              },
            ],
          })
          .then((paymentDataRequest) => {
            const fooPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "FOO"
              );
            const cardPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "CARD"
              );

            expect(fooPaymentMethod.type).toBe("FOO");
            expect(fooPaymentMethod.parameters).toBeUndefined();
            expect(cardPaymentMethod.type).toBe("CARD");
            expect(cardPaymentMethod.parameters.allowedCardNetworks).toEqual([
              "VISA",
              "AMEX",
            ]);
          });
      });

      it("overrides shipping address info with v2 params and returns a v2 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            apiVersion: 2,
            shippingAddressRequired: false,
            shippingAddressParameters: {
              allowedCountryCodes: ["US", "CA"],
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(1);
            expect(paymentDataRequest.shippingAddressRequired).toBe(false);
            expect(paymentDataRequest.shippingAddressParameters).toEqual({
              allowedCountryCodes: ["US", "CA"],
            });
          });
      });

      it("overrides tokenizationSpecification info with v2 params and returns a v2 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            apiVersion: 2,
            allowedPaymentMethods: [
              {
                type: "CARD",
                tokenizationSpecification: {
                  type: "TEST_GATEWAY",
                  parameters: {
                    gateway: "test-gateway",
                    gatewayMerchantId: "test-merchant-id",
                  },
                },
              },
            ],
          })
          .then((paymentDataRequest) => {
            const cardPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "CARD"
              );

            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(1);
            expect(cardPaymentMethod.tokenizationSpecification.type).toBe(
              "TEST_GATEWAY"
            );
            expect(
              cardPaymentMethod.tokenizationSpecification.parameters.gateway
            ).toBe("test-gateway");
            expect(
              cardPaymentMethod.tokenizationSpecification.parameters
                .gatewayMerchantId
            ).toBe("test-merchant-id");
          });
      });

      it("overrides billing address info with v2 params and returns a v2 schema config", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            apiVersion: 2,
            allowedPaymentMethods: [
              {
                type: "CARD",
                parameters: {
                  billingAddressRequired: true,
                  billingAddressParameters: {
                    phoneNumberRequired: true,
                    format: "FULL",
                  },
                },
              },
            ],
          })
          .then((paymentDataRequest) => {
            const cardPaymentMethod =
              paymentDataRequest.allowedPaymentMethods.find(
                (el) => el.type === "CARD"
              );

            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(1);
            expect(cardPaymentMethod.parameters.billingAddressRequired).toBe(
              true
            );
            expect(
              cardPaymentMethod.parameters.billingAddressParameters
            ).toEqual({
              format: "FULL",
              phoneNumberRequired: true,
            });
          });
      });

      it("includes a PAYPAL allowedPaymentMethod in v2 if paypal is enabled", () => {
        let paypalPaymentMethod, client, googlePayment;

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
        createDeferredClient.create.mockResolvedValue(client);
        googlePayment = new GooglePayment({
          useDeferredClient: true,
          createPromise: Promise.resolve(client),
          googlePayVersion: 2,
        });

        return googlePayment
          .createPaymentDataRequest()
          .then((paymentDataRequest) => {
            paypalPaymentMethod = paymentDataRequest.allowedPaymentMethods.find(
              (el) => el.type === "PAYPAL"
            );

            expect(paymentDataRequest.allowedPaymentMethods.length).toBe(2);
            expect(paypalPaymentMethod.type).toBe("PAYPAL");
            expect(paypalPaymentMethod.parameters.purchase_context).toEqual({
              purchase_units: [
                {
                  payee: {
                    client_id: "paypal_client_id",
                  },

                  recurring_payment: true,
                },
              ],
            });
            expect(paypalPaymentMethod.tokenizationSpecification.type).toBe(
              "PAYMENT_GATEWAY"
            );
            expect(
              paypalPaymentMethod.tokenizationSpecification.parameters
            ).toMatchObject({
              gateway: "braintree",
              "braintree:merchantId": "merchant-id",
              "braintree:apiVersion": "v1",
              "braintree:sdkVersion": VERSION,
              "braintree:paypalClientId": "paypal_client_id",
            });
            expect(
              typeof paypalPaymentMethod.tokenizationSpecification.parameters[
                "braintree:metadata"
              ]
            ).toBe("string");
          });
      });

      it("does not include a merchant id by default", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({ apiVersion: 2 })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.merchantInfo).toBeFalsy();
          });
      });

      it("sends an analytics event", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({ apiVersion: 2 })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "google-payment.v2.createPaymentDataRequest"
            );
          });
      });
    });

    describe("when passing totalPrice values", () => {
      it("converts numbers to strings", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            transactionInfo: {
              totalPrice: 15,
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.transactionInfo.totalPrice).toBe("15");
          });
      });
      it("leaves strings unchanged", () => {
        return testContext.googlePayment
          .createPaymentDataRequest({
            transactionInfo: {
              totalPrice: "15.00",
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.transactionInfo.totalPrice).toBe("15.00");
          });
      });
    });

    describe("when using options during instance construction", () => {
      it("preserves options in a GooglePayment instance", () => {
        const googlePayment = new GooglePayment({
          useDeferredClient: true,
          createPromise: Promise.resolve(testContext.fakeClient),
          googlePayVersion: 2,
        });

        return googlePayment
          .createPaymentDataRequest()
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.apiVersion).toBe(2);
          });
      });

      it("overrides instantiation options if both are specified", () => {
        const googlePayment = new GooglePayment({
          useDeferredClient: true,
          createPromise: Promise.resolve(testContext.fakeClient),
          googlePayVersion: 2,
          googleMerchantId: "some-merchant-id",
        });

        return googlePayment
          .createPaymentDataRequest({
            merchantInfo: {
              merchantName: "merchantName",
              merchantId: "some-other-merchant-id",
            },
          })
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.merchantInfo).toEqual({
              merchantName: "merchantName",
              merchantId: "some-other-merchant-id",
            });
          });
      });

      it("returns a promise that resolves with the data request object if instance was instanitated with a deferred client", () => {
        const googlePayment = new GooglePayment({
          useDeferredClient: true,
          createPromise: Promise.resolve(testContext.fakeClient),
        });

        return googlePayment
          .createPaymentDataRequest()
          .then((paymentDataRequest) => {
            expect(paymentDataRequest.environment).toBe("TEST");
            expect(paymentDataRequest.allowedPaymentMethods).toEqual([
              "CARD",
              "TOKENIZED_CARD",
            ]);
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters
                .tokenizationType
            ).toBe("PAYMENT_GATEWAY");
            expect(
              paymentDataRequest.paymentMethodTokenizationParameters.parameters
                .gateway
            ).toBe("braintree");
          });
      });

      it("returns an the data request object if instance was instanitated without a deferred client", () => {
        const googlePayment = new GooglePayment({
          client: testContext.fakeClient,
          createPromise: Promise.resolve(testContext.fakeClient),
        });
        const paymentDataRequest = googlePayment.createPaymentDataRequest();

        expect(paymentDataRequest.environment).toBe("TEST");
        expect(paymentDataRequest.allowedPaymentMethods).toEqual([
          "CARD",
          "TOKENIZED_CARD",
        ]);
        expect(
          paymentDataRequest.paymentMethodTokenizationParameters
            .tokenizationType
        ).toBe("PAYMENT_GATEWAY");
        expect(
          paymentDataRequest.paymentMethodTokenizationParameters.parameters
            .gateway
        ).toBe("braintree");
      });
    });
  });

  describe("parseResponse", () => {
    it("resolves with parsed response from Google Pay tokenization", () => {
      const rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token:
            '{"androidPayCards":[{"type":"AndroidPayCard","nonce":"nonce-1234","description":"Android Pay","consumed":false,"details":{"cardType":"Visa","lastTwo":"24","lastFour":"7224","isNetworkTokenized":false,"bin":"411111"},"binData":{"prepaid":"No","healthcare":"Unknown","debit":"Unknown","durbinRegulated":"Unknown","commercial":"Unknown","payroll":"Unknown","issuingBank":"Unknown","countryOfIssuance":"","productId":"Unknown","business":"Unknown","consumer":"Unknown","purchase":"Unknown","corporate":"Unknown"}}]}',
          tokenizationType: "PAYMENT_GATEWAY",
        },
      };

      return testContext.googlePayment
        .parseResponse(rawResponse)
        .then((parsedResponse) => {
          expect(parsedResponse).toEqual({
            nonce: "nonce-1234",
            type: "AndroidPayCard",
            description: "Android Pay",
            details: {
              cardType: "Visa",
              lastFour: "7224",
              lastTwo: "24",
              isNetworkTokenized: false,
              bin: "411111",
            },
            binData: {
              prepaid: "No",
              healthcare: "Unknown",
              debit: "Unknown",
              durbinRegulated: "Unknown",
              commercial: "Unknown",
              payroll: "Unknown",
              issuingBank: "Unknown",
              countryOfIssuance: "",
              productId: "Unknown",
              business: "Unknown",
              consumer: "Unknown",
              purchase: "Unknown",
              corporate: "Unknown",
            },
          });
        });
    });

    it("passes back Braintree error when tokenization fails", () => {
      const rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"error":{"message":"Record not found"},"fieldErrors":[]}',
          tokenizationType: "PAYMENT_GATEWAY",
        },
      };

      return expect(
        testContext.googlePayment.parseResponse(rawResponse)
      ).rejects.toMatchObject({
        code: "GOOGLE_PAYMENT_GATEWAY_ERROR",
        message:
          "There was an error when tokenizing the Google Pay payment method.",
      });
    });

    it("passes back Braintree error when JSON parsing fails", () => {
      const rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"foo:{}}',
          tokenizationType: "PAYMENT_GATEWAY",
        },
      };

      return expect(
        testContext.googlePayment.parseResponse(rawResponse)
      ).rejects.toMatchObject({
        code: "GOOGLE_PAYMENT_GATEWAY_ERROR",
        message:
          "There was an error when tokenizing the Google Pay payment method.",
      });
    });

    it("sends analytics events when google-payment payment method nonce payload is parsed", () => {
      const rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token:
            '{"androidPayCards":[{"type":"AndroidPayCard","nonce":"nonce-1234","description":"Android Pay","consumed":false,"details":{"cardType":"Visa","lastTwo":"24","lastFour":"7224","isNetworkTokenized":false,"bin":"411111"},"binData":{"prepaid":"No","healthcare":"Unknown","debit":"Unknown","durbinRegulated":"Unknown","commercial":"Unknown","payroll":"Unknown","issuingBank":"Unknown","countryOfIssuance":"","productId":"Unknown"}}]}',
          tokenizationType: "PAYMENT_GATEWAY",
        },
      };

      return testContext.googlePayment.parseResponse(rawResponse).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "google-payment.parseResponse.succeeded"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "google-payment.parseResponse.succeeded.google-payment"
        );
      });
    });

    it("sends analytics events when paypal payment method nonce payload is parsed", () => {
      const rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token:
            '{"paypalAccounts":[{"type":"PayPalAccount","nonce":"nonce-1234","description":"PayPal","consumed":false,"details":{"correlationId":null}}]}',
          tokenizationType: "PAYMENT_GATEWAY",
        },
      };

      return testContext.googlePayment.parseResponse(rawResponse).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "google-payment.parseResponse.succeeded"
        );
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "google-payment.parseResponse.succeeded.paypal"
        );
      });
    });

    it("sends an analytics event when tokenization results in an error", () => {
      const rawResponse = {
        cardInfo: {},
        paymentMethodToken: {
          token: '{"foo:{}}',
          tokenizationType: "PAYMENT_GATEWAY",
        },
      };

      return Promise.resolve()
        .then(() => {
          return expect(
            testContext.googlePayment.parseResponse(rawResponse)
          ).rejects.toThrow(
            "There was an error when tokenizing the Google Pay payment method."
          );
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "google-payment.parseResponse.failed"
          );
        });
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", () => {
      const instance = testContext.googlePayment;

      return instance.teardown().then(() => {
        methods(GooglePayment.prototype).forEach((method) => {
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
      });
    });
  });
});
