vi.mock("@braintree/uuid");

import BraintreeError from "../../../src/lib/braintree-error";
import { getConfiguration } from "../../../src/client/get-configuration";
import createAuthorizationData from "../../../src/lib/create-authorization-data";
import fetchDriver from "../../../src/client/request/fetch";
import _imp0 from "../../helpers";

const {
  fake: { clientToken, clientTokenWithGraphQL, tokenizationKey },
  yieldsAsync,
} = _imp0;

import { GRAPHQL_URLS } from "../../../src/lib/constants";
import { VERSION } from "../../../src/lib/constants";
import { BRAINTREE_VERSION } from "../../../src/client/constants";
import uuid from "@braintree/uuid";

// A minimal, valid GraphQL clientConfiguration response body. The GraphQL
// config path adapts this shape, so success-path tests must return it (a bare
// `{}` would have no `data.clientConfiguration` to adapt).
function graphQLConfigResponse() {
  return {
    data: {
      clientConfiguration: {
        environment: "DEVELOPMENT",
        merchantId: "merchant_id",
        assetsUrl: "https://localhost",
        clientApiUrl: "https://localhost/merchants/merchant_id/client_api",
      },
    },
  };
}

function graphQLErrorResponse(errorClass) {
  return {
    errors: [
      {
        message: "error message",
        extensions: { errorClass: errorClass },
      },
    ],
  };
}

