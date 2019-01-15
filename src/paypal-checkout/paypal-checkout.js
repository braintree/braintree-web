'use strict';

var analytics = require('../lib/analytics');
var createDeferredClient = require('../lib/create-deferred-client');
var createAssetsUrl = require('../lib/create-assets-url');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');
var BraintreeError = require('../lib/braintree-error');
var convertToBraintreeError = require('../lib/convert-to-braintree-error');
var errors = require('./errors');
var constants = require('../paypal/shared/constants');
var methods = require('../lib/methods');
var convertMethodsToError = require('../lib/convert-methods-to-error');

/**
 * PayPal Checkout tokenized payload. Returned in {@link PayPalCheckout#tokenizePayment}'s callback as the second argument, `data`.
 * @typedef {object} PayPalCheckout~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type The payment method type, always `PayPalAccount`.
 * @property {object} details Additional PayPal account details.
 * @property {string} details.email User's email address.
 * @property {string} details.payerId User's payer ID, the unique identifier for each PayPal account.
 * @property {string} details.firstName User's given name.
 * @property {string} details.lastName User's surname.
 * @property {?string} details.countryCode User's 2 character country code.
 * @property {?string} details.phone User's phone number (e.g. 555-867-5309).
 * @property {?object} details.shippingAddress User's shipping address details, only available if shipping address is enabled.
 * @property {string} details.shippingAddress.recipientName Recipient of postage.
 * @property {string} details.shippingAddress.line1 Street number and name.
 * @property {string} details.shippingAddress.line2 Extended address.
 * @property {string} details.shippingAddress.city City or locality.
 * @property {string} details.shippingAddress.state State or region.
 * @property {string} details.shippingAddress.postalCode Postal code.
 * @property {string} details.shippingAddress.countryCode 2 character country code (e.g. US).
 * @property {?object} details.billingAddress User's billing address details.
 * Not available to all merchants; [contact PayPal](https://developers.braintreepayments.com/support/guides/paypal/setup-guide#contacting-paypal-support) for details on eligibility and enabling this feature.
 * Alternatively, see `shippingAddress` above as an available client option.
 * @property {string} details.billingAddress.line1 Street number and name.
 * @property {string} details.billingAddress.line2 Extended address.
 * @property {string} details.billingAddress.city City or locality.
 * @property {string} details.billingAddress.state State or region.
 * @property {string} details.billingAddress.postalCode Postal code.
 * @property {string} details.billingAddress.countryCode 2 character country code (e.g. US).
 * @property {?object} creditFinancingOffered This property will only be present when the customer pays with PayPal Credit.
 * @property {object} creditFinancingOffered.totalCost This is the estimated total payment amount including interest and fees the user will pay during the lifetime of the loan.
 * @property {string} creditFinancingOffered.totalCost.value An amount defined by [ISO 4217](http://www.iso.org/iso/home/standards/currency_codes.htm) for the given currency.
 * @property {string} creditFinancingOffered.totalCost.currency 3 letter currency code as defined by [ISO 4217](http://www.iso.org/iso/home/standards/currency_codes.htm).
 * @property {number} creditFinancingOffered.term Length of financing terms in months.
 * @property {object} creditFinancingOffered.monthlyPayment This is the estimated amount per month that the customer will need to pay including fees and interest.
 * @property {string} creditFinancingOffered.monthlyPayment.value An amount defined by [ISO 4217](http://www.iso.org/iso/home/standards/currency_codes.htm) for the given currency.
 * @property {string} creditFinancingOffered.monthlyPayment.currency 3 letter currency code as defined by [ISO 4217](http://www.iso.org/iso/home/standards/currency_codes.htm).
 * @property {object} creditFinancingOffered.totalInterest Estimated interest or fees amount the payer will have to pay during the lifetime of the loan.
 * @property {string} creditFinancingOffered.totalInterest.value An amount defined by [ISO 4217](http://www.iso.org/iso/home/standards/currency_codes.htm) for the given currency.
 * @property {string} creditFinancingOffered.totalInterest.currency 3 letter currency code as defined by [ISO 4217](http://www.iso.org/iso/home/standards/currency_codes.htm).
 * @property {boolean} creditFinancingOffered.payerAcceptance Status of whether the customer ultimately was approved for and chose to make the payment using the approved installment credit.
 * @property {boolean} creditFinancingOffered.cartAmountImmutable Indicates whether the cart amount is editable after payer's acceptance on PayPal side.
 */

