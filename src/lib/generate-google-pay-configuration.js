"use strict";

var VERSION = process.env.npm_package_version;
var assign = require("./assign").assign;

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

module.exports = function (configuration, googlePayVersion, googleMerchantId) {
  var data, paypalPaymentMethod;
  var androidPayConfiguration = configuration.gatewayConfiguration.androidPay;
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
            allowedCardNetworks: androidPayConfiguration.supportedNetworks.map(
              function (card) {
                return card.toUpperCase();
              }
            ),
          },
          tokenizationSpecification: {
            type: "PAYMENT_GATEWAY",
            parameters: generateTokenizationParameters(configuration, {
              "braintree:authorizationFingerprint":
                androidPayConfiguration.googleAuthorizationFingerprint,
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

    if (androidPayConfiguration.paypalClientId) {
      paypalPaymentMethod = {
        type: "PAYPAL",
        parameters: {
          /* eslint-disable camelcase */
          purchase_context: {
            purchase_units: [
              {
                payee: {
                  client_id: androidPayConfiguration.paypalClientId,
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
            "braintree:paypalClientId": androidPayConfiguration.paypalClientId,
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
            androidPayConfiguration.googleAuthorizationFingerprint,
        }),
      },
      cardRequirements: {
        allowedCardNetworks: androidPayConfiguration.supportedNetworks.map(
          function (card) {
            return card.toUpperCase();
          }
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
};
