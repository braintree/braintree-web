import BraintreeError from "../lib/braintree-error";

/**
 * @name BraintreeError.Apple Pay - Creation Error Codes
 * @description Errors that occur when [creating the Apple Pay component](./module-braintree-web_apple-pay.html#.create).
 * @property {MERCHANT} APPLE_PAY_NOT_ENABLED Occurs when the authorization used is not authorized to process Apple Pay.
 */

/**
 * @name BraintreeError.Apple Pay - applePayCapabilities Error Codes
 * @description Errors that occur when [checking capability](./ApplePay.html#applePayCapabilities).
 * @property {MERCHANT} APPLE_PAY_SDK_NOT_LOADED Occurs when `applePayCapabilities` is called but Apple's Apple Pay JS SDK is not available (for example, it failed to load or `loadApplePaySDK` was set to `false`).
 */

/**
 * @name BraintreeError.Apple Pay - performValidation Error Codes
 * @description Errors that occur when [validating](./ApplePay.html#performValidation).
 * @property {MERCHANT} APPLE_PAY_VALIDATION_URL_REQUIRED Occurs when the `validationURL` option is not passed in.
 * @property {MERCHANT} APPLE_PAY_MERCHANT_VALIDATION_FAILED Occurs when the website domain has not been registered in the Braintree control panel.
 * @property {NETWORK} APPLE_PAY_MERCHANT_VALIDATION_NETWORK Occurs when an unknown network error occurs.
 */

/**
 * @name BraintreeError.Apple Pay - tokenize Error Codes
 * @description Errors that occur when [tokenizing](./ApplePay.html#tokenize).
 * @property {MERCHANT} APPLE_PAY_PAYMENT_TOKEN_REQUIRED Occurs when the `token` option is not passed in.
 * @property {NETWORK} APPLE_PAY_TOKENIZATION Occurs when an unknown network error occurs.
 */

const _default = {
  APPLE_PAY_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "APPLE_PAY_NOT_ENABLED",
    message: "Apple Pay is not enabled for this merchant.",
  },
  APPLE_PAY_SDK_NOT_LOADED: {
    type: BraintreeError.types.MERCHANT,
    code: "APPLE_PAY_SDK_NOT_LOADED",
    message: "Apple Pay JS SDK is not loaded.",
  },
  APPLE_PAY_VALIDATION_URL_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "APPLE_PAY_VALIDATION_URL_REQUIRED",
    message: "performValidation must be called with a validationURL.",
  },
  APPLE_PAY_MERCHANT_VALIDATION_NETWORK: {
    type: BraintreeError.types.NETWORK,
    code: "APPLE_PAY_MERCHANT_VALIDATION_NETWORK",
    message: "A network error occurred when validating the Apple Pay merchant.",
  },
  APPLE_PAY_MERCHANT_VALIDATION_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "APPLE_PAY_MERCHANT_VALIDATION_FAILED",
    message:
      "Make sure you have registered your domain name in the Braintree Control Panel.",
  },
  APPLE_PAY_PAYMENT_TOKEN_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "APPLE_PAY_PAYMENT_TOKEN_REQUIRED",
    message: "tokenize must be called with a payment token.",
  },
  APPLE_PAY_TOKENIZATION: {
    type: BraintreeError.types.NETWORK,
    code: "APPLE_PAY_TOKENIZATION",
    message: "A network error occurred when processing the Apple Pay payment.",
  },
};

export const {
  APPLE_PAY_NOT_ENABLED,
  APPLE_PAY_SDK_NOT_LOADED,
  APPLE_PAY_VALIDATION_URL_REQUIRED,
  APPLE_PAY_MERCHANT_VALIDATION_NETWORK,
  APPLE_PAY_MERCHANT_VALIDATION_FAILED,
  APPLE_PAY_PAYMENT_TOKEN_REQUIRED,
  APPLE_PAY_TOKENIZATION,
} = _default;

export default _default;