/**
 * @class
 * @param {object} options see {@link module:braintree-web/paypal-checkout.create|paypal-checkout.create}
 * @classdesc This class represents a PayPal Checkout component that coordinates with the {@link https://developer.paypal.com/docs/integration/direct/express-checkout/integration-jsv4|PayPal checkout.js} library. Instances of this class can generate payment data and tokenize authorized payments.
 *
 * All UI (such as preventing actions on the parent page while authentication is in progress) is managed by {@link https://developer.paypal.com/docs/integration/direct/express-checkout/integration-jsv4|checkout.js}.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/paypal-checkout.create|braintree-web.paypal-checkout.create} instead.</strong>
 *
 * You must have PayPal's checkout.js script loaded on your page to use PayPal Checkout. You can either use the [paypal-checkout package on npm](https://www.npmjs.com/package/paypal-checkout) with a build tool or use a script hosted by PayPal:
 *
 * ```html
 * <script src="https://www.paypalobjects.com/api/checkout.js" data-version-4 log-level="warn"></script>
 * ```
 *
 * Once you have the script loaded, there are two ways to integrate with the checkout.js library.
 *
 * #### Pass a Braintree object into checkout.js
 *
 * You can pass a `braintree` object into PayPal's checkout.js library. This will create the necessary Braintree {@link moudle:braintree-web/client.create|client} and {@link moudle:braintree-web/paypal-checkout.create|PayPal Checkout} components and automatically tokenize the authorized PayPal account. Use this integration option if you are not integrating with any other Braintree components.
 *
 * ```javascript
 * paypal.Button.render({
 *   braintree: braintree, // this object is available on the window by including the client and paypal-checkout component scripts on the page
 *   client: {
 *     production: 'production_authorization',
 *     sandbox: 'sandbox_authorization'
 *   },
 *
 *   env: 'production', // or 'sandbox'
 *
 *   payment: function (data, actions) {
 *     return actions.braintree.create({
 *       // your createPayment options here
 *     });
 *   },
 *
 *   onAuthorize: function (payload, actions) {
 *     // send payload.nonce to your server
 *
 *     // for more data about the user's PayPal account:
 *     // return actions.payment.get().then(function(data) { console.log(data); });
 *   }
 * }, '#paypal-button'); // the PayPal button will be rendered in an html element with the id `paypal-button`
 * ```
 *
 * If you are using `npm` to load braintree, simply pass in the invidual components:
 *
 * ```javascript
 * var btClient = require('braintree-web/client');
 * var btPayPal = require('braintree-web/paypal-checkout');
 *
 * paypal.Button.render({
 *   braintree: {
 *     client: btClient,
 *     paypalCheckout: btPayPal
 *   },
 *   client: {
 *     production: 'production_authorization',
 *     sandbox: 'sandbox_authorization'
 *   },
 *   // rest of checkout.js config
 * ```
 *
 * #### Create the Braintree components manually
 *
 * Alternatively, you can create the Braintree {@link moudle:braintree-web/client.create|client} and {@link moudle:braintree-web/paypal-checkout.create|PayPal Checkout} components manually. Use this integration style if you prefer to have some logic between receiving the authorized PayPal account and tokenizing it.
 *
 * ```javascript
 * braintree.client.create({
 *   authorization: 'authorization'
 * }).then(function (clientInstance) {
 *   return braintree.paypalCheckout.create({
 *     client: clientInstance
 *   });
 * }).then(function (paypalCheckoutInstance) {
 *   return paypal.Button.render({
 *     env: 'production', // or 'sandbox'
 *
 *     payment: function () {
 *       return paypalCheckoutInstance.createPayment({
 *         // your createPayment options here
 *       });
 *     },
 *
 *     onAuthorize: function (data, actions) {
 *       // some logic here before tokenization happens below
 *       return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
 *         // Submit payload.nonce to your server
 *       });
 *     }
 *   }, '#paypal-button');
 * }).catch(function (err) {
 *  console.error('Error!', err);
 * });
 * ```
 */
function PayPalCheckout(options) {
  this._merchantAccountId = options.merchantAccountId;
}

PayPalCheckout.prototype._initialize = function (options) {
  this._clientPromise = createDeferredClient.create({
    authorization: options.authorization,
    client: options.client,
    debug: options.debug,
    assetsUrl: createAssetsUrl.create(options.authorization),
    name: 'PayPal Checkout'
  }).then(function (client) {
    this._configuration = client.getConfiguration();

    // we skip these checks if a merchant account id is
    // passed in, because the default merchant account
    // may not have paypal enabled
    if (!this._merchantAccountId) {
      if (!this._configuration.gatewayConfiguration.paypalEnabled) {
        this._setupError = new BraintreeError(errors.PAYPAL_NOT_ENABLED);
      } else if (this._configuration.gatewayConfiguration.paypal.environmentNoNetwork === true) {
        this._setupError = new BraintreeError(errors.PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED);
      }
    }

    if (this._setupError) {
      return Promise.reject(this._setupError);
    }

    analytics.sendEvent(client, 'paypal-checkout.initialized');

    return client;
  }.bind(this));

  // if client was passed in, let config checks happen before
  // resolving the instance. Otherwise, just resolve the instance
  if (options.client) {
    return this._clientPromise.then(function () {
      return this;
    }.bind(this));
  }

  return Promise.resolve(this);
};

