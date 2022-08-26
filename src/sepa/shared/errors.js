"use strict";

var BraintreeError = require("../../lib/braintree-error");

/**
 * @name BraintreeError.SEPA - tokenize Error Codes
 * @description Errors that occur when using the {@link module:braintree-web/sepa.tokenize|sepa.tokenize} method.
 * @property {MERCHANT} SEPA_CREATE_MANDATE_FAILED Occurs when there was an issue creating a mandate. This can occur if the request fails, or if the merchant does not have SEPA enabled.
 * @property {CUSTOMER} SEPA_CUSTOMER_CANCELED Occurs when the customer has canceled the SEPA authorization process. This can be within the mandate approval popup, or by canceling the popup itself.
 * @property {MERCHANT} SEPA_INVALID_MANDATE_TYPE Occurs when an invalid mandate type is provided.
 * @property {UNKNOWN} SEPA_TOKENIZATION_FAILED Occurs when tokenization fails during the mandate approval process for unknown reasons.
 * @property {MERCHANT} SEPA_TOKENIZE_MISSING_REQUIRED_OPTION Occurs when there are required input options not provided.
 * @property {UNKNOWN} SEPA_TRANSACTION_FAILED Occurs when final tokenization fails.
 */

// Those with a "details" property are used in specific locations and this prop serves to identify where in the imlpementation the error originates.
module.exports = {
  SEPA_CREATE_MANDATE_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "SEPA_CREATE_MANDATE_FAILED",
    message: "SEPA create mandate failed.",
    details: "create-mandate",
  },
  SEPA_CUSTOMER_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "SEPA_CUSTOMER_CANCELED",
    message: "User canceled SEPA authorization",
    details: "customer-canceled",
  },
  SEPA_INVALID_MANDATE_TYPE: {
    type: BraintreeError.types.MERCHANT,
    code: "SEPA_INVALID_MANDATE_TYPE",
    message: "SEPA mandate type is invalid",
  },
  SEPA_TOKENIZATION_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: "SEPA_TOKENIZATION_FAILED",
    message: "SEPA encountered a problem",
    details: "open-popup",
  },
  SEPA_TOKENIZE_MISSING_REQUIRED_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "SEPA_TOKENIZE_MISSING_REQUIRED_OPTION",
    message: "Missing required option for tokenize.",
  },
  SEPA_TRANSACTION_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: "SEPA_TRANSACTION_FAILED",
    message: "SEPA transaction failed",
    details: "handle-approval",
  },
};
