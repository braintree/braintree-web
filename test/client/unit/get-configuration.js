"use strict";

jest.mock("@braintree/uuid");

const BraintreeError = require("../../../src/lib/braintree-error");
const { getConfiguration } = require("../../../src/client/get-configuration");
const createAuthorizationData = require("../../../src/lib/create-authorization-data");
const AJAXDriver = require("../../../src/client/request/ajax-driver");
const {
  fake: { clientToken, clientTokenWithGraphQL, tokenizationKey },
  yieldsAsync,
} = require("../../helpers");
const GraphQL = require("../../../src/client/request/graphql");
const uuid = require("@braintree/uuid");

describe("getConfiguration", () => {
  const mockUuid = "some_string";

  beforeEach(() => {
    jest.spyOn(AJAXDriver, "request").mockReturnValue(null);
    uuid.mockReturnValue(mockUuid);
  });

  it("returns a promise when no callback is passed", () => {
    const authData = createAuthorizationData(
      "production_abc123_prod_merchant_id"
    );

    expect(getConfiguration(authData)).toBeInstanceOf(Promise);
  });

  it("uses automatically sets sessionId when not provided", async () => {
    jest.spyOn(AJAXDriver, "request").mockImplementation((ops, cb) => {
      cb(undefined, {}, 200);
    });
    const authData = createAuthorizationData(
      "production_abc123_prod_merchant_id"
    );

    let config = await getConfiguration(authData);

    expect(config.analyticsMetadata.sessionId).toEqual(mockUuid);
  });

  it("uses manually set sessionId when provided", async () => {
    jest.spyOn(AJAXDriver, "request").mockImplementation((ops, cb) => {
      cb(undefined, {}, 200);
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
        expectedUrl:
          "https://api.braintreegateway.com:443/merchants/prod_merchant_id/client_api/v1/configuration",
        environment: "production",
      },
      {
        tokenizationKey: "sandbox_abc123_sandbox_merchant_id",
        expectedUrl:
          "https://api.sandbox.braintreegateway.com:443/merchants/sandbox_merchant_id/client_api/v1/configuration",
        environment: "sandbox",
      },
    ])(
      "uses a $environment config endpoint with a $environment tokenization key",
      ({ tokenizationKey, expectedUrl }) => {
        const authData = createAuthorizationData(tokenizationKey);

        getConfiguration(authData);

        expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
          url: expectedUrl,
        });
      }
    );

    it("passes back configuration on successful request", (done) => {
      const payload = { foo: "bar" };

      jest
        .spyOn(AJAXDriver, "request")
        .mockImplementation(yieldsAsync(null, payload));

      getConfiguration(
        createAuthorizationData(tokenizationKey),
        (err, response) => {
          expect(err).toBeFalsy();

          expect(Object.keys(response.analyticsMetadata)).toEqual([
            "merchantAppId",
            "platform",
            "sdkVersion",
            "source",
            "integration",
            "integrationType",
            "sessionId",
          ]);

          expect(response.gatewayConfiguration).toBe(payload);
          expect(response.authorizationType).toBe("TOKENIZATION_KEY");

          done();
        }
      );
    });

    it.each([
      {
        statusCode: 401,
        expectedCode: "CLIENT_AUTHORIZATION_INVALID",
        expectedType: "MERCHANT",
        expectedMessage:
          "Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted.",
      },
      {
        statusCode: 403,
        expectedCode: "CLIENT_AUTHORIZATION_INSUFFICIENT",
        expectedType: "MERCHANT",
        expectedMessage: "The authorization used has insufficient privileges.",
      },
      {
        statusCode: null,
        expectedCode: "CLIENT_GATEWAY_NETWORK",
        expectedType: "NETWORK",
        expectedMessage: "Cannot contact the gateway at this time.",
      },
    ])(
      "calls the callback with a $expectedCode error if request returns status $statusCode",
      ({ statusCode, expectedCode, expectedType, expectedMessage }) => {
        return new Promise((resolve) => {
          const fakeErr = new Error("you goofed!");

          jest
            .spyOn(AJAXDriver, "request")
            .mockImplementation(yieldsAsync(fakeErr, null, statusCode));

          getConfiguration(
            createAuthorizationData(tokenizationKey),
            (err, response) => {
              expect(response).toBeFalsy();

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe(expectedType);
              expect(err.code).toBe(expectedCode);
              expect(err.message).toBe(expectedMessage);
              expect(err.details.originalError).toBe(fakeErr);

              resolve();
            }
          );
        });
      }
    );
  });

  describe("client token", () => {
    it("uses the config endpoint from the client token", () => {
      const authData = createAuthorizationData(clientToken);
      const configUrl = JSON.parse(atob(clientToken)).configUrl;

      jest.spyOn(AJAXDriver, "request").mockReturnValue(null);
      getConfiguration(authData);

      expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
        url: configUrl,
      });
    });

    it("passes back configuration on successful request", (done) => {
      const payload = { foo: "bar" };

      jest
        .spyOn(AJAXDriver, "request")
        .mockImplementation(yieldsAsync(null, payload));

      getConfiguration(
        createAuthorizationData(clientToken),
        (err, response) => {
          expect(err).toBeFalsy();

          expect(Object.keys(response.analyticsMetadata)).toEqual(
            expect.arrayContaining([
              "merchantAppId",
              "platform",
              "sdkVersion",
              "source",
              "integration",
              "integrationType",
              "sessionId",
            ])
          );

          expect(response.gatewayConfiguration).toBe(payload);
          expect(response.authorizationType).toBe("CLIENT_TOKEN");

          done();
        }
      );
    });

    it("calls the callback with a CLIENT_GATEWAY_NETWORK error if request fails", (done) => {
      const fakeErr = new Error("you goofed!");

      jest
        .spyOn(AJAXDriver, "request")
        .mockImplementation(yieldsAsync(fakeErr, null));

      getConfiguration(
        createAuthorizationData(clientToken),
        (err, response) => {
          expect(response).toBeFalsy();

          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
          expect(err.message).toBe("Cannot contact the gateway at this time.");
          expect(err.details.originalError).toBe(fakeErr);

          done();
        }
      );
    });
  });

  describe("configVersion", () => {
    it("is set with expected value when requesting configuration over AJAX", (done) => {
      jest.spyOn(AJAXDriver, "request").mockImplementation((options) => {
        expect(options.data.configVersion).toBe("3");
        done();
      });

      getConfiguration(createAuthorizationData(clientToken));
    });
  });

  describe("GraphQL configuration", () => {
    describe("client token", () => {
      it("creates a GraphQL instance when GraphQLConfiguration is present", (done) => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementation((authorization) => {
            expect(authorization.graphQL).toBeInstanceOf(GraphQL);
            done();
          });

        getConfiguration(createAuthorizationData(clientTokenWithGraphQL));
      });

      it("does not create a GraphQL instance when GraphQLConfiguration is not present", (done) => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementation((authorization) => {
            expect(authorization.graphQL).toBeFalsy();
            done();
          });

        getConfiguration(createAuthorizationData(clientToken));
      });
    });

    describe("tokenization key", () => {
      it("creates a GraphQL instance", (done) => {
        jest
          .spyOn(AJAXDriver, "request")
          .mockImplementation((authorization) => {
            expect(authorization.graphQL).toBeInstanceOf(GraphQL);
            done();
          });

        getConfiguration(createAuthorizationData(tokenizationKey));
      });
    });
  });
});
