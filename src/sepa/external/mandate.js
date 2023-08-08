"use strict";

var BraintreeError = require("../../lib/braintree-error");
var sepaErrors = require("../shared/errors");
var frameService = require("../../lib/frame-service/external");
var analytics = require("../../lib/analytics");
var useMin = require("../../lib/use-min");
var billingAddressOptions =
  require("../shared/constants").BILLING_ADDRESS_OPTIONS;
var snakeCaseToCamelCase = require("../../lib/snake-case-to-camel-case");

var POPUP_WIDTH = 400;
var POPUP_HEIGHT = 570;

/**
 * @ignore
 * @typedef CreateMandateResponse
 * @property {string} approvalUrl The URL to present to the customer for payment approval.
 * @property {string} last4 The last four digits of the iban.
 * @property {string} bankReferenceToken The tokenized payment source to fun the payment.
 */

/**
 *
 * A function that creates a mandate so that we can present the mandate to the customer via a popup.
 *
 * @ignore
 * @static
 * @function createMandate
 * @param {object} client The Braintree client.
 * @param {object} options All options for intiating the SEPA payment flow.
 * @param {string} [options.accountHolderName] The account holder name.
 * @param {object} [options.billingAddress] The customer's billing address
 * @param {string} [options.billingAddress.addressLine1] Line 1 of the Address (eg. number, street, etc). An error will occur if this address is not valid.
 * @param {string} [options.billingAddress.addressLine2] Line 2 of the Address (eg. suite, apt #, etc.). An error will occur if this address is not valid.
 * @param {string} [options.billingAddress.adminArea1] Customer's city.
 * @param {string} [options.billingAddress.adminArea2] Customer's region or state.
 * @param {string} [options.billingAddress.postalCode] Customer's postal code.
 * @param {string} [options.cancelUrl] The URL to redirect to if authorization is cancelled.
 * @param {string} [options.countryCode] The customer's country code. Also used as billing address country code.
 * @param {string} [options.customerId] The customer's id.
 * @param {string} [options.iban] The customer's International Bank Account Number.
 * @param {string} [options.locale] The BCP 47-formatted locale. See https://developer.paypal.com/reference/locale-codes/ for a list of possible values.
 * @param {string} [options.mandateType] Specify ONE_OFF or RECURRENT payment.
 * @param {string} [options.merchantAccountId] The merchant's account id.
 * @param {string} [options.merchantId] The merchant id.
 * @param {string} [options.returnUrl] The URL to redirect to if authorization is successful.
 * @returns {Promise<CreateMandateResponse|Error>} Returns a promise with the mandate response or an error.
 */

function createMandate(client, options) {
  // Disabling eslint because api is expecting snake_case format for the keys
  /* eslint-disable */
  var data = {
    sepa_debit: {
      account_holder_name: options.accountHolderName,
      billing_address: {
        country_code: options.countryCode,
      },
      iban: options.iban,
      merchant_or_partner_customer_id: options.customerId,
      mandate_type: options.mandateType,
    },
    locale: options.locale,
    cancel_url: options.cancelUrl,
    return_url: options.returnUrl,
    merchant_account_id: options.merchantAccountId,
  };

  if (options.billingAddress) {
    billingAddressOptions.forEach(function (option) {
      var ccOption = snakeCaseToCamelCase(option);
      if (ccOption in options.billingAddress) {
        data.sepa_debit.billing_address[option] =
          options.billingAddress[ccOption]; // camelCase equivilent of option (eg. postal_code = postalCode) ]
      }
    });
  }
  /* eslint-enable */

  return client
    .request({
      api: "clientApi",
      method: "post",
      endpoint: "sepa_debit",
      data: data,
    })
    .then(function (response) {
      var sepaDebitAccount = response.message.body.sepaDebitAccount;

      if (!sepaDebitAccount) {
        throw new BraintreeError(sepaErrors.SEPA_CREATE_MANDATE_FAILED);
      }

      return {
        approvalUrl: sepaDebitAccount.approvalUrl,
        last4: sepaDebitAccount.last4,
        bankReferenceToken: sepaDebitAccount.bankReferenceToken,
      };
    })
    .catch(function () {
      throw new BraintreeError(sepaErrors.SEPA_CREATE_MANDATE_FAILED);
    });
}

