import BraintreeError from "../../lib/braintree-error";

/**
 * @name BraintreeError.Venmo - Creation Error Codes
 * @description Errors that occur when [creating the Venmo component](./module-braintree-web_venmo.html#.create).
 * @property {MERCHANT} VENMO_NOT_ENABLED Occurs when Venmo is not enabled on the Braintree control panel.
 * @property {MERCHANT} VENMO_INVALID_PROFILE_ID Occurs when Venmo is initialized with a profile id, but it is invalid.
 * @property {MERCHANT} VENMO_INVALID_RISK_CORRELATION_ID Occurs when Venmo is initialized with a riskCorrelationId (A.K.A. a clientMetadataId), but it is invalid.
 * @property {MERCHANT} VENMO_INVALID_DEEP_LINK_RETURN_URL Occurs when Venmo is initialized with a deep link return URL, but it is invalid.
 * @property {MERCHANT} VENMO_PAYMENT_METHOD_USAGE_REQUIRED Occurs when Venmo is initialized without a paymentMethodUsage option.
 * @property {MERCHANT} VENMO_INVALID_PAYMENT_METHOD_USAGE Occurs when Venmo is initialized with a paymentMethodUsage that is not "single_use" or "multi_use".
 * @property {MERCHANT} VENMO_TOTAL_AMOUNT_REQUIRED Occurs when Venmo is initialized with `paymentMethodUsage` of `single_use` but without a `totalAmount`.
 * @property {NETWORK} VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED Occurs when the request to set up a Venmo Payment Context object fails.
 */

/**
 * @name BraintreeError.Venmo - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./Venmo.html#tokenize).
 * @property {CUSTOMER} VENMO_CUSTOMER_CANCELED Occurs when customer cancels the flow.
 * @property {CUSTOMER} VENMO_DESKTOP_CANCELED Occurs when customer cancels the Venmo Desktop flow by closing the modal.
 * @property {UNKNOWN} VENMO_DESKTOP_UNKNOWN_ERROR Occurs when an unknown error causes the Venmo Desktop flow to fail.
 * @property {UNKNOWN} VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR Occurs when an unknown network error causes the mobile polling process to fail.
 * @property {CUSTOMER} VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED Occurs when the polling has expired and the payment cannot be completed.
 * @property {CUSTOMER} VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED Occurs when the polling operation is canceled by the customer.
 * @property {CUSTOMER} VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT Occurs when customer takes too long to complete payment.
 * @property {UNKNOWN} VENMO_MOBILE_POLLING_TOKENIZATION_NO_CONTEXT_ID Occurs when payment context ID is not available.
 * @property {UNKNOWN} VENMO_MOBILE_POLLING_TOKENIZATION_FAILED Occurs if there is an unknown error during the mobile polling process.
 * @property {NETWORK} VENMO_NETWORK_ERROR Occurs when a network error causes a request to fail.
 * @property {MERCHANT} VENMO_TOKENIZATION_CANCELED_BY_MERCHANT Occurs when `cancelTokenization` is called while tokenization is in progress.
 * @property {UNKNOWN} VENMO_TOKENIZATION_FAILED Occurs when there is an unknown error during the web login experience.
 * @property {MERCHANT} VENMO_TOKENIZATION_REQUEST_ACTIVE Occurs when `tokenize` is called when the flow is already in progress.
 * @property {MERCHANT} VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE Occurs when `cancelTokenization` is called when the flow is not in progress.
 * @property {MERCHANT} VENMO_ECD_DISABLED Occurs when the merchant tries to access customer details without enabling Enriched Customer Data.
 */

