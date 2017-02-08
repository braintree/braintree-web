'use strict';
/** @module braintree-web/hosted-fields */

var HostedFields = require('./external/hosted-fields');
var deferred = require('../lib/deferred');
var throwIfNoCallback = require('../lib/throw-if-no-callback');
var VERSION = process.env.npm_package_version;

/**
 * Fields used in {@link module:braintree-web/hosted-fields~fieldOptions fields options}
 * @typedef {object} field
 * @property {string} selector A CSS selector to find the container where the hosted field will be inserted.
 * @property {string} [placeholder] Will be used as the `placeholder` attribute of the input. If `placeholder` is not natively supported by the browser, it will be polyfilled.
 * @property {string} [type] Will be used as the `type` attribute of the input. To mask `cvv` input, for instance, `type: "password"` can be used.
 * @property {boolean} [formatInput=true] Enable or disable automatic formatting on this field.
 * @property {object|boolean} [select] If truthy, this field becomes a `<select>` dropdown list. This can only be used for `expirationMonth` and `expirationYear` fields.
 * @property {string[]} [select.options] An array of 12 strings, one per month. This can only be used for the `expirationMonth` field. For example, the array can look like `['01 - January', '02 - February', ...]`.
 */

/**
 * An object that has {@link module:braintree-web/hosted-fields~field field objects} for each field. Used in {@link module:braintree-web/hosted-fields~create create}.
 * @typedef {object} fieldOptions
 * @property {field} [number] A field for card number.
 * @property {field} [expirationDate] A field for expiration date in `MM/YYYY` format. This should not be used with the `expirationMonth` and `expirationYear` properties.
 * @property {field} [expirationMonth] A field for expiration month in `MM` format. This should be used with the `expirationYear` property.
 * @property {field} [expirationYear] A field for expiration year in `YYYY` format. This should be used with the `expirationMonth` property.
 * @property {field} [cvv] A field for 3 or 4 digit CVV or CID.
 * @property {field} [postalCode] A field for postal or region code.
 */

/**
 * An object that represents CSS that will be applied in each hosted field. This object looks similar to CSS. Typically, these styles involve fonts (such as `font-family` or `color`).
 *
 * These are the CSS properties that Hosted Fields supports. Any other CSS should be specified on your page and outside of any Braintree configuration. Trying to set unsupported properties will fail and put a warning in the console.
 *
 * Supported CSS properties are:
 * `color`
 * `font-family`
 * `font-size-adjust`
 * `font-size`
 * `font-stretch`
 * `font-style`
 * `font-variant-alternates`
 * `font-variant-caps`
 * `font-variant-east-asian`
 * `font-variant-ligatures`
 * `font-variant-numeric`
 * `font-variant`
 * `font-weight`
 * `font`
 * `letter-spacing`
 * `line-height`
 * `opacity`
 * `outline`
 * `text-shadow`
 * `transition`
 * `-moz-osx-font-smoothing`
 * `-moz-tap-highlight-color`
 * `-moz-transition`
 * `-webkit-font-smoothing`
 * `-webkit-tap-highlight-color`
 * `-webkit-transition`
 * @typedef {object} styleOptions
 */

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {fieldOptions} options.fields A {@link module:braintree-web/hosted-fields~fieldOptions set of options for each field}.
 * @param {styleOptions} options.styles {@link module:braintree-web/hosted-fields~styleOptions Styles} applied to each field.
 * @param {callback} callback The second argument, `data`, is the {@link HostedFields} instance.
 * @returns {void}
 * @example
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   styles: {
 *     'input': {
 *       'font-size': '16pt',
 *       'color': '#3A3A3A'
 *     },
 *     '.number': {
 *       'font-family': 'monospace'
 *     },
 *     '.valid': {
 *       'color': 'green'
 *     }
 *   },
 *   fields: {
 *     number: {
 *       selector: '#card-number'
 *     },
 *     cvv: {
 *       selector: '#cvv',
 *       placeholder: '•••'
 *     },
 *     expirationDate: {
 *       selector: '#expiration-date',
 *       type: 'month'
 *     }
 *   }
 * }, callback);
 */
function create(options, callback) {
  var integration;

  throwIfNoCallback(callback, 'create');

  try {
    integration = new HostedFields(options);
  } catch (err) {
    callback = deferred(callback);
    callback(err);
    return;
  }

  integration.on('ready', function () {
    callback(null, integration);
  });
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
