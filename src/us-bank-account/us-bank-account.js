'use strict';

var BraintreeError = require('../lib/braintree-error');
var constants = require('./constants');
var errors = require('./errors');
var sharedErrors = require('../lib/errors');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');
var once = require('../lib/once');
var convertMethodsToError = require('../lib/convert-methods-to-error');
var methods = require('../lib/methods');
var throwIfNoCallback = require('../lib/throw-if-no-callback');
var camelCaseToSnakeCase = require('../lib/camel-case-to-snake-case');

/**
 * @typedef {object} USBankAccount~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type The payment method type, always `us_bank_account`.
 * @property {object} details Additional account details. Currently empty.
 */

/**
 * @class
 * @param {object} options See {@link module:braintree-web/us-bank-account.create|us-bank-account.create}.
 * @classdesc This class represents a US Bank Account component. Instances of this class can tokenize raw bank details or present a bank login. <strong>You cannot use this constructor directly. Use {@link module:braintree-web/us-bank-account.create|braintree.us-bank-account.create} instead.</strong>
 */
function USBankAccount(options) {
  this._client = options.client;

  this._isTokenizingBankLogin = false;

  analytics.sendEvent(this._client, 'usbankaccount.initialized');
}

/**
 * Tokenizes bank information to return a payment method nonce. You can tokenize bank details by providing information like account and routing numbers. You can also tokenize with a bank login UI that prompts the customer to log into their bank account.
 * @public
 * @param {object} options All tokenization options for the US Bank Account component.
 * @param {string} options.mandateText A string for proof of customer authorization. For example, `'I authorize Braintree to debit my bank account on behalf of My Online Store.'`.
 * @param {object} [options.bankDetails] Bank detail information (such as account and routing numbers). `bankDetails` or `bankLogin` option must be provided.
 * @param {string} options.bankDetails.routingNumber The customer's bank routing number, such as `'307075259'`.
 * @param {string} options.bankDetails.accountNumber The customer's bank account number, such as `'999999999'`.
 * @param {string} options.bankDetails.accountType The customer's bank account type. Must be `'checking'` or `'savings'`.
 * @param {string} options.bankDetails.accountHolderName The customer's bank account holder name, such as `'Rosetta Fox'`.
 * @param {object} options.bankDetails.billingAddress The customer's billing address.
 * @param {string} options.bankDetails.billingAddress.streetAddress The street address for the customer's billing address, such as `'123 Fake St'`.
 * @param {string} [options.bankDetails.billingAddress.extendedAddress] The extended street address for the customer's billing address, such as `'Apartment B'`.
 * @param {string} options.bankDetails.billingAddress.locality The locality for the customer's billing address. This is typically a city, such as `'San Francisco'`.
 * @param {string} options.bankDetails.billingAddress.region The region for the customer's billing address. This is typically a state, such as `'CA'`.
 * @param {string} options.bankDetails.billingAddress.postalCode The postal code for the customer's billing address. This is typically a ZIP code, such as `'94119'`.
 * @param {object} [options.bankLogin] Bank login information. `bankLogin` or `bankDetails` option must be provided.
 * @param {string} options.bankLogin.displayName Display name for the bank login UI, such as `'My Store'`.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link USBankAccount~tokenizePayload|tokenizePayload}.
 * @returns {void}
 * @example
 * <caption>Tokenizing raw bank details</caption>
 * submitButton.addEventListener('click', function (event) {
 *   var routingNumberInput = document.querySelector('input#routing-number');
 *   var accountNumberInput = document.querySelector('input#account-number');
 *   var accountHolderNameInput = document.querySelector('input#account-holder-name');
 *   var accountTypeInput = document.querySelector('input[name="account-type"]:checked');
 *   var billingAddressStreetInput = document.querySelector('input#street-address');
 *   var billingAddressExtendedInput = document.querySelector('input#extended-address');
 *   var billingAddressLocalityInput = document.querySelector('input#locality');
 *   var billingAddressRegionSelect = document.querySelector('select#region');
 *   var billingAddressPostalInput = document.querySelector('input#postal-code');
 *
 *   event.preventDefault();
 *
 *   usBankAccountInstance.tokenize({
 *     bankDetails: {
 *       routingNumber: routingNumberInput.value,
 *       accountNumber: accountNumberInput.value,
 *       accountHolderName: accountHolderNameInput.value,
 *       accountType: accountTypeInput.value,
 *       billingAddress: {
 *         streetAddress: billingAddressStreetInput.value,
 *         extendedAddress: billingAddressExtendedInput.value,
 *         locality: billingAddressLocalityInput.value,
 *         region: billingAddressRegionSelect.value,
 *         postalCode: billingAddressPostalInput.value
 *       }
 *     },
 *     mandateText: 'I authorize Braintree to debit my bank account on behalf of My Online Store.'
 *   }, function (tokenizeErr, tokenizedPayload) {
 *     if (tokenizeErr) {
 *       console.error('There was an error tokenizing the bank details.');
 *       return;
 *     }
 *
 *     // Send tokenizePayload.nonce to your server here!
 *   });
 * });
 * @example
 * <caption>Tokenizing with bank login UI</caption>
 * bankLoginButton.addEventListener('click', function (event) {
 *   event.preventDefault();
 *
 *   usBankAccountInstance.tokenize({
 *     bankLogin: {
 *       displayName: 'My Online Store'
 *     },
 *     mandateText: 'I authorize Braintree to debit my bank account on behalf of My Online Store.'
 *   }, function (tokenizeErr, tokenizedPayload) {
 *     if (tokenizeErr) {
 *       console.error('There was an error tokenizing the bank details.');
 *       return;
 *     }
 *
 *     // Send tokenizePayload.nonce to your server here!
 *   });
 * });
 */
