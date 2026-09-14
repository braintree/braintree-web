// @ts-nocheck
/**
 * @module braintree-web/google-payment
 * @description A component to integrate with Google Pay. The majority of the integration uses [Google's pay.js JavaScript file](https://pay.google.com/gp/p/js/pay.js). The Braintree component generates the configuration object necessary for Google Pay to initiate the Payment Request and parse the returned data to retrieve the payment method nonce which is used to process the transaction on the server.
 */

import GooglePayment from "./google-payment";
import BraintreeError from "../lib/braintree-error";
import createAssetsUrl from "../lib/create-assets-url";
import createDeferredClient from "../lib/create-deferred-client";
import basicComponentVerification from "../lib/basic-component-verification";
/**
 * @description The current version of the SDK, i.e. `{@pkg version}`.
 * @type {string}
 */
import errors from "./errors";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.useDeferredClient] Used in conjunction with `authorization`, allows the Google Payment instance to be available right away by fetching the client configuration in the background.
 * @param {string} [options.googleMerchantId] A Google merchant identifier issued after your website is approved by Google. Required when PaymentsClient is initialized with an environment property of PRODUCTION, but may be omitted in TEST environment.
 * @example <caption>Simple Example</caption>
 * // include https://pay.google.com/gp/p/js/pay.js in a script tag
 * // on your page to load the `google.payments.api.PaymentsClient` global object.
 * //
 * // IMPORTANT: The Braintree SDK Google Pay component only supports Google Pay API version 2.
 * // You MUST set apiVersion: 2 in all Google Pay API calls (isReadyToPay, loadPaymentData) to avoid errors and unexpected behavior.
 *
 * var paymentButton = document.querySelector('#google-pay-button');
 * var paymentsClient = new google.payments.api.PaymentsClient({
 *   environment: 'TEST' // or 'PRODUCTION'
 * });
 *
 * braintree.client.create({
 *   authorization: 'tokenization-key-or-client-token'
 * }).then(function (clientInstance) {
 *   return braintree.googlePayment.create({
 *     client: clientInstance,
 *      googleMerchantId: 'your-merchant-id-from-google'
 *   });
 * }).then(function (googlePaymentInstance) {
 *   paymentButton.addEventListener('click', function (event) {
 *     var paymentDataRequest;
 *
 *     event.preventDefault();
 *
 *     paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
 *       transactionInfo: {
 *         currencyCode: 'USD',
 *         totalPriceStatus: 'FINAL',
 *         totalPrice: '100.00'
 *       }
 *     });
 *
 *     paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
 *       return googlePaymentInstance.parseResponse(paymentData);
 *     }).then(function (result) {
 *       // send result.nonce to your server
 *     }).catch(function (err) {
 *       // handle err
 *     });
 *   });
 * });
 * @example <caption>Check Browser and Customer Compatibility</caption>
 * var paymentsClient = new google.payments.api.PaymentsClient({
 *   environment: 'TEST' // or 'PRODUCTION'
 * });
 *
 * function setupGooglePayButton(googlePaymentInstance) {
 *   var button = document.createElement('button');
 *
 *   button.id = 'google-pay';
 *   button.appendChild(document.createTextNode('Google Pay'));
 *   button.addEventListener('click', function (event) {
 *     var paymentRequestData;
 *
 *     event.preventDefault();
 *
 *     paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
 *       transactionInfo: {
 *         currencyCode: 'USD',
 *         totalPriceStatus: 'FINAL',
 *         totalPrice: '100.00' // your amount
 *       }
 *     });
 *
 *     paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
 *       return googlePaymentInstance.parseResponse(paymentData);
 *       }).then(function (result) {
 *       // send result.nonce to your server
 *     }).catch(function (err) {
 *       // handle errors
 *     });
 *   });
 *
 *   document.getElementById('container').appendChild(button);
 * }
 *
 * braintree.client.create({
 *   authorization: 'tokenization-key-or-client-token'
 * }).then(function (clientInstance) {
 *   return braintree.googlePayment.create({
 *     client: clientInstance,
 *     googleMerchantId: 'your-merchant-id-from-google'
 *   });
 * }).then(function (googlePaymentInstance) {
 *   // IMPORTANT: apiVersion MUST be set to 2 to match the Braintree SDK Google Pay component.
 *   return paymentsClient.isReadyToPay({
 *     // see https://developers.google.com/pay/api/web/reference/object#IsReadyToPayRequest for all options
 *     apiVersion: 2,
 *     apiVersionMinor: 0,
 *     allowedPaymentMethods: googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods,
 *     existingPaymentMethodRequired: true
 *   });
 * }).then(function (response) {
 *   if (response.result) {
 *     setupGooglePayButton(googlePaymentInstance);
 *   }
 * }).catch(function (err) {
 *   // handle setup errors
 * });
 *
 * @returns {Promise} Returns a promise that resolves with the {@link GooglePayment} instance.
 */
function create(options) {
  var name = "Google Pay";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var createPromise, instance;

      createPromise = createDeferredClient
        .create({
          authorization: options.authorization,
          client: options.client,
          debug: options.debug,
          assetsUrl: createAssetsUrl.create(options.authorization),
          name: name,
        })
        .then(function (client) {
          var configuration = client.getConfiguration();

          options.client = client;
          if (!configuration.gatewayConfiguration.googlePay) {
            throw new BraintreeError(errors.GOOGLE_PAYMENT_NOT_ENABLED);
          }

          return client;
        });

      options.createPromise = createPromise;
      instance = new GooglePayment(options);

      if (!options.useDeferredClient) {
        return createPromise.then(function (client) {
          instance._client = client;

          return instance;
        });
      }

      return instance;
    });
}

export default {
  create,
  VERSION,
};
