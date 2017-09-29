'use strict';
/**
 * @module braintree-web/american-express
 * @description This module is for use with Amex Express Checkout. To accept American Express cards, use Hosted Fields.
 */

var AmericanExpress = require('./american-express');
var basicComponentVerification = require('../lib/basic-component-verification');
var VERSION = process.env.npm_package_version;
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link AmericanExpress} instance. If no callback is provided, `create` returns a promise that resolves with the {@link AmericanExpress} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'American Express',
    client: options.client
  }).then(function () {
    return new AmericanExpress(options);
  });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
