'use strict';

var GraphQL = require('../../../../../../src/client/request/graphql');
var GraphQLRequest = require('../../../../../../src/client/request/graphql/request');

describe('GraphQL Configuration', function () {
  beforeEach(function () {
    this.configurationUrl = 'https://localhost/merchant_id/client_api/v1/configuration';
    this.config = {
      graphQL: {
        url: 'https://localhost/graphql',
        features: [
          'configuration'
        ]
      }
    };
    this.fakeMetadata = {
      source: 'my-source',
      integration: 'my-integration',
      sessionId: 'my-session-id'
    };
    this.options = {
      graphQL: new GraphQL(this.config),
      url: this.configurationUrl,
      headers: {
        FAKE_HEADER: 'Fake header'
      },
      metadata: this.fakeMetadata
    };
  });

  describe('adaptResponseBody', function () {
    it('normalizes a GraphQL configuration response', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeConfigurationResponse = {
        data: {
          clientConfiguration: {
            analyticsUrl: 'https://localhost/analytics',
            environment: 'DEVELOPMENT',
            merchantId: 'merchant_id',
            assetsUrl: 'https://localhost',
            clientApiUrl: 'https://localhost/merchants/merchant_id/client_api',
            creditCard: {
              supportedCardBrands: [
                'AMERICAN_EXPRESS',
                'DINERS',
                'DISCOVER',
                'INTERNATIONAL_MAESTRO',
                'JCB',
                'MASTERCARD',
                'SOLO',
                'UK_MAESTRO',
                'UNION_PAY',
                'UNKNOWN',
                'VISA'
              ],
              challenges: ['CVV'],
              threeDSecureEnabled: false
            },
            supportedFeatures: ['TOKENIZE_CREDIT_CARDS'],
            applePayWeb: {
              countryCode: 'US',
              currencyCode: 'USD',
              merchantIdentifier: 'merchant_id',
              supportedCardBrands: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER']
            },
            googlePay: {
              displayName: 'merchant',
              environment: 'SANDBOX',
              googleAuthorization: 'fake_authorization',
              supportedCardBrands: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER']
            },
            ideal: {
              routeId: 'route_id',
              assetsUrl: 'https://localhost'
            },
            kount: {
              merchantId: '600000'
            },
            masterpass: {
              merchantCheckoutId: 'merchant_checkout_id',
              supportedCardBrands: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER', 'DINERS', 'INTERNATIONAL_MAESTRO', 'JCB']
            },
            paypal: {
              displayName: 'display_name',
              clientId: 'client_id',
              privacyUrl: 'http://www.example.com/privacy_policy',
              userAgreementUrl: 'http://www.example.com/user_agreement',
              assetsUrl: 'https://localhost',
              environmentNoNetwork: false,
              environment: 'CUSTOM',
              unvettedMerchant: false,
              braintreeClientId: 'braintree_client_id',
              billingAgreementsEnabled: false,
              merchantAccountId: 'merchant_account_id',
              currencyCode: 'USD',
              payeeEmail: 'user@example.com'
            },
            unionPay: {
              merchantAccountId: 'merchant_account_id'
            },
            usBankAccount: {
              routeId: 'route_id',
              plaidPublicKey: 'plaid_public_key'
            },
            venmo: {
              merchantId: 'merchant_id',
              accessToken: 'access_token',
              environment: 'DEVELOPMENT'
            },
            visaCheckout: {
              apiKey: 'visa_checkout_api_key',
              externalClientId: 'external_client_id',
              supportedCardBrands: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER']
            },
            braintreeApi: {
              accessToken: 'access_token',
              url: 'https://payments.sandbox.braintree-api.com'
            }
          }
        },
        extensions: {
          requestId: 'fake-request-id'
        }
      };
      var configurationResponse = {
        challenges: ['cvv'],
        threeDSecureEnabled: false,
        analytics: {
          url: 'https://localhost/analytics'
        },
        environment: 'development',
        merchantId: 'merchant_id',
        assetsUrl: 'https://localhost',
        clientApiUrl: 'https://localhost/merchants/merchant_id/client_api',
        applePayWeb: {
          countryCode: 'US',
          currencyCode: 'USD',
          merchantIdentifier: 'merchant_id',
          supportedNetworks: ['visa', 'mastercard', 'amex', 'discover']
        },
        kount: {
          kountMerchantId: '600000'
        },
        masterpass: {
          merchantCheckoutId: 'merchant_checkout_id',
          supportedNetworks: [
            'visa',
            'master',
            'amex',
            'discover',
            'diners',
            'maestro',
            'jcb'
          ]
        },
        paypalEnabled: true,
        paypal: {
          displayName: 'display_name',
          clientId: 'client_id',
          privacyUrl: 'http://www.example.com/privacy_policy',
          userAgreementUrl: 'http://www.example.com/user_agreement',
          assetsUrl: 'https://localhost',
          environment: 'custom',
          environmentNoNetwork: false,
          unvettedMerchant: false,
          braintreeClientId: 'braintree_client_id',
          billingAgreementsEnabled: false,
          merchantAccountId: 'merchant_account_id',
          currencyIsoCode: 'USD',
          payeeEmail: 'user@example.com'
        },
        unionPay: {
          enabled: true,
          merchantAccountId: 'merchant_account_id'
        },
        visaCheckout: {
          apikey: 'visa_checkout_api_key',
          externalClientId: 'external_client_id',
          supportedCardTypes: [
            'Visa',
            'MasterCard',
            'American Express',
            'Discover'
          ]
        },
        graphQL: {
          url: 'https://localhost/graphql',
          features: ['tokenize_credit_cards']
        },
        venmo: 'off',
        braintreeApi: {
          accessToken: 'access_token',
          url: 'https://payments.sandbox.braintree-api.com'
        },
        payWithVenmo: {
          accessToken: 'access_token',
          environment: 'development',
          merchantId: 'merchant_id'
        },
        androidPay: {
          displayName: 'merchant',
          enabled: true,
          environment: 'sandbox',
          googleAuthorizationFingerprint: 'fake_authorization',
          supportedNetworks: [
            'visa',
            'mastercard',
            'amex',
            'discover'
          ]
        },
        creditCards: {
          supportedCardTypes: [
            'American Express',
            'Discover',
            'Maestro',
            'JCB',
            'MasterCard',
            'Solo',
            'UK Maestro',
            'UnionPay',
            'Visa'
          ]
        },
        ideal: {
          routeId: 'route_id',
          assetsUrl: 'https://localhost'
        },
        usBankAccount: {
          routeId: 'route_id',
          plaid: {
            publicKey: 'plaid_public_key'
          }
        }
      };
      var adaptedResponse = graphQLRequest.adaptResponseBody(fakeConfigurationResponse);

      expect(adaptedResponse.challenges).to.deep.equal(configurationResponse.challenges);
      expect(adaptedResponse.threeDSecureEnabled).to.deep.equal(configurationResponse.threeDSecureEnabled);
      expect(adaptedResponse.analytics).to.deep.equal(configurationResponse.analytics);
      expect(adaptedResponse.environment).to.deep.equal(configurationResponse.environment);
      expect(adaptedResponse.merchantId).to.deep.equal(configurationResponse.merchantId);
      expect(adaptedResponse.assetsUrl).to.deep.equal(configurationResponse.assetsUrl);
      expect(adaptedResponse.clientApiUrl).to.deep.equal(configurationResponse.clientApiUrl);

      expect(adaptedResponse.applePayWeb).to.deep.equal(configurationResponse.applePayWeb);
      expect(adaptedResponse.kount).to.deep.equal(configurationResponse.kount);
      expect(adaptedResponse.masterpass).to.deep.equal(configurationResponse.masterpass);
      expect(adaptedResponse.paypalEnabled).to.deep.equal(configurationResponse.paypalEnabled);
      expect(adaptedResponse.paypal).to.deep.equal(configurationResponse.paypal);
      expect(adaptedResponse.unionPay).to.deep.equal(configurationResponse.unionPay);
      expect(adaptedResponse.visaCheckout).to.deep.equal(configurationResponse.visaCheckout);

      expect(adaptedResponse.graphQL).to.deep.equal(configurationResponse.graphQL);
      expect(adaptedResponse.venmo).to.deep.equal(configurationResponse.venmo);
      expect(adaptedResponse.payWithVenmo).to.deep.equal(configurationResponse.payWithVenmo);
      expect(adaptedResponse.androidPay).to.deep.equal(configurationResponse.androidPay);
      expect(adaptedResponse.creditCards).to.deep.equal(configurationResponse.creditCards);
      expect(adaptedResponse.ideal).to.deep.equal(configurationResponse.ideal);
      expect(adaptedResponse.usBankAccount).to.deep.equal(configurationResponse.usBankAccount);
      expect(adaptedResponse.braintreeApi).to.deep.equal(configurationResponse.braintreeApi);

      expect(adaptedResponse).to.deep.equal(configurationResponse);
    });

    describe('field adapters', function () {
      beforeEach(function () {
        this.graphQLRequest = new GraphQLRequest(this.options);
        this.fakeEmptyConfigurationResponse = {
          data: {
            clientConfiguration: {
              analyticsUrl: 'https://localhost/analytics',
              environment: 'DEVELOPMENT',
              merchantId: 'merchant_id',
              assetsUrl: 'https://localhost',
              clientApiUrl: 'https://localhost/merchants/merchant_id/client_api',
              creditCard: null,
              applePayWeb: null,
              googlePay: null,
              ideal: null,
              kount: null,
              masterpass: null,
              paypal: null,
              unionPay: null,
              usBankAccount: null,
              venmo: null,
              visaCheckout: null
            }
          },
          extensions: {
            requestId: 'fake-request-id'
          }
        };
      });
      it('correctly handles null fields', function () {
        var adaptedResponse = this.graphQLRequest.adaptResponseBody(this.fakeEmptyConfigurationResponse);

        expect(adaptedResponse.creditCards).to.deep.equal({
          supportedCardTypes: []
        });
        expect(adaptedResponse.challenges).to.deep.equal([]);
        expect(adaptedResponse.threeDSecureEnabled).to.equal(false);

        expect(adaptedResponse.paypal).to.be.undefined;
        expect(adaptedResponse.paypalEnabled).to.equal(false);

        expect(adaptedResponse.payWithVenmo).to.be.undefined;
        expect(adaptedResponse.androidPay).to.be.undefined;
        expect(adaptedResponse.braintreeApi).to.be.undefined;
        expect(adaptedResponse.kount).to.be.undefined;
        expect(adaptedResponse.unionPay).to.be.undefined;
        expect(adaptedResponse.visaCheckout).to.be.undefined;
        expect(adaptedResponse.masterpass).to.be.undefined;
        expect(adaptedResponse.usBankAccount).to.be.undefined;
        expect(adaptedResponse.ideal).to.be.undefined;
        expect(adaptedResponse.graphQL).to.be.undefined;
      });
    });
  });
});

