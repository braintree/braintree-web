"use strict";

/**
 * @name BraintreeError.Hosted Fields - Creation Error Codes
 * @description Errors that occur when [creating the Hosted Fields component](./module-braintree-web_hosted-fields.html#.create).
 * @property {UNKNOWN} HOSTED_FIELDS_TIMEOUT Occurs when Hosted Fields does not finish setting up within 60 seconds.
 * @property {MERCHANT} HOSTED_FIELDS_INVALID_FIELD_KEY Occurs when Hosted Fields is instantiated with an invalid Field option.
 * @property {MERCHANT} HOSTED_FIELDS_INVALID_FIELD_SELECTOR Occurs when Hosted Fields given a field selector that is not valid.
 * @property {MERCHANT} HOSTED_FIELDS_FIELD_DUPLICATE_IFRAME Occurs when Hosted Fields given a field selector that already contains an iframe.
 * @property {MERCHANT} HOSTED_FIELDS_FIELD_PROPERTY_INVALID Occurs when a field configuration option is not valid.
 */

/**
 * @name BraintreeError.Hosted Fields - Field Manipulation Error Codes
 * @description Errors that occur when modifying fields through [`addClass`](./HostedFields.html#addClass), [`removeClass`](./HostedFields.html#removeClass), [`setAttribute`](./HostedFields.html#setAttribute), [`removeAttribute`](./HostedFields.html#removeAttribute), [`clear`](./HostedFields.html#clear), [`focus`](./HostedFields.html#focus), and [`setMonthOptions`](./HostedFields.html#setMonthOptions).
 * @property {MERCHANT} HOSTED_FIELDS_FIELD_INVALID Occurs when attempting to modify a field that is not a valid Hosted Fields option.
 * @property {MERCHANT} HOSTED_FIELDS_FIELD_NOT_PRESENT Occurs when attempting to modify a field that is not configured with Hosted Fields.
 * @property {MERCHANT} HOSTED_FIELDS_FIELD_PROPERTY_INVALID Occurs when a field configuration option is not valid.
 */

/**
 * @name BraintreeError.Hosted Fields - Set Attribute Error Codes
 * @description Errors that occur when using the [`setAttribute` method](./HostedFields.html#setAttribute)
 * @property {MERCHANT} HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED Occurs when trying to set an attribute that is not supported to be set.
 * @property {MERCHANT} HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED Occurs when the type of value for an attribute is not allowed to be set.
 */

/**
 * @name BraintreeError.Hosted Fields - Tokenize Error Codes
 * @description Errors that occur when [tokenizing the card details with Hosted Fields](./HostedFields.html#tokenize).
 * @property {NETWORK} HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR Occurs when the Braintree gateway cannot be contacted.
 * @property {CUSTOMER} HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE Occurs when attempting to vault a card, but the client token being used is configured to fail if the card already exists in the vault.
 * @property {CUSTOMER} HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED Occurs when cvv verification is turned on in the Braintree control panel.
 * @property {CUSTOMER} HOSTED_FIELDS_FAILED_TOKENIZATION Occurs when the credit card details were sent to Braintree, but failed to tokenize.
 * @property {CUSTOMER} HOSTED_FIELDS_FIELDS_EMPTY Occurs when all the Hosted Fields inputs are empty.
 * @property {CUSTOMER} HOSTED_FIELDS_FIELDS_INVALID Occurs when one ore more fields are invalid.
 */

var BraintreeError = require("../../lib/braintree-error");

module.exports = {
  HOSTED_FIELDS_TIMEOUT: {
    type: BraintreeError.types.UNKNOWN,
    code: "HOSTED_FIELDS_TIMEOUT",
    message: "Hosted Fields timed out when attempting to set up.",
  },
  HOSTED_FIELDS_INVALID_FIELD_KEY: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_INVALID_FIELD_KEY",
  },
  HOSTED_FIELDS_INVALID_FIELD_SELECTOR: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_INVALID_FIELD_SELECTOR",
    message: "Selector does not reference a valid DOM node.",
  },
  HOSTED_FIELDS_FIELD_DUPLICATE_IFRAME: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_FIELD_DUPLICATE_IFRAME",
    message: "Element already contains a Braintree iframe.",
  },
  HOSTED_FIELDS_FIELD_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_FIELD_INVALID",
  },
  HOSTED_FIELDS_FIELD_NOT_PRESENT: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_FIELD_NOT_PRESENT",
  },
  HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR",
    message: "A tokenization network error occurred.",
  },
  HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE: {
    type: BraintreeError.types.CUSTOMER,
    code: "HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE",
    message: "This credit card already exists in the merchant's vault.",
  },
  HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED: {
    type: BraintreeError.types.CUSTOMER,
    code: "HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED",
    message: "CVV verification failed during tokenization.",
  },
  HOSTED_FIELDS_FAILED_TOKENIZATION: {
    type: BraintreeError.types.CUSTOMER,
    code: "HOSTED_FIELDS_FAILED_TOKENIZATION",
    message: "The supplied card data failed tokenization.",
  },
  HOSTED_FIELDS_FIELDS_EMPTY: {
    type: BraintreeError.types.CUSTOMER,
    code: "HOSTED_FIELDS_FIELDS_EMPTY",
    message: "All fields are empty. Cannot tokenize empty card fields.",
  },
  HOSTED_FIELDS_FIELDS_INVALID: {
    type: BraintreeError.types.CUSTOMER,
    code: "HOSTED_FIELDS_FIELDS_INVALID",
    message:
      "Some payment input fields are invalid. Cannot tokenize invalid card fields.",
  },
  HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED",
  },
  HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED",
  },
  HOSTED_FIELDS_FIELD_PROPERTY_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: "HOSTED_FIELDS_FIELD_PROPERTY_INVALID",
  },
};
