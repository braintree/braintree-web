"use strict";

/**
 * @name BraintreeError.Client - Internal Error Codes
 * @ignore
 * @description These codes should never be experienced by the merchant directly.
 * @property {MERCHANT} CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN An error to prevent client creation for domains that are not allowed in the JS.
 * @property {INTERNAL} CLIENT_MISSING_GATEWAY_CONFIGURATION Occurs when the client is created without a gateway configuration. Should never happen.
 */

/**
 * @name BraintreeError.Client - Create Error Codes
 * @description Errors that may occur when [creating the client](./module-braintree-web_client.html#.create)
 * @property {MERCHANT} CLIENT_INVALID_AUTHORIZATION Occurs when client token cannot be parsed.
 */

/**
 * @name BraintreeError.Client - Request Error Codes
 * @description Errors that may occur when [using the request method](./Client.html#request)
 * @property {MERCHANT} CLIENT_OPTION_REQUIRED An option required in the request method was not provided. Usually `options.method` or `options.endpoint`
 * @property {MERCHANT} CLIENT_OPTION_INVALID The request option provided is invalid.
 * @property {MERCHANT} CLIENT_GATEWAY_NETWORK The Braintree gateway could not be contacted.
 * @property {NETWORK} CLIENT_REQUEST_TIMEOUT The request took too long to complete and timed out.
 * @property {NETWORK} CLIENT_REQUEST_ERROR The response from a request had status 400 or greater.
 * @property {NETWORK} CLIENT_GRAPHQL_REQUEST_ERROR The response from a request to GraphQL contained an error.
 * @property {MERCHANT} CLIENT_RATE_LIMITED The response from a request had a status of 429, indicating rate limiting.
 * @property {MERCHANT} CLIENT_AUTHORIZATION_INSUFFICIENT The user associated with the client token or tokenization key does not have permissions to make the request.
 * @property {MERCHANT} CLIENT_AUTHORIZATION_INVALID The provided authorization could not be found. Either the client token has expired and a new client token must be generated or the tokenization key used is set to be inactive or has been deleted.
 */

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN",
  },
  CLIENT_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_OPTION_REQUIRED",
  },
  CLIENT_OPTION_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_OPTION_INVALID",
  },
  CLIENT_MISSING_GATEWAY_CONFIGURATION: {
    type: BraintreeError.types.INTERNAL,
    code: "CLIENT_MISSING_GATEWAY_CONFIGURATION",
    message: "Missing gatewayConfiguration.",
  },
  CLIENT_INVALID_AUTHORIZATION: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_INVALID_AUTHORIZATION",
    message:
      "Authorization is invalid. Make sure your client token or tokenization key is valid.",
  },
  CLIENT_GATEWAY_NETWORK: {
    type: BraintreeError.types.NETWORK,
    code: "CLIENT_GATEWAY_NETWORK",
    message: "Cannot contact the gateway at this time.",
  },
  CLIENT_REQUEST_TIMEOUT: {
    type: BraintreeError.types.NETWORK,
    code: "CLIENT_REQUEST_TIMEOUT",
    message: "Request timed out waiting for a reply.",
  },
  CLIENT_REQUEST_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "CLIENT_REQUEST_ERROR",
    message: "There was a problem with your request.",
  },
  CLIENT_GRAPHQL_REQUEST_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "CLIENT_GRAPHQL_REQUEST_ERROR",
    message: "There was a problem with your request.",
  },
  CLIENT_RATE_LIMITED: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_RATE_LIMITED",
    message: "You are being rate-limited; please try again in a few minutes.",
  },
  CLIENT_AUTHORIZATION_INSUFFICIENT: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_AUTHORIZATION_INSUFFICIENT",
    message: "The authorization used has insufficient privileges.",
  },
  CLIENT_AUTHORIZATION_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: "CLIENT_AUTHORIZATION_INVALID",
    message:
      "Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted.",
  },
};
