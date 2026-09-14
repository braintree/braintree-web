import BraintreeError from "../../../../src/lib/braintree-error";
import {
  classifyRequestError,
  errorFromStatus,
} from "../../../../src/client/request/request-error";

function graphQLErrorBody(errorClass) {
  return {
    errors: [
      {
        message: "an error",
        extensions: errorClass ? { errorClass } : {},
      },
    ],
  };
}

describe("request-error", () => {
  describe("errorFromStatus", () => {
    it.each([
      { status: -1, code: "CLIENT_REQUEST_TIMEOUT" },
      { status: 401, code: "CLIENT_AUTHORIZATION_INVALID" },
      { status: 403, code: "CLIENT_AUTHORIZATION_INSUFFICIENT" },
      { status: 429, code: "CLIENT_RATE_LIMITED" },
      { status: 500, code: "CLIENT_GATEWAY_NETWORK" },
      { status: 503, code: "CLIENT_GATEWAY_NETWORK" },
      { status: 400, code: "CLIENT_REQUEST_ERROR" },
    ])("maps HTTP status $status to $code", ({ status, code }) => {
      const err = errorFromStatus(status, "error");

      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.code).toBe(code);
    });

    it("returns undefined for a 2xx status", () => {
      expect(errorFromStatus(200, null)).toBeUndefined();
    });
  });

  describe("classifyRequestError", () => {
    it("returns undefined for a successful 200 response", () => {
      expect(
        classifyRequestError(200, null, { data: { foo: "bar" } })
      ).toBeUndefined();
    });

    it.each([
      { status: -1, code: "CLIENT_REQUEST_TIMEOUT" },
      { status: 401, code: "CLIENT_AUTHORIZATION_INVALID" },
      { status: 403, code: "CLIENT_AUTHORIZATION_INSUFFICIENT" },
      { status: 429, code: "CLIENT_RATE_LIMITED" },
      { status: 500, code: "CLIENT_GATEWAY_NETWORK" },
      { status: 503, code: "CLIENT_GATEWAY_NETWORK" },
      { status: 400, code: "CLIENT_REQUEST_ERROR" },
    ])("maps HTTP status $status to $code", ({ status, code }) => {
      const err = classifyRequestError(status, "error", null);

      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.code).toBe(code);
      expect(err.details.httpStatus).toBe(status);
      expect(err.details.originalError).toBe("error");
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
      "maps a 200 error body with errorClass $errorClass to $code",
      ({ errorClass, code }) => {
        const body = graphQLErrorBody(errorClass);
        const err = classifyRequestError(200, null, body);

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe(code);
        expect(err.details.originalError).toBe(body.errors);
        expect(err.details.httpStatus).toBe(200);
      }
    );

    it("maps a 200 error body with no errorClass to CLIENT_GRAPHQL_REQUEST_ERROR", () => {
      const body = graphQLErrorBody();
      const err = classifyRequestError(200, null, body);

      expect(err.code).toBe("CLIENT_GRAPHQL_REQUEST_ERROR");
    });

    it("classifies a non-2xx response that carries a GraphQL error body from its status", () => {
      const body = graphQLErrorBody("AUTHENTICATION");
      // fetch driver forwards a non-2xx body as `err`, not as the response.
      const err = classifyRequestError(403, body, null);

      expect(err.code).toBe("CLIENT_AUTHORIZATION_INSUFFICIENT");
      expect(err.details.httpStatus).toBe(403);
      expect(err.details.originalError).toBe(body.errors);
    });

    it("surfaces the transport error as originalError on a non-2xx response", () => {
      const transportError = new Error("boom");
      const err = classifyRequestError(500, transportError, null);

      expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
      expect(err.details.originalError).toBe(transportError);
    });

    it("wraps a non-BraintreeError into CLIENT_REQUEST_ERROR for a generic 4xx", () => {
      const original = new Error("nope");
      const err = classifyRequestError(422, original, null);

      expect(err.code).toBe("CLIENT_REQUEST_ERROR");
      expect(err.details.originalError).toBe(original);
    });

    it("classifies a transport error with no status or body as CLIENT_GATEWAY_NETWORK", () => {
      const transportError = new Error("never left the browser");
      const err = classifyRequestError(undefined, transportError, null);

      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.code).toBe("CLIENT_GATEWAY_NETWORK");
      expect(err.details.originalError).toBe(transportError);
      expect(err.details.httpStatus).toBeUndefined();
    });
  });
});
