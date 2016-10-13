'use strict';

var BraintreeError = require('../lib/error');
var constants = require('./constants');
var errors = require('./errors');
var deferred = require('../lib/deferred');
var once = require('../lib/once');
var throwIfNoCallback = require('../lib/throw-if-no-callback');
var camelCaseToSnakeCase = require('../lib/camel-case-to-snake-case');

/**
 * @class
 * @param {object} options Options
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/us-bank-account.create|braintree.us-bank-account.create} instead.</strong>
 * @classdesc This class represents a US Bank Account component.
 */
function USBankAccount(options) {
  this._client = options.client;
}

USBankAccount.prototype.tokenize = function (options, callback) {
  throwIfNoCallback(callback, 'tokenize');

  options = options || {};
  callback = deferred(callback);

  if (!options.mandateText) {
    callback(new BraintreeError({
      type: errors.US_BANK_OPTION_REQUIRED.type,
      code: errors.US_BANK_OPTION_REQUIRED.code,
      message: 'mandateText property is required.'
    }));
    return;
  }

  if (options.bankDetails && options.bankLogin) {
    callback(new BraintreeError({
      type: errors.US_BANK_MUTUALLY_EXCLUSIVE_OPTIONS.type,
      code: errors.US_BANK_MUTUALLY_EXCLUSIVE_OPTIONS.code,
      message: 'tokenize must be called with bankDetails or bankLogin, not both.'
    }));
  } else if (options.bankDetails) {
    this._tokenizeBankDetails(options, callback);
  } else if (options.bankLogin) {
    this._tokenizeBankLogin(options, callback);
  } else {
    callback(new BraintreeError({
      type: errors.US_BANK_OPTION_REQUIRED.type,
      code: errors.US_BANK_OPTION_REQUIRED.code,
      message: 'tokenize must be called with bankDetails or bankLogin.'
    }));
  }
};

USBankAccount.prototype._tokenizeBankDetails = function (options, callback) {
  var i, key;
  var bankDetails = options.bankDetails;
  var apiConfig = this._client.getConfiguration().gatewayConfiguration.braintreeApi;

  for (i = 0; i < constants.REQUIRED_BANK_DETAILS.length; i++) {
    key = constants.REQUIRED_BANK_DETAILS[i];
    if (!bankDetails[key]) {
      callback(new BraintreeError({
        type: errors.US_BANK_OPTION_REQUIRED.type,
        code: errors.US_BANK_OPTION_REQUIRED.code,
        message: 'bankDetails.' + key + ' property is required.'
      }));
      return;
    }
  }

  this._client._request({
    method: 'POST',
    url: apiConfig.url + '/tokens',
    headers: {
      Authorization: 'Bearer ' + apiConfig.accessToken,
      'Braintree-Version': '2016-08-25'
    },
    data: {
      type: 'us_bank_account',
      /* eslint-disable camelcase */
      routing_number: bankDetails.routingNumber,
      account_number: bankDetails.accountNumber,
      account_holder_name: bankDetails.accountHolderName,
      account_type: bankDetails.accountType,
      billing_address: camelCaseToSnakeCase(bankDetails.billingAddress),
      ach_mandate: {
        text: options.mandateText
      }
      /* eslint-enable camelcase */
    }
  }, function (err, response) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, formatTokenizeResponse(response));
  });
};

USBankAccount.prototype._tokenizeBankLogin = function (options, callback) {
  var client = this._client;
  var apiConfig = this._client.getConfiguration().gatewayConfiguration.braintreeApi;

  if (!options.bankLogin.displayName) {
    callback(new BraintreeError({
      type: errors.US_BANK_OPTION_REQUIRED.type,
      code: errors.US_BANK_OPTION_REQUIRED.code,
      message: 'displayName property is required when using bankLogin.'
    }));
    return;
  }

  this._loadPlaid(function (plaidLoadErr, plaid) {
    if (plaidLoadErr) {
      callback(plaidLoadErr);
      return;
    }

    plaid.create({
      env: 'tartan',
      clientName: options.bankLogin.displayName,
      key: 'test_key',
      product: 'auth',
      selectAccount: true,
      onExit: function () {
        callback(new Error('Customer closed bank login flow.'));
      },
      onSuccess: function (publicToken, metadata) {
        client._request({
          method: 'POST',
          url: apiConfig.url + '/tokens',
          headers: {
            Authorization: 'Bearer ' + apiConfig.accessToken,
            'Braintree-Version': '2016-08-25'
          },
          data: {
            type: 'plaid_public_token',
            /* eslint-disable camelcase */
            public_token: publicToken,
            account_id: metadata.account_id,
            ach_mandate: {
              text: options.mandateText
            }
            /* eslint-enable camelcase */
          }
        }, function (tokenizeErr, response) {
          if (tokenizeErr) {
            callback(tokenizeErr);
            return;
          }

          callback(null, formatTokenizeResponse(response));
        });
      }
    }).open();
  });
};

function formatTokenizeResponse(response) {
  return {
    nonce: response.data.id,
    details: {},
    description: response.data.description,
    type: response.data.type
  };
}

USBankAccount.prototype._loadPlaid = function (callback) {
  var script;

  callback = once(callback);

  if (global.Plaid) {
    callback(null, global.Plaid);
    return;
  }

  script = document.createElement('script');

  script.src = constants.PLAID_LINK_JS;
  script.async = true;
  script.onerror = function () {
    removeLoadListeners(script);
    callback(new BraintreeError(errors.US_BANK_LOGIN_LOAD_FAILED));
  };

  script.onload = script.onreadystatechange = function () {
    if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
      removeLoadListeners(script);
      callback(null, global.Plaid);
    }
  };

  document.body.appendChild(script);

  this._plaidScript = script;
};

function removeLoadListeners(script) {
  script.onerror = script.onload = script.onreadystatechange = null;
}

USBankAccount.prototype.teardown = function () {
  if (this._plaidScript) {
    document.body.removeChild(this._plaidScript);
  }
};

module.exports = USBankAccount;
