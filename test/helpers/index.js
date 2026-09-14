let clientToken, clientTokenWithGraphQL, clientTokenWithoutEnvironment;
import COMPONENTS from "../../components";
import constants from "../../src/lib/constants";
const tokenizationKey = "development_testing_merchant_id";

const basicLookupResponse = {
  paymentMethod: {
    nonce: "lookup-nonce",
    threeDSecureInfo: {
      liabilityShifted: true,
      liabilityShiftPossible: true,
    },
  },
  lookup: {
    acsUrl: "http://example.com/acs",
    pareq: "pareq",
    termUrl: "http://example.com/term",
    md: "md",
  },
  threeDSecureInfo: {
    liabilityShifted: true,
    liabilityShiftPossible: true,
  },
};

function noop() {}

function configuration() {
  return {
    gatewayConfiguration: {
      merchantId: "merchant-id",
      assetsUrl: "https://assets.braintreegateway.com",
      environment: "sandbox",
      configUrl: "https://braintreegateway.com/config",
      clientApiUrl: "https://braintreegateway.com",
      creditCard: {
        supportedCardBrands: ["AMERICAN_EXPRESS", "DISCOVER", "VISA"],
        challenges: ["CVV", "POSTAL_CODE"],
      },
      applePayWeb: {
        merchantIdentifier: "com.example.test-merchant-identifier",
        supportedCardBrands: ["VISA", "AMERICAN_EXPRESS", "MASTERCARD"],
      },
      braintreeApi: {
        accessToken: "fakeToken",
        url: "https://example.braintree-api.com",
      },
      paypal: {
        assetsUrl: "https://example.com:9292",
        displayName: "Name",
      },
      venmo: {
        accessToken: "pwv-access-token",
        environment: "sandbox",
        merchantId: "pwv-merchant-id",
        enrichedCustomerDataEnabled: true,
      },
      analytics: {
        url: "https://braintreegateway.com/analytics",
      },
      openBanking: {
        businessNames: ["sandbox_ach_test"],
        allowListedDomains: ["example.com"],
        profileId: "fake-profile-id",
      },
    },
    analyticsMetadata: {
      sdkVersion: constants.VERSION,
      merchantAppId: "http://fakeDomain.com",
      sessionId: "fakeSessionId",
      platform: constants.PLATFORM,
      source: constants.SOURCE,
      integration: constants.INTEGRATION,
    },
    authorization: tokenizationKey,
    isDebug: false,
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
    teardown: noop,
  };
}

clientToken = configuration().gatewayConfiguration;
clientToken.authorizationFingerprint = "encoded_auth_fingerprint";
clientTokenWithoutEnvironment = { ...clientToken };
clientToken.environment = "development";
clientTokenWithGraphQL = {
  graphQL: {
    url: "https://localhost/graphql",
    date: "2018-05-08",
  },
  ...clientToken,
};

clientToken = btoa(JSON.stringify(clientToken));
clientTokenWithGraphQL = btoa(JSON.stringify(clientTokenWithGraphQL));
clientTokenWithoutEnvironment = btoa(
  JSON.stringify(clientTokenWithoutEnvironment)
);

function baseYields(async, originalFunctionArgs, callbackArgs) {
  originalFunctionArgs.some((arg) => {
    if (typeof arg === "function") {
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

export const components = {
  components: COMPONENTS,
  files: COMPONENTS.reduce((components, name) => {
    components.push(name);
    components.push(`${name}.min`);

    return components;
  }, []),
};

export const fake = {
  authResponse() {
    return {
      success: true,
      paymentMethod: {
        nonce: "auth-success-nonce",
        binData: {
          prepaid: "No",
          healthcare: "Unknown",
          debit: "Unknown",
          durbinRegulated: "Unknown",
          commercial: "Unknown",
          payroll: "Unknown",
          issuingBank: "Unknown",
          countryOfIssuance: "CAN",
          productId: "Unknown",
          business: "Unknown",
          consumer: "Unknown",
          purchase: "Unknown",
          corporate: "Unknown",
        },
        details: {
          last2: 11,
        },
        description: "a description",
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
          threeDSecureVersion: "1.0.2",
        },
      },
      threeDSecureInfo: {
        liabilityShiftPossible: true,
        liabilityShifted: true,
      },
    };
  },
  basicLookupResponse,
  tokenizationKey,
  clientToken,
  clientTokenWithGraphQL,
  clientTokenWithoutEnvironment,
  configuration,
  client,
};

export const mockWindowOpen = (url, name) => {
  const fakeWindowObject = {
    focus: vi.fn(),
    close: vi.fn().mockImplementation(() => {
      fakeWindowObject.closed = true;
    }),
    closed: false,
    name: name,
    location: {
      href: url,
    },
  };

  return fakeWindowObject;
};

export const wait = (time = 1) =>
  new Promise((resolve) => setTimeout(resolve, time));

export const yields = function (...callbackArgs) {
  return (...originalFunctionArgs) => {
    baseYields(false, originalFunctionArgs, callbackArgs);
  };
};

export const yieldsAsync = function (...callbackArgs) {
  return (...originalFunctionArgs) => {
    baseYields(true, originalFunctionArgs, callbackArgs);
  };
};

export const yieldsByEvent = function (event, ...callbackArgs) {
  return (eventName, ...originalFunctionArgs) => {
    if (!event || event === eventName) {
      baseYields(false, originalFunctionArgs, callbackArgs);
    }
  };
};

export const yieldsByEventAsync = function (event, ...callbackArgs) {
  return (eventName, ...originalFunctionArgs) => {
    if (!event || event === eventName) {
      baseYields(true, originalFunctionArgs, callbackArgs);
    }
  };
};

export const yieldsByEvents = function (implementations, delay) {
  return (eventName, ...originalFunctionArgs) => {
    implementations.forEach(({ event, args: callbackArgs }) => {
      if (event.match(eventName)) {
        if (typeof delay === "number") {
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
};

export const findFirstEventCallback = (event, calls) =>
  calls.find((args) => args[0] === event)[1];

export { noop };

export default {
  components,
  fake,
  mockWindowOpen,
  noop,
  wait,
  yields,
  yieldsAsync,
  yieldsByEvent,
  yieldsByEventAsync,
  yieldsByEvents,
  findFirstEventCallback,
};
