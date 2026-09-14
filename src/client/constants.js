const CONFIGURATION_QUERY = `query ClientConfiguration {
  clientConfiguration {
    environment
    merchantId
    assetsUrl
    clientApiUrl
    creditCard {
      supportedCardBrands
      challenges
      threeDSecureEnabled
      threeDSecure {
        cardinalAuthenticationJWT
        cardinalSongbirdUrl
        cardinalSongbirdIdentityHash
      }
    }
    applePayWeb {
      countryCode
      currencyCode
      merchantIdentifier
      supportedCardBrands
    }
    fastlane {
      enabled
      tokensOnDemand {
        enabled
        tokenExchange {
          enabled
        }
      }
    }
    googlePay {
      displayName
      supportedCardBrands
      environment
      googleAuthorization
      paypalClientId
    }
    ideal {
      routeId
      assetsUrl
    }
    openBanking {
      businessNames
      allowListedDomains
      profileId
    }
    paypal {
      displayName
      clientId
      assetsUrl
      environment
      environmentNoNetwork
      unvettedMerchant
      braintreeClientId
      billingAgreementsEnabled
      merchantAccountId
      currencyCode
      payeeEmail
    }
    usBankAccount {
      routeId
    }
    venmo {
      merchantId
      accessToken
      environment
      enrichedCustomerDataEnabled
    }
    braintreeApi {
      accessToken
      url
    }
  }
}`;

export const BRAINTREE_VERSION = "2018-05-10";
export const CONFIGURATION_OPERATION_NAME = "ClientConfiguration";
export { CONFIGURATION_QUERY };

export default {
  BRAINTREE_VERSION,
  CONFIGURATION_QUERY,
  CONFIGURATION_OPERATION_NAME,
};