USBankAccount.prototype.tokenize = function (options, callback) {
  throwIfNoCallback(callback, 'tokenize');

  options = options || {};
  callback = deferred(callback);

  if (!options.mandateText) {
    callback(new BraintreeError({
      type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
      code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
      message: 'mandateText property is required.'
    }));
    return;
  }

  if (options.bankDetails && options.bankLogin) {
    callback(new BraintreeError({
      type: errors.US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS.type,
      code: errors.US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS.code,
      message: 'tokenize must be called with bankDetails or bankLogin, not both.'
    }));
  } else if (options.bankDetails) {
    this._tokenizeBankDetails(options, callback);
  } else if (options.bankLogin) {
    this._tokenizeBankLogin(options, callback);
  } else {
    callback(new BraintreeError({
      type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
      code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
      message: 'tokenize must be called with bankDetails or bankLogin.'
    }));
  }
};

USBankAccount.prototype._tokenizeBankDetails = function (options, callback) {
  var i, key;
  var client = this._client;
  var bankDetails = options.bankDetails;

  for (i = 0; i < constants.REQUIRED_BANK_DETAILS.length; i++) {
    key = constants.REQUIRED_BANK_DETAILS[i];
    if (!bankDetails[key]) {
      callback(new BraintreeError({
        type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
        code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
        message: 'bankDetails.' + key + ' property is required.'
      }));
      return;
    }
  }

  client.request({
    method: 'POST',
    endpoint: 'tokens',
    api: 'braintreeApi',
    data: camelCaseToSnakeCase({
      type: 'us_bank_account',
      routingNumber: bankDetails.routingNumber,
      accountNumber: bankDetails.accountNumber,
      accountHolderName: bankDetails.accountHolderName,
      accountType: bankDetails.accountType,
      billingAddress: camelCaseToSnakeCase(bankDetails.billingAddress),
      achMandate: {
        text: options.mandateText
      }
    })
  }, function (err, response, status) {
    var error;

    if (err) {
      error = errorFrom(err, status);
      analytics.sendEvent(client, 'usbankaccount.bankdetails.tokenization.failed');
      callback(error);
      return;
    }

    analytics.sendEvent(client, 'usbankaccount.bankdetails.tokenization.succeeded');

    callback(null, formatTokenizeResponse(response));
  });
};