describe("getConfiguration", () => {
  const mockUuid = "some_string";

  beforeEach(() => {
    vi.spyOn(fetchDriver, "request").mockReturnValue(null);
    uuid.mockReturnValue(mockUuid);
  });

  it("returns a promise when no callback is passed", () => {
    const authData = createAuthorizationData(
      "production_abc123_prod_merchant_id"
    );

    expect(getConfiguration(authData)).toBeInstanceOf(Promise);
  });

  it("uses automatically sets sessionId when not provided", async () => {
    vi.spyOn(fetchDriver, "request").mockImplementation((ops, cb) => {
      cb(undefined, graphQLConfigResponse(), 200);
    });
    const authData = createAuthorizationData(
      "production_abc123_prod_merchant_id"
    );

    let config = await getConfiguration(authData);

    expect(config.analyticsMetadata.sessionId).toEqual(mockUuid);
  });

  it("uses manually set sessionId when provided", async () => {
    vi.spyOn(fetchDriver, "request").mockImplementation((ops, cb) => {
      cb(undefined, graphQLConfigResponse(), 200);
    });

    const authData = createAuthorizationData(
      "production_abc123_prod_merchant_id"
    );

    let sessionId = "00000-00000";
    let config = await getConfiguration(authData, sessionId);

    expect(config.analyticsMetadata.sessionId).toEqual(sessionId);
  });

  describe("tokenization key", () => {
    it.each([
      {
        tokenizationKey: "production_abc123_prod_merchant_id",
        environment: "production",
      },
      {
        tokenizationKey: "sandbox_abc123_sandbox_merchant_id",
        environment: "sandbox",
      },
    ])(
      "requests configuration from the $environment GraphQL endpoint with a $environment tokenization key",
      ({ tokenizationKey: key, environment }) => {
        const authData = createAuthorizationData(key);

        getConfiguration(authData);

        expect(fetchDriver.request.mock.calls[0][0]).toMatchObject({
          url: GRAPHQL_URLS[environment],
          method: "POST",
        });
      }
    );

    it("sends the configuration query and auth headers for a tokenization key", () => {
      const authData = createAuthorizationData(
        "production_abc123_prod_merchant_id"
      );

      getConfiguration(authData);

      const reqOptions = fetchDriver.request.mock.calls[0][0];

      expect(reqOptions.data.query).toContain("clientConfiguration");
      expect(reqOptions.headers).toMatchObject({
        Authorization: "Bearer production_abc123_prod_merchant_id",
        "Braintree-Version": BRAINTREE_VERSION,
      });
    });

    it("sends the full clientSdkMetadata on the request body", () => {
      const authData = createAuthorizationData(
        "production_abc123_prod_merchant_id"
      );

      getConfiguration(authData, "session-id");

      const reqOptions = fetchDriver.request.mock.calls[0][0];

      expect(reqOptions.data.clientSdkMetadata).toEqual({
        platform: expect.any(String),
        source: expect.any(String),
        integration: expect.any(String),
        sessionId: "session-id",
        version: VERSION,
      });
    });

    it("passes back adapted configuration on successful request", async () => {
      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, graphQLConfigResponse(), 200)
      );

      const response = await getConfiguration(
        createAuthorizationData(tokenizationKey)
      );

      expect(Object.keys(response.analyticsMetadata)).toEqual([
        "merchantAppId",
        "platform",
        "sdkVersion",
        "source",
        "integration",
        "sessionId",
      ]);

      expect(response.gatewayConfiguration.merchantId).toBe("merchant_id");
      expect(response.gatewayConfiguration.environment).toBe("development");
      expect(response.authorizationType).toBe("TOKENIZATION_KEY");
    });

    it("maps a transport-level request failure to CLIENT_GATEWAY_NETWORK", async () => {
      const fakeErr = new Error("you goofed!");

      // A network failure comes back as an `err` with no GraphQL error body
      // and no classifiable status, so it maps to a gateway network error.
      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(fakeErr, null, 500)
      );

      try {
        await getConfiguration(createAuthorizationData(tokenizationKey));
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
        expect(err.message).toBe("Cannot contact the gateway at this time.");
        expect(err.details.originalError).toBe(fakeErr);
      }
    });

    it.each([
      { status: 401, expectedCode: "CLIENT_AUTHORIZATION_INVALID" },
      { status: 403, expectedCode: "CLIENT_AUTHORIZATION_INSUFFICIENT" },
      { status: 429, expectedCode: "CLIENT_RATE_LIMITED" },
      { status: 500, expectedCode: "CLIENT_GATEWAY_NETWORK" },
    ])(
      "classifies a non-2xx ($status) config response with a GraphQL error body from its status",
      async ({ status, expectedCode }) => {
        // The fetch driver forwards a non-2xx body as the `err` argument (not
        // the response), with the HTTP status. Classification is status-first.
        const errorBody = graphQLErrorResponse("AUTHENTICATION");

        vi.spyOn(fetchDriver, "request").mockImplementation(
          yieldsAsync(errorBody, null, status)
        );
        try {
          await getConfiguration(
            createAuthorizationData("production_abc123_prod_merchant_id")
          );
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe(expectedCode);
        }
      }
    );

    it.each([
      {
        errorClass: "AUTHENTICATION",
        expectedCode: "CLIENT_AUTHORIZATION_INVALID",
      },
      {
        errorClass: "AUTHORIZATION",
        expectedCode: "CLIENT_AUTHORIZATION_INSUFFICIENT",
      },
      {
        errorClass: "VALIDATION",
        expectedCode: "CLIENT_REQUEST_ERROR",
      },
      {
        errorClass: "UNKNOWN",
        expectedCode: "CLIENT_GRAPHQL_REQUEST_ERROR",
      },
    ])(
      "maps a GraphQL $errorClass error (HTTP 200 body) to $expectedCode",
      async ({ errorClass, expectedCode }) => {
        // GraphQL surfaces errors as an HTTP 200 body containing `errors`.
        vi.spyOn(fetchDriver, "request").mockImplementation(
          yieldsAsync(null, graphQLErrorResponse(errorClass), 200)
        );
        try {
          await getConfiguration(
            createAuthorizationData("production_abc123_prod_merchant_id")
          );
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe(expectedCode);
        }
      }
    );

    it("surfaces the raw GraphQL errors array as details.originalError", async () => {
      const errorResponse = graphQLErrorResponse("AUTHENTICATION");

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, errorResponse, 200)
      );
      try {
        await getConfiguration(
          createAuthorizationData("production_abc123_prod_merchant_id")
        );
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.details.originalError).toBe(errorResponse.errors);
      }
    });
  });

  describe("adapts the GraphQL clientConfiguration response", () => {
    // A rich GraphQL clientConfiguration response exercising every field the
    // config path shapes onto the gatewayConfiguration object.
    function fullGraphQLConfigResponse() {
      return {
        data: {
          clientConfiguration: {
            environment: "DEVELOPMENT",
            merchantId: "merchant_id",
            assetsUrl: "https://localhost",
            clientApiUrl: "https://localhost/merchants/merchant_id/client_api",
            creditCard: {
              supportedCardBrands: ["VISA", "MASTERCARD"],
              challenges: ["CVV"],
              threeDSecureEnabled: false,
              threeDSecure: {
                cardinalAuthenticationJWT: "3ds-jwt",
                cardinalSongbirdUrl: "some-songbird-url",
                cardinalSongbirdIdentityHash: "some-songbird-identity-hash",
              },
            },
            applePayWeb: {
              countryCode: "US",
              currencyCode: "USD",
              merchantIdentifier: "merchant_id",
              supportedCardBrands: ["VISA", "MASTERCARD"],
            },
            fastlane: true,
            googlePay: {
              displayName: "merchant",
              environment: "SANDBOX",
              googleAuthorization: "fake_authorization",
              paypalClientId: "client_id",
              supportedCardBrands: ["VISA", "MASTERCARD"],
            },
            ideal: {
              routeId: "route_id",
              assetsUrl: "https://localhost",
            },
            openBanking: {
              businessNames: ["biz"],
              allowListedDomains: ["example.com"],
              profileId: "profile_id",
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
            usBankAccount: {
              routeId: "route_id",
            },
            venmo: {
              merchantId: "merchant_id",
              accessToken: "access_token",
              environment: "DEVELOPMENT",
              enrichedCustomerDataEnabled: true,
            },
            braintreeApi: {
              accessToken: "access_token",
              url: "https://payments.sandbox.braintree-api.com",
            },
          },
        },
      };
    }

    it("normalizes a full GraphQL configuration response", async () => {
      const graphQLUrl = JSON.parse(atob(clientTokenWithGraphQL)).graphQL.url;
      const source = fullGraphQLConfigResponse().data.clientConfiguration;

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, fullGraphQLConfigResponse(), 200)
      );

      const config = await getConfiguration(
        createAuthorizationData(clientTokenWithGraphQL)
      );

      const gatewayConfiguration = config.gatewayConfiguration;

      expect(gatewayConfiguration).toEqual({
        environment: "development",
        clientApiUrl: source.clientApiUrl,
        assetsUrl: source.assetsUrl,
        merchantId: source.merchantId,
        graphQL: {
          url: graphQLUrl,
        },
        braintreeApi: source.braintreeApi,
        applePayWeb: source.applePayWeb,
        fastlane: true,
        ideal: source.ideal,
        creditCard: source.creditCard,
        googlePay: source.googlePay,
        venmo: source.venmo,
        paypal: source.paypal,
        usBankAccount: source.usBankAccount,
        openBanking: source.openBanking,
      });
    });

    it("passes optional config blocks through as-is (shallow copy of the response)", async () => {
      const response = fullGraphQLConfigResponse();
      const source = response.data.clientConfiguration;

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, response, 200)
      );

      const config = await getConfiguration(
        createAuthorizationData(clientTokenWithGraphQL)
      );

      const gatewayConfiguration = config.gatewayConfiguration;

      expect(gatewayConfiguration.googlePay).toEqual(source.googlePay);
      expect(gatewayConfiguration.venmo).toEqual(source.venmo);
      expect(gatewayConfiguration.paypal).toEqual(source.paypal);
      expect(gatewayConfiguration.creditCard).toEqual(source.creditCard);
    });

    it("passes null optional fields through as null and always sets the graphQL url block", async () => {
      const graphQLUrl = JSON.parse(atob(clientTokenWithGraphQL)).graphQL.url;
      const response = {
        data: {
          clientConfiguration: {
            environment: "DEVELOPMENT",
            merchantId: "merchant_id",
            assetsUrl: "https://localhost",
            clientApiUrl: "https://localhost/merchants/merchant_id/client_api",
            creditCard: null,
            applePayWeb: null,
            fastlane: null,
            googlePay: null,
            ideal: null,
            openBanking: null,
            paypal: null,
            usBankAccount: null,
            venmo: null,
            braintreeApi: null,
          },
        },
      };

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, response, 200)
      );

      const config = await getConfiguration(
        createAuthorizationData(clientTokenWithGraphQL)
      );
      const gatewayConfiguration = config.gatewayConfiguration;

      expect(gatewayConfiguration.creditCard).toBeNull();
      expect(gatewayConfiguration.applePayWeb).toBeNull();
      expect(gatewayConfiguration.fastlane).toBeNull();
      expect(gatewayConfiguration.googlePay).toBeNull();
      expect(gatewayConfiguration.ideal).toBeNull();
      expect(gatewayConfiguration.openBanking).toBeNull();
      expect(gatewayConfiguration.paypal).toBeNull();
      expect(gatewayConfiguration.usBankAccount).toBeNull();
      expect(gatewayConfiguration.venmo).toBeNull();
      expect(gatewayConfiguration.braintreeApi).toBeNull();

      // The graphQL block is always set from the url used to make the
      // request (it is not returned by GraphQL), and carries only the url.
      expect(gatewayConfiguration.graphQL).toEqual({ url: graphQLUrl });
    });

    it("resolves a falsy gatewayConfiguration when a successful 200 response has no data.clientConfiguration", async () => {
      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, { data: {} }, 200)
      );

      const config = await getConfiguration(
        createAuthorizationData("production_abc123_prod_merchant_id")
      );
      expect(config.gatewayConfiguration).toBeFalsy();
    });
  });

  describe("client token without a graphQL block", () => {
    it("requests configuration from the environment's default GraphQL endpoint", () => {
      // Build a sandbox client token with no graphQL block so the URL resolves
      // to a concrete GRAPHQL_URLS entry (development is env-dependent).
      const rawToken = JSON.parse(atob(clientToken));

      rawToken.environment = "sandbox";
      delete rawToken.graphQL;

      const sandboxClientToken = btoa(JSON.stringify(rawToken));
      const authData = createAuthorizationData(sandboxClientToken);

      vi.spyOn(fetchDriver, "request").mockReturnValue(null);
      getConfiguration(authData);

      expect(fetchDriver.request.mock.calls[0][0]).toMatchObject({
        url: GRAPHQL_URLS.sandbox,
        method: "POST",
      });
    });

    it("sends the configuration query and auth headers", () => {
      getConfiguration(createAuthorizationData(clientToken));

      const reqOptions = fetchDriver.request.mock.calls[0][0];

      expect(reqOptions.data.query).toContain("clientConfiguration");
      expect(reqOptions.headers).toMatchObject({
        Authorization: "Bearer encoded_auth_fingerprint",
        "Braintree-Version": BRAINTREE_VERSION,
      });
    });

    it("passes back adapted configuration on successful request", async () => {
      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, graphQLConfigResponse(), 200)
      );

      const response = await getConfiguration(
        createAuthorizationData(clientToken)
      );

      expect(Object.keys(response.analyticsMetadata)).toEqual(
        expect.arrayContaining([
          "merchantAppId",
          "platform",
          "sdkVersion",
          "source",
          "integration",
          "sessionId",
        ])
      );

      expect(response.gatewayConfiguration.merchantId).toBe("merchant_id");
      expect(response.gatewayConfiguration.environment).toBe("development");
      expect(response.authorizationType).toBe("CLIENT_TOKEN");
    });

    it("forwards paymentMethodIdJwt from the client token to the configuration object", async () => {
      const rawToken = JSON.parse(atob(clientToken));

      rawToken.paymentMethodIdJwt = "fake-pmt-jwt";

      const tokenWithJwt = btoa(JSON.stringify(rawToken));

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, graphQLConfigResponse(), 200)
      );

      const config = await getConfiguration(
        createAuthorizationData(tokenWithJwt)
      );

      expect(config.paymentMethodIdJwt).toBe("fake-pmt-jwt");
    });

    it("sets paymentMethodIdJwt to undefined when not present in client token", async () => {
      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(null, graphQLConfigResponse(), 200)
      );

      const config = await getConfiguration(
        createAuthorizationData(clientToken)
      );

      expect(config.paymentMethodIdJwt).toBeUndefined();
    });

    it("rejects with a CLIENT_GATEWAY_NETWORK error if request fails", async () => {
      const fakeErr = new Error("you goofed!");

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yieldsAsync(fakeErr, null)
      );
      try {
        await getConfiguration(createAuthorizationData(clientToken));
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
        expect(err.message).toBe("Cannot contact the gateway at this time.");
        expect(err.details.originalError).toBe(fakeErr);
      }
    });
  });
});
