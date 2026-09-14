// @ts-nocheck
import analytics from "../lib/analytics";
import BraintreeError from "../lib/braintree-error";
import errors from "./errors";
import convertMethodsToError from "../lib/convert-methods-to-error";
import methods from "../lib/methods";

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
 * @returns {Promise} Returns a promise that resolves with the {@link VaultManager~fetchPaymentMethodsPayload|fetchPaymentMethodsPayload}.
 * @example
 * const paymentMethods = await vaultManagerInstance.fetchPaymentMethods();
 * paymentMethods.forEach(function (paymentMethod) {
 *   // add payment method to UI
 *   // paymentMethod.nonce <- transactable nonce associated with payment method
 *   // paymentMethod.details <- object with additional information about payment method
 *   // paymentMethod.type <- a constant signifying the type
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

/**
 * Deletes a payment method owned by the customer whose id was used to generate the client token used to create the {@link module:braintree-web/client|client}.
 * @public
 * @param {string} paymentMethodNonce The payment method nonce that references a vaulted payment method.
 * @returns {Promise} Returns a promise.
 * @example
 * await vaultManagerInstance.deletePaymentMethod('nonce-to-delete');
 */
VaultManager.prototype.deletePaymentMethod = function (paymentMethodNonce) {
  return this._createPromise.then(function (client) {
    var usesClientToken =
      client.getConfiguration().authorizationType === "CLIENT_TOKEN";

    if (!usesClientToken) {
      throw new BraintreeError(
        errors.VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN
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
              "An unknown error occurred when attempting to delete the payment method associated with the payment method nonce `" +
              paymentMethodNonce +
              "`.",
            details: {
              originalError: originalError,
            },
          });
        }

        // formattedError is always a BraintreeError (see assignments above).
        // eslint-disable-next-line no-throw-literal
        throw formattedError;
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
 * @example
 * vaultManagerInstance.teardown();
 * @returns {Promise} Returns a promise that resolves once teardown is complete.
 */
VaultManager.prototype.teardown = function () {
  convertMethodsToError(this, methods(VaultManager.prototype));

  return Promise.resolve();
};

export default VaultManager;
