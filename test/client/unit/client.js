vi.mock("../../../src/lib/analytics");

import analytics from "../../../src/lib/analytics";
import fetchDriver from "../../../src/client/request/fetch";
import Client from "../../../src/client/client";
import { BRAINTREE_VERSION } from "../../../src/client/constants";
import { GRAPHQL_URLS } from "../../../src/lib/constants";
const VERSION = process.env.npm_package_version;
import _imp0 from "../../helpers";

const {
  fake: { clientToken, configuration: fakeConfiguration, tokenizationKey },
  rejectIfResolves,
  yields,
  yieldsAsync,
} = _imp0;

import BraintreeError from "../../../src/lib/braintree-error";
import methods from "../../../src/lib/methods";

function graphQLConfigResponse() {
  return {
    data: {
      clientConfiguration: fakeConfiguration().gatewayConfiguration,
    },
  };
}

describe("Client", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("bad instantiation", () => {
    it("throws an error when instantiated with no arguments", () => {
      try {
        new Client();
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
      }
    });

    it("throws an error when instantiated with no gatewayConfiguration", () => {
      try {
        new Client();
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.INTERNAL);
        expect(err.code).toBe("CLIENT_MISSING_GATEWAY_CONFIGURATION");
        expect(err.message).toBe("Missing gatewayConfiguration.");
      }
    });

    it("throws an error when instantiated with invalid assetsUrl", () => {
      try {
        new Client({
          gatewayConfiguration: {
            assetsUrl: "http://example.com",
          },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.MERCHANT);
        expect(err.code).toBe("CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN");
        expect(err.message).toBe("assetsUrl property is on an invalid domain.");
      }
    });

    it("throws an error when instantiated with invalid clientApiUrl", () => {
      try {
        new Client({
          gatewayConfiguration: {
            clientApiUrl: "http://example.com",
          },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.MERCHANT);
        expect(err.code).toBe("CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN");
        expect(err.message).toBe(
          "clientApiUrl property is on an invalid domain."
        );
      }
    });

    it("throws an error when instantiated with invalid configUrl", () => {
      try {
        new Client({
          gatewayConfiguration: {
            configUrl: "http://example.com",
          },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.MERCHANT);
        expect(err.code).toBe("CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN");
        expect(err.message).toBe("configUrl property is on an invalid domain.");
      }
    });

    it("throws an error when instantiated with invalid graphqlUrl", () => {
      expect.assertions(4);

      try {
        new Client({
          gatewayConfiguration: {
            graphQL: {
              url: "http://example.com",
            },
          },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.MERCHANT);
        expect(err.code).toBe("CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN");
        expect(err.message).toBe(
          "graphQL.url property is on an invalid domain."
        );
      }
    });
  });

  describe("initialize", () => {
    let originalDevelopmentGraphQLUrl;

    beforeEach(() => {
      originalDevelopmentGraphQLUrl = GRAPHQL_URLS.development;
      GRAPHQL_URLS.development =
        "https://payments.sandbox.braintree-api.com/graphql";

      vi.spyOn(fetchDriver, "request").mockImplementation(
        yields(null, graphQLConfigResponse())
      );
      Client.clearCache();
    });

    afterEach(() => {
      GRAPHQL_URLS.development = originalDevelopmentGraphQLUrl;
    });

    it("sends an analytics event on initialization", async () => {
      await Client.initialize({ authorization: tokenizationKey });
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "custom.client.load.initialized"
      );
    });

    it("sends an analytics event on success", async () => {
      await Client.initialize({ authorization: tokenizationKey });
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "custom.client.load.succeeded"
      );
    });

    it("sends an analytics event when client is cached", async () => {
      await Client.initialize({ authorization: tokenizationKey });
      expect(analytics.sendEvent).not.toBeCalledWith(
        expect.anything(),
        "custom.client.load.cached"
      );
      await Client.initialize({ authorization: tokenizationKey });
      expect(analytics.sendEvent).lastCalledWith(
        expect.anything(),
        "custom.client.load.cached"
      );
    });

    it("gets the configuration from the gateway", async () => {
      await Client.initialize({ authorization: tokenizationKey });

      const reqOptions = fetchDriver.request.mock.calls[0][0];

      expect(reqOptions.method).toBe("POST");
      expect(reqOptions.data.query).toContain("clientConfiguration");
    });

    describe("when the request fails", () => {
      beforeEach(() => {
        fetchDriver.request.mockRestore();
      });

      it("errors out when configuration endpoint is not reachable", async () => {
        vi.spyOn(fetchDriver, "request").mockImplementation(
          yields({ errors: "Unknown error" })
        );

        try {
          await Client.initialize({ authorization: tokenizationKey });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
          expect(err.message).toBe("Cannot contact the gateway at this time.");
        }
      });

      it("deletes client from cache when configuration request errors", () => {
        vi.spyOn(fetchDriver, "request")
          .mockImplementationOnce(yieldsAsync({ errors: "Unknown error" }))
          .mockImplementationOnce(yieldsAsync(null, graphQLConfigResponse()));

        return Client.initialize({ authorization: tokenizationKey })
          .then(rejectIfResolves)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("NETWORK");
            expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
            expect(err.message).toBe(
              "Cannot contact the gateway at this time."
            );

            return Client.initialize({ authorization: tokenizationKey });
          })
          .then(() => {
            expect(fetchDriver.request).toBeCalledTimes(2);
          });
      });

      it("errors out when malformed authorization is passed", async () => {
        vi.spyOn(fetchDriver, "request").mockImplementation(yields(null, null));

        try {
          await Client.initialize({ authorization: "bogus" });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_INVALID_AUTHORIZATION");
          expect(err.message).toBe(
            "Authorization is invalid. Make sure your client token or tokenization key is valid."
          );
        }
      });

      it("errors out when the Client fails to initialize", async () => {
        vi.spyOn(fetchDriver, "request").mockImplementation(yields(null, null));

        try {
          await Client.initialize({ authorization: tokenizationKey });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("INTERNAL");
          expect(err.code).toBe("CLIENT_MISSING_GATEWAY_CONFIGURATION");
          expect(err.message).toBe("Missing gatewayConfiguration.");
        }
      });
    });

    it("can pass debug: true onto configuration", () =>
      Client.initialize({ authorization: clientToken, debug: true }).then(
        async (thingy) => {
          expect(thingy).toBeInstanceOf(Client);
          expect(thingy.getConfiguration().isDebug).toBe(true);
        }
      ));

    it("caches client when created with the same authorization", () =>
      Client.initialize({ authorization: tokenizationKey }).then(
        async (firstFakeClient) =>
          Client.initialize({ authorization: clientToken })
            .then(async (secondFakeClient) => {
              expect(firstFakeClient).not.toBe(secondFakeClient);

              return await Client.initialize({
                authorization: tokenizationKey,
              });
            })
            .then(async (thirdFakeClient) => {
              expect(firstFakeClient).toBe(thirdFakeClient);
            })
      ));

    it("invalidates cached client on teardown", () =>
      Client.initialize({ authorization: tokenizationKey }).then(
        async (firstFakeClient) => {
          await firstFakeClient.teardown();

          return Client.initialize({ authorization: tokenizationKey }).then(
            async (secondFakeClient) => {
              expect(firstFakeClient).not.toBe(secondFakeClient);
            }
          );
        }
      ));
  });

  describe("getConfiguration", () => {
    it("has an immutable configuration", () => {
      let first, second;
      const client = new Client(fakeConfiguration());

      first = client.getConfiguration();
      first.gatewayConfiguration.yes = "yes";

      second = client.getConfiguration();
      expect(second.gatewayConfiguration.yes).toBeFalsy();
    });

    it("has analytics metadata", () => {
      const client = new Client(fakeConfiguration());

      const actual = client.getConfiguration();

      expect(actual.analyticsMetadata.sdkVersion).toBe(VERSION);
      expect(actual.analyticsMetadata.merchantAppId).toBe(
        "http://fakeDomain.com"
      );
      expect(actual.analyticsMetadata.sessionId).toBe("fakeSessionId");
    });

    it("has authorization", () => {
      const client = new Client(fakeConfiguration());
      const actual = client.getConfiguration();

      expect(actual.authorization).toBe("development_testing_merchant_id");
    });
  });

  describe("toJSON", () => {
    it("returns the same object as getConfiguration", () => {
      const client = new Client(fakeConfiguration());

      expect(client.toJSON()).toEqual(client.getConfiguration());
    });

    it("returns the value of getConfiguration when getConfiguration is overwritten", () => {
      const client = new Client(fakeConfiguration());
      const newConfiguration = { foo: "bar" };

      expect(client.toJSON()).toEqual(client.getConfiguration());

      client.getConfiguration = () => newConfiguration;

      expect(client.toJSON()).toBe(newConfiguration);
      expect(client.toJSON()).toBe(client.getConfiguration());
    });
  });

  describe("request", () => {
    beforeEach(() => {
      testContext.originalBody = document.body.innerHTML;
      vi.spyOn(Client.prototype, "request");
    });

    afterEach(() => {
      document.body.innerHTML = testContext.originalBody;
    });

    it("rejects with an error when passed no HTTP method", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());

      try {
        await client.request({
          endpoint: "payment_methods",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_OPTION_REQUIRED");
        expect(err.message).toBe(
          "options.method is required when making a request."
        );
      }
    });

    it("rejects with an error when passed no endpoint", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());

      try {
        await client.request({
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_OPTION_REQUIRED");
        expect(err.message).toBe(
          "options.endpoint is required when making a request."
        );
      }
    });

    it("does not require a method and endpoint when using graphQLApi", async () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(yields(null, {}, 200));

      await client.request({
        api: "graphQLApi",
      });

      expect(client._request).toBeCalledTimes(1);
    });

    it("rejects with error when graphQLApi request comes back with a 200 and an errors object", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());
      const errors = [{}];

      vi.spyOn(client, "_request").mockImplementation(
        yields(null, { errors: errors }, 200)
      );

      try {
        await client.request({
          api: "graphQLApi",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("CLIENT_GRAPHQL_REQUEST_ERROR");
        expect(err.details.originalError).toBe(errors);
      }
    });

    it.each([
      { errorClass: "AUTHENTICATION", code: "CLIENT_AUTHORIZATION_INVALID" },
      {
        errorClass: "AUTHORIZATION",
        code: "CLIENT_AUTHORIZATION_INSUFFICIENT",
      },
      { errorClass: "VALIDATION", code: "CLIENT_REQUEST_ERROR" },
      { errorClass: "UNKNOWN", code: "CLIENT_GRAPHQL_REQUEST_ERROR" },
    ])(
      "maps a graphQLApi 200 $errorClass error body to $code",
      async ({ errorClass, code }) => {
        const client = new Client(fakeConfiguration());
        const graphQLErrors = [{ extensions: { errorClass } }];

        vi.spyOn(client, "_request").mockImplementation(
          yields(null, { errors: graphQLErrors }, 200)
        );

        try {
          await client.request({ api: "graphQLApi" });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe(code);
          expect(err.details.originalError).toBe(graphQLErrors);
        }
      }
    );

    it.each([
      { status: 401, code: "CLIENT_AUTHORIZATION_INVALID" },
      { status: 403, code: "CLIENT_AUTHORIZATION_INSUFFICIENT" },
      { status: 429, code: "CLIENT_RATE_LIMITED" },
      { status: 500, code: "CLIENT_GATEWAY_NETWORK" },
    ])(
      "maps a graphQLApi non-2xx ($status) response to $code",
      async ({ status, code }) => {
        const client = new Client(fakeConfiguration());
        const graphQLErrors = [
          { extensions: { errorClass: "AUTHENTICATION" } },
        ];

        vi.spyOn(client, "_request").mockImplementation(
          yields({ errors: graphQLErrors }, null, status)
        );

        try {
          await client.request({ api: "graphQLApi" });
        } catch (err) {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe(code);
        }
      }
    );

    it("rejects with an error when passed a bogus API", async () => {
      const client = new Client(fakeConfiguration());

      try {
        await client.request({
          method: "get",
          endpoint: "foo",
          api: "garbage",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_OPTION_INVALID");
      }
    });

    it("rejects with an error when passed an empty string as an API", async () => {
      expect.assertions(3);
      const client = new Client(fakeConfiguration());

      try {
        await client.request({
          method: "get",
          endpoint: "foo",
          api: "",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_OPTION_INVALID");
      }
    });

    it("calls driver with client for source in _meta if source is not provided", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null); // yieldsAsync
      client.request({
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls).not.toEqual([]);
      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { _meta: { source: "client" } },
      });
    });

    it("calls driver with full URL with GET if specified and no API is specified", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        method: "get",
        url: "https://braintreegateway.com/v1/payment_methods",
      });
    });

    it("calls driver with full URL with GET if specified and API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "clientApi",
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        method: "get",
        url: "https://braintreegateway.com/v1/payment_methods",
      });
    });

    it("calls driver with GraphQL formatted request when using graphQLApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "graphQLApi",
        data: { foo: "bar" },
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: {
          clientSdkMetadata: {
            platform: "web",
            source: "client",
            integration: "custom",
            sessionId: "fakeSessionId",
            version: expect.stringMatching(/^\d+\.\d+\.\d+/),
          },
          foo: "bar",
        },
        method: "post",
        url: "https://payments.sandbox.braintree-api.com/graphql",
        headers: {
          Authorization: "Bearer development_testing_merchant_id",
          "Braintree-Version": BRAINTREE_VERSION,
        },
      });
    });

    it("uses authorization fingerprint for auth header if available in graphQLApi", () => {
      const conf = fakeConfiguration();
      let client;

      conf.authorization = clientToken;
      conf.authorizationFingerprint = "encoded_auth_fingerprint";

      client = new Client(conf);

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "graphQLApi",
        data: { foo: "bar" },
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        headers: {
          Authorization: "Bearer encoded_auth_fingerprint",
          "Braintree-Version": BRAINTREE_VERSION,
        },
      });
    });

    it("sends graphql.init and graphql.tokenization-key analytics for a graphQLApi request", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({ api: "graphQLApi", data: { foo: "bar" } });

      expect(analytics.sendEvent).toBeCalledWith(client, "graphql.init");
      expect(analytics.sendEvent).toBeCalledWith(
        client,
        "graphql.tokenization-key"
      );
    });

    it("sends graphql.authorization-fingerprint analytics when a fingerprint is present", () => {
      const conf = fakeConfiguration();
      let client;

      conf.authorization = clientToken;
      conf.authorizationFingerprint = "encoded_auth_fingerprint";
      client = new Client(conf);

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({ api: "graphQLApi", data: { foo: "bar" } });

      expect(analytics.sendEvent).toBeCalledWith(
        client,
        "graphql.authorization-fingerprint"
      );
    });

    it("sends a graphql.status.<status> analytics event with the response status", async () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yields(null, { data: {} }, 200)
      );

      await client.request({ api: "graphQLApi" });

      expect(analytics.sendEvent).toBeCalledWith(client, "graphql.status.200");
    });

    it("calls driver with full URL with POST if specified and API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "payment_methods",
        method: "post",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        url: "https://braintreegateway.com/v1/payment_methods",
        method: "post",
      });
    });

    it("calls driver with full URL with POST if specified and API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "clientApi",
        endpoint: "payment_methods",
        method: "post",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        url: "https://braintreegateway.com/v1/payment_methods",
        method: "post",
      });
    });

    it("calls driver with library version when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { braintreeLibraryVersion: `braintree/web/${VERSION}` },
      });
    });

    it("calls driver with library version when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "clientApi",
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { braintreeLibraryVersion: `braintree/web/${VERSION}` },
      });
    });

    it("calls driver with sessionId in _meta when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: {
          _meta: {
            sessionId: client.getConfiguration().analyticsMetadata.sessionId,
          },
        },
      });
    });

    it("calls driver with sessionId in _meta when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "clientApi",
        endpoint: "payment_methods",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: {
          _meta: {
            sessionId: client.getConfiguration().analyticsMetadata.sessionId,
          },
        },
      });
    });

    it("calls driver with client for source in _meta if source is not provided", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        method: "post",
        endpoint: "payment_methods",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { _meta: { source: "client" } },
      });
    });

    it("calls driver with specified source in _meta", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        method: "post",
        endpoint: "payment_methods",
        data: {
          _meta: { source: "custom source" },
        },
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { _meta: { source: "custom source" } },
      });
    });

    it("calls driver with a callable sendAnalyticsEvent function", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(analytics, "sendEvent").mockReturnValue(null);

      vi.spyOn(client, "_request").mockImplementation((options) => {
        options.sendAnalyticsEvent("my.event");
      });

      client.request({
        method: "post",
        endpoint: "payment_methods",
      });

      expect(analytics.sendEvent).toBeCalledWith(client, "my.event");
    });

    it("does not set headers when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "cool",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).not.toMatchObject({
        headers: expect.anything(),
      });
    });

    it("does not set headers when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "clientApi",
        endpoint: "cool",
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).not.toMatchObject({
        headers: expect.anything(),
      });
    });

    it("passes through timeout to driver", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "payment_methods",
        timeout: 4000,
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        timeout: 4000,
      });
    });

    it("passes through data to driver when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        endpoint: "payment_methods",
        data: { some: "stuffs" },
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { some: "stuffs" },
      });
    });

    it("passes through data to driver when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockReturnValue(null);
      client.request({
        api: "clientApi",
        endpoint: "payment_methods",
        data: { some: "stuffs" },
        method: "get",
      });

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { some: "stuffs" },
      });
    });

    it("returns BraintreeError for expired authorization if driver has a 401", async () => {
      expect.assertions(5);
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync("error", null, 401)
      );

      try {
        await client.request({
          endpoint: "payment_methods",
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_AUTHORIZATION_INVALID");
        expect(err.message).toBe(
          "Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted."
        );
        expect(err.details.httpStatus).toBe(401);
      }
    });

    it("returns BraintreeError for authorization if driver has a 403", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync("error", null, 403)
      );

      try {
        await client.request({
          endpoint: "payment_methods",
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_AUTHORIZATION_INSUFFICIENT");
        expect(err.message).toBe(
          "The authorization used has insufficient privileges."
        );
      }
    });

    it("returns BraintreeError for rate limiting if driver has a 429", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync("error", null, 429)
      );

      try {
        await client.request({
          endpoint: "payment_methods",
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("CLIENT_RATE_LIMITED");
        expect(err.message).toBe(
          "You are being rate-limited; please try again in a few minutes."
        );
      }
    });

    it("returns BraintreeError if driver times out", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync("timeout", null, -1)
      );

      try {
        await client.request({
          endpoint: "payment_methods",
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("CLIENT_REQUEST_TIMEOUT");
        expect(err.message).toBe("Request timed out waiting for a reply.");
      }
    });

    it("returns BraintreeError if driver has a 4xx", async () => {
      expect.assertions(5);
      const errorDetails = { error: "message" };
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync(errorDetails, null, 422)
      );

      try {
        await client.request({
          endpoint: "payment_methods",
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("CLIENT_REQUEST_ERROR");
        expect(err.message).toBe("There was a problem with your request.");
        expect(err.details.originalError).toBe(errorDetails);
      }
    });

    it("returns BraintreeError if driver has a 5xx", async () => {
      expect.assertions(4);
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync("This is a network error message", null, 500)
      );

      try {
        await client.request({
          endpoint: "payment_methods",
          method: "get",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
        expect(err.message).toBe("Cannot contact the gateway at this time.");
      }
    });

    it("copies data object and adds _httpStatus when request resolves", async () => {
      const client = new Client(fakeConfiguration());

      vi.spyOn(client, "_request").mockImplementation(
        yieldsAsync(null, { foo: "bar" }, 200)
      );

      const data = await client.request({
        endpoint: "payment_methods",
        method: "get",
      });

      expect(data).toEqual({
        foo: "bar",
        _httpStatus: 200,
      });
    });
  });

  describe("getVersion", () => {
    it("returns the package.json version", () => {
      const client = new Client(fakeConfiguration());

      expect(client.getVersion()).toBe(VERSION);
    });
  });

  describe("teardown", () => {
    it("returns a promise that resolves once teardown is complete", () => {
      const client = new Client(fakeConfiguration());
      const promise = client.teardown();

      expect(promise).toBeInstanceOf(Promise);

      return expect(promise).resolves.toBeUndefined();
    });

    it("replaces all methods so error is thrown when methods are invoked", async () => {
      const instance = new Client(fakeConfiguration());

      await instance.teardown();

      methods(Client.prototype).forEach((method) => {
        let err;

        try {
          instance[method]();
        } catch (e) {
          err = e;
        }

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.MERCHANT);
        expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
        expect(err.message).toBe(`${method} cannot be called after teardown.`);
      });
    });
  });
});
