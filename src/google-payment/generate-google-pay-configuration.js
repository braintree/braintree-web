// @ts-nocheck
import { assign } from "../lib/assign";
const VERSION = __SDK_VERSION__;

// Maps the native GraphQL supportedCardBrands enum values to the card network
// tokens Google Pay expects in allowedCardNetworks. Brands not present in this
// map are dropped (Google Pay would reject unsupported networks).
var GOOGLE_PAY_CARD_BRAND_MAP = {
  VISA: "VISA",
  MASTERCARD: "MASTERCARD",
  DISCOVER: "DISCOVER",
  AMERICAN_EXPRESS: "AMEX",
  INTERNATIONAL_MAESTRO: "MAESTRO",
  ELO: "ELO",
};

function mapSupportedCardBrands(supportedCardBrands) {
  return supportedCardBrands.reduce(function (networks, brand) {
    if (GOOGLE_PAY_CARD_BRAND_MAP.hasOwnProperty(brand)) {
      return networks.concat(GOOGLE_PAY_CARD_BRAND_MAP[brand]);
    }

    return networks;
  }, []);
}

function generateTokenizationParameters(configuration, overrides) {
  var metadata = configuration.analyticsMetadata;
  var basicTokenizationParameters = {
    gateway: "braintree",
    "braintree:merchantId": configuration.gatewayConfiguration.merchantId,
    "braintree:apiVersion": "v1",
    "braintree:sdkVersion": VERSION,
    "braintree:metadata": JSON.stringify({
      source: metadata.source,
      integration: metadata.integration,
      sessionId: metadata.sessionId,
      version: VERSION,
      platform: metadata.platform,
    }),
  };

  return assign({}, basicTokenizationParameters, overrides);
}

export default function (configuration, googlePayVersion, googleMerchantId) {
  var data, paypalPaymentMethod;
  var googlePayConfiguration = configuration.gatewayConfiguration.googlePay;
  var environment =
    configuration.gatewayConfiguration.environment === "production"
      ? "PRODUCTION"
      : "TEST";

  if (googlePayVersion === 2) {
    data = {
      apiVersion: 2,
      apiVersionMinor: 0,
      environment: environment,
      allowedPaymentMethods: [
        {
          type: "CARD",
          parameters: {
            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
            allowedCardNetworks: mapSupportedCardBrands(
              googlePayConfiguration.supportedCardBrands
            ),
          },
          tokenizationSpecification: {
            type: "PAYMENT_GATEWAY",
            parameters: generateTokenizationParameters(configuration, {
              "braintree:authorizationFingerprint":
                googlePayConfiguration.googleAuthorization,
            }),
          },
        },
      ],
    };

    if (googleMerchantId) {
      data.merchantInfo = {
        merchantId: googleMerchantId,
      };
    }

    if (googlePayConfiguration.paypalClientId) {
      paypalPaymentMethod = {
        type: "PAYPAL",
        parameters: {
          /* eslint-disable camelcase */
          purchase_context: {
            purchase_units: [
              {
                payee: {
                  client_id: googlePayConfiguration.paypalClientId,
                },
                recurring_payment: true,
              },
            ],
          },
          /* eslint-enable camelcase */
        },
        tokenizationSpecification: {
          type: "PAYMENT_GATEWAY",
          parameters: generateTokenizationParameters(configuration, {
            "braintree:paypalClientId": googlePayConfiguration.paypalClientId,
          }),
        },
      };

      data.allowedPaymentMethods.push(paypalPaymentMethod);
    }
  } else {
    data = {
      environment: environment,
      allowedPaymentMethods: ["CARD", "TOKENIZED_CARD"],
      paymentMethodTokenizationParameters: {
        tokenizationType: "PAYMENT_GATEWAY",
        parameters: generateTokenizationParameters(configuration, {
          "braintree:authorizationFingerprint":
            googlePayConfiguration.googleAuthorization,
        }),
      },
      cardRequirements: {
        allowedCardNetworks: mapSupportedCardBrands(
          googlePayConfiguration.supportedCardBrands
        ),
      },
    };

    if (configuration.authorizationType === "TOKENIZATION_KEY") {
      data.paymentMethodTokenizationParameters.parameters[
        "braintree:clientKey"
      ] = configuration.authorization;
    }

    if (googleMerchantId) {
      data.merchantId = googleMerchantId;
    }

    if (googlePayVersion) {
      data.apiVersion = googlePayVersion;
    }
  }

  return data;
}
