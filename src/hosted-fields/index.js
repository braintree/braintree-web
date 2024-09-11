"use strict";
/** @module braintree-web/hosted-fields */

var HostedFields = require("./external/hosted-fields");
var basicComponentVerification = require("../lib/basic-component-verification");
var errors = require("./shared/errors");
var supportsInputFormatting = require("restricted-input/supports-input-formatting");
var wrapPromise = require("@braintree/wrap-promise");
var BraintreeError = require("../lib/braintree-error");
var VERSION = process.env.npm_package_version;

/**
 * Fields used in {@link module:braintree-web/hosted-fields~fieldOptions fields options}
 * @typedef {object} field
 * @property {string} selector Deprecated: Now an alias for `options.container`.
 * @property {(string|HTMLElement)} container A DOM node or CSS selector to find the container where the hosted field will be inserted.
 * @property {string} [placeholder] Will be used as the `placeholder` attribute of the input. If `placeholder` is not natively supported by the browser, it will be polyfilled.
 * @property {string} [type] Will be used as the `type` attribute of the input. To mask `cvv` input, for instance, `type: "password"` can be used.
 * @property {string} [iframeTitle] The title used for the iframe containing the credit card input. By default, this will be `Secure Credit Card Frame - <the name of the specific field>`.
 * @property {string} [internalLabel] Each Hosted Field iframe has a hidden label that is used by screen readers to identify the input. The `internalLabel` property can be used to customize the field for localization purposes. The default values are:
 * * number: Credit Card Number
 * * cvv: CVV
 * * expirationDate: Expiration Date
 * * expirationMonth: Expiration Month
 * * expirationYear: Expiration Year
 * * postalCode: Postal Code
 * * cardholderName: Cardholder Name
 * @property {boolean} [formatInput=true] Enable or disable automatic formatting on this field.
 * @property {(object|boolean)} [maskInput=false] Enable or disable input masking when input is not focused. If set to `true` instead of an object, the defaults for the `maskInput` parameters will be used.
 * @property {string} [maskInput.character=•] The character to use when masking the input. The default character ('•') uses a unicode symbol, so the webpage must support UTF-8 characters when using the default.
 * @property {Boolean} [maskInput.showLastFour=false] Only applicable for the credit card field. Whether or not to show the last 4 digits of the card when masking.
 * @property {(object|boolean)} [select] If truthy, this field becomes a `<select>` dropdown list. This can only be used for `expirationMonth` and `expirationYear` fields. If you do not use a `placeholder` property for the field, the current month/year will be the default selected value.
 * @property {string[]} [select.options] An array of 12 strings, one per month. This can only be used for the `expirationMonth` field. For example, the array can look like `['01 - January', '02 - February', ...]`.
 * @property {number} [maxCardLength] This option applies only to the number field. Allows a limit to the length of the card number, even if the card brand may support numbers of a greater length. If the value passed is greater than the max length for a card brand, the smaller number of the 2 values will be used. For example, is `maxCardLength` is set to 16, but an American Express card is entered (which has a max card length of 15), a max card length of 15 will be used.
 * @property {number} [maxlength] This option applies only to the CVV and postal code fields. Will be used as the `maxlength` attribute of the input. The primary use cases for the `maxlength` option are: limiting the length of the CVV input for CVV-only verifications when the card type is known and setting the length of the postal code input when cards are coming from a known region. The default `maxlength` for the postal code input is `10`.
 * @property {number} [minlength=3] This option applies only to the cvv and postal code fields. Will be used as the `minlength` attribute of the input.
 * For postal code fields, the default value is 3, representing the Icelandic postal code length. This option's primary use case is to increase the `minlength`, e.g. for US customers, the postal code `minlength` can be set to 5.
 * For cvv fields, the default value is 3. The `minlength` attribute only applies to integrations capturing a cvv without a number field.
 * @property {string} [prefill] A value to prefill the field with. For example, when creating an update card form, you can prefill the expiration date fields with the old expiration date data.
 * @property {boolean} [rejectUnsupportedCards=false] Deprecated since version 3.46.0, use `supportedCardBrands` instead. Only allow card types that your merchant account is able to process. Unsupported card types will invalidate the card form. e.g. if you only process Visa cards, a customer entering a American Express card would get an invalid card field. This can only be used for the `number` field.
 * @property {object} [supportedCardBrands] Override card brands that are supported by the card form. Pass `'card-brand-id': true` to override the default in the merchant configuration and enable a card brand. Pass `'card-brand-id': false` to disable a card brand. Unsupported card types will invalidate the card form. e.g. if you only process Visa cards, a customer entering an American Express card would get an invalid card field. This can only be used for the  `number` field. (Note: only allow card types that your merchant account is actually able to process.)
 *
 * Valid card brand ids are:
 * * visa
 * * mastercard
 * * american-express
 * * diners-club
 * * discover
 * * jcb
 * * union-pay
 * * maestro
 * * elo
 * * mir
 * * hiper
 * * hipercard
 */

