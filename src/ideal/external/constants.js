'use strict';

module.exports = {
  MAX_TRANSACTION_STATUS_POLLING_RETRIES: 5,
  POLL_RETRY_TIME: 10000,
  REQUIRED_OPTIONS_FOR_START_PAYMENT: ['orderId', 'amount', 'currency']
};
