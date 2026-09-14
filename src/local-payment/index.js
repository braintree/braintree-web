// @ts-nocheck
/**
 * @module braintree-web/local-payment
 * @description A component to integrate with local payment methods. *This component is currently in beta and is subject to change.*
 */

import analytics from "../lib/analytics";
import basicComponentVerification from "../lib/basic-component-verification";
import createDeferredClient from "../lib/create-deferred-client";
import createAssetsUrl from "../lib/create-assets-url";
import LocalPayment from "./external/local-payment";
/**
 * @description The current version of the SDK, i.e. `{@pkg version}`.
 * @type {string}
 */
import BraintreeError from "../lib/braintree-error";
import errors from "./shared/errors";
import { parse } from "../lib/querystring";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.merchantAccountId] A non-default merchant account ID to use for tokenization and creation of the authorizing transaction. Braintree strongly recommends specifying this parameter.
 * @param {string} [options.redirectUrl] When provided, triggers full page redirect flow instead of popup flow.
 * @example <caption>Using the local payment component to set up an iDEAL button</caption>
 * var idealButton = document.querySelector('.ideal-button');
 *
 * braintree.client.create({
 *   authorization: CLIENT_AUTHORIZATION
 * }).then(function (clientInstance) {
 *   return braintree.localPayment.create({
 *     client: clientInstance,
 *     merchantAccountId: 'merchantAccountEUR',
 *   });
 * }).then(function (localPaymentInstance) {
 *   idealButton.removeAttribute('disabled');
 *
 *   // When the button is clicked, attempt to start the payment flow.
 *   idealButton.addEventListener('click', function (event) {
 *     // Because this opens a popup, this has to be called as a result of
 *     // customer action, like clicking a button. You cannot call this at any time.
 *     localPaymentInstance.startPayment({
 *       paymentType: 'ideal',
 *       amount: '10.67',
 *       city: 'Den Haag',
 *       countryCode: 'NL',
 *       firstName: 'Test',
 *       lastName: 'McTester',
 *       line1: '123 of 456 Fake Lane',
 *       line2: 'Apartment 789',
 *       payerEmail: 'payer@example.com',
 *       phone: '123456789',
 *       postalCode: '1234 AA',
 *       currencyCode: 'EUR',
 *       onPaymentStart: function (data, continueCallback) {
 *         // Do any preprocessing to store the ID and setup webhook
 *         // Call start to initiate the popup
 *         continueCallback();
 *       }
 *     }).then(function (payload) {
 *       idealButton.setAttribute('disabled', true);
 *
 *       console.log(payload.paymentId);
 *     }).catch(function (startPaymentErr) {
 *       if (startPaymentErr.type !== 'CUSTOMER') {
 *         console.error('Error starting payment:', startPaymentErr);
 *       }
 *     });
 *   }, false);
 * }).catch(function (clientErr) {
 *   console.error('Error creating client:', clientErr);
 * });
 * @returns {Promise} Returns a promise that resolves with the {@link LocalPayment} instance.
 */
function create(options) {
  var name = "Local Payment";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      return createDeferredClient.create({
        authorization: options.authorization,
        client: options.client,
        debug: options.debug,
        assetsUrl: createAssetsUrl.create(options.authorization),
        name: name,
      });
    })
    .then(function (client) {
      var localPaymentInstance, params;
      var config = client.getConfiguration();

      options.client = client;

      if (!config.gatewayConfiguration.paypal) {
        throw new BraintreeError(errors.LOCAL_PAYMENT_NOT_ENABLED);
      }

      analytics.sendEvent(client, "local-payment.initialized");

      localPaymentInstance = new LocalPayment(options);
      if (options.redirectUrl) {
        params = parse(window.location.href);

        if (params.token || params.wasCanceled) {
          return localPaymentInstance
            .tokenize(params)
            .then(function (payload) {
              localPaymentInstance.tokenizePayload = payload;

              return localPaymentInstance;
            })
            .catch(function (err) {
              console.log("Error while tokenizing: ", err); // eslint-disable-line no-console

              return localPaymentInstance;
            });
        }

        return localPaymentInstance;
      }

      return localPaymentInstance._initialize();
    });
}

export default {
  create,
  VERSION,
};
