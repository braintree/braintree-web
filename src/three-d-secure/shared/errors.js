'use strict';

/**
 * @name BraintreeError.3D Secure - Creation Error Codes
 * @description Errors that occur when [creating the 3D Secure component](/current/module-braintree-web_three-d-secure.html#.create).
 * @property {MERCHANT} THREEDS_NOT_ENABLED Occurs when 3D Secure is not enabled in the Braintree control panel.
 * @property {MERCHANT} THREEDS_CAN_NOT_USE_TOKENIZATION_KEY Occurs when 3D Secure component is created without a Client Token.
 * @property {MERCHANT} THREEDS_HTTPS_REQUIRED Occurs when 3D Secure component is created in production over HTTPS.
 * @property {MERCHANT} THREEDS_NOT_ENABLED_FOR_V2 Occurs when 3D Secure component is created with version 2 parameter, but merchant is not enabled to use version 2.
 * @property {UNKNOWN} THREEDS_CARDINAL_SDK_SETUP_FAILED Occurs when Cardinal's Songbird.js library fails to setup for an unknown reason.
 * @property {NETWORK} THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED Occurs when using version 2 and Cardinal's Songbird.js script could not be loaded.
 * @property {UNKNOWN} THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT Occurs when Cardinal's Songbird.js library takes longer than 60 seconds to set up.
 * @property {UNKNOWN} THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT Occurs when Cardinal sends a response indicating a timeout on /Validate, /Confirm, or /Continue.
 * @property {MERCHANT} THREEDS_CARDINAL_SDK_BAD_CONFIG Occurs when there is no JWT in the request. Also when there's some other malformed aspect of config.
 * @property {MERCHANT} THREEDS_CARDINAL_SDK_BAD_JWT Occus when a malformed config causes a either a missing response JWT or a malformed Cardinal response.
 * @property {UNKNOWN} THREEDS_CARDINAL_SDK_ERROR Occurs when a "general error" or a Cardinal hosted fields error happens. Description contains more details.
 * @property {CUSTOMER} THREEDS_CARDINAL_SDK_CANCELED Occurs when customer cancels the transaction mid-flow, usually with alt-pays that have their own cancel buttons.
 */

/**
 * @name BraintreeError.3D Secure - verifyCard Error Codes
 * @description Errors that occur when using the [`verifyCard` method](/current/ThreeDSecure.html#verifyCard).
 * @property {MERCHANT} THREEDS_AUTHENTICATION_IN_PROGRESS Occurs when another verification is already in progress.
 * @property {MERCHANT} THREEDS_MISSING_VERIFY_CARD_OPTION Occurs when a required option is missing.
 * @property {UNKNOWN} THREEDS_JWT_AUTHENTICATION_FAILED Occurs when something went wrong authenticating the JWT from the Cardinal SDK.
 */

/**
 * @name BraintreeError.3D Secure - cancelVerifyCard Error Codes
 * @description Errors that occur when using the [`cancelVerifyCard` method](/current/ThreeDSecure.html#cancelVerifyCard).
 * @property {MERCHANT} THREEDS_NO_VERIFICATION_PAYLOAD Occurs when the 3D Secure flow is canceled, but there is no 3D Secure information available.
 * @property {MERCHANT} THREEDS_NO_METHOD_DEPRECATED Occurs when `cancelVerifyCard` is called when using 3D Secure version 2.
 */

/**
 * @name BraintreeError.3D Secure - Internal Error Codes
 * @ignore
 * @description Errors that occur internally
 * @property {INTERNAL} THREEDS_TERM_URL_REQUIRES_BRAINTREE_DOMAIN Occurs when iframe is initialized on a non-verified domain.
 */

var BraintreeError = require('../../lib/braintree-error');

module.exports = {
  THREEDS_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_NOT_ENABLED',
    message: '3D Secure is not enabled for this merchant.'
  },
  THREEDS_CAN_NOT_USE_TOKENIZATION_KEY: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_CAN_NOT_USE_TOKENIZATION_KEY',
    message: '3D Secure can not use a tokenization key for authorization.'
  },
  THREEDS_HTTPS_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_HTTPS_REQUIRED',
    message: '3D Secure requires HTTPS.'
  },
  THREEDS_NOT_ENABLED_FOR_V2: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_NOT_ENABLED_FOR_V2',
    message: '3D Secure version 2 is not enabled for this merchant.'
  },
  THREEDS_CARDINAL_SDK_SETUP_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: 'THREEDS_CARDINAL_SDK_SETUP_FAILED',
    message: 'Something went wrong setting up Cardinal\'s Songbird.js library.'
  },
  THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED',
    message: 'Cardinal\'s Songbird.js library could not be loaded.'
  },
  THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT: {
    type: BraintreeError.types.UNKNOWN,
    code: 'THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT',
    message: 'Cardinal\'s Songbird.js took too long to setup.'
  },
  THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT: {
    type: BraintreeError.types.UNKNOWN,
    code: 'THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT',
    message: 'Cardinal\'s API took too long to respond.'
  },
  THREEDS_CARDINAL_SDK_BAD_CONFIG: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_CARDINAL_SDK_BAD_CONFIG',
    message: 'JWT or other required field missing. Please check your setup configuration.'
  },
  THREEDS_CARDINAL_SDK_BAD_JWT: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_CARDINAL_SDK_BAD_JWT',
    message: 'Cardinal JWT missing or malformed. Please check your setup configuration.'
  },
  THREEDS_CARDINAL_SDK_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: 'THREEDS_CARDINAL_SDK_ERROR',
    message: 'A general error has occurred with Cardinal. See description for more information.'
  },
  THREEDS_CARDINAL_SDK_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'THREEDS_CARDINAL_SDK_CANCELED',
    message: 'Canceled by user.'
  },
  THREEDS_AUTHENTICATION_IN_PROGRESS: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_AUTHENTICATION_IN_PROGRESS',
    message: 'Cannot call verifyCard while existing authentication is in progress.'
  },
  THREEDS_MISSING_VERIFY_CARD_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_MISSING_VERIFY_CARD_OPTION'
  },
  THREEDS_JWT_AUTHENTICATION_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: 'THREEDS_JWT_AUTHENTICATION_FAILED',
    message: 'Something went wrong authenticating the JWT from Cardinal'
  },
  THREEDS_NO_VERIFICATION_PAYLOAD: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_NO_VERIFICATION_PAYLOAD',
    message: 'No verification payload available.'
  },
  THREEDS_METHOD_DEPRECATED: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_METHOD_DEPRECATED'
  },
  THREEDS_TERM_URL_REQUIRES_BRAINTREE_DOMAIN: {
    type: BraintreeError.types.INTERNAL,
    code: 'THREEDS_TERM_URL_REQUIRES_BRAINTREE_DOMAIN',
    message: 'Term Url must be on a Braintree domain.'
  }
};
