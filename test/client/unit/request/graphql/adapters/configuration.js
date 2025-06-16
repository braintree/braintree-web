"use strict";

const GraphQL = require("../../../../../../src/client/request/graphql");
const GraphQLRequest = require("../../../../../../src/client/request/graphql/request");

describe("GraphQL Configuration", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configurationUrl =
      "https://localhost/merchant_id/client_api/v1/configuration";
    testContext.config = {
      graphQL: {
        url: "https://localhost/graphql",
        features: ["configuration"],
      },
    };
    testContext.fakeMetadata = {
      source: "my-source",
      integration: "my-integration",
      sessionId: "my-session-id",
    };
    testContext.options = {
      graphQL: new GraphQL(testContext.config),
      url: testContext.configurationUrl,
      headers: {
        FAKE_HEADER: "Fake header",
      },
      metadata: testContext.fakeMetadata,
      data: {},
    };
  });

  describe("adaptResponseBody", () => {
    it("normalizes a GraphQL configuration response", () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeConfigurationResponse = {
        data: {
          clientConfiguration: {
            analyticsUrl: "https://localhost/analytics",
            environment: "DEVELOPMENT",
            merchantId: "merchant_id",
            assetsUrl: "https://localhost",
            clientApiUrl: "https://localhost/merchants/merchant_id/client_api",
            creditCard: {
              supportedCardBrands: [
                "AMERICAN_EXPRESS",
                "DINERS",
                "DISCOVER",
                "ELO",
                "HIPER",
                "HIPERCARD",
                "INTERNATIONAL_MAESTRO",
                "JCB",
                "MASTERCARD",
                "SOLO",
                "UK_MAESTRO",
                "UNION_PAY",
                "UNKNOWN",
                "VISA",
              ],
              challenges: ["CVV"],
              threeDSecureEnabled: false,
              threeDSecure: {
                cardinalAuthenticationJWT: "3ds-jwt",
                cardinalSongbirdUrl: "some-songbird-url",
                cardinalSongbirdIdentityHash: "some-songbird-identity-hash",
              },
            },
            supportedFeatures: ["TOKENIZE_CREDIT_CARDS"],
            applePayWeb: {
              countryCode: "US",
              currencyCode: "USD",
              merchantIdentifier: "merchant_id",
              supportedCardBrands: [
                "VISA",
                "MASTERCARD",
                "AMERICAN_EXPRESS",
                "DISCOVER",
                "INTERNATIONAL_MAESTRO",
                "ELO",
              ],
            },
            fastlane: true,
            googlePay: {
              displayName: "merchant",
              environment: "SANDBOX",
              googleAuthorization: "fake_authorization",
              paypalClientId: "client_id",
              supportedCardBrands: [
                "VISA",
                "MASTERCARD",
                "AMERICAN_EXPRESS",
                "DISCOVER",
                "INTERNATIONAL_MAESTRO",
                "ELO",
              ],
            },
            ideal: {
              routeId: "route_id",
              assetsUrl: "https://localhost",
            },
            masterpass: {
              merchantCheckoutId: "merchant_checkout_id",
              supportedCardBrands: [
                "VISA",
                "MASTERCARD",
                "AMERICAN_EXPRESS",
                "DISCOVER",
                "DINERS",
                "INTERNATIONAL_MAESTRO",
                "JCB",
              ],
            },
            paypal: {
              displayName: "display_name",
              clientId: "client_id",
              assetsUrl: "https://localhost",
              environmentNoNetwork: false,
              environment: "CUSTOM",
              unvettedMerchant: false,
              braintreeClientId: "braintree_client_id",
              billingAgreementsEnabled: false,
              merchantAccountId: "merchant_account_id",
              currencyCode: "USD",
              payeeEmail: "user@example.com",
            },
            unionPay: {
              merchantAccountId: "merchant_account_id",
            },
            usBankAccount: {
              routeId: "route_id",
              plaidPublicKey: "plaid_public_key",
            },
            venmo: {
              merchantId: "merchant_id",
              accessToken: "access_token",
              environment: "DEVELOPMENT",
              enrichedCustomerDataEnabled: true,
            },
            visaCheckout: {
              apiKey: "visa_checkout_api_key",
              encryptionKey: "visa_checkout_encryption_key",
              externalClientId: "external_client_id",
              supportedCardBrands: [
                "VISA",
                "MASTERCARD",
                "AMERICAN_EXPRESS",
                "DISCOVER",
              ],
            },
            braintreeApi: {
              accessToken: "access_token",
              url: "https://payments.sandbox.braintree-api.com",
            },
          },
        },
        extensions: {
          requestId: "fake-request-id",
        },
      };
      const configurationResponse = {
        challenges: ["cvv"],
        threeDSecureEnabled: false,
        threeDSecure: {
          cardinalAuthenticationJWT: "3ds-jwt",
          cardinalSongbirdUrl: "some-songbird-url",
          cardinalSongbirdIdentityHash: "some-songbird-identity-hash",
        },
        analytics: {
          url: "https://localhost/analytics",
        },
        environment: "development",
        merchantId: "merchant_id",
        assetsUrl: "https://localhost",
        clientApiUrl: "https://localhost/merchants/merchant_id/client_api",
        applePayWeb: {
          countryCode: "US",
          currencyCode: "USD",
          merchantIdentifier: "merchant_id",
          supportedNetworks: [
            "visa",
            "mastercard",
            "amex",
            "discover",
            "maestro",
            "elo",
          ],
        },
        fastlane: true,
        masterpass: {
          merchantCheckoutId: "merchant_checkout_id",
          supportedNetworks: [
            "visa",
            "master",
            "amex",
            "discover",
            "diners",
            "maestro",
            "jcb",
          ],
        },
        paypalEnabled: true,
        paypal: {
          displayName: "display_name",
          clientId: "client_id",
          assetsUrl: "https://localhost",
          environment: "custom",
          environmentNoNetwork: false,
          unvettedMerchant: false,
          braintreeClientId: "braintree_client_id",
          billingAgreementsEnabled: false,
          merchantAccountId: "merchant_account_id",
          currencyIsoCode: "USD",
          payeeEmail: "user@example.com",
        },
        unionPay: {
          enabled: true,
          merchantAccountId: "merchant_account_id",
        },
        visaCheckout: {
          apikey: "visa_checkout_api_key",
          encryptionKey: "visa_checkout_encryption_key",
          externalClientId: "external_client_id",
          supportedCardTypes: [
            "Visa",
            "MasterCard",
            "American Express",
            "Discover",
          ],
        },
        graphQL: {
          url: "https://localhost/graphql",
          features: ["tokenize_credit_cards"],
        },
        venmo: "off",
        braintreeApi: {
          accessToken: "access_token",
          url: "https://payments.sandbox.braintree-api.com",
        },
        payWithVenmo: {
          accessToken: "access_token",
          environment: "development",
          merchantId: "merchant_id",
          enrichedCustomerDataEnabled: true,
        },
        androidPay: {
          displayName: "merchant",
          enabled: true,
          environment: "sandbox",
          googleAuthorizationFingerprint: "fake_authorization",
          paypalClientId: "client_id",
          supportedNetworks: [
            "visa",
            "mastercard",
            "amex",
            "discover",
            "maestro",
            "elo",
          ],
        },
        creditCards: {
          supportedCardTypes: [
            "American Express",
            "Discover",
            "Elo",
            "Hiper",
            "Hipercard",
            "Maestro",
            "JCB",
            "MasterCard",
            "Solo",
            "UK Maestro",
            "UnionPay",
            "Visa",
          ],
        },
        ideal: {
          routeId: "route_id",
          assetsUrl: "https://localhost",
        },
        usBankAccount: {
          routeId: "route_id",
          plaid: {
            publicKey: "plaid_public_key",
          },
        },
      };
      const adaptedResponse = graphQLRequest.adaptResponseBody(
        fakeConfigurationResponse
      );

      expect(adaptedResponse.challenges).toEqual(
        configurationResponse.challenges
      );
      expect(adaptedResponse.threeDSecureEnabled).toEqual(
        configurationResponse.threeDSecureEnabled
      );
      expect(adaptedResponse.analytics).toEqual(
        configurationResponse.analytics
      );
      expect(adaptedResponse.environment).toEqual(
        configurationResponse.environment
      );
      expect(adaptedResponse.merchantId).toEqual(
        configurationResponse.merchantId
      );
      expect(adaptedResponse.assetsUrl).toEqual(
        configurationResponse.assetsUrl
      );
      expect(adaptedResponse.clientApiUrl).toEqual(
        configurationResponse.clientApiUrl
      );

      expect(adaptedResponse.applePayWeb).toEqual(
        configurationResponse.applePayWeb
      );
      expect(adaptedResponse.fastlane).toEqual(true);
      expect(adaptedResponse.masterpass).toEqual(
        configurationResponse.masterpass
      );
      expect(adaptedResponse.paypalEnabled).toEqual(
        configurationResponse.paypalEnabled
      );
      expect(adaptedResponse.paypal).toEqual(configurationResponse.paypal);
      expect(adaptedResponse.unionPay).toEqual(configurationResponse.unionPay);
      expect(adaptedResponse.visaCheckout).toEqual(
        configurationResponse.visaCheckout
      );

      expect(adaptedResponse.graphQL).toEqual(configurationResponse.graphQL);
      expect(adaptedResponse.venmo).toEqual(configurationResponse.venmo);
      expect(adaptedResponse.payWithVenmo).toEqual(
        configurationResponse.payWithVenmo
      );
      expect(adaptedResponse.androidPay).toEqual(
        configurationResponse.androidPay
      );
      expect(adaptedResponse.creditCards).toEqual(
        configurationResponse.creditCards
      );
      expect(adaptedResponse.ideal).toEqual(configurationResponse.ideal);
      expect(adaptedResponse.usBankAccount).toEqual(
        configurationResponse.usBankAccount
      );
      expect(adaptedResponse.braintreeApi).toEqual(
        configurationResponse.braintreeApi
      );

      expect(adaptedResponse).toEqual(configurationResponse);
    });

    describe("field adapters", () => {
      beforeEach(() => {
        testContext.graphQLRequest = new GraphQLRequest(testContext.options);
        testContext.fakeEmptyConfigurationResponse = {
          data: {
            clientConfiguration: {
              analyticsUrl: "https://localhost/analytics",
              environment: "DEVELOPMENT",
              merchantId: "merchant_id",
              assetsUrl: "https://localhost",
              clientApiUrl:
                "https://localhost/merchants/merchant_id/client_api",
              creditCard: null,
              applePayWeb: null,
              fastlane: null,
              googlePay: null,
              ideal: null,
              masterpass: null,
              paypal: null,
              unionPay: null,
              usBankAccount: null,
              venmo: null,
              visaCheckout: null,
            },
          },
          extensions: {
            requestId: "fake-request-id",
          },
        };
      });
      it("correctly handles null fields", () => {
        const adaptedResponse = testContext.graphQLRequest.adaptResponseBody(
          testContext.fakeEmptyConfigurationResponse
        );

        expect(adaptedResponse.creditCards).toEqual({
          supportedCardTypes: [],
        });
        expect(adaptedResponse.challenges).toEqual([]);
        expect(adaptedResponse.threeDSecureEnabled).toBe(false);

        expect(adaptedResponse.paypal).toBeUndefined();
        expect(adaptedResponse.paypalEnabled).toBe(false);

        expect(adaptedResponse.payWithVenmo).toBeUndefined();
        expect(adaptedResponse.androidPay).toBeUndefined();
        expect(adaptedResponse.braintreeApi).toBeUndefined();
        expect(adaptedResponse.fastlane).toBeUndefined();
        expect(adaptedResponse.unionPay).toBeUndefined();
        expect(adaptedResponse.visaCheckout).toBeUndefined();
        expect(adaptedResponse.masterpass).toBeUndefined();
        expect(adaptedResponse.usBankAccount).toBeUndefined();
        expect(adaptedResponse.ideal).toBeUndefined();
        expect(adaptedResponse.graphQL).toBeUndefined();
      });
    });
  });
});
