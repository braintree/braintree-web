"use strict";

/**
 * @name BraintreeError.Shared Internal Error Codes
 * @ignore
 * @description These codes should never be experienced by the merchant directly.
 * @property {INTERNAL} INVALID_USE_OF_INTERNAL_FUNCTION Occurs when the client is created without a gateway configuration. Should never happen.
 */

/**
 * @name BraintreeError.Shared Errors - Component Creation Error Codes
 * @description Errors that occur when creating components.
 * @property {MERCHANT} INSTANTIATION_OPTION_REQUIRED Occurs when a component is created that is missing a required option.
 * @property {MERCHANT} INCOMPATIBLE_VERSIONS Occurs when a component is created with a client with a different version than the component.
 * @property {NETWORK} CLIENT_SCRIPT_FAILED_TO_LOAD Occurs when a component attempts to load the Braintree client script, but the request fails.
 */

/**
 * @name BraintreeError.Shared Errors - Component Instance Error Codes
 * @description Errors that occur when using instances of components.
 * @property {MERCHANT} METHOD_CALLED_AFTER_TEARDOWN Occurs when a method is called on a component instance after it has been torn down.
 */

var BraintreeError = require("./braintree-error");

module.exports = {
  INVALID_USE_OF_INTERNAL_FUNCTION: {
    type: BraintreeError.types.INTERNAL,
    code: "INVALID_USE_OF_INTERNAL_FUNCTION",
  },
  INSTANTIATION_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "INSTANTIATION_OPTION_REQUIRED",
  },
  INCOMPATIBLE_VERSIONS: {
    type: BraintreeError.types.MERCHANT,
    code: "INCOMPATIBLE_VERSIONS",
  },
  CLIENT_SCRIPT_FAILED_TO_LOAD: {
    type: BraintreeError.types.NETWORK,
    code: "CLIENT_SCRIPT_FAILED_TO_LOAD",
    message: "Braintree client script could not be loaded.",
  },
  METHOD_CALLED_AFTER_TEARDOWN: {
    type: BraintreeError.types.MERCHANT,
    code: "METHOD_CALLED_AFTER_TEARDOWN",
  },
};
