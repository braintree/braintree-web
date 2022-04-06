"use strict";

var errorResponseAdapter = require("./error");
var assign = require("../../../../lib/assign").assign;

/* eslint-disable camelcase */
var cardTypeTransforms = {
  creditCard: {
    AMERICAN_EXPRESS: "American Express",
    DISCOVER: "Discover",
    INTERNATIONAL_MAESTRO: "Maestro",
    JCB: "JCB",
    MASTERCARD: "MasterCard",
    SOLO: "Solo",
    UK_MAESTRO: "UK Maestro",
    UNION_PAY: "UnionPay",
    VISA: "Visa",
    ELO: "Elo",
    HIPER: "Hiper",
    HIPERCARD: "Hipercard",
  },
  applePayWeb: {
    VISA: "visa",
    MASTERCARD: "mastercard",
    DISCOVER: "discover",
    AMERICAN_EXPRESS: "amex",
    INTERNATIONAL_MAESTRO: "maestro",
    ELO: "elo",
  },
  visaCheckout: {
    VISA: "Visa",
    MASTERCARD: "MasterCard",
    DISCOVER: "Discover",
    AMERICAN_EXPRESS: "American Express",
  },
  googlePay: {
    VISA: "visa",
    MASTERCARD: "mastercard",
    DISCOVER: "discover",
    AMERICAN_EXPRESS: "amex",
    INTERNATIONAL_MAESTRO: "maestro",
    ELO: "elo",
  },
  masterpass: {
    VISA: "visa",
    MASTERCARD: "master",
    DISCOVER: "discover",
    AMERICAN_EXPRESS: "amex",
    DINERS: "diners",
    INTERNATIONAL_MAESTRO: "maestro",
    JCB: "jcb",
  },
};
/* eslint-enable camelcase */

function configurationResponseAdapter(responseBody, ctx) {
  var adaptedResponse;

  if (responseBody.data && !responseBody.errors) {
    adaptedResponse = adaptConfigurationResponseBody(responseBody, ctx);
  } else {
    adaptedResponse = errorResponseAdapter(responseBody);
  }

  return adaptedResponse;
}

function adaptConfigurationResponseBody(body, ctx) {
  var configuration = body.data.clientConfiguration;
  var response;

  response = {
    environment: configuration.environment.toLowerCase(),
    clientApiUrl: configuration.clientApiUrl,
    assetsUrl: configuration.assetsUrl,
    analytics: {
      url: configuration.analyticsUrl,
    },
    merchantId: configuration.merchantId,
    venmo: "off",
  };

  if (configuration.supportedFeatures) {
    response.graphQL = {
      url: ctx._graphQL._config.url,
      features: configuration.supportedFeatures.map(function (feature) {
        return feature.toLowerCase();
      }),
    };
  }

  if (configuration.braintreeApi) {
    response.braintreeApi = configuration.braintreeApi;
  }

  if (configuration.applePayWeb) {
    response.applePayWeb = configuration.applePayWeb;
    response.applePayWeb.supportedNetworks = mapCardTypes(
      configuration.applePayWeb.supportedCardBrands,
      cardTypeTransforms.applePayWeb
    );

    delete response.applePayWeb.supportedCardBrands;
  }

  if (configuration.ideal) {
    response.ideal = configuration.ideal;
  }

  if (configuration.kount) {
    response.kount = {
      kountMerchantId: configuration.kount.merchantId,
    };
  }

  if (configuration.creditCard) {
    response.challenges = configuration.creditCard.challenges.map(function (
      challenge
    ) {
      return challenge.toLowerCase();
    });

    response.creditCards = {
      supportedCardTypes: mapCardTypes(
        configuration.creditCard.supportedCardBrands,
        cardTypeTransforms.creditCard
      ),
    };
    response.threeDSecureEnabled = configuration.creditCard.threeDSecureEnabled;
    response.threeDSecure = configuration.creditCard.threeDSecure;
  } else {
    response.challenges = [];
    response.creditCards = {
      supportedCardTypes: [],
    };
    response.threeDSecureEnabled = false;
  }

  if (configuration.googlePay) {
    response.androidPay = {
      displayName: configuration.googlePay.displayName,
      enabled: true,
      environment: configuration.googlePay.environment.toLowerCase(),
      googleAuthorizationFingerprint:
        configuration.googlePay.googleAuthorization,
      paypalClientId: configuration.googlePay.paypalClientId,
      supportedNetworks: mapCardTypes(
        configuration.googlePay.supportedCardBrands,
        cardTypeTransforms.googlePay
      ),
    };
  }

  if (configuration.venmo) {
    response.payWithVenmo = {
      merchantId: configuration.venmo.merchantId,
      accessToken: configuration.venmo.accessToken,
      environment: configuration.venmo.environment.toLowerCase(),
    };
  }

  if (configuration.paypal) {
    response.paypalEnabled = true;
    response.paypal = assign({}, configuration.paypal);
    response.paypal.currencyIsoCode = response.paypal.currencyCode;
    response.paypal.environment = response.paypal.environment.toLowerCase();

    delete response.paypal.currencyCode;
  } else {
    response.paypalEnabled = false;
  }

  if (configuration.unionPay) {
    response.unionPay = {
      enabled: true,
      merchantAccountId: configuration.unionPay.merchantAccountId,
    };
  }

  if (configuration.visaCheckout) {
    response.visaCheckout = {
      apikey: configuration.visaCheckout.apiKey,
      encryptionKey: configuration.visaCheckout.encryptionKey,
      externalClientId: configuration.visaCheckout.externalClientId,
      supportedCardTypes: mapCardTypes(
        configuration.visaCheckout.supportedCardBrands,
        cardTypeTransforms.visaCheckout
      ),
    };
  }

  if (configuration.masterpass) {
    response.masterpass = {
      merchantCheckoutId: configuration.masterpass.merchantCheckoutId,
      supportedNetworks: mapCardTypes(
        configuration.masterpass.supportedCardBrands,
        cardTypeTransforms.masterpass
      ),
    };
  }

  if (configuration.usBankAccount) {
    response.usBankAccount = {
      routeId: configuration.usBankAccount.routeId,
      plaid: {
        publicKey: configuration.usBankAccount.plaidPublicKey,
      },
    };
  }

  return response;
}

function mapCardTypes(cardTypes, cardTypeTransformMap) {
  return cardTypes.reduce(function (acc, type) {
    if (cardTypeTransformMap.hasOwnProperty(type)) {
      return acc.concat(cardTypeTransformMap[type]);
    }

    return acc;
  }, []);
}

module.exports = configurationResponseAdapter;
