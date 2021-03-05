'use strict';

/**
 * @name BraintreeError.Data Collector - Creation Error Codes
 * @description Errors that occur when [creating the Data Collector component](./module-braintree-web_data-collector.html#.create).
 * @property {MERCHANT} DATA_COLLECTOR_KOUNT_NOT_ENABLED Occurs when Kount is enabled in creation options but is not enabled on the Braintree control panel.
 * @property {MERCHANT} DATA_COLLECTOR_KOUNT_ERROR Occurs when Kount errors while setting up.
 * @property {MERCHANT} DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS Occurs when Kount or PayPal Fraudnet could not be enabled.
 */

var BraintreeError = require('../lib/braintree-error');

module.exports = {
  DATA_COLLECTOR_KOUNT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'DATA_COLLECTOR_KOUNT_NOT_ENABLED',
    message: 'Kount is not enabled for this merchant.'
  },
  DATA_COLLECTOR_KOUNT_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: 'DATA_COLLECTOR_KOUNT_ERROR'
  },
  DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: 'DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS',
    message: 'Data Collector must be created with Kount and/or PayPal.'
  }
};
