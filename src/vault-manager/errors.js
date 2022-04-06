"use strict";

/**
 * @name BraintreeError.Vault Manager - deletePaymentMethod Error Codes
 * @description Errors that occur when using the [`deletePaymentMethod` method](./VaultManager.html#deletePaymentMethod).
 * @property {MERCHANT} VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN Occurs when vault manager is initialized with a tokenization key instead of a Client Token.
 * @property {MERCHANT} VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND Occurs when the specified payment method can not be found.
 * @property {UNKNOWN} VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR Occurs when there is an error attempting to delete the payment method.
 */

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN: {
    type: BraintreeError.types.MERCHANT,
    code: "VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN",
    message:
      "A client token with a customer id must be used to delete a payment method nonce.",
  },
  VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND: {
    type: BraintreeError.types.MERCHANT,
    code: "VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND",
  },
  VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: "VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR",
  },
};
