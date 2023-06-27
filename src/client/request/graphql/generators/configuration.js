"use strict";

var CONFIGURATION_QUERY =
  "query ClientConfiguration { " +
  "  clientConfiguration { " +
  "    analyticsUrl " +
  "    environment " +
  "    merchantId " +
  "    assetsUrl " +
  "    clientApiUrl " +
  "    creditCard { " +
  "      supportedCardBrands " +
  "      challenges " +
  "      threeDSecureEnabled " +
  "      threeDSecure { " +
  "        cardinalAuthenticationJWT " +
  "      } " +
  "    } " +
  "    applePayWeb { " +
  "      countryCode " +
  "      currencyCode " +
  "      merchantIdentifier " +
  "      supportedCardBrands " +
  "    } " +
  "    googlePay { " +
  "      displayName " +
  "      supportedCardBrands " +
  "      environment " +
  "      googleAuthorization " +
  "      paypalClientId " +
  "    } " +
  "    ideal { " +
  "      routeId " +
  "      assetsUrl " +
  "    } " +
  "    kount { " +
  "      merchantId " +
  "    } " +
  "    masterpass { " +
  "      merchantCheckoutId " +
  "      supportedCardBrands " +
  "    } " +
  "    paypal { " +
  "      displayName " +
  "      clientId " +
  "      privacyUrl " +
  "      userAgreementUrl " +
  "      assetsUrl " +
  "      environment " +
  "      environmentNoNetwork " +
  "      unvettedMerchant " +
  "      braintreeClientId " +
  "      billingAgreementsEnabled " +
  "      merchantAccountId " +
  "      currencyCode " +
  "      payeeEmail " +
  "    } " +
  "    unionPay { " +
  "      merchantAccountId " +
  "    } " +
  "    usBankAccount { " +
  "      routeId " +
  "      plaidPublicKey " +
  "    } " +
  "    venmo { " +
  "      merchantId " +
  "      accessToken " +
  "      environment " +
  "      enrichedCustomerDataEnabled" +
  "    } " +
  "    visaCheckout { " +
  "      apiKey " +
  "      externalClientId " +
  "      supportedCardBrands " +
  "    } " +
  "    braintreeApi { " +
  "      accessToken " +
  "      url " +
  "    } " +
  "    supportedFeatures " +
  "  } " +
  "}";

function configuration() {
  return {
    query: CONFIGURATION_QUERY,
    operationName: "ClientConfiguration",
  };
}

module.exports = configuration;
