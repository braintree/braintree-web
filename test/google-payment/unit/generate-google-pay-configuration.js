import generateGooglePayConfiguration from "../../../src/google-payment/generate-google-pay-configuration";
import { fake } from "../../helpers";
import { version as VERSION } from "../../../package.json";

describe("generateGooglePayConfiguration", () => {
  let testContext;

  beforeEach(() => {
    const configuration = fake.configuration();

    configuration.gatewayConfiguration.googlePay = {
      displayName: "merchant",
      environment: "SANDBOX",
      googleAuthorization: "fake-google-authorization",
      paypalClientId: "",
      supportedCardBrands: ["VISA", "AMERICAN_EXPRESS"],
    };

    testContext = { configuration };
  });

  describe("Google Pay v2", () => {
    it("returns a v2 payment data request", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(data.apiVersion).toBe(2);
      expect(data.apiVersionMinor).toBe(0);
      expect(data.allowedPaymentMethods).toHaveLength(1);
      expect(data.allowedPaymentMethods[0].type).toBe("CARD");
    });

    it("sets the TEST environment for a sandbox configuration", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(data.environment).toBe("TEST");
    });

    it("sets the PRODUCTION environment for a production configuration", () => {
      testContext.configuration.gatewayConfiguration.environment = "production";

      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(data.environment).toBe("PRODUCTION");
    });

    it("maps native supportedCardBrands to Google Pay allowed card networks", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(
        data.allowedPaymentMethods[0].parameters.allowedCardNetworks
      ).toEqual(["VISA", "AMEX"]);
    });

    it("maps INTERNATIONAL_MAESTRO to MAESTRO", () => {
      testContext.configuration.gatewayConfiguration.googlePay.supportedCardBrands =
        ["VISA", "INTERNATIONAL_MAESTRO"];

      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(
        data.allowedPaymentMethods[0].parameters.allowedCardNetworks
      ).toEqual(["VISA", "MAESTRO"]);
    });

    it("drops unsupported card brands", () => {
      testContext.configuration.gatewayConfiguration.googlePay.supportedCardBrands =
        ["VISA", "DINERS", "UK_MAESTRO"];

      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(
        data.allowedPaymentMethods[0].parameters.allowedCardNetworks
      ).toEqual(["VISA"]);
    });

    it("passes googleAuthorization as the braintree authorization fingerprint", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(
        data.allowedPaymentMethods[0].tokenizationSpecification.parameters[
          "braintree:authorizationFingerprint"
        ]
      ).toBe("fake-google-authorization");
    });

    it("includes the sdk version in the tokenization parameters", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(
        data.allowedPaymentMethods[0].tokenizationSpecification.parameters[
          "braintree:sdkVersion"
        ]
      ).toBe(VERSION);
    });

    it("does not set merchantInfo when no googleMerchantId is provided", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(data.merchantInfo).toBeUndefined();
    });

    it("sets merchantInfo when a googleMerchantId is provided", () => {
      const data = generateGooglePayConfiguration(
        testContext.configuration,
        2,
        "google-merchant-id"
      );

      expect(data.merchantInfo).toEqual({
        merchantId: "google-merchant-id",
      });
    });

    it("does not add a PayPal payment method when paypalClientId is falsy", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 2);

      expect(data.allowedPaymentMethods).toHaveLength(1);
    });

    it("adds a PayPal payment method when paypalClientId is present", () => {
      testContext.configuration.gatewayConfiguration.googlePay.paypalClientId =
        "paypal-client-id";

      const data = generateGooglePayConfiguration(testContext.configuration, 2);
      const paypalMethod = data.allowedPaymentMethods[1];

      expect(data.allowedPaymentMethods).toHaveLength(2);
      expect(paypalMethod.type).toBe("PAYPAL");
      expect(
        paypalMethod.parameters.purchase_context.purchase_units[0].payee
          .client_id
      ).toBe("paypal-client-id");
      expect(
        paypalMethod.tokenizationSpecification.parameters[
          "braintree:paypalClientId"
        ]
      ).toBe("paypal-client-id");
    });
  });

  describe("Google Pay v1", () => {
    it("returns a v1 payment data request", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 1);

      expect(data.apiVersion).toBe(1);
      expect(data.allowedPaymentMethods).toEqual(["CARD", "TOKENIZED_CARD"]);
    });

    it("sets the TEST environment for a sandbox configuration", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 1);

      expect(data.environment).toBe("TEST");
    });

    it("maps native supportedCardBrands in cardRequirements", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 1);

      expect(data.cardRequirements.allowedCardNetworks).toEqual([
        "VISA",
        "AMEX",
      ]);
    });

    it("passes googleAuthorization as the braintree authorization fingerprint", () => {
      const data = generateGooglePayConfiguration(testContext.configuration, 1);

      expect(
        data.paymentMethodTokenizationParameters.parameters[
          "braintree:authorizationFingerprint"
        ]
      ).toBe("fake-google-authorization");
    });

    it("adds braintree:clientKey for a tokenization key authorization", () => {
      testContext.configuration.authorizationType = "TOKENIZATION_KEY";
      testContext.configuration.authorization = "fake-tokenization-key";

      const data = generateGooglePayConfiguration(testContext.configuration, 1);

      expect(
        data.paymentMethodTokenizationParameters.parameters[
          "braintree:clientKey"
        ]
      ).toBe("fake-tokenization-key");
    });

    it("does not add braintree:clientKey for a non-tokenization-key authorization", () => {
      testContext.configuration.authorizationType = "CLIENT_TOKEN";

      const data = generateGooglePayConfiguration(testContext.configuration, 1);

      expect(
        data.paymentMethodTokenizationParameters.parameters
      ).not.toHaveProperty("braintree:clientKey");
    });

    it("sets merchantId when a googleMerchantId is provided", () => {
      const data = generateGooglePayConfiguration(
        testContext.configuration,
        1,
        "google-merchant-id"
      );

      expect(data.merchantId).toBe("google-merchant-id");
    });
  });
});
