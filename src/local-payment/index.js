"use strict";
/**
 * @module braintree-web/local-payment
 * @description A component to integrate with local payment methods. *This component is currently in beta and is subject to change.*
 */

var analytics = require("../lib/analytics");
var basicComponentVerification = require("../lib/basic-component-verification");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var LocalPayment = require("./external/local-payment");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");
var BraintreeError = require("../lib/braintree-error");
var errors = require("./shared/errors");
var parse = require("../lib/querystring").parse;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.merchantAccountId] A non-default merchant account ID to use for tokenization and creation of the authorizing transaction. Braintree strongly recommends specifying this parameter.
 * @param {string} [options.redirectUrl] When provided, triggers full page redirect flow instead of popup flow.
 * @param {callback} callback The second argument, `data`, is the {@link LocalPayment} instance.
 * @example <caption>Using the local payment component to set up an iDEAL button</caption>
 * var idealButton = document.querySelector('.ideal-button');
 *
 * braintree.client.create({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (clientErr, clientInstance) {
 *   if (clientErr) {
 *     console.error('Error creating client:', clientErr);
 *     return;
 *   }
 *
 *   braintree.localPayment.create({
 *     client: clientInstance,
 *     merchantAccountId: 'merchantAccountEUR',
 *   }, function (localPaymentErr, localPaymentInstance) {
 *     if (localPaymentErr) {
 *       console.error('Error creating local payment component:', localPaymentErr);
 *       return;
 *     }
 *
 *     idealButton.removeAttribute('disabled');
 *
 *     // When the button is clicked, attempt to start the payment flow.
 *     idealButton.addEventListener('click', function (event) {
 *       // Because this opens a popup, this has to be called as a result of
 *       // customer action, like clicking a button. You cannot call this at any time.
 *       localPaymentInstance.startPayment({
 *         paymentType: 'ideal',
 *         amount: '10.67',
 *         city: 'Den Haag',
 *         countryCode: 'NL',
 *         firstName: 'Test',
 *         lastName: 'McTester',
 *         line1: '123 of 456 Fake Lane',
 *         line2: 'Apartment 789',
 *         payerEmail: 'payer@example.com',
 *         phone: '123456789',
 *         postalCode: '1234 AA',
 *         currencyCode: 'EUR',
 *         onPaymentStart: function (data, continueCallback) {
 *           // Do any preprocessing to store the ID and setup webhook
 *           // Call start to initiate the popup
 *           continueCallback();
 *         }
 **       }, function (startPaymentErr, payload) {
 *         if (startPaymentErr) {
 *           if (startPaymentErr.type !== 'CUSTOMER') {
 *             console.error('Error starting payment:', startPaymentErr);
 *           }
 *           return;
 *         }
 *
 *         idealButton.setAttribute('disabled', true);
 *
 *         console.log(payload.paymentId);
 *       });
 *     }, false);
 *   });
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
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

      if (config.gatewayConfiguration.paypalEnabled !== true) {
        return Promise.reject(
          new BraintreeError(errors.LOCAL_PAYMENT_NOT_ENABLED)
        );
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

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
