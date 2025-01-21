"use strict";

/**
 * @name BraintreeError.Data Collector - Creation Error Codes
 * @description Errors that occur when [creating the Data Collector component](./module-braintree-web_data-collector.html#.create).
 * @property {MERCHANT} DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS Occurs when PayPal Fraudnet could not be enabled.
 */

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: "DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS",
    message: "Data Collector must be created with Kount and/or PayPal.",
  },
};
