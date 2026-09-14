import BraintreeError from "../../lib/braintree-error";
import errors from "../errors";

// Read the errorClass off the first entry of a GraphQL `errors` body.
function getErrorClass(parsedResponse) {
  return parsedResponse?.errors?.[0]?.extensions?.errorClass;
}

// Classify an HTTP 200 GraphQL response body carrying an `errors` array.
// Returns undefined when the body has no GraphQL-shaped errors.
function errorFromBody(parsedResponse) {
  if (!parsedResponse || !parsedResponse.errors) {
    return undefined;
  }

  const errorClass = getErrorClass(parsedResponse);

  if (errorClass === "AUTHENTICATION") {
    return new BraintreeError(errors.CLIENT_AUTHORIZATION_INVALID);
  }
  if (errorClass === "AUTHORIZATION") {
    return new BraintreeError(errors.CLIENT_AUTHORIZATION_INSUFFICIENT);
  }
  if (errorClass === "VALIDATION") {
    return new BraintreeError(errors.CLIENT_REQUEST_ERROR);
  }

  // Unknown or missing errorClass: use the generic GraphQL error code.
  return new BraintreeError(errors.CLIENT_GRAPHQL_REQUEST_ERROR);
}

export { getErrorClass, errorFromBody };

export default {
  getErrorClass,
  errorFromBody,
};
