'use strict';

var VERSION = process.env.npm_package_version;

module.exports = function (configuration) {
  var isProduction = configuration.gatewayConfiguration.environment === 'production';
  var androidPayConfiguration = configuration.gatewayConfiguration.androidPay;
  var metadata = configuration.analyticsMetadata;
  var data = {
    environment: isProduction ? 'PRODUCTION' : 'TEST',
    allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
    paymentMethodTokenizationParameters: {
      tokenizationType: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'braintree',
        'braintree:merchantId': configuration.gatewayConfiguration.merchantId,
        'braintree:authorizationFingerprint': androidPayConfiguration.googleAuthorizationFingerprint,
        'braintree:apiVersion': 'v1',
        'braintree:sdkVersion': VERSION,
        'braintree:metadata': JSON.stringify({
          source: metadata.source,
          integration: metadata.integration,
          sessionId: metadata.sessionId,
          version: VERSION,
          platform: metadata.platform
        })
      }
    },
    cardRequirements: {
      allowedCardNetworks: androidPayConfiguration.supportedNetworks.map(function (card) { return card.toUpperCase(); })
    }
  };

  if (configuration.authorizationType === 'TOKENIZATION_KEY') {
    data.paymentMethodTokenizationParameters.parameters['braintree:clientKey'] = configuration.authorization;
  }

  return data;
};
