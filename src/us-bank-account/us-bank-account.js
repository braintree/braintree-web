"use strict";

var BraintreeError = require("../lib/braintree-error");
var constants = require("./constants");
var errors = require("./errors");
var sharedErrors = require("../lib/errors");
var analytics = require("../lib/analytics");
var once = require("../lib/once");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var methods = require("../lib/methods");
var Promise = require("../lib/promise");
var wrapPromise = require("@braintree/wrap-promise");

var TOKENIZE_BANK_DETAILS_MUTATION = createGraphQLMutation("UsBankAccount");
var TOKENIZE_BANK_LOGIN_MUTATION = createGraphQLMutation("UsBankLogin");

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

  analytics.sendEvent(this._client, "usbankaccount.initialized");
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
 * @param {string} options.bankDetails.ownershipType The customer's bank account ownership type. Must be `'personal'` or `'business'`.
 * @param {string} [options.bankDetails.firstName] The customer's first name. Required when account ownership type is `personal`.
 * @param {string} [options.bankDetails.lastName] The customer's last name. Required when account ownership type is `personal`.
 * @param {string} [options.bankDetails.businessName] The customer's business name. Required when account ownership type is `business`.
 * @param {object} options.bankDetails.billingAddress The customer's billing address.
 * @param {string} options.bankDetails.billingAddress.streetAddress The street address for the customer's billing address, such as `'123 Fake St'`.
 * @param {string} [options.bankDetails.billingAddress.extendedAddress] The extended street address for the customer's billing address, such as `'Apartment B'`.
 * @param {string} options.bankDetails.billingAddress.locality The locality for the customer's billing address. This is typically a city, such as `'San Francisco'`.
 * @param {string} options.bankDetails.billingAddress.region The region for the customer's billing address. This is typically a state, such as `'CA'`.
 * @param {string} options.bankDetails.billingAddress.postalCode The postal code for the customer's billing address. This is typically a ZIP code, such as `'94119'`.
 * @param {object} [options.bankLogin] Bank login information. `bankLogin` or `bankDetails` option must be provided.
 * @param {string} options.bankLogin.displayName Display name for the bank login UI, such as `'My Store'`.
 * @param {string} options.bankLogin.ownershipType The customer's bank account ownership type. Must be `'personal'` or `'business'`.
 * @param {string} [options.bankLogin.firstName] The customer's first name. Required when account ownership type is `personal`.
 * @param {string} [options.bankLogin.lastName] The customer's last name. Required when account ownership type is `personal`.
 * @param {string} [options.bankLogin.businessName] The customer's business name. Required when account ownership type is `business`.
 * @param {object} options.bankLogin.billingAddress The customer's billing address.
 * @param {string} options.bankLogin.billingAddress.streetAddress The street address for the customer's billing address, such as `'123 Fake St'`.
 * @param {string} [options.bankLogin.billingAddress.extendedAddress] The extended street address for the customer's billing address, such as `'Apartment B'`.
 * @param {string} options.bankLogin.billingAddress.locality The locality for the customer's billing address. This is typically a city, such as `'San Francisco'`.
 * @param {string} options.bankLogin.billingAddress.region The region for the customer's billing address. This is typically a state, such as `'CA'`.
 * @param {string} options.bankLogin.billingAddress.postalCode The postal code for the customer's billing address. This is typically a ZIP code, such as `'94119'`.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link USBankAccount~tokenizePayload|tokenizePayload}. If no callback is provided, `tokenize` returns a promise that resolves with {@link USBankAccount~tokenizePayload|tokenizePayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * <caption>Tokenizing raw bank details</caption>
 * var routingNumberInput = document.querySelector('input[name="routing-number"]');
 * var accountNumberInput = document.querySelector('input[name="account-number"]');
 * var accountTypeInput = document.querySelector('input[name="account-type"]:checked');
 * var ownershipTypeInput = document.querySelector('input[name="ownership-type"]:checked');
 * var firstNameInput = document.querySelector('input[name="first-name"]');
 * var lastNameInput = document.querySelector('input[name="last-name"]');
 * var businessNameInput = document.querySelector('input[name="business-name"]');
 * var billingAddressStreetInput = document.querySelector('input[name="street-address"]');
 * var billingAddressExtendedInput = document.querySelector('input[name="extended-address"]');
 * var billingAddressLocalityInput = document.querySelector('input[name="locality"]');
 * var billingAddressRegionSelect = document.querySelector('select[name="region"]');
 * var billingAddressPostalInput = document.querySelector('input[name="postal-code"]');
 *
 * submitButton.addEventListener('click', function (event) {
 *   var bankDetails = {
 *     routingNumber: routingNumberInput.value,
 *     accountNumber: accountNumberInput.value,
 *     accountType: accountTypeInput.value,
 *     ownershipType: ownershipTypeInput.value,
 *     billingAddress: {
 *       streetAddress: billingAddressStreetInput.value,
 *       extendedAddress: billingAddressExtendedInput.value,
 *       locality: billingAddressLocalityInput.value,
 *       region: billingAddressRegionSelect.value,
 *       postalCode: billingAddressPostalInput.value
 *     }
 *   };
 *
 *   if (bankDetails.ownershipType === 'personal') {
 *     bankDetails.firstName = firstNameInput.value;
 *     bankDetails.lastName = lastNameInput.value;
 *   } else {
 *     bankDetails.businessName = businessNameInput.value;
 *   }
 *
 *   event.preventDefault();
 *
 *   usBankAccountInstance.tokenize({
 *     bankDetails: bankDetails,
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
 * var ownershipTypeInput = document.querySelector('input[name="ownership-type"]:checked');
 * var firstNameInput = document.querySelector('input[name="first-name"]');
 * var lastNameInput = document.querySelector('input[name="last-name"]');
 * var businessNameInput = document.querySelector('input[name="business-name"]');
 * var billingAddressStreetInput = document.querySelector('input[name="street-address"]');
 * var billingAddressExtendedInput = document.querySelector('input[name="extended-address"]');
 * var billingAddressLocalityInput = document.querySelector('input[name="locality"]');
 * var billingAddressRegionSelect = document.querySelector('select[name="region"]');
 * var billingAddressPostalInput = document.querySelector('input[name="postal-code"]');
 *
 * bankLoginButton.addEventListener('click', function (event) {
 *   var bankLogin = {
 *     displayName: 'My Online Store',
 *     ownershipType: ownershipTypeInput.value,
 *     billingAddress: {
 *       streetAddress: billingAddressStreetInput.value,
 *       extendedAddress: billingAddressExtendedInput.value,
 *       locality: billingAddressLocalityInput.value,
 *       region: billingAddressRegionSelect.value,
 *       postalCode: billingAddressPostalInput.value
 *     }
 *   }
 *   event.preventDefault();
 *
 *   if (bankLogin.ownershipType === 'personal') {
 *     bankLogin.firstName = firstNameInput.value;
 *     bankLogin.lastName = lastNameInput.value;
 *   } else {
 *     bankLogin.businessName = businessNameInput.value;
 *   }
 *
 *   usBankAccountInstance.tokenize({
 *     bankLogin: bankLogin,
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
USBankAccount.prototype.tokenize = function (options) {
  options = options || {};

  if (!options.mandateText) {
    return Promise.reject(
      new BraintreeError({
        type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
        code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
        message: "mandateText property is required.",
      })
    );
  }

  if (options.bankDetails && options.bankLogin) {
    return Promise.reject(
      new BraintreeError({
        type: errors.US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS.type,
        code: errors.US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS.code,
        message:
          "tokenize must be called with bankDetails or bankLogin, not both.",
      })
    );
  } else if (options.bankDetails) {
    return this._tokenizeBankDetails(options);
  } else if (options.bankLogin) {
    return this._tokenizeBankLogin(options);
  }

  return Promise.reject(
    new BraintreeError({
      type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
      code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
      message: "tokenize must be called with bankDetails or bankLogin.",
    })
  );
};

USBankAccount.prototype._tokenizeBankDetails = function (options) {
  var client = this._client;
  var bankDetails = options.bankDetails;
  var data = {
    achMandate: options.mandateText,
    routingNumber: bankDetails.routingNumber,
    accountNumber: bankDetails.accountNumber,
    accountType: bankDetails.accountType.toUpperCase(),
    billingAddress: formatBillingAddressForGraphQL(
      bankDetails.billingAddress || {}
    ),
  };

  formatDataForOwnershipType(data, bankDetails);

  return client
    .request({
      api: "graphQLApi",
      data: {
        query: TOKENIZE_BANK_DETAILS_MUTATION,
        variables: {
          input: {
            usBankAccount: data,
          },
        },
      },
    })
    .then(function (response) {
      analytics.sendEvent(
        client,
        "usbankaccount.bankdetails.tokenization.succeeded"
      );

      return Promise.resolve(
        formatTokenizeResponseFromGraphQL(response, "tokenizeUsBankAccount")
      );
    })
    .catch(function (err) {
      var error = errorFrom(err);

      analytics.sendEvent(
        client,
        "usbankaccount.bankdetails.tokenization.failed"
      );

      return Promise.reject(error);
    });
};

USBankAccount.prototype._tokenizeBankLogin = function (options) {
  var self = this;
  var client = this._client;
  var gatewayConfiguration = client.getConfiguration().gatewayConfiguration;
  var isProduction = gatewayConfiguration.environment === "production";
  var plaidConfig = gatewayConfiguration.usBankAccount.plaid;

  if (!options.bankLogin.displayName) {
    return Promise.reject(
      new BraintreeError({
        type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
        code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
        message: "displayName property is required when using bankLogin.",
      })
    );
  }

  if (!plaidConfig) {
    return Promise.reject(
      new BraintreeError(errors.US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED)
    );
  }

  if (this._isTokenizingBankLogin) {
    return Promise.reject(
      new BraintreeError(errors.US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE)
    );
  }
  this._isTokenizingBankLogin = true;

  return new Promise(function (resolve, reject) {
    self._loadPlaid(function (plaidLoadErr, plaid) {
      if (plaidLoadErr) {
        reject(plaidLoadErr);

        return;
      }

      plaid
        .create({
          clientName: options.bankLogin.displayName,
          apiVersion: "v2",
          env: isProduction ? "production" : "sandbox",
          key: plaidConfig.publicKey,
          product: "auth",
          selectAccount: true,
          onExit: function () {
            self._isTokenizingBankLogin = false;

            analytics.sendEvent(
              client,
              "usbankaccount.banklogin.tokenization.closed.by-user"
            );

            reject(new BraintreeError(errors.US_BANK_ACCOUNT_LOGIN_CLOSED));
          },
          onSuccess: function (publicToken, metadata) {
            var bankLogin = options.bankLogin;
            var data = {
              publicToken: publicToken,
              accountId: isProduction
                ? metadata.account_id
                : "plaid_account_id",
              accountType: metadata.account.subtype.toUpperCase(),
              achMandate: options.mandateText,
              billingAddress: formatBillingAddressForGraphQL(
                bankLogin.billingAddress || {}
              ),
            };

            formatDataForOwnershipType(data, bankLogin);

            client
              .request({
                api: "graphQLApi",
                data: {
                  query: TOKENIZE_BANK_LOGIN_MUTATION,
                  variables: {
                    input: {
                      usBankLogin: data,
                    },
                  },
                },
              })
              .then(function (response) {
                self._isTokenizingBankLogin = false;

                analytics.sendEvent(
                  client,
                  "usbankaccount.banklogin.tokenization.succeeded"
                );

                resolve(
                  formatTokenizeResponseFromGraphQL(
                    response,
                    "tokenizeUsBankLogin"
                  )
                );
              })
              .catch(function (tokenizeErr) {
                var error;

                self._isTokenizingBankLogin = false;
                error = errorFrom(tokenizeErr);

                analytics.sendEvent(
                  client,
                  "usbankaccount.banklogin.tokenization.failed"
                );

                reject(error);
              });
          },
        })
        .open();

      analytics.sendEvent(
        client,
        "usbankaccount.banklogin.tokenization.started"
      );
    });
  });
};

function errorFrom(err) {
  var error;
  var status = err.details && err.details.httpStatus;

  if (status === 401) {
    error = new BraintreeError(sharedErrors.BRAINTREE_API_ACCESS_RESTRICTED);
  } else if (status < 500) {
    error = new BraintreeError(errors.US_BANK_ACCOUNT_FAILED_TOKENIZATION);
  } else {
    error = new BraintreeError(
      errors.US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR
    );
  }
  error.details = { originalError: err };

  return error;
}

function formatTokenizeResponseFromGraphQL(response, type) {
  var data = response.data[type].paymentMethod;
  var last4 = data.details.last4;
  var description = "US bank account ending in - " + last4;

  return {
    nonce: data.id,
    details: {},
    description: description,
    type: "us_bank_account",
  };
}

USBankAccount.prototype._loadPlaid = function (callback) {
  var existingScript, script;

  callback = once(callback);

  if (window.Plaid) {
    callback(null, window.Plaid);

    return;
  }

  existingScript = document.querySelector(
    'script[src="' + constants.PLAID_LINK_JS + '"]'
  );

  if (existingScript) {
    addLoadListeners(existingScript, callback);
  } else {
    script = document.createElement("script");

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

    if (!readyState || readyState === "loaded" || readyState === "complete") {
      removeLoadListeners();
      callback(null, window.Plaid);
    }
  }

  function errorHandler() {
    script.parentNode.removeChild(script);

    callback(new BraintreeError(errors.US_BANK_ACCOUNT_LOGIN_LOAD_FAILED));
  }

  function removeLoadListeners() {
    script.removeEventListener("error", errorHandler);
    script.removeEventListener("load", loadHandler);
    script.removeEventListener("readystatechange", loadHandler);
  }

  script.addEventListener("error", errorHandler);
  script.addEventListener("load", loadHandler);
  script.addEventListener("readystatechange", loadHandler);
}

function formatBillingAddressForGraphQL(address) {
  return {
    streetAddress: address.streetAddress,
    extendedAddress: address.extendedAddress,
    city: address.locality,
    state: address.region,
    zipCode: address.postalCode,
  };
}

function formatDataForOwnershipType(data, details) {
  if (details.ownershipType === "personal") {
    data.individualOwner = {
      firstName: details.firstName,
      lastName: details.lastName,
    };
  } else if (details.ownershipType === "business") {
    data.businessOwner = {
      businessName: details.businessName,
    };
  }
}

function createGraphQLMutation(type) {
  return (
    "" +
    "mutation Tokenize" +
    type +
    "($input: Tokenize" +
    type +
    "Input!) {" +
    "  tokenize" +
    type +
    "(input: $input) {" +
    "    paymentMethod {" +
    "      id" +
    "      details {" +
    "        ... on UsBankAccountDetails {" +
    "          last4" +
    "        }" +
    "      }" +
    "    }" +
    "  }" +
    "}"
  );
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
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
USBankAccount.prototype.teardown = function () {
  if (this._plaidScript) {
    document.body.removeChild(this._plaidScript);
  }

  convertMethodsToError(this, methods(USBankAccount.prototype));

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(USBankAccount);
