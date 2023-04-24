"use strict";

const GraphQL = require("../../../../../src/client/request/graphql");

describe("GraphQL", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.tokenizeUrl =
      "https://localhost/merchant_id/client_api/v1/payment_methods/credit_cards?12312";
    testContext.tokenizePayPalUrl =
      "https://localhost/merchant_id/client_api/v1/payment_methods/paypal?12312";
    testContext.config = {
      graphQL: {
        url: "http://localhost/graphql",
        features: ["tokenize_credit_cards"],
      },
    };
  });

  describe("getGraphQLEndpoint", () => {
    it("provides a GraphQL endpoint", () => {
      const gql = new GraphQL(testContext.config);

      expect(gql.getGraphQLEndpoint()).toBe(testContext.config.graphQL.url);
    });
  });

  describe("isGraphQLRequest", () => {
    it("returns true if url is a GraphQL url", () => {
      const gql = new GraphQL(testContext.config);

      expect(gql.isGraphQLRequest(testContext.tokenizeUrl, {})).toBe(true);
    });

    it("returns false if url is a non-GraphQL client api url", () => {
      const gql = new GraphQL(testContext.config);

      expect(gql.isGraphQLRequest(testContext.tokenizePayPalUrl, {})).toBe(
        false
      );
    });

    it("returns false if url is not a GraphQL url", () => {
      const gql = new GraphQL(testContext.config);

      expect(gql.isGraphQLRequest("https://localhost/other", {})).toBe(false);
    });

    it("returns false if GraphQL configuration is not present", () => {
      const gql = new GraphQL({});

      expect(gql.isGraphQLRequest("https://localhost/other", {})).toBe(false);
    });

    it("returns false if body contains disallowed key", () => {
      const gql = new GraphQL(testContext.config);
      const body = {
        creditCard: {
          options: {
            unionPayEnrollment: {
              id: "id",
              smsCode: "smsCode",
            },
          },
        },
      };

      expect(gql.isGraphQLRequest(testContext.tokenizeUrl, body)).toBe(false);
    });

    it("returns false if body contains disallowed key with falsy, but not undefined value", () => {
      const gql = new GraphQL(testContext.config);

      expect(
        gql.isGraphQLRequest(testContext.tokenizeUrl, {
          creditCard: {
            options: {
              unionPayEnrollment: null,
            },
          },
        })
      ).toBe(false);
      expect(
        gql.isGraphQLRequest(testContext.tokenizeUrl, {
          creditCard: {
            options: {
              unionPayEnrollment: false,
            },
          },
        })
      ).toBe(false);
      expect(
        gql.isGraphQLRequest(testContext.tokenizeUrl, {
          creditCard: {
            options: {
              unionPayEnrollment: 0,
            },
          },
        })
      ).toBe(false);
    });
  });
});
