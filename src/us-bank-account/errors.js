import BraintreeError from "../lib/braintree-error";

/**
 * @name BraintreeError.Us Bank Account - Creation Error Codes
 * @description Errors that occur when [creating the Us Bank Account component](./module-braintree-web_us-bank-account.html#.create).
 * @property {MERCHANT} US_BANK_ACCOUNT_NOT_ENABLED Occurs when US Bank Account is not enabled in the Braintree control panel.
 */

/**
 * @name BraintreeError.Us Bank Account - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./UsBankAccount.html#tokenize).
 * @property {MERCHANT} US_BANK_ACCOUNT_OPTION_REQUIRED Occurs when a required option is not passed.
 * @property {NETWORK} US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR Occurs when payment details could not be tokenized.
 * @property {CUSTOMER} US_BANK_ACCOUNT_FAILED_TOKENIZATION Occurs when payment details failed to be tokenized.
 */

const _default = {
  US_BANK_ACCOUNT_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "US_BANK_ACCOUNT_OPTION_REQUIRED",
  },
  US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR",
    message: "A tokenization network error occurred.",
  },
  US_BANK_ACCOUNT_FAILED_TOKENIZATION: {
    type: BraintreeError.types.CUSTOMER,
    code: "US_BANK_ACCOUNT_FAILED_TOKENIZATION",
    message: "The supplied data failed tokenization.",
  },
  US_BANK_ACCOUNT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "US_BANK_ACCOUNT_NOT_ENABLED",
    message: "US bank account is not enabled.",
  },
};

export const {
  US_BANK_ACCOUNT_OPTION_REQUIRED,
  US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR,
  US_BANK_ACCOUNT_FAILED_TOKENIZATION,
  US_BANK_ACCOUNT_NOT_ENABLED,
} = _default;

export default _default;
