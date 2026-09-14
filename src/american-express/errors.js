/**
 * @name BraintreeError.American Express - getRewardsBalance Error Codes
 * @description Errors that occur when using the [`getRewardsBalance` method](./AmericanExpress.html#getRewardsBalance).
 * @property {MERCHANT} AMEX_NONCE_REQUIRED Occurs when a nonce is not provided to method.
 * @property {NETWORK} AMEX_NETWORK_ERROR Occurs when there is an error communicating with the Braintree gateway.
 */

/**
 * @name BraintreeError.American Express - getExpressCheckoutProfile Error Codes
 * @description Errors that occur when using the [`getExpressCheckoutProfile` method](./AmericanExpress.html#getExpressCheckoutProfile).
 * @property {MERCHANT} AMEX_NONCE_REQUIRED Occurs when a nonce is not provided to method.
 * @property {NETWORK} AMEX_NETWORK_ERROR Occurs when there is an error communicating with the Braintree gateway.
 */

import BraintreeError from "../lib/braintree-error";

export const AMEX_NONCE_REQUIRED = {
  type: BraintreeError.types.MERCHANT,
  code: "AMEX_NONCE_REQUIRED",
};

export const AMEX_NETWORK_ERROR = {
  type: BraintreeError.types.NETWORK,
  code: "AMEX_NETWORK_ERROR",
};