/**
 *
 * A function for opening and managing the popup used for authorization.
 *
 * @ignore
 * @param {string} client The Braintree client.
 * @param {string} options The input options needed to manage the popup portion of the flow.
 * @param {string} [options.assetsUrl] The url to the Braintree asset to be used in frameservice.
 * @param {string} [options.approvalUrl] The url to open for SEPA authorization. It is `approvalUrl` coming back from the mandate creation, but commonly refered to as the mandate link.
 * @param {string} [options.debug] Whether to use debugging modes or not.
 * @returns {Promise<void|Error>} Returns a promise.
 */
function openPopup(client, options) {
  var popupName = "sepadirectdebit";
  var assetsBaseUrl = options.assetsUrl + "/html";
  var debug = options.debug || false;

  return new Promise(function (resolve, reject) {
    var popupLocation = centeredPopupDimensions();

    frameService.create(
      {
        name: popupName,
        dispatchFrameUrl:
          assetsBaseUrl + "/dispatch-frame" + useMin(debug) + ".html",
        openFrameUrl:
          assetsBaseUrl + "/sepa-landing-frame" + useMin(debug) + ".html",
        top: popupLocation.top,
        left: popupLocation.left,
        height: POPUP_HEIGHT,
        width: POPUP_WIDTH,
      },
      function (frameServiceInstance) {
        analytics.sendEvent(client, "sepa.popup.initialized");
        frameServiceInstance.open({}, function (err, params) {
          if (mandateApproved(params)) {
            frameServiceInstance.close();

            return resolve();
          }

          if (customerCanceled(params, err)) {
            frameServiceInstance.close();

            return reject(
              new BraintreeError(sepaErrors.SEPA_CUSTOMER_CANCELED)
            );
          }

          frameServiceInstance.close();

          return reject(
            new BraintreeError(sepaErrors.SEPA_TOKENIZATION_FAILED)
          );
        });

        frameServiceInstance.redirect(options.approvalUrl);
      }
    );
  });
}

function mandateApproved(params) {
  return params && params.success;
}

function customerCanceled(params, error) {
  return (
    (params && params.cancel) ||
    (error && error.code === "FRAME_SERVICE_FRAME_CLOSED")
  );
}

function centeredPopupDimensions() {
  var popupTop =
    Math.round((window.outerHeight - POPUP_HEIGHT) / 2) + window.screenTop;
  var popupLeft =
    Math.round((window.outerWidth - POPUP_WIDTH) / 2) + window.screenLeft;

  return {
    top: popupTop,
    left: popupLeft,
  };
}

/**
 *
 * A function that creates a mandate so that we can present the mandate to the customer via a popup.
 *
 * @ignore
 * @static
 * @function handleApproval
 * @param {object} client The Braintree client.
 * @param {object} options All options for intiating the SEPA payment flow.
 * @param {string} [options.bankReferenceToken] The tokenized payment source to fun the payment.
 * @param {string} [options.customerId] The customer's id.
 * @param {string} [options.last4] The last four digits of iban.
 * @param {string} [options.mandateType] The mandate type being used. Specify ONE_OFF or RECURRENT payment.
 * @param {string} [options.merchantAccountId] The merchant's account id.
 * @param {string} [options.merchantId] The merchant id.
 * @returns {Promise<tokenizePayload|Error>} Returns a promise with the approval response or an error.
 */

function handleApproval(client, options) {
  // Disabling eslint because api is expecting snake_case format for the keys
  /* eslint-disable */
  var data = {
    sepa_debit_account: {
      last_4: options.last4,
      merchant_or_partner_customer_id: options.customerId,
      bank_reference_token: options.bankReferenceToken,
      mandate_type: options.mandateType,
    },
    merchant_account_id: options.merchantAccountId,
  };

  /* eslint-enable */
  return client
    .request({
      api: "clientApi",
      method: "post",
      endpoint: "payment_methods/sepa_debit_accounts",
      data: data,
    })
    .then(function (response) {
      if (!response.nonce) {
        throw new BraintreeError(sepaErrors.SEPA_TRANSACTION_FAILED);
      }

      return {
        nonce: response.nonce,
        ibanLastFour: options.last4,
        customerId: options.customerId,
        mandateType: options.mandateType,
      };
    })
    .catch(function () {
      throw new BraintreeError(sepaErrors.SEPA_TRANSACTION_FAILED);
    });
}

module.exports = {
  createMandate: createMandate,
  openPopup: openPopup,
  handleApproval: handleApproval,
  POPUP_WIDTH: POPUP_WIDTH,
  POPUP_HEIGHT: POPUP_HEIGHT,
};
