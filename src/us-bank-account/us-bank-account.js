// @ts-nocheck
import BraintreeError from "../lib/braintree-error";
import errors from "./errors";
import sharedErrors from "../lib/errors";
import analytics from "../lib/analytics";
import convertMethodsToError from "../lib/convert-methods-to-error";
import methods from "../lib/methods";

var TOKENIZE_BANK_DETAILS_MUTATION = createGraphQLMutation("UsBankAccount");

/**
 * @typedef {object} USBankAccount~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type The payment method type, always `us_bank_account`.
 * @property {object} details Additional account details. Currently empty.
 */

/**
 * @class
 * @param {object} options See {@link module:braintree-web/us-bank-account.create|us-bank-account.create}.
 * @classdesc This class represents a US Bank Account component. Instances of this class can tokenize raw bank details. <strong>You cannot use this constructor directly. Use {@link module:braintree-web/us-bank-account.create|braintree.us-bank-account.create} instead.</strong>
 */
function USBankAccount(options) {
  this._client = options.client;

  analytics.sendEvent(this._client, "usbankaccount.initialized");
}

/**
 * Tokenizes bank information to return a payment method nonce. You can tokenize bank details by providing information like account and routing numbers.
 * @public
 * @param {object} options All tokenization options for the US Bank Account component.
 * @param {string} options.mandateText A string for proof of customer authorization. For example, `'I authorize Braintree to debit my bank account on behalf of My Online Store.'`.
 * @param {object} options.bankDetails Bank detail information (such as account and routing numbers).
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
 * @returns {Promise} Returns a promise that resolves with {@link USBankAccount~tokenizePayload|tokenizePayload}.
 * @example
 * <caption>Tokenizing raw bank details</caption>
 * const routingNumberInput = document.querySelector('input[name="routing-number"]');
 * const accountNumberInput = document.querySelector('input[name="account-number"]');
 * const accountTypeInput = document.querySelector('input[name="account-type"]:checked');
 * const ownershipTypeInput = document.querySelector('input[name="ownership-type"]:checked');
 * const firstNameInput = document.querySelector('input[name="first-name"]');
 * const lastNameInput = document.querySelector('input[name="last-name"]');
 * const businessNameInput = document.querySelector('input[name="business-name"]');
 * const billingAddressStreetInput = document.querySelector('input[name="street-address"]');
 * const billingAddressExtendedInput = document.querySelector('input[name="extended-address"]');
 * const billingAddressLocalityInput = document.querySelector('input[name="locality"]');
 * const billingAddressRegionSelect = document.querySelector('select[name="region"]');
 * const billingAddressPostalInput = document.querySelector('input[name="postal-code"]');
 *
 * submitButton.addEventListener('click', async function (event) {
 *   const bankDetails = {
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
 *   try {
 *     const payload = await usBankAccountInstance.tokenize({
 *       bankDetails: bankDetails,
 *       mandateText: 'I authorize Braintree to debit my bank account on behalf of My Online Store.'
 *     });
 *
 *     // Send payload.nonce to your server here!
 *   } catch (tokenizeErr) {
 *     console.error('There was an error tokenizing the bank details.');
 *   }
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

  if (options.bankDetails) {
    return this._tokenizeBankDetails(options);
  }

  return Promise.reject(
    new BraintreeError({
      type: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.type,
      code: errors.US_BANK_ACCOUNT_OPTION_REQUIRED.code,
      message: "tokenize must be called with bankDetails.",
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

      return formatTokenizeResponseFromGraphQL(
        response,
        "tokenizeUsBankAccount"
      );
    })
    .catch(function (err) {
      var error = errorFrom(err);

      analytics.sendEvent(
        client,
        "usbankaccount.bankdetails.tokenization.failed"
      );

      throw error;
    });
};

function errorFrom(err) {
  var error;
  var status = err.details && err.details.httpStatus;

  if (status === 401) {
    error = new BraintreeError(sharedErrors.BRAINTREE_API_ACCESS_RESTRICTED);
  } else if (status != null && status < 500) {
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
 * @example
 * usBankAccountInstance.teardown();
 * @returns {Promise} Returns a promise that resolves once teardown is complete.
 */
USBankAccount.prototype.teardown = function () {
  convertMethodsToError(this, methods(USBankAccount.prototype));

  return Promise.resolve();
};

export default USBankAccount;
