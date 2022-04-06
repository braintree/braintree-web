"use strict";

var analytics = require("../lib/analytics");
var BraintreeError = require("../lib/braintree-error");
var errors = require("./errors");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var methods = require("../lib/methods");
var Promise = require("../lib/promise");
var wrapPromise = require("@braintree/wrap-promise");

var DELETE_PAYMENT_METHOD_MUTATION =
  "mutation DeletePaymentMethodFromSingleUseToken($input: DeletePaymentMethodFromSingleUseTokenInput!) {" +
  "  deletePaymentMethodFromSingleUseToken(input: $input) {" +
  "    clientMutationId" +
  "  }" +
  "}";

/**
 * @typedef {array} VaultManager~fetchPaymentMethodsPayload The customer's payment methods.
 * @property {object} paymentMethod The payment method object.
 * @property {string} paymentMethod.nonce A nonce that can be sent to your server to transact on the payment method.
 * @property {boolean} paymentMethod.default Whether or not this is the default payment method for the customer.
 * @property {object} paymentMethod.details Any additional details about the payment method. Varies depending on the type of payment method.
 * @property {string} paymentMethod.type A constant indicating the type of payment method.
 * @property {?string} paymentMethod.description Additional description about the payment method.
 * @property {?object} paymentMethod.binData Bin data about the payment method.
 *
 */

/**
 * @class
 * @param {object} options Options
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/vault-manager.create|braintree.vault-manager.create} instead.</strong>
 * @classdesc This class allows you to manage a customer's payment methods on the client.
 */
function VaultManager(options) {
  this._createPromise = options.createPromise;
}

/**
 * Fetches payment methods owned by the customer whose id was used to generate the client token used to create the {@link module:braintree-web/client|client}.
 * @public
 * @param {object} [options] Options for fetching payment methods.
 * @param {boolean} [options.defaultFirst = false] If `true`, the payment methods will be returned with the default payment method for the customer first. Otherwise, order is not guaranteed.
 * @param {callback} [callback] The second argument is a {@link VaultManager~fetchPaymentMethodsPayload|fetchPaymentMethodsPayload}. This is also what is resolved by the promise if no callback is provided.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * vaultManagerInstance.fetchPaymentMethods(function (err, paymentMethods) {
 *   paymentMethods.forEach(function (paymentMethod) {
 *     // add payment method to UI
 *     // paymentMethod.nonce <- transactable nonce associated with payment method
 *     // paymentMethod.details <- object with additional information about payment method
 *     // paymentMethod.type <- a constant signifying the type
 *   });
 * });
 */
VaultManager.prototype.fetchPaymentMethods = function (options) {
  var defaultFirst;

  options = options || {};

  defaultFirst = options.defaultFirst === true ? 1 : 0;

  return this._createPromise
    .then(function (client) {
      return client.request({
        endpoint: "payment_methods",
        method: "get",
        data: {
          defaultFirst: defaultFirst,
        },
      });
    })
    .then(
      function (paymentMethodsPayload) {
        analytics.sendEvent(
          this._createPromise,
          "vault-manager.fetch-payment-methods.succeeded"
        );

        return paymentMethodsPayload.paymentMethods.map(
          formatPaymentMethodPayload
        );
      }.bind(this)
    );
};

// TODO hide from jsdoc for now until the GraphQL API is on for all merchants by default
/**
 * Deletes a payment method owned by the customer whose id was used to generate the client token used to create the {@link module:braintree-web/client|client}.
 * @public
 * @ignore
 * @param {string} paymentMethodNonce The payment method nonce that references a vaulted payment method.
 * @param {callback} [callback] No data is returned if the operation is successful.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * vaultManagerInstance.deletePaymentMethod('nonce-to-delete', function (err) {
 *   // handle err if it exists
 * });
 */
VaultManager.prototype.deletePaymentMethod = function (paymentMethodNonce) {
  return this._createPromise.then(function (client) {
    var usesClientToken =
      client.getConfiguration().authorizationType === "CLIENT_TOKEN";

    if (!usesClientToken) {
      return Promise.reject(
        new BraintreeError(
          errors.VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN
        )
      );
    }

    return client
      .request({
        api: "graphQLApi",
        data: {
          query: DELETE_PAYMENT_METHOD_MUTATION,
          variables: {
            input: {
              singleUseTokenId: paymentMethodNonce,
            },
          },
          operationName: "DeletePaymentMethodFromSingleUseToken",
        },
      })
      .then(function () {
        analytics.sendEvent(
          client,
          "vault-manager.delete-payment-method.succeeded"
        );

        // noop to prevent sending back the raw graphql data
      })
      .catch(function (error) {
        var originalError = error.details.originalError;
        var formattedError;

        analytics.sendEvent(
          client,
          "vault-manager.delete-payment-method.failed"
        );

        if (
          originalError[0] &&
          originalError[0].extensions.errorClass === "NOT_FOUND"
        ) {
          formattedError = new BraintreeError({
            type: errors.VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND.type,
            code: errors.VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND.code,
            message:
              "A payment method for payment method nonce `" +
              paymentMethodNonce +
              "` could not be found.",
            details: {
              originalError: originalError,
            },
          });
        }

        if (!formattedError) {
          formattedError = new BraintreeError({
            type: errors.VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR.type,
            code: errors.VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR.code,
            message:
              "An unknown error occured when attempting to delete the payment method assocaited with the payment method nonce `" +
              paymentMethodNonce +
              "`.",
            details: {
              originalError: originalError,
            },
          });
        }

        return Promise.reject(formattedError);
      });
  });
};

function formatPaymentMethodPayload(paymentMethod) {
  var formattedPaymentMethod = {
    nonce: paymentMethod.nonce,
    default: paymentMethod.default,
    details: paymentMethod.details,
    hasSubscription: paymentMethod.hasSubscription,
    type: paymentMethod.type,
  };

  if (paymentMethod.description) {
    formattedPaymentMethod.description = paymentMethod.description;
  }

  if (paymentMethod.binData) {
    formattedPaymentMethod.binData = paymentMethod.binData;
  }

  return formattedPaymentMethod;
}

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/vault-manager.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * vaultManagerInstance.teardown();
 * @example <caption>With callback</caption>
 * vaultManagerInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
VaultManager.prototype.teardown = function () {
  convertMethodsToError(this, methods(VaultManager.prototype));

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(VaultManager);
