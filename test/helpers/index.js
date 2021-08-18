'use strict';

let clientToken, clientTokenWithGraphQL, clientTokenWithoutEnvironment;
const COMPONENTS = require('../../components');
const constants = require('../../src/lib/constants');
const tokenizationKey = 'development_testing_merchant_id';

const basicLookupResponse = {
  paymentMethod: {
    nonce: 'lookup-nonce'
  },
  lookup: {
    acsUrl: 'http://example.com/acs',
    pareq: 'pareq',
    termUrl: 'http://example.com/term',
    md: 'md'
  }
};

function noop() {}

function configuration() {
  return {
    gatewayConfiguration: {
      merchantId: 'merchant-id',
      assetsUrl: 'https://assets.braintreegateway.com',
      environment: 'sandbox',
      configUrl: 'https://braintreegateway.com/config',
      clientApiUrl: 'https://braintreegateway.com',
      challenges: ['cvv', 'postal_code'],
      creditCards: {
        collectDeviceData: false,
        supportedCardTypes: [
          'American Express',
          'Discover',
          'Visa'
        ],
        supportedGateways: [
          {
            name: 'clientApi'
          }
        ]
      },
      applePayWeb: {
        merchantIdentifier: 'com.example.test-merchant-identifier',
        supportedNetworks: ['visa', 'amex', 'mastercard']
      },
      braintreeApi: {
        accessToken: 'fakeToken',
        url: 'https://example.braintree-api.com'
      },
      paypal: {
        assetsUrl: 'https://example.com:9292',
        displayName: 'Name'
      },
      payWithVenmo: {
        accessToken: 'pwv-access-token',
        environment: 'sandbox',
        merchantId: 'pwv-merchant-id'
      },
      analytics: {
        url: 'https://braintreegateway.com/analytics'
      },
      visaCheckout: {
        apikey: 'gwApikey',
        encryptionKey: 'gwEncryptionKey',
        externalClientId: 'gwExternalClientId',
        supportedCardTypes: ['Visa', 'MasterCard', 'Discover', 'American Express']
      }
    },
    analyticsMetadata: {
      sdkVersion: constants.VERSION,
      merchantAppId: 'http://fakeDomain.com',
      sessionId: 'fakeSessionId',
      platform: constants.PLATFORM,
      source: constants.SOURCE,
      integration: constants.INTEGRATION,
      integrationType: constants.INTEGRATION
    },
    authorization: tokenizationKey
  };
}

function client(options) {
  options = options || {};

  return {
    getConfiguration: function () {
      return options.configuration || configuration();
    },
    getVersion: function () {
      return options.version || constants.VERSION;
    },
    request: noop,
    teardown: noop
  };
}

clientToken = configuration().gatewayConfiguration;
clientToken.authorizationFingerprint = 'encoded_auth_fingerprint';
clientTokenWithoutEnvironment = { ...clientToken };
clientToken.environment = 'development';
clientTokenWithGraphQL = {
  graphQL: {
    url: 'https://localhost/graphql',
    date: '2018-05-08'
  },
  ...clientToken
};

clientToken = btoa(JSON.stringify(clientToken));
clientTokenWithGraphQL = btoa(JSON.stringify(clientTokenWithGraphQL));
clientTokenWithoutEnvironment = btoa(JSON.stringify(clientTokenWithoutEnvironment));

function baseYields(async, originalFunctionArgs, callbackArgs) {
  originalFunctionArgs.some(arg => {
    if (typeof arg === 'function') {
      if (async) {
        Promise.resolve().then(() => {
          arg.apply(null, callbackArgs);
        });
      } else {
        arg.apply(null, callbackArgs);

        return true;
      }
    }

    return false;
  });
}

module.exports = {
  components: {
    components: COMPONENTS,
    files: COMPONENTS.reduce((components, name) => {
      components.push(name);
      components.push(`${name}.min`);

      return components;
    }, [])
  },
  fake: {
    authResponse() {
      return {
        success: true,
        paymentMethod: {
          nonce: 'auth-success-nonce',
          binData: {
            prepaid: 'No',
            healthcare: 'Unknown',
            debit: 'Unknown',
            durbinRegulated: 'Unknown',
            commercial: 'Unknown',
            payroll: 'Unknown',
            issuingBank: 'Unknown',
            countryOfIssuance: 'CAN',
            productId: 'Unknown'
          },
          details: {
            last2: 11
          },
          description: 'a description',
          threeDSecureInfo: {
            threeDSecureVersion: '1.0.2'
          }
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true
        }
      };
    },
    basicLookupResponse,
    tokenizationKey,
    clientToken,
    clientTokenWithGraphQL,
    clientTokenWithoutEnvironment,
    configuration,
    client
  },

  mockWindowOpen: (url, name) => {
    const fakeWindowObject = {
      focus: jest.fn(),
      close: jest.fn().mockImplementation(() => {
        fakeWindowObject.closed = true;
      }),
      closed: false,
      name: name,
      location: {
        href: url
      }
    };

    return fakeWindowObject;
  },

  noop,

  wait: (time = 1) =>
    new Promise(resolve => setTimeout(resolve, time)),

  yields(...callbackArgs) {
    return (...originalFunctionArgs) => {
      baseYields(false, originalFunctionArgs, callbackArgs);
    };
  },

  yieldsAsync(...callbackArgs) {
    return (...originalFunctionArgs) => {
      baseYields(true, originalFunctionArgs, callbackArgs);
    };
  },

  yieldsByEvent(event, ...callbackArgs) {
    return (eventName, ...originalFunctionArgs) => {
      if (!event || event === eventName) {
        baseYields(false, originalFunctionArgs, callbackArgs);
      }
    };
  },

  yieldsByEventAsync(event, ...callbackArgs) {
    return (eventName, ...originalFunctionArgs) => {
      if (!event || event === eventName) {
        baseYields(true, originalFunctionArgs, callbackArgs);
      }
    };
  },

  yieldsByEvents(implementations, delay) {
    return (eventName, ...originalFunctionArgs) => {
      implementations.forEach(({ event, args: callbackArgs }) => {
        if (event.match(eventName)) {
          if (typeof delay === 'number') {
            setTimeout(() => {
              baseYields(false, originalFunctionArgs, callbackArgs);
            }, delay);
          } else if (delay) {
            baseYields(true, originalFunctionArgs, callbackArgs);
          } else {
            baseYields(false, originalFunctionArgs, callbackArgs);
          }
        }
      });
    };
  },

  /*
   * Using an already-mocked method (like `Bus.on`), find
   * the first callback that has been called for a given event.
   * @param {string} event - The event name
   * @param {Array} calls - A jest mock's calls (ie fn.mock.calls)
   * @returns {function}
   * */
  findFirstEventCallback: (event, calls) => calls.find(args => args[0] === event)[1]
};