const _default = {
  VENMO_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_NOT_ENABLED",
    message: "Venmo is not enabled for this merchant.",
  },
  VENMO_TOKENIZATION_REQUEST_ACTIVE: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_TOKENIZATION_REQUEST_ACTIVE",
    message: "Another tokenization request is active.",
  },
  VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE",
    message: "No tokenization in progress.",
  },
  VENMO_CUSTOMER_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "VENMO_CUSTOMER_CANCELED",
    message: "User canceled Venmo authorization.",
  },
  VENMO_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "VENMO_NETWORK_ERROR",
    message: "Something went wrong making the request",
  },
  VENMO_DESKTOP_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "VENMO_DESKTOP_CANCELED",
    message:
      "User canceled Venmo authorization by closing the Venmo Desktop modal.",
  },
  VENMO_TOKENIZATION_CANCELED_BY_MERCHANT: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_TOKENIZATION_CANCELED_BY_MERCHANT",
    message: "The Venmo tokenization was canceled by the merchant.",
  },
  VENMO_DESKTOP_UNKNOWN_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: "VENMO_DESKTOP_UNKNOWN_ERROR",
    message: "Something went wrong with the Venmo Desktop flow.",
  },
  VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED",
    message: "Something went wrong creating the Venmo Payment Context.",
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: "VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR",
    message: "Something went wrong during mobile polling.",
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED: {
    type: BraintreeError.types.CUSTOMER,
    code: "VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED",
    message: "The Venmo authorization request is expired.",
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED",
    message: "The Venmo authorization was canceled",
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT: {
    type: BraintreeError.types.CUSTOMER,
    code: "VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT",
    message: "Customer took too long to authorize Venmo payment.",
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_NO_CONTEXT_ID: {
    type: BraintreeError.types.UNKNOWN,
    code: "VENMO_MOBILE_POLLING_TOKENIZATION_NO_CONTEXT_ID",
    message: "No Venmo payment context ID available.",
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: "VENMO_MOBILE_POLLING_TOKENIZATION_FAILED",
    message: "The Venmo authorization failed.",
  },
  VENMO_INVALID_PROFILE_ID: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_INVALID_PROFILE_ID",
    message: "Venmo profile ID is invalid.",
  },
  VENMO_INVALID_DEEP_LINK_RETURN_URL: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_INVALID_DEEP_LINK_RETURN_URL",
    message: "Venmo deep link return URL is invalid.",
  },
  VENMO_PAYMENT_METHOD_USAGE_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_PAYMENT_METHOD_USAGE_REQUIRED",
    message: "Payment method usage is required.",
  },
  VENMO_INVALID_PAYMENT_METHOD_USAGE: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_INVALID_PAYMENT_METHOD_USAGE",
    message: "Payment method usage is invalid.",
  },
  VENMO_TOTAL_AMOUNT_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_TOTAL_AMOUNT_REQUIRED",
    message: "Total amount required when payment method usage is single use.",
  },
  VENMO_INVALID_RISK_CORRELATION_ID: {
    type: BraintreeError.types.MERCHANT,
    code: "VENMO_INVALID_RISK_CORRELATION_ID",
    message: "Venmo risk correlation ID is invalid.",
  },
  VENMO_TOKENIZATION_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: "VENMO_TOKENIZATION_FAILED",
    message: "Venmo encountered a problem",
  },
  VENMO_ECD_DISABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "ECD_DISABLED",
    message:
      "Cannot collect customer data when ECD is disabled. Enable this feature in the Control Panel to collect this data.",
  },
};

export const {
  VENMO_NOT_ENABLED,
  VENMO_TOKENIZATION_REQUEST_ACTIVE,
  VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE,
  VENMO_CUSTOMER_CANCELED,
  VENMO_NETWORK_ERROR,
  VENMO_DESKTOP_CANCELED,
  VENMO_TOKENIZATION_CANCELED_BY_MERCHANT,
  VENMO_DESKTOP_UNKNOWN_ERROR,
  VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED,
  VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR,
  VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED,
  VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED,
  VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT,
  VENMO_MOBILE_POLLING_TOKENIZATION_NO_CONTEXT_ID,
  VENMO_MOBILE_POLLING_TOKENIZATION_FAILED,
  VENMO_INVALID_PROFILE_ID,
  VENMO_INVALID_DEEP_LINK_RETURN_URL,
  VENMO_PAYMENT_METHOD_USAGE_REQUIRED,
  VENMO_INVALID_PAYMENT_METHOD_USAGE,
  VENMO_TOTAL_AMOUNT_REQUIRED,
  VENMO_INVALID_RISK_CORRELATION_ID,
  VENMO_TOKENIZATION_FAILED,
  VENMO_ECD_DISABLED,
} = _default;

export default _default;