/**
 * @typedef {object} PayPalCheckout~lineItem
 * @property {string} quantity Number of units of the item purchased. This value must be a whole number and can't be negative or zero.
 * @property {string} unitAmount Per-unit price of the item. Can include up to 2 decimal places. This value can't be negative or zero.
 * @property {string} name Item name. Maximum 127 characters.
 * @property {string} kind Indicates whether the line item is a debit (sale) or credit (refund) to the customer. Accepted values: `debit` and `credit`.
 * @property {?string} unitTaxAmount Per-unit tax price of the item. Can include up to 2 decimal places. This value can't be negative or zero.
 * @property {?string} description Item description. Maximum 127 characters.
 * @property {?string} productCode Product or UPC code for the item. Maximum 127 characters.
 * @property {?string} url The URL to product information.
 */

/**
 * Creates a PayPal payment ID or billing token using the given options. This is meant to be passed to PayPal's checkout.js library.
 * When a {@link callback} is defined, the function returns undefined and invokes the callback with the id to be used with the checkout.js library. Otherwise, it returns a Promise that resolves with the id.
 * @public
 * @param {object} options All options for the PayPalCheckout component.
 * @param {string} options.flow Set to 'checkout' for one-time payment flow, or 'vault' for Vault flow. If 'vault' is used with a client token generated with a customer ID, the PayPal account will be added to that customer as a saved payment method.
 * @param {string} [options.intent=authorize]
 * * `authorize` - Submits the transaction for authorization but not settlement.
 * * `order` - Validates the transaction without an authorization (i.e. without holding funds). Useful for authorizing and capturing funds up to 90 days after the order has been placed. Only available for Checkout flow.
 * * `sale` - Payment will be immediately submitted for settlement upon creating a transaction.
 * @param {boolean} [options.offerCredit=false] Offers PayPal Credit as the default funding instrument for the transaction. If the customer isn't pre-approved for PayPal Credit, they will be prompted to apply for it.
 * @param {string|number} [options.amount] The amount of the transaction. Required when using the Checkout flow.
 * @param {string} [options.currency] The currency code of the amount, such as 'USD'. Required when using the Checkout flow.
 * @param {string} [options.displayName] The merchant name displayed inside of the PayPal lightbox; defaults to the company name on your Braintree account
 * @param {string} [options.locale=en_US] Use this option to change the language, links, and terminology used in the PayPal flow. This locale will be used unless the buyer has set a preferred locale for their account. If an unsupported locale is supplied, a fallback locale (determined by buyer preference or browser data) will be used and no error will be thrown.
 *
 * Supported locales are:
 * `da_DK`,
 * `de_DE`,
 * `en_AU`,
 * `en_GB`,
 * `en_US`,
 * `es_ES`,
 * `fr_CA`,
 * `fr_FR`,
 * `id_ID`,
 * `it_IT`,
 * `ja_JP`,
 * `ko_KR`,
 * `nl_NL`,
 * `no_NO`,
 * `pl_PL`,
 * `pt_BR`,
 * `pt_PT`,
 * `ru_RU`,
 * `sv_SE`,
 * `th_TH`,
 * `zh_CN`,
 * `zh_HK`,
 * and `zh_TW`.
 *
 * @param {boolean} [options.enableShippingAddress=false] Returns a shipping address object in {@link PayPal#tokenize}.
 * @param {object} [options.shippingAddressOverride] Allows you to pass a shipping address you have already collected into the PayPal payment flow.
 * @param {string} options.shippingAddressOverride.line1 Street address.
 * @param {string} [options.shippingAddressOverride.line2] Street address (extended).
 * @param {string} options.shippingAddressOverride.city City.
 * @param {string} options.shippingAddressOverride.state State.
 * @param {string} options.shippingAddressOverride.postalCode Postal code.
 * @param {string} options.shippingAddressOverride.countryCode Country.
 * @param {string} [options.shippingAddressOverride.phone] Phone number.
 * @param {string} [options.shippingAddressOverride.recipientName] Recipient's name.
 * @param {boolean} [options.shippingAddressEditable=true] Set to false to disable user editing of the shipping address.
 * @param {string} [options.billingAgreementDescription] Use this option to set the description of the preapproved payment agreement visible to customers in their PayPal profile during Vault flows. Max 255 characters.
 * @param {string} [options.landingPageType] Use this option to specify the PayPal page to display when a user lands on the PayPal site to complete the payment.
 * * `login` - A PayPal account login page is used.
 * * `billing` - A non-PayPal account landing page is used.
* @property {lineItem[]} [options.lineItems] The line items for this transaction. It can include up to 249 line items.
 * @param {callback} [callback] The second argument is a PayPal `paymentId` or `billingToken` string, depending on whether `options.flow` is `checkout` or `vault`. This is also what is resolved by the promise if no callback is provided.
 * @example
 * // this paypal object is created by checkout.js
 * // see https://github.com/paypal/paypal-checkout
 * paypal.Button.render({
 *   // when createPayment resolves, it is automatically passed to checkout.js
 *   payment: function () {
 *    return paypalCheckoutInstance.createPayment({
 *       flow: 'checkout',
 *       amount: '10.00',
 *       currency: 'USD',
 *       intent: 'sale'
 *     });
 *   },
 *   // Add other options, e.g. onAuthorize, env, locale
 * }, '#paypal-button');
 *
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.createPayment = function (options) {
  var self = this;
  var endpoint;

  if (!options || !constants.FLOW_ENDPOINTS.hasOwnProperty(options.flow)) {
    return Promise.reject(new BraintreeError(errors.PAYPAL_FLOW_OPTION_REQUIRED));
  }

  endpoint = 'paypal_hermes/' + constants.FLOW_ENDPOINTS[options.flow];

  analytics.sendEvent(this._clientPromise, 'paypal-checkout.createPayment');
  if (options.offerCredit === true) {
    analytics.sendEvent(this._clientPromise, 'paypal-checkout.credit.offered');
  }

  return this._clientPromise.then(function (client) {
    return client.request({
      endpoint: endpoint,
      method: 'post',
      data: self._formatPaymentResourceData(options)
    });
  }).then(function (response) {
    var flowToken;

    if (options.flow === 'checkout') {
      flowToken = response.paymentResource.paymentToken;
    } else {
      flowToken = response.agreementSetup.tokenId;
    }

    return flowToken;
  }).catch(function (err) {
    var status;

    if (self._setupError) {
      return Promise.reject(self._setupError);
    }

    status = err.details && err.details.httpStatus;

    if (status === 422) {
      return Promise.reject(new BraintreeError({
        type: errors.PAYPAL_INVALID_PAYMENT_OPTION.type,
        code: errors.PAYPAL_INVALID_PAYMENT_OPTION.code,
        message: errors.PAYPAL_INVALID_PAYMENT_OPTION.message,
        details: {
          originalError: err
        }
      }));
    }

    return Promise.reject(convertToBraintreeError(err, {
      type: errors.PAYPAL_FLOW_FAILED.type,
      code: errors.PAYPAL_FLOW_FAILED.code,
      message: errors.PAYPAL_FLOW_FAILED.message
    }));
  });
};

/**
 * Tokenizes the authorize data from PayPal's checkout.js library when completing a buyer approval flow.
 * When a {@link callback} is defined, invokes the callback with {@link PayPalCheckout~tokenizePayload|tokenizePayload} and returns undefined. Otherwise, returns a Promise that resolves with a {@link PayPalCheckout~tokenizePayload|tokenizePayload}.
 * @public
 * @param {object} tokenizeOptions Tokens and IDs required to tokenize the payment.
 * @param {string} tokenizeOptions.payerId Payer ID returned by PayPal `onAuthorize` callback.
 * @param {string} [tokenizeOptions.paymentId] Payment ID returned by PayPal `onAuthorize` callback.
 * @param {string} [tokenizeOptions.billingToken] Billing Token returned by PayPal `onAuthorize` callback.
 * @param {callback} [callback] The second argument, <code>payload</code>, is a {@link PayPalCheckout~tokenizePayload|tokenizePayload}. If no callback is provided, the promise resolves with a {@link PayPalCheckout~tokenizePayload|tokenizePayload}.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.tokenizePayment = function (tokenizeOptions) {
  var self = this;
  var payload;
  var options = {
    flow: tokenizeOptions.billingToken ? 'vault' : 'checkout',
    intent: tokenizeOptions.intent
  };
  var params = {
    // The paymentToken provided by Checkout.js v4 is the ECToken
    ecToken: tokenizeOptions.paymentToken,
    billingToken: tokenizeOptions.billingToken,
    payerId: tokenizeOptions.payerID,
    paymentId: tokenizeOptions.paymentID
  };

  analytics.sendEvent(this._clientPromise, 'paypal-checkout.tokenization.started');

  return this._clientPromise.then(function (client) {
    return client.request({
      endpoint: 'payment_methods/paypal_accounts',
      method: 'post',
      data: self._formatTokenizeData(options, params)
    });
  }).then(function (response) {
    payload = self._formatTokenizePayload(response);

    analytics.sendEvent(self._clientPromise, 'paypal-checkout.tokenization.success');
    if (payload.creditFinancingOffered) {
      analytics.sendEvent(self._clientPromise, 'paypal-checkout.credit.accepted');
    }

    return payload;
  }).catch(function (err) {
    if (self._setupError) {
      return Promise.reject(self._setupError);
    }

    analytics.sendEvent(self._clientPromise, 'paypal-checkout.tokenization.failed');

    return Promise.reject(convertToBraintreeError(err, {
      type: errors.PAYPAL_ACCOUNT_TOKENIZATION_FAILED.type,
      code: errors.PAYPAL_ACCOUNT_TOKENIZATION_FAILED.code,
      message: errors.PAYPAL_ACCOUNT_TOKENIZATION_FAILED.message
    }));
  });
};

PayPalCheckout.prototype._formatPaymentResourceData = function (options) {
  var key;
  var gatewayConfiguration = this._configuration.gatewayConfiguration;
  var paymentResource = {
    // returnUrl and cancelUrl are required in hermes create_payment_resource route
    // but are not validated and are not actually used with checkout.js
    returnUrl: 'x',
    cancelUrl: 'x',
    offerPaypalCredit: options.offerCredit === true,
    merchantAccountId: this._merchantAccountId,
    experienceProfile: {
      brandName: options.displayName || gatewayConfiguration.paypal.displayName,
      localeCode: options.locale,
      noShipping: (!options.enableShippingAddress).toString(),
      addressOverride: options.shippingAddressEditable === false,
      landingPageType: options.landingPageType
    }
  };

  if (options.flow === 'checkout') {
    paymentResource.amount = options.amount;
    paymentResource.currencyIsoCode = options.currency;

    if (options.hasOwnProperty('intent')) {
      paymentResource.intent = options.intent;
    }

    if (options.hasOwnProperty('lineItems')) {
      paymentResource.lineItems = options.lineItems;
    }

    for (key in options.shippingAddressOverride) {
      if (options.shippingAddressOverride.hasOwnProperty(key)) {
        paymentResource[key] = options.shippingAddressOverride[key];
      }
    }
  } else {
    paymentResource.shippingAddress = options.shippingAddressOverride;

    if (options.billingAgreementDescription) {
      paymentResource.description = options.billingAgreementDescription;
    }
  }

  return paymentResource;
};

PayPalCheckout.prototype._formatTokenizeData = function (options, params) {
  var clientConfiguration = this._configuration;
  var gatewayConfiguration = clientConfiguration.gatewayConfiguration;
  var isTokenizationKey = clientConfiguration.authorizationType === 'TOKENIZATION_KEY';
  var data = {
    paypalAccount: {
      correlationId: params.billingToken || params.ecToken,
      options: {
        validate: options.flow === 'vault' && !isTokenizationKey
      }
    }
  };

  if (params.billingToken) {
    data.paypalAccount.billingAgreementToken = params.billingToken;
  } else {
    data.paypalAccount.paymentToken = params.paymentId;
    data.paypalAccount.payerId = params.payerId;
    data.paypalAccount.unilateral = gatewayConfiguration.paypal.unvettedMerchant;

    if (options.intent) {
      data.paypalAccount.intent = options.intent;
    }
    if (this._merchantAccountId) {
      data.merchantAccountId = this._merchantAccountId;
    }
  }

  return data;
};

PayPalCheckout.prototype._formatTokenizePayload = function (response) {
  var payload;
  var account = {};

  if (response.paypalAccounts) {
    account = response.paypalAccounts[0];
  }

  payload = {
    nonce: account.nonce,
    details: {},
    type: account.type
  };

  if (account.details && account.details.payerInfo) {
    payload.details = account.details.payerInfo;
  }

  if (account.details && account.details.creditFinancingOffered) {
    payload.creditFinancingOffered = account.details.creditFinancingOffered;
  }

  return payload;
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/paypal-checkout.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * paypalCheckoutInstance.teardown();
 * @example <caption>With callback</caption>
 * paypalCheckoutInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.teardown = function () {
  convertMethodsToError(this, methods(PayPalCheckout.prototype));

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(PayPalCheckout);