/**
 * An object that has {@link module:braintree-web/hosted-fields~field field objects} for each field. Used in {@link module:braintree-web/hosted-fields~create create}.
 * @typedef {object} fieldOptions
 * @property {field} [number] A field for card number.
 * @property {field} [expirationDate] A field for expiration date in `MM/YYYY` or `MM/YY` format. This should not be used with the `expirationMonth` and `expirationYear` properties.
 * @property {field} [expirationMonth] A field for expiration month in `MM` format. This should be used with the `expirationYear` property.
 * @property {field} [expirationYear] A field for expiration year in `YYYY` or `YY` format. This should be used with the `expirationMonth` property.
 * @property {field} [cvv] A field for 3 or 4 digit card verification code (like CVV or CID). If you wish to create a CVV-only payment method nonce to verify a card already stored in your Vault, omit all other fields to only collect CVV.
 * @property {field} [postalCode] A field for postal or region code.
 * @property {field} [cardholderName] A field for the cardholder name on the customer's credit card.
 */

/**
 * An object that represents CSS that will be applied in each hosted field. This object looks similar to CSS. Typically, these styles involve fonts (such as `font-family` or `color`).
 *
 * You may also pass the name of a class on your site that contains the styles you would like to apply. The style properties will be automatically pulled off the class and applied to the Hosted Fields inputs. Note: this is recommended for `input` elements only. If using a `select` for the expiration date, unexpected styling may occur.
 *
 * These are the CSS properties that Hosted Fields supports. Any other CSS should be specified on your page and outside of any Braintree configuration. Trying to set unsupported properties will fail and put a warning in the console.
 *
 * Supported CSS properties are:
 * `appearance`
 * `box-shadow`
 * `color`
 * `direction`
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
 * `margin`
 * `margin-top`
 * `margin-right`
 * `margin-bottom`
 * `margin-left`
 * `padding`
 * `padding-top`
 * `padding-right`
 * `padding-bottom`
 * `padding-left`
 * `text-align`
 * `text-shadow`
 * `transition`
 * `-moz-appearance`
 * `-moz-box-shadow`
 * `-moz-osx-font-smoothing`
 * `-moz-tap-highlight-color`
 * `-moz-transition`
 * `-webkit-appearance`
 * `-webkit-box-shadow`
 * `-webkit-font-smoothing`
 * `-webkit-tap-highlight-color`
 * `-webkit-transition`
 * @typedef {object} styleOptions
 */

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {fieldOptions} options.fields A {@link module:braintree-web/hosted-fields~fieldOptions set of options for each field}.
 * @param {styleOptions} [options.styles] {@link module:braintree-web/hosted-fields~styleOptions Styles} applied to each field.
 * @param {boolean} [options.preventAutofill=false] When true, browsers will not try to prompt the customer to autofill their credit card information.
 * @param {string} [options.sessionId] Used in specific cases where associating SDK events with a specific external id is required.
 * @param {callback} [callback] The second argument, `data`, is the {@link HostedFields} instance. If no callback is provided, `create` returns a promise that resolves with the {@link HostedFields} instance.
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
 *       container: '#card-number'
 *     },
 *     cvv: {
 *       container: '#cvv',
 *       placeholder: '•••'
 *     },
 *     expirationDate: {
 *       container: '#expiration-date'
 *     }
 *   }
 * }, callback);
 * @example <caption>With cardholder name</caption>
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   fields: {
 *     number: {
 *       container: '#card-number'
 *     },
 *     cardholderName: {
 *       container: '#cardholder-name'
 *     },
 *     cvv: {
 *       container: '#cvv',
 *     },
 *     expirationDate: {
 *       container: '#expiration-date'
 *     }
 *   }
 * }, callback);
 * @example <caption>Applying styles with a class name</caption>
 * // in document head
 * <style>
 *   .braintree-input-class {
 *     color: black;
 *   }
 *   .braintree-valid-class {
 *     color: green;
 *   }
 *   .braintree-invalid-class {
 *     color: red;
 *   }
 * </style>
 * // in a script tag
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   styles: {
 *     'input': 'braintree-input-class',
 *     '.invalid': 'braintree-invalid-class',
 *     '.valid': {
 *       // you can also use the object syntax alongside
 *       // the class name syntax
 *       color: green;
 *     }
 *   },
 *   fields: {
 *     number: {
 *       container: '#card-number'
 *     },
 *     // etc...
 *   }
 * }, callback);
 * @example <caption>Right to Left Language Support</caption>
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   styles: {
 *     'input': {
 *       // other styles
 *       direction: 'rtl'
 *     },
 *   },
 *   fields: {
 *     number: {
 *       container: '#card-number',
 *       // Credit card formatting is not currently supported
 *       // with RTL languages, so we need to turn it off for the number input
 *       formatInput: false
 *     },
 *     cvv: {
 *       container: '#cvv',
 *       placeholder: '•••'
 *     },
 *     expirationDate: {
 *       container: '#expiration-date',
 *       type: 'month'
 *     }
 *   }
 * }, callback);
 * @example <caption>Setting up Hosted Fields to tokenize CVV only</caption>
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   fields: {
 *     // Only add the `cvv` option.
 *     cvv: {
 *       container: '#cvv',
 *       placeholder: '•••'
 *     }
 *   }
 * }, callback);
 * @example <caption>Creating an expiration date update form with prefilled data</caption>
 * var storedCreditCardInformation = {
 *   // get this info from your server
 *   // with a payment method lookup
 *   month: '09',
 *   year: '2017'
 * };
 *
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   fields: {
 *     expirationMonth: {
 *       container: '#expiration-month',
 *       prefill: storedCreditCardInformation.month
 *     },
 *     expirationYear: {
 *       container: '#expiration-year',
 *       prefill: storedCreditCardInformation.year
 *     }
 *   }
 * }, callback);
 * @example <caption>Validate the card form for supported card types</caption>
 * braintree.hostedFields.create({
 *   client: clientInstance,
 *   fields: {
 *     number: {
 *       container: '#card-number',
 *       supportedCardBrands: {
 *         visa: false, // prevents Visas from showing up as valid even when the Braintree control panel is configured to allow them
 *         'diners-club': true // allow Diners Club cards to be valid (processed as Discover cards on the Braintree backend)
 *       }
 *     },
 *     cvv: {
 *       container: '#cvv',
 *       placeholder: '•••'
 *     },
 *     expirationDate: {
 *       container: '#expiration-date',
 *       type: 'month'
 *     }
 *   },
 * }, callback);
 */
