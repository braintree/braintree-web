import BraintreeError from "../../../../src/lib/braintree-error";
import {
  errorFromBody,
  getErrorClass,
} from "../../../../src/client/request/graphql-error";

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

describe("graphql-error", () => {
  describe("getErrorClass", () => {
    it("returns the errorClass from the first error's extensions", () => {
      expect(getErrorClass(graphQLErrorBody("AUTHENTICATION"))).toBe(
        "AUTHENTICATION"
      );
    });

    it("returns a falsy value when there is no error class", () => {
      expect(getErrorClass(graphQLErrorBody())).toBeFalsy();
      expect(getErrorClass({ data: {} })).toBeFalsy();
      expect(getErrorClass(null)).toBeFalsy();
    });
  });

  describe("errorFromBody", () => {
    it("returns undefined when the body has no errors array", () => {
      expect(errorFromBody({ data: { foo: "bar" } })).toBeUndefined();
      expect(errorFromBody(null)).toBeUndefined();
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
        const err = errorFromBody(body);

        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe(code);
      }
    );

    it("maps a 200 error body with no errorClass to CLIENT_GRAPHQL_REQUEST_ERROR", () => {
      const body = graphQLErrorBody();
      const err = errorFromBody(body);

      expect(err.code).toBe("CLIENT_GRAPHQL_REQUEST_ERROR");
    });
  });
});
