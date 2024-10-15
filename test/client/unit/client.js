"use strict";

jest.mock("../../../src/lib/analytics");

const analytics = require("../../../src/lib/analytics");
const AJAXDriver = require("../../../src/client/request/ajax-driver");
const Client = require("../../../src/client/client");
const { BRAINTREE_VERSION } = require("../../../src/client/constants");
const VERSION = process.env.npm_package_version;
const {
  fake: { clientToken, configuration: fakeConfiguration, tokenizationKey },
  rejectIfResolves,
  noop,
  yields,
  yieldsAsync,
} = require("../../helpers");
const BraintreeError = require("../../../src/lib/braintree-error");
const methods = require("../../../src/lib/methods");

describe("Client", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("bad instantiation", () => {
    it("throws an error when instantiated with no arguments", (done) => {
      try {
        new Client();
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        done();
      }
    });

    it("throws an error when instantiated with no gatewayConfiguration", (done) => {
      try {
        new Client();
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(BraintreeError.types.INTERNAL);
        expect(err.code).toBe("CLIENT_MISSING_GATEWAY_CONFIGURATION");
        expect(err.message).toBe("Missing gatewayConfiguration.");
        done();
      }
    });

    it("throws an error when instantiated with invalid assetsUrl", (done) => {
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
        done();
      }
    });

    it("throws an error when instantiated with invalid clientApiUrl", (done) => {
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
        done();
      }
    });

    it("throws an error when instantiated with invalid configUrl", (done) => {
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
        done();
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
    beforeEach(() => {
      jest
        .spyOn(AJAXDriver, "request")
        .mockImplementation(
          yields(null, fakeConfiguration().gatewayConfiguration)
        );
      Client.clearCache();
    });

    it("sends an analytics event on initialization", () =>
      Client.initialize({ authorization: tokenizationKey }).then(() => {
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "custom.client.load.initialized"
        );
      }));

    it("sends an analytics event on success", () =>
      Client.initialize({ authorization: tokenizationKey }).then(() => {
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "custom.client.load.succeeded"
        );
      }));

    it("sends an analytics event when client is cached", () =>
      Client.initialize({ authorization: tokenizationKey })
        .then(() => {
          expect(analytics.sendEvent).not.toBeCalledWith(
            expect.anything(),
            "custom.client.load.cached"
          );

          return Client.initialize({ authorization: tokenizationKey });
        })
        .then(() => {
          expect(analytics.sendEvent).toBeCalledWith(
            expect.anything(),
            "custom.client.load.cached"
          );
        }));

    it("gets the configuration from the gateway", () =>
      Client.initialize({ authorization: tokenizationKey }).then(() => {
        expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
          url: expect.stringMatching(/client_api\/v1\/configuration$/),
        });
      }));

    describe("when the request fails", () => {
      beforeEach(() => {
        AJAXDriver.request.mockRestore();
      });

      it("errors out when configuration endpoint is not reachable", () => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementation(yields({ errors: "Unknown error" }));

        return Client.initialize({ authorization: tokenizationKey })
          .then(rejectIfResolves)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("NETWORK");
            expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
            expect(err.message).toBe(
              "Cannot contact the gateway at this time."
            );
          });
      });

      it("deletes client from cache when configuration request errors", () => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementationOnce(yieldsAsync({ errors: "Unknown error" }))
          .mockImplementationOnce(
            yieldsAsync(null, fakeConfiguration().gatewayConfiguration)
          );

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
            expect(AJAXDriver.request).toBeCalledTimes(2);
          });
      });

      it("errors out when malformed authorization is passed", () => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementation(yields(null, null));

        return Client.initialize({ authorization: "bogus" })
          .then(rejectIfResolves)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("CLIENT_INVALID_AUTHORIZATION");
            expect(err.message).toBe(
              "Authorization is invalid. Make sure your client token or tokenization key is valid."
            );
          });
      });

      it("errors out when the Client fails to initialize", () => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementation(yields(null, null));

        return Client.initialize({ authorization: tokenizationKey })
          .then(rejectIfResolves)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("INTERNAL");
            expect(err.code).toBe("CLIENT_MISSING_GATEWAY_CONFIGURATION");
            expect(err.message).toBe("Missing gatewayConfiguration.");
          });
      });
    });

    it("can pass debug: true onto configuration", () =>
      Client.initialize({ authorization: clientToken, debug: true }).then(
        (thingy) => {
          expect(thingy).toBeInstanceOf(Client);
          expect(thingy.getConfiguration().isDebug).toBe(true);
        }
      ));

    it("caches client when created with the same authorization", () =>
      Client.initialize({ authorization: tokenizationKey }).then(
        (firstFakeClient) =>
          Client.initialize({ authorization: clientToken })
            .then((secondFakeClient) => {
              expect(firstFakeClient).not.toBe(secondFakeClient);

              return Client.initialize({ authorization: tokenizationKey });
            })
            .then((thirdFakeClient) => {
              expect(firstFakeClient).toBe(thirdFakeClient);
            })
      ));

    it("invalidates cached client on teardown", () =>
      Client.initialize({ authorization: tokenizationKey }).then(
        (firstFakeClient) => {
          firstFakeClient.teardown();

          return Client.initialize({ authorization: tokenizationKey }).then(
            (secondFakeClient) => {
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
      jest.spyOn(Client.prototype, "request");
    });

    afterEach(() => {
      document.body.innerHTML = testContext.originalBody;
    });

    it("calls callback with an error when passed no HTTP method", (done) => {
      const client = new Client(fakeConfiguration());

      client.request(
        {
          endpoint: "payment_methods",
        },
        (err, data) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_OPTION_REQUIRED");
          expect(err.message).toBe(
            "options.method is required when making a request."
          );
          expect(data).toBeFalsy();

          done();
        }
      );
    });

    it("calls callback with an error when passed no endpoint", (done) => {
      const client = new Client(fakeConfiguration());

      client.request(
        {
          method: "get",
        },
        (err, data) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_OPTION_REQUIRED");
          expect(err.message).toBe(
            "options.endpoint is required when making a request."
          );
          expect(data).toBeFalsy();

          done();
        }
      );
    });

    it("does not require a method and endpoint when using graphQLApi", (done) => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockImplementation(yields(null, {}, 200));

      client.request(
        {
          api: "graphQLApi",
        },
        (err) => {
          expect(err).toBeFalsy();
          expect(client._request).toBeCalledTimes(1);
          done();
        }
      );
    });

    it("rejects with error when graphQLApi request comes back with a 200 and an errors object", (done) => {
      const client = new Client(fakeConfiguration());
      const errors = [{}];

      jest
        .spyOn(client, "_request")
        .mockImplementation(yields(null, { errors: errors }, 200));

      client.request(
        {
          api: "graphQLApi",
        },
        (err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("CLIENT_GRAPHQL_REQUEST_ERROR");
          expect(err.details.originalError).toBe(errors);
          done();
        }
      );
    });

    it("calls callback with an error when passed a bogus API", (done) => {
      const client = new Client(fakeConfiguration());

      client.request(
        {
          method: "get",
          endpoint: "foo",
          api: "garbage",
        },
        (err, data) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_OPTION_INVALID");
          expect(err.message).toBe("options.api is invalid.");
          expect(data).toBeFalsy();

          done();
        }
      );
    });

    it("calls callback with an error when passed an empty string as an API", (done) => {
      const client = new Client(fakeConfiguration());

      client.request(
        {
          method: "get",
          endpoint: "foo",
          api: "",
        },
        (err, data) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_OPTION_INVALID");
          expect(err.message).toBe("options.api is invalid.");
          expect(data).toBeFalsy();

          done();
        }
      );
    });

    it("calls driver with client for source in _meta if source is not provided", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null); // yieldsAsync
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

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        method: "get",
        url: "https://braintreegateway.com/v1/payment_methods",
      });
    });

    it("calls driver with full URL with GET if specified and API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "clientApi",
          endpoint: "payment_methods",
          method: "get",
        },
        noop
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        method: "get",
        url: "https://braintreegateway.com/v1/payment_methods",
      });
    });

    it("calls driver with GraphQL formatted request when using graphQLApi", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "graphQLApi",
          data: { foo: "bar" },
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: {
          clientSdkMetadata: {
            platform: "web",
            source: "client",
            integration: "custom",
            sessionId: "fakeSessionId",
            version: expect.stringMatching(/^3\./),
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

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "graphQLApi",
          data: { foo: "bar" },
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        headers: {
          Authorization: "Bearer encoded_auth_fingerprint",
          "Braintree-Version": BRAINTREE_VERSION,
        },
      });
    });

    it("calls driver with full URL with POST if specified and API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "payment_methods",
          method: "post",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        url: "https://braintreegateway.com/v1/payment_methods",
        method: "post",
      });
    });

    it("calls driver with full URL with POST if specified and API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "clientApi",
          endpoint: "payment_methods",
          method: "post",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        url: "https://braintreegateway.com/v1/payment_methods",
        method: "post",
      });
    });

    it("calls driver with library version when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { braintreeLibraryVersion: `braintree/web/${VERSION}` },
      });
    });

    it("calls driver with library version when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "clientApi",
          endpoint: "payment_methods",
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { braintreeLibraryVersion: `braintree/web/${VERSION}` },
      });
    });

    it("calls driver with sessionId in _meta when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        () => {}
      );

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

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "clientApi",
          endpoint: "payment_methods",
          method: "get",
        },
        () => {}
      );

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

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          method: "post",
          endpoint: "payment_methods",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { _meta: { source: "client" } },
      });
    });

    it("calls driver with specified source in _meta", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          method: "post",
          endpoint: "payment_methods",
          data: {
            _meta: { source: "custom source" },
          },
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { _meta: { source: "custom source" } },
      });
    });

    it("calls driver with a callable sendAnalyticsEvent function", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(analytics, "sendEvent").mockReturnValue(null);

      jest.spyOn(client, "_request").mockImplementation((options) => {
        options.sendAnalyticsEvent("my.event");
      });

      client.request(
        {
          method: "post",
          endpoint: "payment_methods",
        },
        () => {}
      );

      expect(analytics.sendEvent).toBeCalledWith(client, "my.event");
    });

    it("does not set headers when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "cool",
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).not.toMatchObject({
        headers: expect.anything(),
      });
    });

    it("does not set headers when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "clientApi",
          endpoint: "cool",
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).not.toMatchObject({
        headers: expect.anything(),
      });
    });

    it("passes through timeout to driver", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "payment_methods",
          timeout: 4000,
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        timeout: 4000,
      });
    });

    it("passes through data to driver when API is unspecified", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          endpoint: "payment_methods",
          data: { some: "stuffs" },
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { some: "stuffs" },
      });
    });

    it("passes through data to driver when API is clientApi", () => {
      const client = new Client(fakeConfiguration());

      jest.spyOn(client, "_request").mockReturnValue(null);
      client.request(
        {
          api: "clientApi",
          endpoint: "payment_methods",
          data: { some: "stuffs" },
          method: "get",
        },
        () => {}
      );

      expect(client._request.mock.calls[0][0]).toMatchObject({
        data: { some: "stuffs" },
      });
    });

    it("returns BraintreeError for expired authorization if driver has a 401", (done) => {
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync("error", null, 401));

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_AUTHORIZATION_INVALID");
          expect(err.message).toBe(
            "Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted."
          );
          expect(data).toBeNull();
          expect(status).toBe(401);
          done();
        }
      );
    });

    it("returns BraintreeError for authorization if driver has a 403", (done) => {
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync("error", null, 403));

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_AUTHORIZATION_INSUFFICIENT");
          expect(err.message).toBe(
            "The authorization used has insufficient privileges."
          );
          expect(data).toBeNull();
          expect(status).toBe(403);
          done();
        }
      );
    });

    it("returns BraintreeError for rate limiting if driver has a 429", (done) => {
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync("error", null, 429));

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("CLIENT_RATE_LIMITED");
          expect(err.message).toBe(
            "You are being rate-limited; please try again in a few minutes."
          );
          expect(data).toBeNull();
          expect(status).toBe(429);
          done();
        }
      );
    });

    it("returns BraintreeError if driver times out", (done) => {
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync("timeout", null, -1));

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("CLIENT_REQUEST_TIMEOUT");
          expect(err.message).toBe("Request timed out waiting for a reply.");
          expect(data).toBeNull();
          expect(status).toBe(-1);
          done();
        }
      );
    });

    it("returns BraintreeError if driver has a 4xx", (done) => {
      const errorDetails = { error: "message" };
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync(errorDetails, null, 422));

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("CLIENT_REQUEST_ERROR");
          expect(err.message).toBe("There was a problem with your request.");
          expect(err.details.originalError).toBe(errorDetails);
          expect(data).toBeNull();
          expect(status).toBe(422);
          done();
        }
      );
    });

    it("returns BraintreeError if driver has a 5xx", (done) => {
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(
          yieldsAsync("This is a network error message", null, 500)
        );

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
          expect(err.message).toBe("Cannot contact the gateway at this time.");
          expect(data).toBeNull();
          expect(status).toBe(500);
          done();
        }
      );
    });

    it("copies data object and adds _httpStatus when request resolves", (done) => {
      const client = new Client(fakeConfiguration());

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync(null, { foo: "bar" }, 200));

      client.request(
        {
          endpoint: "payment_methods",
          method: "get",
        },
        (err, data, status) => {
          expect(err).toBeFalsy();
          expect(status).toBe(200);
          expect(data).toEqual({
            foo: "bar",
            _httpStatus: 200,
          });
          done();
        }
      );
    });

    it("fraudnet json is added to dom when collect device data is enabled for card transactions", (done) => {
      const expectedData = { foo: "boo" };
      const configuration = fakeConfiguration();
      let client;

      configuration.gatewayConfiguration.creditCards.collectDeviceData = true;
      client = new Client(configuration);

      jest
        .spyOn(client, "_request")
        .mockImplementation(
          yieldsAsync(null, { creditCards: [{ nonce: "fake-nonce" }] }, 200)
        );

      client.request(
        {
          endpoint: "payment_methods/credit_cards",
          data: expectedData,
          method: "post",
        },
        () => {
          const script = document.querySelector(
            'script[type="application/json"]'
          );

          expect(script.getAttribute("fncls")).toBe(
            "fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99"
          );
          expect(script.innerHTML).toBe(
            '{"f":"fake-nonce","fp":{"rda_tenant":"bt_card","mid":"merchant-id"},"bu":false,"s":"BRAINTREE_SIGNIN"}'
          );
          done();
        }
      );
    });

    it("fraudnet json is NOT added to dom when collect device data is disabled for card transactions", (done) => {
      const expectedData = { foo: "boo" };
      const configuration = fakeConfiguration();
      let client;

      configuration.gatewayConfiguration.creditCards.collectDeviceData = false;
      client = new Client(configuration);

      jest
        .spyOn(client, "_request")
        .mockImplementation(
          yieldsAsync(null, { creditCards: [{ nonce: "fake-nonce" }] }, 200)
        );

      client.request(
        {
          endpoint: "payment_methods/credit_cards",
          data: expectedData,
          method: "post",
        },
        () => {
          const script = document.querySelector(
            'script[type="application/json"]'
          );

          expect(script).toBeNull();

          done();
        }
      );
    });

    it("fraudnet json is NOT added to dom when collect device data is enabled but gateway response does not contain creditCards array", (done) => {
      const expectedData = { foo: "boo" };
      const configuration = fakeConfiguration();
      let client;

      configuration.gatewayConfiguration.creditCards.collectDeviceData = true;
      client = new Client(configuration);

      jest
        .spyOn(client, "_request")
        .mockImplementation(yieldsAsync(null, {}, 200));

      client.request(
        {
          endpoint: "payment_methods/credit_cards",
          data: expectedData,
          method: "post",
        },
        () => {
          const script = document.querySelector(
            'script[type="application/json"]'
          );

          expect(script).toBeNull();

          done();
        }
      );
    });
  });

  describe("getVersion", () => {
    it("returns the package.json version", () => {
      const client = new Client(fakeConfiguration());

      expect(client.getVersion()).toBe(VERSION);
    });
  });

  describe("teardown", () => {
    it("returns a promise", () => {
      const client = new Client(fakeConfiguration());
      const promise = client.teardown();

      expect(promise).toBeInstanceOf(Promise);
    });

    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      const instance = new Client(fakeConfiguration());

      instance.teardown(() => {
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
          expect(err.message).toBe(
            `${method} cannot be called after teardown.`
          );
        });

        done();
      });
    });
  });
});
