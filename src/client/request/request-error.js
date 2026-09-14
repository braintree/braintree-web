import BraintreeError from "../../lib/braintree-error";
import convertToBraintreeError from "../../lib/convert-to-braintree-error";
import errors from "../errors";
import { errorFromBody } from "./graphql-error";

// Map a non-2xx HTTP status to a BraintreeError. Returns undefined for 2xx.
// This is transport-level classification shared by every request the client
// makes, whether it targets the REST clientApi or the GraphQL api.
function errorFromStatus(status, err) {
  if (status === -1) {
    return new BraintreeError(errors.CLIENT_REQUEST_TIMEOUT);
  }
  if (status === 401) {
    return new BraintreeError(errors.CLIENT_AUTHORIZATION_INVALID);
  }
  if (status === 403) {
    return new BraintreeError(errors.CLIENT_AUTHORIZATION_INSUFFICIENT);
  }
  if (status === 429) {
    return new BraintreeError(errors.CLIENT_RATE_LIMITED);
  }
  if (status >= 500) {
    return new BraintreeError(errors.CLIENT_GATEWAY_NETWORK);
  }
  if (status < 200 || status >= 400) {
    return convertToBraintreeError(err, errors.CLIENT_REQUEST_ERROR);
  }

  return undefined;
}

// Classify the outcome of any client request (REST clientApi or GraphQL)
// into a BraintreeError, or undefined on success. Status is checked first;
// a 200 with a GraphQL-shaped error body is classified next.
function classifyRequestError(status, err, parsedResponse) {
  let requestError =
    errorFromStatus(status, err) || errorFromBody(parsedResponse);

  // A transport error with no classifiable status or body is still a failure.
  if (!requestError && err) {
    requestError = new BraintreeError(errors.CLIENT_GATEWAY_NETWORK);
  }

  if (!requestError) {
    return undefined;
  }

  const originalError = parsedResponse?.errors ?? err?.errors ?? err;

  requestError.details = requestError.details || {};
  requestError.details.originalError = originalError;
  requestError.details.httpStatus = status;

  return requestError;
}

export { classifyRequestError, errorFromStatus };

export default {
  classifyRequestError,
  errorFromStatus,
};