function create(options) {
  return basicComponentVerification
    .verify({
      name: "Hosted Fields",
      authorization: options.authorization,
      client: options.client,
    })
    .then(function () {
      var integration = new HostedFields(options);

      return new Promise(function (resolve, reject) {
        integration.on("ready", function () {
          resolve(integration);
        });
        integration.on("timeout", function () {
          reject(new BraintreeError(errors.HOSTED_FIELDS_TIMEOUT));
        });
      });
    });
}

module.exports = {
  /**
   * @static
   * @function supportsInputFormatting
   * @description Returns false if input formatting will be automatically disabled due to browser incompatibility. Otherwise, returns true. For a list of unsupported browsers, [go here](https://github.com/braintree/restricted-input/blob/main/README.md#browsers-where-formatting-is-turned-off-automatically).
   * @returns {Boolean} Returns false if input formatting will be automatically disabled due to browser incompatibility. Otherwise, returns true.
   * @example
   * <caption>Conditionally choosing split expiration date inputs if formatting is unavailable</caption>
   * var canFormat = braintree.hostedFields.supportsInputFormatting();
   * var fields = {
   *   number: {
   *     container: '#card-number'
   *   },
   *   cvv: {
   *     container: '#cvv'
   *   }
   * };
   *
   * if (canFormat) {
   *   fields.expirationDate = {
   *     selection: '#expiration-date'
   *   };
   *   functionToCreateAndInsertExpirationDateDivToForm();
   * } else {
   *   fields.expirationMonth = {
   *     selection: '#expiration-month'
   *   };
   *   fields.expirationYear = {
   *     selection: '#expiration-year'
   *   };
   *   functionToCreateAndInsertExpirationMonthAndYearDivsToForm();
   * }
   *
   * braintree.hostedFields.create({
   *   client: clientInstance,
   *   styles: {
   *     // Styles
   *   },
   *   fields: fields
   * }, callback);
   */
  supportsInputFormatting: supportsInputFormatting,
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