USBankAccount.prototype._tokenizeBankLogin = function (options, callback) {
  var self = this;
  var client = this._client;
  var gatewayConfiguration = client.getConfiguration().gatewayConfiguration;
  var isProduction = gatewayConfiguration.environment === 'production';
  var plaidConfig = gatewayConfiguration.usBankAccount.plaid;

  if (!options.bankLogin.displayName) {
    callback(new BraintreeError({
      type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
      code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
      message: 'displayName property is required when using bankLogin.'
    }));
    return;
  }

  if (!plaidConfig) {
    callback(new BraintreeError(errors.US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED));
    return;
  }

  if (this._isTokenizingBankLogin) {
    callback(new BraintreeError(errors.US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE));
    return;
  }
  this._isTokenizingBankLogin = true;

  this._loadPlaid(function (plaidLoadErr, plaid) {
    if (plaidLoadErr) {
      callback(plaidLoadErr);
      return;
    }

    plaid.create({
      clientName: options.bankLogin.displayName,
      env: isProduction ? 'production' : 'tartan',
      key: isProduction ? plaidConfig.publicKey : 'test_key',
      product: 'auth',
      selectAccount: true,
      onExit: function () {
        self._isTokenizingBankLogin = false;

        analytics.sendEvent(client, 'usbankaccount.banklogin.tokenization.closed.by-user');

        callback(new BraintreeError(errors.US_BANK_ACCOUNT_LOGIN_CLOSED));
      },
      onSuccess: function (publicToken, metadata) {
        client.request({
          method: 'POST',
          endpoint: 'tokens',
          api: 'braintreeApi',
          data: camelCaseToSnakeCase({
            type: 'plaid_public_token',
            publicToken: publicToken,
            accountId: metadata.account_id,
            achMandate: {
              text: options.mandateText
            }
          })
        }, function (tokenizeErr, response, status) {
          var error;

          self._isTokenizingBankLogin = false;

          if (tokenizeErr) {
            error = errorFrom(tokenizeErr, status);
            analytics.sendEvent(client, 'usbankaccount.banklogin.tokenization.failed');

            callback(error);
            return;
          }

          analytics.sendEvent(client, 'usbankaccount.banklogin.tokenization.succeeded');

          callback(null, formatTokenizeResponse(response));
        });
      }
    }).open();

    analytics.sendEvent(client, 'usbankaccount.banklogin.tokenization.started');
  });
};

function errorFrom(err, status) {
  var error;

  if (status === 401) {
    error = new BraintreeError(sharedErrors.BRAINTREE_API_ACCESS_RESTRICTED);
  } else if (status < 500) {
    error = new BraintreeError(errors.US_BANK_ACCOUNT_FAILED_TOKENIZATION);
  } else {
    error = new BraintreeError(errors.US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR);
  }
  error.details = {originalError: err};
  return error;
}

function formatTokenizeResponse(response) {
  return {
    nonce: response.data.id,
    details: {},
    description: response.data.description,
    type: response.data.type
  };
}

USBankAccount.prototype._loadPlaid = function (callback) {
  var existingScript, script;

  callback = once(callback);

  if (global.Plaid) {
    callback(null, global.Plaid);
    return;
  }

  existingScript = document.querySelector('script[src="' + constants.PLAID_LINK_JS + '"]');

  if (existingScript) {
    addLoadListeners(existingScript, callback);
  } else {
    script = document.createElement('script');

    script.src = constants.PLAID_LINK_JS;
    script.async = true;

    addLoadListeners(script, callback);

    document.body.appendChild(script);

    this._plaidScript = script;
  }
};

function addLoadListeners(script, callback) {
  function loadHandler() {
    var readyState = this.readyState; // eslint-disable-line no-invalid-this

    if (!readyState || readyState === 'loaded' || readyState === 'complete') {
      removeLoadListeners();
      callback(null, global.Plaid);
    }
  }

  function errorHandler() {
    script.parentNode.removeChild(script);

    callback(new BraintreeError(errors.US_BANK_ACCOUNT_LOGIN_LOAD_FAILED));
  }

  function removeLoadListeners() {
    script.removeEventListener('error', errorHandler);
    script.removeEventListener('load', loadHandler);
    script.removeEventListener('readystatechange', loadHandler);
  }

  script.addEventListener('error', errorHandler);
  script.addEventListener('load', loadHandler);
  script.addEventListener('readystatechange', loadHandler);
}

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/us-bank-account.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * usBankAccountInstance.teardown();
 * @example <caption>With callback</caption>
 * usBankAccountInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {void}
 */
USBankAccount.prototype.teardown = function (callback) {
  if (this._plaidScript) {
    document.body.removeChild(this._plaidScript);
  }

  convertMethodsToError(this, methods(USBankAccount.prototype));

  if (callback) {
    callback = deferred(callback);
    callback();
  }
};

module.exports = USBankAccount;
