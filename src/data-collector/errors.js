import BraintreeError from "../lib/braintree-error";

/**
 * @name BraintreeError.Data Collector - Creation Error Codes
 * @description Errors that occur when [creating the Data Collector component](./module-braintree-web_data-collector.html#.create).
 * @property {NETWORK} DATA_COLLECTOR_FAILED_TO_INSTANTIATE Occurs when PayPal Fraudnet could not be enabled.
 */

const _default = {
  DATA_COLLECTOR_FAILED_TO_INSTANTIATE: {
    type: BraintreeError.types.NETWORK,
    code: "DATA_COLLECTOR_FAILED_TO_INSTANTIATE",
    message:
      "Data Collector failed to instantiate. Possible network error or blocked request.",
  },
};

export const { DATA_COLLECTOR_FAILED_TO_INSTANTIATE } = _default;

export default _default;
