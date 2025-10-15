"use strict";

jest.mock("../../../src/lib/analytics");

const analytics = require("../../../src/lib/analytics");
const VisaCheckout = require("../../../src/visa-checkout/visa-checkout");
const BraintreeError = require("../../../src/lib/braintree-error");
const {
  fake: { configuration },
} = require("../../helpers");
const methods = require("../../../src/lib/methods");

describe("Visa Checkout", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.client = {
      request: jest.fn().mockResolvedValue({
        visaCheckoutCards: [],
      }),
      getConfiguration: () => testContext.configuration,
    };
    testContext.visaCheckout = new VisaCheckout({
      client: testContext.client,
    });
  });

  describe("createInitOptions", () => {
    it("throws an error if options is not defined", () => {
      expect.assertions(4);

      try {
        VisaCheckout.prototype.createInitOptions.call({
          _client: testContext.client,
          _transformCardTypes: VisaCheckout.prototype._transformCardTypes,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe("VISA_CHECKOUT_INIT_OPTIONS_REQUIRED");
        expect(err.type).toBe("MERCHANT");
        expect(err.message).toBe("initOptions requires an object.");
      }
    });

    it.each([
      {
        description: "sets apikey if undefined",
        options: {},
        valueExtractor: function (option) {
          return option.apikey;
        },
        expectedValue: "gwApikey",
      },
      {
        description: "does not overwrite apikey if defined",
        options: { apikey: "apikey" },
        valueExtractor: function (option) {
          return option.apikey;
        },
        expectedValue: "apikey",
      },
      {
        description: "sets encryptionKey",
        options: {},
        valueExtractor: function (option) {
          return option.encryptionKey;
        },
        expectedValue: "gwEncryptionKey",
      },
      {
        description: "sets externalClientId if undefined",
        options: {},
        valueExtractor: function (option) {
          return option.externalClientId;
        },
        expectedValue: "gwExternalClientId",
      },
      {
        description: "does not overwrite externalClientId if defined",
        options: { externalClientId: "externalClientId" },
        valueExtractor: function (option) {
          return option.externalClientId;
        },
        expectedValue: "externalClientId",
      },
      {
        description: "sets settings.dataLevel if undefined",
        options: {},
        valueExtractor: function (option) {
          return option.settings.dataLevel;
        },
        expectedValue: "FULL",
      },
      {
        description: "overwrites settings.dataLevel if defined",
        options: { settings: { dataLevel: "summary" } },
        valueExtractor: function (option) {
          return option.settings.dataLevel;
        },
        expectedValue: "FULL",
      },
    ])("$description", ({ options, valueExtractor, expectedValue }) => {
      const initOptions = VisaCheckout.prototype.createInitOptions.call(
        {
          _client: testContext.client,
        },
        options
      );

      expect(valueExtractor(initOptions)).toBe(expectedValue);
    });

    it.each([
      {
        inputOptions: {},
        description:
          "transforms gateway visaCheckout.supportedCardTypes to settings.payment.cardBrands if undefined",
        expectedCardBrands: ["VISA", "MASTERCARD", "DISCOVER", "AMEX"],
      },
      {
        inputOptions: {
          settings: { payment: { cardBrands: ["CARD1", "CARD2"] } },
        },
        description:
          "does not overwrite settings.payment.cardBrands if defined",
        expectedCardBrands: ["CARD1", "CARD2"],
      },
    ])("$description", ({ inputOptions, expectedCardBrands }) => {
      const initOptions = VisaCheckout.prototype.createInitOptions.call(
        {
          _client: testContext.client,
        },
        inputOptions
      );

      expect(initOptions.settings.payment.cardBrands).toEqual(
        expectedCardBrands
      );
    });

    it("does not mutate incoming options", () => {
      const originalOptions = {
        settings: {
          dataLevel: "summary",
        },
      };

      VisaCheckout.prototype.createInitOptions.call(
        {
          _client: testContext.client,
          _transformCardTypes: VisaCheckout.prototype._transformCardTypes,
        },
        originalOptions
      );

      expect(originalOptions).toEqual({
        settings: {
          dataLevel: "summary",
        },
      });
    });
  });

  describe("tokenize", () => {
    it.each([["callid"], ["encKey"], ["encPaymentData"]])(
      "rejects with error when payment.%s is undefined",
      (optionKey) => {
        const options = {
          callid: "callId",
          encKey: "encKey",
          encPaymentdata: "encPaymentData",
        };

        delete options[optionKey];

        return testContext.visaCheckout.tokenize(options).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("VISA_CHECKOUT_PAYMENT_REQUIRED");
          expect(err.type).toBe("MERCHANT");
          expect(err.message).toBe(
            "tokenize requires callid, encKey, and encPaymentData."
          );
        });
      }
    );

    it("makes a request with the proper data", () => {
      const payment = {
        callid: "callid",
        encKey: "encKey",
        encPaymentData: "encPaymentData",
      };

      return testContext.visaCheckout.tokenize(payment).then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith({
          method: "post",
          endpoint: "payment_methods/visa_checkout_cards",
          data: {
            _meta: { source: "visa-checkout" },
            visaCheckoutCard: {
              callId: "callid",
              encryptedKey: "encKey",
              encryptedPaymentData: "encPaymentData",
            },
          },
        });
      });
    });

    it("rejects with error if the request fails", () => {
      const originalError = new BraintreeError({
        type: "NETWORK",
        code: "CODE",
        message: "message",
      });

      testContext.client.request.mockRejectedValue(originalError);

      return testContext.visaCheckout
        .tokenize({
          callid: "callId",
          encKey: "encKey",
          encPaymentData: "encPaymentData",
        })
        .catch((err) => {
          expect(err.type).toBe(BraintreeError.types.NETWORK);
          expect(err.code).toBe("VISA_CHECKOUT_TOKENIZATION");
          expect(err.message).toBe(
            "A network error occurred when processing the Visa Checkout payment."
          );
          expect(err.details.originalError).toBe(originalError);
        });
    });

    it("resolves with a tokenized payload when success", () => {
      const tokenizedPayload = {
        foo: "baz",
      };

      testContext.client.request.mockResolvedValue({
        visaCheckoutCards: [tokenizedPayload],
      });

      return testContext.visaCheckout
        .tokenize({
          callid: "callId",
          encKey: "encKey",
          encPaymentData: "encPaymentData",
        })
        .then((payload) => {
          expect(payload.foo).toBe("baz");
        });
    });
  });

  describe("analytics", () => {
    describe("tokenize", () => {
      it("submits succeeded", () => {
        testContext.client.request.mockResolvedValue({
          visaCheckoutCards: [{}],
        });

        return VisaCheckout.prototype.tokenize
          .call(
            {
              _client: testContext.client,
            },
            {
              callid: "callId",
              encKey: "encKey",
              encPaymentData: "encPaymentData",
            }
          )
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.client,
              "visacheckout.tokenize.succeeded"
            );
          });
      });

      it("submits failed", () => {
        testContext.client.request.mockRejectedValue(new Error());

        return VisaCheckout.prototype.tokenize
          .call(
            {
              _client: testContext.client,
            },
            {
              callid: "callId",
              encKey: "encKey",
              encPaymentData: "encPaymentData",
            }
          )
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.client,
              "visacheckout.tokenize.failed"
            );
          });
      });
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", () => {
      const instance = testContext.visaCheckout;

      instance.teardown().then(() => {
        methods(VisaCheckout.prototype).forEach((method) => {
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
  });
});
