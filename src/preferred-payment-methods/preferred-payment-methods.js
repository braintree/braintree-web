'use strict';

var wrapPromise = require('@braintree/wrap-promise');
var analytics = require('../lib/analytics');
var createAssetsUrl = require('../lib/create-assets-url');
var createDeferredClient = require('../lib/create-deferred-client');
var Promise = require('../lib/promise');

/**
 * @class
 * @param {object} options See {@link module:braintree-web/preferred-payment-methods.create|preferred-payment-methods.create}
 */
function PreferredPaymentMethods() {
}

PreferredPaymentMethods.prototype.initialize = function (options) {
  var self = this;

  this._clientPromise = createDeferredClient.create({
    authorization: options.authorization,
    client: options.client,
    debug: options.debug,
    assetsUrl: createAssetsUrl.create(options.authorization),
    name: 'PreferredPaymentMethods'
  }).catch(function (err) {
    self._setupError = err;

    return Promise.reject(err);
  });

  analytics.sendEvent(this._clientPromise, 'preferred-payment-methods.initialized');

  return Promise.resolve(this);
};

/**
 * Fetches information about which payment methods are preferred on the device.
 * Used to determine which payment methods are given preference in your UI,
 * not whether they are presented entirely.
 *
 * This class is currently in beta and may change in future releases.
 * @public
 * @returns {Promise|void} Returns a promise if no callback is provided.
 * @example
 * <caption>Preferred Payment Methods</caption>
 * preferredPaymentMethodsInstance.fetchPreferredPaymentMethods().then(function (result) {
 *   if (result.paypalPreferred) {
 *     // PayPal preferred
 *   } else {
 *     // PayPal not preferred
 *   }
 *
 *   if (result.venmoPreferred) {
 *     // Venmo preferred
 *   } else {
 *     // Venmo not preferred
 *   }
 * });
 */
PreferredPaymentMethods.prototype.fetchPreferredPaymentMethods = function () {
  var client;
  var self = this;

  return this._clientPromise.then(function (clientInstance) {
    client = clientInstance;

    return client.request({
      api: 'graphQLApi',
      data: {
        query: 'query PreferredPaymentMethods { ' +
          'preferredPaymentMethods { ' +
            'paypalPreferred ' +
            'venmoPreferred ' +
          '} ' +
        '}'
      }
    });
  }).then(function (result) {
    var paypalPreferred = result.data.preferredPaymentMethods.paypalPreferred;
    var venmoPreferred = result.data.preferredPaymentMethods.venmoPreferred;

    analytics.sendEvent(client, 'preferred-payment-methods.paypal.api-detected.' + paypalPreferred);
    analytics.sendEvent(client, 'preferred-payment-methods.venmo.api-detected.' + venmoPreferred);

    return {
      paypalPreferred: paypalPreferred,
      venmoPreferred: venmoPreferred
    };
  }).catch(function () {
    if (self._setupError) {
      return Promise.reject(self._setupError);
    }

    analytics.sendEvent(client, 'preferred-payment-methods.api-error');

    return {
      paypalPreferred: false,
      venmoPreferred: false
    };
  });
};

module.exports = wrapPromise.wrapPrototype(PreferredPaymentMethods);
