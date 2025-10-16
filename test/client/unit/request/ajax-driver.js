"use strict";

const server = require("mock-xmlhttprequest").newServer();
const AJAXDriver = require("../../../../src/client/request/ajax-driver");
const xhr = require("../../../../src/client/request/xhr");
const GraphQL = require("../../../../src/client/request/graphql");
const { noop } = require("../../../helpers");
const TEST_SERVER_URL = "/testUrl/";

describe("AJAXDriver", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.fakeGraphQL = {
      isGraphQLRequest: jest.fn().mockReturnValue(false),
    };
    server.install();
  });

  afterEach(() => {
    server.remove();
  });

  describe("tcp preconnect bug retry", () => {
    afterEach(() => {
      server._routes = {};
    });

    it("retries if a 408 error", (done) => {
      server.get(TEST_SERVER_URL, [
        { status: 408 },
        { status: 200, body: '{ "result": "yay" }' },
      ]);

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err, data, status) => {
          expect(err).toBeFalsy();
          expect(status).toBe(200);
          expect(data).toEqual({ result: "yay" });
          done();
        }
      );
    });

    it("retries if a status code is 0", (done) => {
      server.get(TEST_SERVER_URL, [
        { status: 0 },
        { status: 200, body: '{ "result": "yay" }' },
      ]);

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err, data, status) => {
          expect(err).toBeFalsy();
          expect(status).toBe(200);
          expect(data).toEqual({ result: "yay" });
          done();
        }
      );
    });

    it("only retries once", (done) => {
      server.get(TEST_SERVER_URL, [
        { status: 408, body: '{ "attempt": 1 }' },
        { status: 408, body: '{ "attempt": 2 }' },
      ]);

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err, data, status) => {
          expect(err.attempt).toBe(2);
          expect(status).toBe(408);
          expect(data).toBeFalsy();
          done();
        }
      );
    });
  });

  describe("#request with get", () => {
    afterEach(() => {
      server._routes = {};
    });

    it("accepts an ajax timeout value which will terminate the request if it is not completed", (done) => {
      // once in the callback, twice in the server timeout assertion to account for the tcp preconnect retry
      expect.assertions(3);
      server.get(TEST_SERVER_URL, ({ _timeout }) => {
        expect(_timeout).toBe(50);
      });

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          timeout: 50,
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err) => {
          expect(err).not.toBe(null);
          done();
        }
      );
    });

    it("makes a serialized ajax request", (done) => {
      server.get(TEST_SERVER_URL, {
        status: 200,
        body: JSON.stringify({ marco: "polo" }),
      });

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err, resp) => {
          if (err) {
            done(err);

            return;
          }

          expect(resp.marco).toBe("polo");
          done();
        }
      );
    });

    it("calls callback with error if request is unsuccessful", (done) => {
      server.get(TEST_SERVER_URL, { status: 500 });

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err) => {
          expect(err).not.toBe(null);
          done();
        }
      );
    });

    it("calls callback with error if request is rate limited", (done) => {
      const body = "<!doctype html><html></html>";

      server.get(TEST_SERVER_URL, {
        status: 429,
        body,
        headers: { "Content-Type": "text/html" },
      });

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "GET",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err, res, status) => {
          expect(status).toBe(429);
          expect(res).toBeNull();
          expect(err).toEqual(body);
          done();
        }
      );
    });
  });

  describe("#request with post", () => {
    afterEach(() => {
      server._routes = {};
    });

    it("makes a serialized ajax request", (done) => {
      server.post(`${TEST_SERVER_URL}/marco`, {
        status: 200,
        body: JSON.stringify({ marco: "polo" }),
      });

      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/marco`,
          data: { marco: "polo" },
          method: "POST",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err, resp) => {
          if (err) {
            done(err);

            return;
          }

          expect(resp.marco).toBe("polo");
          done();
        }
      );
    });

    it("sets the Content-Type header to application/json", () => {
      jest
        .spyOn(XMLHttpRequest.prototype, "setRequestHeader")
        .mockReturnValue(null);

      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/marco`,
          data: { marco: "polo" },
          method: "POST",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(XMLHttpRequest.prototype.setRequestHeader).toBeCalledWith(
        "Content-Type",
        "application/json"
      );
    });

    it("sets the headers if provided and XHR is available", () => {
      jest
        .spyOn(XMLHttpRequest.prototype, "setRequestHeader")
        .mockReturnValue(null);

      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/marco`,
          data: { marco: "polo" },
          headers: {
            Foo: "foo",
            Bar: "bar",
          },
          method: "POST",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(XMLHttpRequest.prototype.setRequestHeader).toBeCalledWith(
        "Foo",
        "foo"
      );
      expect(XMLHttpRequest.prototype.setRequestHeader).toBeCalledWith(
        "Bar",
        "bar"
      );
    });

    it("calls callback with error if request is unsuccessful", (done) => {
      server.post(TEST_SERVER_URL, { status: 500 });

      AJAXDriver.request(
        {
          url: TEST_SERVER_URL,
          method: "POST",
          graphQL: testContext.fakeGraphQL,
          metadata: testContext.fakeMetadata,
        },
        (err) => {
          expect(err).not.toBe(null);
          done();
        }
      );
    });
  });

  describe("graphql", () => {
    beforeEach(() => {
      testContext.fakeMetadata = {
        source: "my-source",
        integration: "my-integration",
        sessionId: "my-session-id",
      };
      testContext.gql = new GraphQL({
        graphQL: {
          url: "http://localhost/graphql",
          features: ["tokenize_credit_cards"],
        },
      });

      testContext.fakeXHR = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
      };
      jest.spyOn(xhr, "getRequestObject").mockReturnValue(testContext.fakeXHR);

      server.post(/client_api\//, {});
    });

    it("sets GraphQL required headers for GraphQL URLs", () => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/client_api/v1/payment_methods/credit_cards`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {},
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(testContext.fakeXHR.setRequestHeader).toBeCalledWith(
        "Authorization",
        "Bearer fake_tokenization_key"
      );
      expect(testContext.fakeXHR.setRequestHeader).toBeCalledWith(
        "Braintree-Version",
        expect.any(String)
      );
    });

    it("does not set GraphQL required headers for non GraphQL URLs", () => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/client_api/non-graph-ql-endpoint`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {},
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(testContext.fakeXHR.setRequestHeader).not.toBeCalledWith(
        "Authorization",
        "Bearer fake_tokenization_key"
      );
      expect(testContext.fakeXHR.setRequestHeader).not.toBeCalledWith(
        "Braintree-Version",
        expect.any(String)
      );
    });

    it("formats body for GraphQL URLs", () => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/client_api/v1/payment_methods/credit_cards`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {},
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(testContext.fakeXHR.send).toHaveBeenCalledWith(
        expect.stringContaining("mutation TokenizeCreditCard")
      );
    });

    it("does not format body for non GraphQL URLs", () => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}foo`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {},
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(testContext.fakeXHR.send).not.toHaveBeenCalledWith(
        expect.stringContaining("mutation TokenizeCreditCard")
      );
    });

    it("rewrites url for GraphQL URLs", () => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/client_api/v1/payment_methods/credit_cards`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {},
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(testContext.fakeXHR.open).toBeCalledWith(
        "POST",
        "http://localhost/graphql",
        true
      );
    });

    it("does not rewrite url for non GraphQL URLs", () => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}foo`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {},
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        noop
      );

      expect(testContext.fakeXHR.open).not.toBeCalledWith(
        "POST",
        "http://localhost/graphql",
        true
      );
    });

    it("provides formatted response from GraphQL", (done) => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}/client_api/v1/payment_methods/credit_cards`,
          data: {
            tokenizationKey: "fake_tokenization_key",
            creditCard: {
              number: "4111111111111111",
            },
            headers: {},
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        (err, body, status) => {
          expect(err).toBeFalsy();
          expect(status).toBe(200);

          expect(body).toEqual({
            creditCards: [
              {
                binData: {
                  commercial: "Unknown",
                  debit: "No",
                  durbinRegulated: "Yes",
                  healthcare: "Unknown",
                  payroll: "No",
                  prepaid: "Yes",
                  issuingBank: "issuing-bank",
                  countryOfIssuance: "USA",
                  productId: "product-id",
                  business: "Unknown",
                  consumer: "Unknown",
                  purchase: "Unknown",
                  corporate: "Unknown",
                },
                consumed: false,
                description: "ending in 11",
                nonce: "the-token",
                details: {
                  expirationMonth: "09",
                  expirationYear: "2020",
                  bin: "",
                  cardType: "Visa",
                  lastFour: "1111",
                  lastTwo: "11",
                },
                type: "CreditCard",
                threeDSecureInfo: null,
              },
            ],
          });

          done();
        }
      );

      testContext.fakeXHR.readyState = 4;
      testContext.fakeXHR.status = 200;
      testContext.fakeXHR.responseText = JSON.stringify({
        data: {
          tokenizeCreditCard: {
            token: "the-token",
            creditCard: {
              expirationMonth: "09",
              expirationYear: "2020",
              binData: {
                commercial: "UNKNOWN",
                debit: "NO",
                durbinRegulated: "YES",
                healthcare: null,
                payroll: "NO",
                prepaid: "YES",
                issuingBank: "issuing-bank",
                countryOfIssuance: "USA",
                productId: "product-id",
                business: "Unknown",
                consumer: "Unknown",
                purchase: "Unknown",
                corporate: "Unknown",
              },
              brandCode: "VISA",
              last4: "1111",
            },
          },
        },
      });

      testContext.fakeXHR.onreadystatechange();
    });

    it("does not provide formatted response from non GraphQL endpoints", (done) => {
      AJAXDriver.request(
        {
          url: `${TEST_SERVER_URL}foo`,
          data: {
            tokenizationKey: "fake_tokenization_key",
          },
          method: "POST",
          graphQL: testContext.gql,
          metadata: testContext.fakeMetadata,
        },
        (err, body, status) => {
          expect(err).toBeFalsy();
          expect(status).toBe(200);

          expect(body).toEqual({
            foo: "bar",
          });
          done();
        }
      );

      testContext.fakeXHR.readyState = 4;
      testContext.fakeXHR.status = 200;
      testContext.fakeXHR.responseText = '{"foo":"bar"}';

      testContext.fakeXHR.onreadystatechange();
    });
  });

  describe("API latency tracking", () => {
    afterEach(() => {
      server._routes = {};
    });

    it("sends analytics event for create_payment_resource endpoint", (done) => {
      const sendAnalyticsEventSpy = jest.fn();

      server.post(
        "/merchants/test/client_api/v1/paypal_hermes/create_payment_resource",
        {
          status: 200,
          body: '{"success":true}',
        }
      );

      AJAXDriver.request(
        {
          url: "https://api.braintreegateway.com/merchants/test/client_api/v1/paypal_hermes/create_payment_resource",
          method: "POST",
          data: {},
          graphQL: testContext.fakeGraphQL,
          sendAnalyticsEvent: sendAnalyticsEventSpy,
        },
        () => {
          expect(sendAnalyticsEventSpy).toHaveBeenCalledWith(
            "core.api-request-latency",
            expect.objectContaining({
              domain: "api.braintreegateway.com",
              endpoint: "/v1/paypal_hermes/create_payment_resource",
              startTime: expect.any(Number),
              endTime: expect.any(Number),
            })
          );
          done();
        }
      );
    });
  });
});
