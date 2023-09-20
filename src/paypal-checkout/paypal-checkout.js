"use strict";

var analytics = require("../lib/analytics");
var assign = require("../lib/assign").assign;
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var ExtendedPromise = require("@braintree/extended-promise");
var wrapPromise = require("@braintree/wrap-promise");
var BraintreeError = require("../lib/braintree-error");
var convertToBraintreeError = require("../lib/convert-to-braintree-error");
var errors = require("./errors");
var constants = require("../paypal/shared/constants");
var frameService = require("../lib/frame-service/external");
var createAuthorizationData = require("../lib/create-authorization-data");
var methods = require("../lib/methods");
var useMin = require("../lib/use-min");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var querystring = require("../lib/querystring");
var VERSION = process.env.npm_package_version;
var INTEGRATION_TIMEOUT_MS = require("../lib/constants").INTEGRATION_TIMEOUT_MS;

var REQUIRED_PARAMS_FOR_START_VAULT_INITIATED_CHECKOUT = [
  "amount",
  "currency",
  "vaultInitiatedCheckoutPaymentMethodToken",
];

var PAYPAL_SDK_PRELOAD_URL =
  "https://www.{ENV}paypal.com/smart/buttons/preload";

ExtendedPromise.suppressUnhandledPromiseMessage = true;

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
 * Not available to all merchants; [contact support](https://developer.paypal.com/braintree/help) for details on eligibility and enabling this feature.
 * Alternatively, see `shippingAddress` above as an available client option.
 * @property {string} details.billingAddress.line1 Street number and name.
 * @property {string} details.billingAddress.line2 Extended address.
 * @property {string} details.billingAddress.city City or locality.
 * @property {string} details.billingAddress.state State or region.
 * @property {string} details.billingAddress.postalCode Postal code.
 * @property {string} details.billingAddress.countryCode 2 character country code (e.g. US).
 * @property {?object} creditFinancingOffered This property will only be present when the customer pays with PayPal Credit.
 * @property {object} creditFinancingOffered.totalCost This is the estimated total payment amount including interest and fees the user will pay during the lifetime of the loan.
 * @property {string} creditFinancingOffered.totalCost.value An amount defined by [ISO 4217](https://www.iso.org/iso/home/standards/currency_codes.htm) for the given currency.
 * @property {string} creditFinancingOffered.totalCost.currency 3 letter currency code as defined by [ISO 4217](https://www.iso.org/iso/home/standards/currency_codes.htm).
 * @property {number} creditFinancingOffered.term Length of financing terms in months.
 * @property {object} creditFinancingOffered.monthlyPayment This is the estimated amount per month that the customer will need to pay including fees and interest.
 * @property {string} creditFinancingOffered.monthlyPayment.value An amount defined by [ISO 4217](https://www.iso.org/iso/home/standards/currency_codes.htm) for the given currency.
 * @property {string} creditFinancingOffered.monthlyPayment.currency 3 letter currency code as defined by [ISO 4217](https://www.iso.org/iso/home/standards/currency_codes.htm).
 * @property {object} creditFinancingOffered.totalInterest Estimated interest or fees amount the payer will have to pay during the lifetime of the loan.
 * @property {string} creditFinancingOffered.totalInterest.value An amount defined by [ISO 4217](https://www.iso.org/iso/home/standards/currency_codes.htm) for the given currency.
 * @property {string} creditFinancingOffered.totalInterest.currency 3 letter currency code as defined by [ISO 4217](https://www.iso.org/iso/home/standards/currency_codes.htm).
 * @property {boolean} creditFinancingOffered.payerAcceptance Status of whether the customer ultimately was approved for and chose to make the payment using the approved installment credit.
 * @property {boolean} creditFinancingOffered.cartAmountImmutable Indicates whether the cart amount is editable after payer's acceptance on PayPal side.
 */

/**
 * @class
 * @param {object} options see {@link module:braintree-web/paypal-checkout.create|paypal-checkout.create}
 * @classdesc This class represents a PayPal Checkout component that coordinates with the {@link https://developer.paypal.com/docs/checkout/integrate/#2-add-the-paypal-script-to-your-web-page|PayPal SDK}. Instances of this class can generate payment data and tokenize authorized payments.
 *
 * All UI (such as preventing actions on the parent page while authentication is in progress) is managed by the {@link https://developer.paypal.com/docs/checkout/integrate/#2-add-the-paypal-script-to-your-web-page|PayPal SDK}. You must provide your PayPal `client-id` as a query parameter. You can [retrieve this value from the PayPal Dashboard](https://developer.paypal.com/docs/checkout/integrate/#1-get-paypal-rest-api-credentials).
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/paypal-checkout.create|braintree-web.paypal-checkout.create} instead.</strong>
 *
 * #### Integrate Checkout Flow with PayPal SDK
 *
 * You must have [PayPal's script, configured with various query parameters](https://developer.paypal.com/docs/checkout/integrate/#2-add-the-paypal-script-to-your-web-page), loaded on your page:
 *
 * ```html
 * <script src="https://www.paypal.com/sdk/js?client-id=your-sandbox-or-prod-client-id"></script>
 * <div id="paypal-button"></div>
 * ```
 *
 * When passing values in the `createPayment` method, make sure they match the [corresponding parameters in the query parameters for the PayPal SDK script](https://developer.paypal.com/docs/checkout/reference/customize-sdk/).
 *
 * ```javascript
 * braintree.client.create({
 *   authorization: 'authorization'
 * }).then(function (clientInstance) {
 *   return braintree.paypalCheckout.create({
 *     client: clientInstance
 *   });
 * }).then(function (paypalCheckoutInstance) {
 *   return paypal.Buttons({
 *     createOrder: function () {
 *       return paypalCheckoutInstance.createPayment({
 *         flow: 'checkout',
 *         currency: 'USD',
 *         amount: '10.00',
 *         intent: 'capture' // this value must either be `capture` or match the intent passed into the PayPal SDK intent query parameter
 *         // your other createPayment options here
 *       });
 *     },
 *
 *     onApprove: function (data, actions) {
 *       // some logic here before tokenization happens below
 *       return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
 *         // Submit payload.nonce to your server
 *       });
 *     },
 *
 *     onCancel: function () {
 *       // handle case where user cancels
 *     },
 *
 *     onError: function (err) {
 *       // handle case where error occurs
 *     }
 *   }).render('#paypal-button');
 * }).catch(function (err) {
 *  console.error('Error!', err);
 * });
 * ```
 *
 * #### Integrate Vault Flow with PayPal SDK
 *
 * You must have [PayPal's script, configured with various query parameters](https://developer.paypal.com/docs/checkout/integrate/#2-add-the-paypal-script-to-your-web-page), loaded on your page:
 *
 * ```html
 * <script src="https://www.paypal.com/sdk/js?client-id=your-sandbox-or-prod-client-id&vault=true"></script>
 * <div id="paypal-button"></div>
 * ```
 *
 * When passing values in the `createPayment` method, make sure they match the [corresponding parameters in the query parameters for the PayPal SDK script](https://developer.paypal.com/docs/checkout/reference/customize-sdk/).
 *
 * ```javascript
 * braintree.client.create({
 *   authorization: 'authorization'
 * }).then(function (clientInstance) {
 *   return braintree.paypalCheckout.create({
 *     client: clientInstance
 *   });
 * }).then(function (paypalCheckoutInstance) {
 *   return paypal.Buttons({
 *     createBillingAgreement: function () {
 *       return paypalCheckoutInstance.createPayment({
 *         flow: 'vault'
 *         // your other createPayment options here
 *       });
 *     },
 *
 *     onApprove: function (data, actions) {
 *       // some logic here before tokenization happens below
 *       return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
 *         // Submit payload.nonce to your server
 *       });
 *     },
 *
 *     onCancel: function () {
 *       // handle case where user cancels
 *     },
 *
 *     onError: function (err) {
 *       // handle case where error occurs
 *     }
 *   }).render('#paypal-button');
 * }).catch(function (err) {
 *  console.error('Error!', err);
 * });
 * ```
 *
 * #### Integrate with Checkout.js (deprecated PayPal SDK)
 *
 * If you are creating a new PayPal integration, please follow the previous integration guide to use the current version of the PayPal SDK. Use this integration guide only as a reference if you are already integrated with Checkout.js.
 *
 * You must have PayPal's Checkout.js script loaded on your page.
 *
 * ```html
 * <script src="https://www.paypalobjects.com/api/checkout.js" data-version-4 log-level="warn"></script>
 * ```
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
  // TODO remove this requirement for it to be opt in.
  // This feature is not yet GA, so we're intentionally making
  // it opt in and not publicly documenting it yet. Once it's
  // GA, we can remove the requirement to opt in to it
  this._autoSetDataUserIdToken = Boolean(options.autoSetDataUserIdToken);
}

PayPalCheckout.prototype._initialize = function (options) {
  var config;

  if (options.client) {
    config = options.client.getConfiguration();
    this._authorizationInformation = {
      fingerprint: config.authorizationFingerprint,
      environment: config.gatewayConfiguration.environment,
    };
  } else {
    config = createAuthorizationData(options.authorization);
    this._authorizationInformation = {
      fingerprint: config.attrs.authorizationFingerprint,
      environment: config.environment,
    };
  }

  this._clientPromise = createDeferredClient
    .create({
      authorization: options.authorization,
      client: options.client,
      debug: options.debug,
      assetsUrl: createAssetsUrl.create(options.authorization),
      name: "PayPal Checkout",
    })
    .then(
      function (client) {
        this._configuration = client.getConfiguration();

        // we skip these checks if a merchant account id is
        // passed in, because the default merchant account
        // may not have paypal enabled
        if (!this._merchantAccountId) {
          if (!this._configuration.gatewayConfiguration.paypalEnabled) {
            this._setupError = new BraintreeError(errors.PAYPAL_NOT_ENABLED);
          } else if (
            this._configuration.gatewayConfiguration.paypal
              .environmentNoNetwork === true
          ) {
            this._setupError = new BraintreeError(
              errors.PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED
            );
          }
        }

        if (this._setupError) {
          return Promise.reject(this._setupError);
        }

        analytics.sendEvent(client, "paypal-checkout.initialized");
        this._frameServicePromise = this._setupFrameService(client);

        return client;
      }.bind(this)
    );

  // if client was passed in, let config checks happen before
  // resolving the instance. Otherwise, just resolve the instance
  if (options.client) {
    return this._clientPromise.then(
      function () {
        return this;
      }.bind(this)
    );
  }

  return Promise.resolve(this);
};

PayPalCheckout.prototype._setupFrameService = function (client) {
  var frameServicePromise = new ExtendedPromise();
  var config = client.getConfiguration();
  var timeoutRef = setTimeout(function () {
    analytics.sendEvent(client, "paypal-checkout.frame-service.timed-out");
    frameServicePromise.reject(
      new BraintreeError(
        errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_SETUP_FAILED
      )
    );
  }, INTEGRATION_TIMEOUT_MS);

  this._assetsUrl =
    config.gatewayConfiguration.paypal.assetsUrl + "/web/" + VERSION;
  this._isDebug = config.isDebug;
  // Note: this is using the static landing frame that the deprecated PayPal component builds and uses
  this._loadingFrameUrl =
    this._assetsUrl +
    "/html/paypal-landing-frame" +
    useMin(this._isDebug) +
    ".html";

  frameService.create(
    {
      name: "braintreepaypallanding",
      dispatchFrameUrl:
        this._assetsUrl +
        "/html/dispatch-frame" +
        useMin(this._isDebug) +
        ".html",
      openFrameUrl: this._loadingFrameUrl,
    },
    function (service) {
      this._frameService = service;
      clearTimeout(timeoutRef);

      frameServicePromise.resolve();
    }.bind(this)
  );

  return frameServicePromise;
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
 * @typedef {object} PayPalCheckout~shippingOption
 * @property {string} id A unique ID that identifies a payer-selected shipping option.
 * @property {string} label A description that the payer sees, which helps them choose an appropriate shipping option. For example, `Free Shipping`, `USPS Priority Shipping`, `Expédition prioritaire USPS`, or `USPS yōuxiān fā huò`. Localize this description to the payer's locale.
 * @property {boolean} selected If `selected = true` is specified as part of the API request it represents the shipping option that the payee/merchant expects to be pre-selected for the payer when they first view the shipping options within the PayPal checkout experience. As part of the response if a shipping option has `selected = true` it represents the shipping option that the payer selected during the course of checkout with PayPal. Only 1 `shippingOption` can be set to `selected = true`.
 * @property {string} type The method by which the payer wants to get their items. The possible values are:
 * * `SHIPPING` - The payer intends to receive the items at a specified address.
 * * `PICKUP` - The payer intends to pick up the items at a specified address. For example, a store address.
 * @property {object} amount The shipping cost for the selected option.
 * @property {string} amount.currency The three-character ISO-4217 currency code. PayPal does not support all currencies.
 * @property {string} amount.value The amount the shipping option will cost. Includes the specified number of digits after decimal separator for the ISO-4217 currency code.
 */

/**
 * Creates a PayPal payment ID or billing token using the given options. This is meant to be passed to the PayPal JS SDK.
 * When a {@link callback} is defined, the function returns undefined and invokes the callback with the id to be used with the PayPal JS SDK. Otherwise, it returns a Promise that resolves with the id.
 * @public
 * @param {object} options All options for the PayPalCheckout component.
 * @param {string} options.flow Set to 'checkout' for one-time payment flow, or 'vault' for Vault flow. If 'vault' is used with a client token generated with a customer ID, the PayPal account will be added to that customer as a saved payment method.
 * @param {string} [options.intent=authorize]
 * * `authorize` - Submits the transaction for authorization but not settlement.
 * * `order` - Validates the transaction without an authorization (i.e. without holding funds). Useful for authorizing and capturing funds up to 90 days after the order has been placed. Only available for Checkout flow.
 * * `capture` - Payment will be immediately submitted for settlement upon creating a transaction. `sale` can be used as an alias for this value.
 * @param {boolean} [options.offerCredit=false] Offers PayPal Credit as the default funding instrument for the transaction. If the customer isn't pre-approved for PayPal Credit, they will be prompted to apply for it.
 * @param {(string|number)} [options.amount] The amount of the transaction. Required when using the Checkout flow. Should not include shipping cost.
 * * Supports up to 2 digits after the decimal point
 * @param {string} [options.currency] The currency code of the amount, such as 'USD'. Required when using the Checkout flow.
 * @param {string} [options.displayName] The merchant name displayed inside of the PayPal lightbox; defaults to the company name on your Braintree account
 * @param {boolean} [options.requestBillingAgreement] If `true` and `flow = checkout`, the customer will be prompted to consent to a billing agreement during the checkout flow. This value is ignored when `flow = vault`.
 * @param {object} [options.billingAgreementDetails] When `requestBillingAgreement = true`, allows for details to be set for the billing agreement portion of the flow.
 * @param {string} [options.billingAgreementDetails.description] Description of the billing agreement to display to the customer.
 * @param {string} [options.vaultInitiatedCheckoutPaymentMethodToken] Use the payment method nonce representing a PayPal account with a Billing Agreement ID to create the payment and redirect the customer to select a new financial instrument. This option is only applicable to the `checkout` flow.
 * @param {shippingOption[]} [options.shippingOptions] List of shipping options offered by the payee or merchant to the payer to ship or pick up their items.
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
 * @param {lineItem[]} [options.lineItems] The {@link PayPalCheckout~lineItem|line items} for this transaction. It can include up to 249 line items.
 * @param {callback} [callback] The second argument is a PayPal `paymentId` or `billingToken` string, depending on whether `options.flow` is `checkout` or `vault`. This is also what is resolved by the promise if no callback is provided.
 * @example
 * // this paypal object is created by the PayPal JS SDK
 * // see https://github.com/paypal/paypal-checkout-components
 * paypal.Buttons({
 *   createOrder: function () {
 *     // when createPayment resolves, it is automatically passed to the PayPal JS SDK
 *     return paypalCheckoutInstance.createPayment({
 *       flow: 'checkout',
 *       amount: '10.00',
 *       currency: 'USD',
 *       intent: 'capture' // this value must either be `capture` or match the intent passed into the PayPal SDK intent query parameter
 *     });
 *   },
 *   // Add other options, e.g. onApproved, onCancel, onError
 * }).render('#paypal-button');
 *
 * @example
 * // shippingOptions are passed to createPayment. You can review the result from onAuthorize to determine which shipping option id was selected.
 * ```javascript
 * braintree.client.create({
 *   authorization: 'authorization'
 * }).then(function (clientInstance) {
 *   return braintree.paypalCheckout.create({
 *     client: clientInstance
 *   });
 * }).then(function (paypalCheckoutInstance) {
 *   return paypal.Button.render({
 *     env: 'production'
 *
 *     payment: function () {
 *       return paypalCheckoutInstance.createPayment({
 *         flow: 'checkout',
 *         amount: '10.00',
 *         currency: 'USD',
 *         shippingOptions: [
 *           {
 *             id: 'UUID-9',
 *             type: 'PICKUP',
 *             label: 'Store Location Five',
 *             selected: true,
 *             amount: {
 *               value: '1.00',
 *               currency: 'USD'
 *             }
 *           },
 *           {
 *             id: 'shipping-speed-fast',
 *             type: 'SHIPPING',
 *             label: 'Fast Shipping',
 *             selected: false,
 *             amount: {
 *               value: '1.00',
 *               currency: 'USD'
 *             }
 *           },
 *           {
 *             id: 'shipping-speed-slow',
 *             type: 'SHIPPING',
 *             label: 'Slow Shipping',
 *             selected: false,
 *             amount: {
 *               value: '1.00',
 *               currency: 'USD'
 *             }
 *           }
 *         ]
 *       });
 *     },
 *
 *     onAuthorize: function (data, actions) {
 *       return paypalCheckoutInstance.tokenizePayment(data).then(function (payload) {
 *         // Submit payload.nonce to your server
 *       });
 *     }
 *   }, '#paypal-button');
 * }).catch(function (err) {
 *  console.error('Error!', err);
 * });
 * ```
 *
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.createPayment = function (options) {
  if (!options || !constants.FLOW_ENDPOINTS.hasOwnProperty(options.flow)) {
    return Promise.reject(
      new BraintreeError(errors.PAYPAL_FLOW_OPTION_REQUIRED)
    );
  }

  analytics.sendEvent(this._clientPromise, "paypal-checkout.createPayment");

  return this._createPaymentResource(options).then(function (response) {
    var flowToken, urlParams;

    if (options.flow === "checkout") {
      urlParams = querystring.parse(response.paymentResource.redirectUrl);
      flowToken = urlParams.token;
    } else {
      flowToken = response.agreementSetup.tokenId;
    }

    return flowToken;
  });
};

PayPalCheckout.prototype._createPaymentResource = function (options, config) {
  var self = this;
  var endpoint = "paypal_hermes/" + constants.FLOW_ENDPOINTS[options.flow];

  delete this.intentFromCreatePayment;

  config = config || {};

  if (options.offerCredit === true) {
    analytics.sendEvent(this._clientPromise, "paypal-checkout.credit.offered");
  }

  return this._clientPromise
    .then(function (client) {
      return client
        .request({
          endpoint: endpoint,
          method: "post",
          data: self._formatPaymentResourceData(options, config),
        })
        .then(function (data) {
          self.intentFromCreatePayment = options.intent;

          return data;
        });
    })
    .catch(function (err) {
      var status;

      if (self._setupError) {
        return Promise.reject(self._setupError);
      }

      status = err.details && err.details.httpStatus;

      if (status === 422) {
        return Promise.reject(
          new BraintreeError({
            type: errors.PAYPAL_INVALID_PAYMENT_OPTION.type,
            code: errors.PAYPAL_INVALID_PAYMENT_OPTION.code,
            message: errors.PAYPAL_INVALID_PAYMENT_OPTION.message,
            details: {
              originalError: err,
            },
          })
        );
      }

      return Promise.reject(
        convertToBraintreeError(err, {
          type: errors.PAYPAL_FLOW_FAILED.type,
          code: errors.PAYPAL_FLOW_FAILED.code,
          message: errors.PAYPAL_FLOW_FAILED.message,
        })
      );
    });
};

/**
 * Use this function to update {@link PayPalCheckout~lineItem|line items} and/or {@link PayPalCheckout~shippingOption|shipping options} associated with a PayPalCheckout flow (`paymentId`).
 * When a {@link callback} is defined, this function returns undefined and invokes the callback. The second callback argument, <code>data</code>, is the returned server data. If no callback is provided, `updatePayment` returns a promise that resolves with the server data.
 * @public
 * @param {object} options All options for the PayPalCheckout component.
 * @param {string} options.paymentId This should be PayPal `paymentId`.
 * @param {(string|number)} options.amount The amount of the transaction, including the amount of the selected shipping option, and all `line_items`.
 * * Supports up to 2 decimal digits.
 * @param {string} options.currency The currency code of the amount, such as 'USD'. Required when using the Checkout flow.
 * @param {shippingOption[]} [options.shippingOptions] List of {@link PayPalCheckout~shippingOption|shipping options} offered by the payee or merchant to the payer to ship or pick up their items.
 * @param {lineItem[]} [options.lineItems] The {@link PayPalCheckout~lineItem|line items} for this transaction. It can include up to 249 line items.
 * @param {callback} [callback] The second argument is a PayPal `paymentId` or `billingToken` string, depending on whether `options.flow` is `checkout` or `vault`. This is also what is resolved by the promise if no callback is provided.
 * @example
 * // this paypal object is created by the PayPal JS SDK
 * // see https://github.com/paypal/paypal-checkout-components
 * paypal.Buttons({
 *   createOrder: function () {
 *     // when createPayment resolves, it is automatically passed to the PayPal JS SDK
 *     return paypalCheckoutInstance.createPayment({
 *       //
 *     });
 *   },
 *   onShippingChange: function (data) {
 *     // Examine data and determine if the payment needs to be updated.
 *     // when updatePayment resolves, it is automatically passed to the PayPal JS SDK
 *     return paypalCheckoutInstance.updatePayment({
 *         paymentId: data.paymentId,
 *         amount: '15.00',
 *         currency: 'USD',
 *         shippingOptions: [
 *           {
 *             id: 'shipping-speed-fast',
 *             type: 'SHIPPING',
 *             label: 'Fast Shipping',
 *             selected: true,
 *             amount: {
 *               value: '5.00',
 *               currency: 'USD'
 *             }
 *           },
 *           {
 *             id: 'shipping-speed-slow',
 *             type: 'SHIPPING',
 *             label: 'Slow Shipping',
 *             selected: false,
 *             amount: {
 *               value: '1.00',
 *               currency: 'USD'
 *             }
 *           }
 *         ]
 *     });
 *   }
 *   // Add other options, e.g. onApproved, onCancel, onError
 * }).render('#paypal-button');
 *
 * ```
 *
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.updatePayment = function (options) {
  var self = this;
  var endpoint = "paypal_hermes/patch_payment_resource";

  if (!options || this._hasMissingOption(options, constants.REQUIRED_OPTIONS)) {
    analytics.sendEvent(
      self._clientPromise,
      "paypal-checkout.updatePayment.missing-options"
    );

    return Promise.reject(
      new BraintreeError(errors.PAYPAL_MISSING_REQUIRED_OPTION)
    );
  }

  if (!this._verifyConsistentCurrency(options)) {
    analytics.sendEvent(
      self._clientPromise,
      "paypal-checkout.updatePayment.inconsistent-currencies"
    );

    return Promise.reject(
      new BraintreeError({
        type: errors.PAYPAL_INVALID_PAYMENT_OPTION.type,
        code: errors.PAYPAL_INVALID_PAYMENT_OPTION.code,
        message: errors.PAYPAL_INVALID_PAYMENT_OPTION.message,
        details: {
          originalError: new Error(
            "One or more shipping option currencies differ from checkout currency."
          ),
        },
      })
    );
  }

  analytics.sendEvent(this._clientPromise, "paypal-checkout.updatePayment");

  return this._clientPromise
    .then(function (client) {
      return client.request({
        endpoint: endpoint,
        method: "post",
        data: self._formatUpdatePaymentData(options),
      });
    })
    .catch(function (err) {
      var status = err.details && err.details.httpStatus;

      if (status === 422) {
        analytics.sendEvent(
          self._clientPromise,
          "paypal-checkout.updatePayment.invalid"
        );

        return Promise.reject(
          new BraintreeError({
            type: errors.PAYPAL_INVALID_PAYMENT_OPTION.type,
            code: errors.PAYPAL_INVALID_PAYMENT_OPTION.code,
            message: errors.PAYPAL_INVALID_PAYMENT_OPTION.message,
            details: {
              originalError: err,
            },
          })
        );
      }

      analytics.sendEvent(
        self._clientPromise,
        "paypal-checkout.updatePayment." + errors.PAYPAL_FLOW_FAILED.code
      );

      return Promise.reject(
        convertToBraintreeError(err, {
          type: errors.PAYPAL_FLOW_FAILED.type,
          code: errors.PAYPAL_FLOW_FAILED.code,
          message: errors.PAYPAL_FLOW_FAILED.message,
        })
      );
    });
};

/**
 * Initializes the PayPal checkout flow with a payment method nonce that represents a vaulted PayPal account.
 * When a {@link callback} is defined, the function returns undefined and invokes the callback with the id to be used with the PayPal JS SDK. Otherwise, it returns a Promise that resolves with the id.
 * @public
 * @ignore
 * @param {object} options These options are identical to the {@link PayPalCheckout#createPayment|options for creating a payment resource}, except for the following:
 * * `flow` cannot be set (will always be `'checkout'`)
 * * `amount`, `currency`, and `vaultInitiatedCheckoutPaymentMethodToken` are required instead of optional
 * * Additional configuration is available (listed below)
 * @param {boolean} [options.optOutOfModalBackdrop=false] By default, the webpage will darken and become unusable while the PayPal window is open. For full control of the UI, pass `true` for this option.
 * @param {callback} [callback] The second argument, <code>payload</code>, is a {@link PayPalCheckout~tokenizePayload|tokenizePayload}. If no callback is provided, the promise resolves with a {@link PayPalCheckout~tokenizePayload|tokenizePayload}.
 * @example
 * paypalCheckoutInstance.startVaultInitiatedCheckout({
 *   vaultInitiatedCheckoutPaymentMethodToken: 'nonce-that-represents-a-vaulted-paypal-account',
 *   amount: '10.00',
 *   currency: 'USD'
 * }).then(function (payload) {
 *   // send payload.nonce to your server
 * }).catch(function (err) {
 *   if (err.code === 'PAYPAL_POPUP_CLOSED') {
 *     // indicates that customer canceled by
 *     // manually closing the PayPal popup
 *   }
 *
 *   // handle other errors
 * });
 *
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.startVaultInitiatedCheckout = function (options) {
  var missingRequiredParam;
  var self = this;

  if (this._vaultInitiatedCheckoutInProgress) {
    analytics.sendEvent(
      this._clientPromise,
      "paypal-checkout.startVaultInitiatedCheckout.error.already-in-progress"
    );

    return Promise.reject(
      new BraintreeError(
        errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS
      )
    );
  }

  REQUIRED_PARAMS_FOR_START_VAULT_INITIATED_CHECKOUT.forEach(function (param) {
    if (!options.hasOwnProperty(param)) {
      missingRequiredParam = param;
    }
  });

  if (missingRequiredParam) {
    return Promise.reject(
      new BraintreeError({
        type: errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED.type,
        code: errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED.code,
        message: "Required param " + missingRequiredParam + " is missing.",
      })
    );
  }

  this._vaultInitiatedCheckoutInProgress = true;
  this._addModalBackdrop(options);

  options = assign({}, options, {
    flow: "checkout",
  });

  analytics.sendEvent(
    this._clientPromise,
    "paypal-checkout.startVaultInitiatedCheckout.started"
  );

  return this._waitForVaultInitiatedCheckoutDependencies()
    .then(function () {
      var frameCommunicationPromise = new ExtendedPromise();
      var startVaultInitiatedCheckoutPromise = self
        ._createPaymentResource(options, {
          returnUrl: self._constructVaultCheckutUrl("redirect-frame"),
          cancelUrl: self._constructVaultCheckutUrl("cancel-frame"),
        })
        .then(function (response) {
          var redirectUrl = response.paymentResource.redirectUrl;

          self._frameService.redirect(redirectUrl);

          return frameCommunicationPromise;
        });

      self._frameService.open(
        {},
        self._createFrameServiceCallback(frameCommunicationPromise)
      );

      return startVaultInitiatedCheckoutPromise;
    })
    .catch(function (err) {
      self._vaultInitiatedCheckoutInProgress = false;
      self._removeModalBackdrop();

      if (err.code === "FRAME_SERVICE_FRAME_CLOSED") {
        analytics.sendEvent(
          self._clientPromise,
          "paypal-checkout.startVaultInitiatedCheckout.canceled.by-customer"
        );

        return Promise.reject(
          new BraintreeError(
            errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED
          )
        );
      }

      if (self._frameService) {
        self._frameService.close();
      }

      if (
        err.code &&
        err.code.indexOf("FRAME_SERVICE_FRAME_OPEN_FAILED") > -1
      ) {
        analytics.sendEvent(
          self._clientPromise,
          "paypal-checkout.startVaultInitiatedCheckout.failed.popup-not-opened"
        );

        return Promise.reject(
          new BraintreeError({
            code: errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED
              .code,
            type: errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED
              .type,
            message:
              errors.PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED
                .message,
            details: {
              originalError: err,
            },
          })
        );
      }

      return Promise.reject(err);
    })
    .then(function (response) {
      self._frameService.close();
      self._vaultInitiatedCheckoutInProgress = false;
      self._removeModalBackdrop();
      analytics.sendEvent(
        self._clientPromise,
        "paypal-checkout.startVaultInitiatedCheckout.succeeded"
      );

      return Promise.resolve(response);
    });
};

PayPalCheckout.prototype._addModalBackdrop = function (options) {
  if (options.optOutOfModalBackdrop) {
    return;
  }

  if (!this._modalBackdrop) {
    this._modalBackdrop = document.createElement("div");
    this._modalBackdrop.setAttribute(
      "data-braintree-paypal-vault-initiated-checkout-modal",
      true
    );
    this._modalBackdrop.style.position = "fixed";
    this._modalBackdrop.style.top = 0;
    this._modalBackdrop.style.bottom = 0;
    this._modalBackdrop.style.left = 0;
    this._modalBackdrop.style.right = 0;
    this._modalBackdrop.style.zIndex = 9999;
    this._modalBackdrop.style.background = "black";
    this._modalBackdrop.style.opacity = "0.7";
    this._modalBackdrop.addEventListener(
      "click",
      function () {
        this.focusVaultInitiatedCheckoutWindow();
      }.bind(this)
    );
  }

  document.body.appendChild(this._modalBackdrop);
};

PayPalCheckout.prototype._removeModalBackdrop = function () {
  if (!(this._modalBackdrop && this._modalBackdrop.parentNode)) {
    return;
  }

  this._modalBackdrop.parentNode.removeChild(this._modalBackdrop);
};

/**
 * Closes the PayPal window if it is opened via `startVaultInitiatedCheckout`.
 * @public
 * @ignore
 * @param {callback} [callback] Gets called when window is closed.
 * @example
 * paypalCheckoutInstance.closeVaultInitiatedCheckoutWindow();
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.closeVaultInitiatedCheckoutWindow = function () {
  if (this._vaultInitiatedCheckoutInProgress) {
    analytics.sendEvent(
      this._clientPromise,
      "paypal-checkout.startVaultInitiatedCheckout.canceled.by-merchant"
    );
  }

  return this._waitForVaultInitiatedCheckoutDependencies().then(
    function () {
      this._frameService.close();
    }.bind(this)
  );
};

/**
 * Focuses the PayPal window if it is opened via `startVaultInitiatedCheckout`.
 * @public
 * @ignore
 * @param {callback} [callback] Gets called when window is focused.
 * @example
 * paypalCheckoutInstance.focusVaultInitiatedCheckoutWindow();
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.focusVaultInitiatedCheckoutWindow = function () {
  return this._waitForVaultInitiatedCheckoutDependencies().then(
    function () {
      this._frameService.focus();
    }.bind(this)
  );
};

PayPalCheckout.prototype._createFrameServiceCallback = function (
  frameCommunicationPromise
) {
  var self = this;

  // TODO when a merchant integrates an iOS or Android integration
  // with a webview using the web SDK, we will have to add popupbridge
  // support
  return function (err, payload) {
    if (err) {
      frameCommunicationPromise.reject(err);
    } else if (payload) {
      self._frameService.redirect(self._loadingFrameUrl);
      self
        .tokenizePayment({
          paymentToken: payload.token,
          payerID: payload.PayerID,
          paymentID: payload.paymentId,
          orderID: payload.orderId,
        })
        .then(function (res) {
          frameCommunicationPromise.resolve(res);
        })
        .catch(function (tokenizationError) {
          frameCommunicationPromise.reject(tokenizationError);
        });
    }
  };
};

PayPalCheckout.prototype._waitForVaultInitiatedCheckoutDependencies =
  function () {
    var self = this;

    return this._clientPromise.then(function () {
      return self._frameServicePromise;
    });
  };

PayPalCheckout.prototype._constructVaultCheckutUrl = function (frameName) {
  var serviceId = this._frameService._serviceId;

  return (
    this._assetsUrl +
    "/html/" +
    frameName +
    useMin(this._isDebug) +
    ".html?channel=" +
    serviceId
  );
};

/**
 * Tokenizes the authorize data from the PayPal JS SDK when completing a buyer approval flow.
 * When a {@link callback} is defined, invokes the callback with {@link PayPalCheckout~tokenizePayload|tokenizePayload} and returns undefined. Otherwise, returns a Promise that resolves with a {@link PayPalCheckout~tokenizePayload|tokenizePayload}.
 * @public
 * @param {object} tokenizeOptions Tokens and IDs required to tokenize the payment.
 * @param {string} tokenizeOptions.payerId Payer ID returned by PayPal `onApproved` callback.
 * @param {string} [tokenizeOptions.paymentId] Payment ID returned by PayPal `onApproved` callback.
 * @param {string} [tokenizeOptions.billingToken] Billing Token returned by PayPal `onApproved` callback.
 * @param {boolean} [tokenizeOptions.vault=true] Whether or not to vault the resulting PayPal account (if using a client token generated with a customer id and the vault flow).
 * @param {callback} [callback] The second argument, <code>payload</code>, is a {@link PayPalCheckout~tokenizePayload|tokenizePayload}. If no callback is provided, the promise resolves with a {@link PayPalCheckout~tokenizePayload|tokenizePayload}.
 * @example <caption>Opt out of auto-vaulting behavior</caption>
 * // create the paypalCheckoutInstance with a client token generated with a customer id
 * paypal.Buttons({
 *   createBillingAgreement: function () {
 *     return paypalCheckoutInstance.createPayment({
 *       flow: 'vault'
 *       // your other createPayment options here
 *     });
 *   },
 *   onApproved: function (data) {
 *     data.vault = false;
 *
 *     return paypalCheckoutInstance.tokenizePayment(data);
 *   },
 *   // Add other options, e.g. onCancel, onError
 * }).render('#paypal-button');
 *
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.tokenizePayment = function (tokenizeOptions) {
  var self = this;
  var shouldVault = true;
  var payload;
  var options = {
    flow:
      tokenizeOptions.billingToken && !tokenizeOptions.paymentID
        ? "vault"
        : "checkout",
    intent: tokenizeOptions.intent || this.intentFromCreatePayment,
  };
  var params = {
    // The paymentToken provided by the PayPal JS SDK is the EC Token
    ecToken: tokenizeOptions.paymentToken,
    billingToken: tokenizeOptions.billingToken,
    payerId: tokenizeOptions.payerID,
    paymentId: tokenizeOptions.paymentID,
    orderId: tokenizeOptions.orderID,
    shippingOptionsId: tokenizeOptions.shippingOptionsId,
  };

  if (tokenizeOptions.hasOwnProperty("vault")) {
    shouldVault = tokenizeOptions.vault;
  }

  options.vault = shouldVault;

  analytics.sendEvent(
    this._clientPromise,
    "paypal-checkout.tokenization.started"
  );

  return this._clientPromise
    .then(function (client) {
      return client.request({
        endpoint: "payment_methods/paypal_accounts",
        method: "post",
        data: self._formatTokenizeData(options, params),
      });
    })
    .then(function (response) {
      payload = self._formatTokenizePayload(response);

      analytics.sendEvent(
        self._clientPromise,
        "paypal-checkout.tokenization.success"
      );
      if (payload.creditFinancingOffered) {
        analytics.sendEvent(
          self._clientPromise,
          "paypal-checkout.credit.accepted"
        );
      }

      return payload;
    })
    .catch(function (err) {
      if (self._setupError) {
        return Promise.reject(self._setupError);
      }

      analytics.sendEvent(
        self._clientPromise,
        "paypal-checkout.tokenization.failed"
      );

      return Promise.reject(
        convertToBraintreeError(err, {
          type: errors.PAYPAL_ACCOUNT_TOKENIZATION_FAILED.type,
          code: errors.PAYPAL_ACCOUNT_TOKENIZATION_FAILED.code,
          message: errors.PAYPAL_ACCOUNT_TOKENIZATION_FAILED.message,
        })
      );
    });
};

/**
 * Resolves with the PayPal client id to be used when loading the PayPal SDK.
 * @public
 * @param {callback} [callback] The second argument, <code>id</code>, is a the PayPal client id. If no callback is provided, the promise resolves with the PayPal client id.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * paypalCheckoutInstance.getClientId().then(function (id) {
 *  var script = document.createElement('script');
 *
 *  script.src = 'https://www.paypal.com/sdk/js?client-id=' + id;
 *  script.onload = function () {
 *    // setup the PayPal SDK
 *  };
 *
 *  document.body.appendChild(script);
 * });
 */
PayPalCheckout.prototype.getClientId = function () {
  return this._clientPromise.then(function (client) {
    return client.getConfiguration().gatewayConfiguration.paypal.clientId;
  });
};

/**
 * Resolves when the PayPal SDK has been successfully loaded onto the page.
 * @public
 * @param {object} [options] A configuration object to modify the query params and data-attributes on the PayPal SDK. A subset of the parameters are listed below. For a full list of query params, see the [PayPal docs](https://developer.paypal.com/docs/checkout/reference/customize-sdk/?mark=query#query-parameters).
 * @param {string} [options.client-id] By default, this will be the client id associated with the authorization used to create the Braintree component. When used in conjunction with passing `authorization` when creating the PayPal Checkout component, you can speed up the loading of the PayPal SDK.
 * @param {string} [options.intent="authorize"] By default, the PayPal SDK defaults to an intent of `capture`. Since the default intent when calling {@link PayPalCheckout#createPayment|`createPayment`} is `authorize`, the PayPal SDK will be loaded with `intent=authorize`. If you wish to use a different intent when calling {@link PayPalCheckout#createPayment|`createPayment`}, make sure it matches here. If `sale` is used, it will be converted to `capture` for the PayPal SDK. If the `vault: true` param is used, `tokenize` will be passed as the default intent.
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
 * @param {string} [options.currency="USD"] If a currency is passed in {@link PayPalCheckout#createPayment|`createPayment`}, it must match the currency passed here.
 * @param {boolean} [options.vault] Must be `true` when using `flow: vault` in {@link PayPalCheckout#createPayment|`createPayment`}.
 * @param {string} [options.components=buttons] By default, the Braintree SDK will only load the PayPal smart buttons component. If you would like to load just the [messages component](https://developer.paypal.com/docs/business/checkout/add-capabilities/credit-messaging/), pass `messages`. If you would like to load both, pass `buttons,messages`
 * @param {object} [options.dataAttributes] The data attributes to apply to the script. Any data attribute can be passed. A subset of the parameters are listed below. For a full list of data attributes, see the [PayPal docs](https://developer.paypal.com/docs/checkout/reference/customize-sdk/#script-parameters).
 * @param {string} [options.dataAttributes.client-token] The client token to use in the script. (usually not needed)
 * @param {string} [options.dataAttributes.csp-nonce] See the [PayPal docs about content security nonces](https://developer.paypal.com/docs/checkout/reference/customize-sdk/#csp-nonce).
 * @param {callback} [callback] Called when the PayPal SDK has been loaded onto the page. The second argument is the PayPal Checkout instance. If no callback is provided, the promise resolves with the PayPal Checkout instance when the PayPal SDK has been loaded onto the page.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example <caption>Without options</caption>
 * paypalCheckoutInstance.loadPayPalSDK().then(function () {
 *   // window.paypal.Buttons is now available to use
 * });
 * @example <caption>With options</caption>
 * paypalCheckoutInstance.loadPayPalSDK({
 *   'client-id': 'PayPal Client Id', // Can speed up rendering time to hardcode this value
 *
 *   intent: 'capture', // Make sure this value matches the value in createPayment
 *   currency: 'USD', // Make sure this value matches the value in createPayment
 * }).then(function () {
 *   // window.paypal.Buttons is now available to use
 * });
 * @example <caption>With Vaulting</caption>
 * paypalCheckoutInstance.loadPayPalSDK({
 *   vault: true
 * }).then(function () {
 *   // window.paypal.Buttons is now available to use
 * });
 */
PayPalCheckout.prototype.loadPayPalSDK = function (options) {
  var idPromise, src;
  var loadPromise = new ExtendedPromise();
  var dataAttributes = (options && options.dataAttributes) || {};
  var userIdToken =
    dataAttributes["user-id-token"] || dataAttributes["data-user-id-token"];

  if (!userIdToken) {
    userIdToken =
      this._authorizationInformation.fingerprint &&
      this._authorizationInformation.fingerprint.split("?")[0];
  }

  this._paypalScript = document.createElement("script");

  // NEXT_MAJOR_VERSION
  // this options object should have 2 properties:
  // * queryParams
  // * dataAttributes
  // should make organizing this better than squashing
  // all the query params at the top level and extracting
  // the data attributes
  options = assign(
    {},
    {
      components: "buttons",
    },
    options
  );
  delete options.dataAttributes;

  // NEXT_MAJOR_VERSION if merchant passes an explicit intent,
  // currency, amount, etc, save those for use in createPayment
  // if no explicit param of that type is passed in when calling
  // createPayment to reduce the number of items that need to be
  // duplicated here and in createPayment
  if (options.vault) {
    options.intent = options.intent || "tokenize";
  } else {
    options.intent = options.intent || "authorize";
    options.currency = options.currency || "USD";
  }

  src = "https://www.paypal.com/sdk/js?";
  this._paypalScript.onload = function () {
    loadPromise.resolve();
  };

  Object.keys(dataAttributes).forEach(
    function (attribute) {
      this._paypalScript.setAttribute(
        "data-" + attribute.replace(/^data\-/, ""),
        dataAttributes[attribute]
      );
    }.bind(this)
  );

  if (options["client-id"]) {
    idPromise = Promise.resolve(options["client-id"]);
  } else {
    idPromise = this.getClientId();
  }

  idPromise.then(
    function (id) {
      options["client-id"] = id;

      if (this._autoSetDataUserIdToken && userIdToken) {
        this._paypalScript.setAttribute("data-user-id-token", userIdToken);

        // preloading improves the rendering time of the PayPal button
        this._attachPreloadPixel({
          id: id,
          userIdToken: userIdToken,
          amount: dataAttributes.amount,
          currency: options.currency,
          merchantId: options["merchant-id"],
        });
      }

      this._paypalScript.src = querystring.queryify(src, options);
      document.head.insertBefore(
        this._paypalScript,
        document.head.firstElementChild
      );
    }.bind(this)
  );

  return loadPromise.then(
    function () {
      return this;
    }.bind(this)
  );
};

PayPalCheckout.prototype._attachPreloadPixel = function (options) {
  var request;
  var id = options.id;
  var userIdToken = options.userIdToken;
  var env = this._authorizationInformation.environment;
  var subdomain = env === "production" ? "" : "sandbox.";
  var url = PAYPAL_SDK_PRELOAD_URL.replace("{ENV}", subdomain);
  var preloadOptions = {
    "client-id": id,
    "user-id-token": userIdToken,
  };

  if (options.amount) {
    preloadOptions.amount = options.amount;
  }
  if (options.currency) {
    preloadOptions.currency = options.currency;
  }
  if (options.merchantId) {
    preloadOptions["merchant-id"] = options.merchantId;
  }

  request = new XMLHttpRequest();
  request.open("GET", querystring.queryify(url, preloadOptions));
  request.send();
};

PayPalCheckout.prototype._formatPaymentResourceData = function (
  options,
  config
) {
  var key;
  var gatewayConfiguration = this._configuration.gatewayConfiguration;
  // NEXT_MAJOR_VERSION default value for intent in PayPal SDK is capture
  // but our integrations default value is authorize. Default this to capture
  // in the next major version.
  var intent = options.intent;
  var paymentResource = {
    // returnUrl and cancelUrl are required in hermes create_payment_resource route
    // but are not used by the PayPal sdk, except to redirect to an error page
    returnUrl: config.returnUrl || "https://www.paypal.com/checkoutnow/error",
    cancelUrl: config.cancelUrl || "https://www.paypal.com/checkoutnow/error",
    offerPaypalCredit: options.offerCredit === true,
    merchantAccountId: this._merchantAccountId,
    experienceProfile: {
      brandName: options.displayName || gatewayConfiguration.paypal.displayName,
      localeCode: options.locale,
      noShipping: (!options.enableShippingAddress).toString(),
      addressOverride: options.shippingAddressEditable === false,
      landingPageType: options.landingPageType,
    },
    shippingOptions: options.shippingOptions,
  };

  if (options.flow === "checkout") {
    paymentResource.amount = options.amount;
    paymentResource.currencyIsoCode = options.currency;
    paymentResource.requestBillingAgreement = options.requestBillingAgreement;

    if (intent) {
      // 'sale' has been changed to 'capture' in PayPal's backend, but
      // we use an old version with 'sale'. We provide capture as an alias
      // to match the PayPal SDK
      if (intent === "capture") {
        intent = "sale";
      }
      paymentResource.intent = intent;
    }

    if (options.hasOwnProperty("lineItems")) {
      paymentResource.lineItems = options.lineItems;
    }

    if (options.hasOwnProperty("vaultInitiatedCheckoutPaymentMethodToken")) {
      paymentResource.vaultInitiatedCheckoutPaymentMethodToken =
        options.vaultInitiatedCheckoutPaymentMethodToken;
    }

    if (options.hasOwnProperty("shippingOptions")) {
      paymentResource.shippingOptions = options.shippingOptions;
    }

    for (key in options.shippingAddressOverride) {
      if (options.shippingAddressOverride.hasOwnProperty(key)) {
        paymentResource[key] = options.shippingAddressOverride[key];
      }
    }

    if (options.hasOwnProperty("billingAgreementDetails")) {
      paymentResource.billingAgreementDetails = options.billingAgreementDetails;
    }
  } else {
    paymentResource.shippingAddress = options.shippingAddressOverride;

    if (options.billingAgreementDescription) {
      paymentResource.description = options.billingAgreementDescription;
    }
  }

  // this needs to be set outside of the block where add it to the
  // payment request so that a follow up tokenization call can use it,
  // but if a second create payment resource call is made without
  // the correlation id, we want to reset it to undefined so that the
  // tokenization call does not use a stale correlation id
  this._riskCorrelationId = options.riskCorrelationId;
  if (options.riskCorrelationId) {
    paymentResource.correlationId = this._riskCorrelationId;
  }

  return paymentResource;
};

/**
 * @ignore
 * @static
 * @function _verifyConsistentCurrency
 * Verifies that `options.currency` and the currencies for each `shippingOption` the same.
 * @param {object} options `options` provided for `updatePayment`.
 * @returns {boolean} true is currencies match (or no shipping options); false if currencies do not match.
 */

PayPalCheckout.prototype._verifyConsistentCurrency = function (options) {
  if (
    options.currency &&
    options.hasOwnProperty("shippingOptions") &&
    Array.isArray(options.shippingOptions)
  ) {
    return options.shippingOptions.every(function (item) {
      return (
        item.amount &&
        item.amount.currency &&
        options.currency.toLowerCase() === item.amount.currency.toLowerCase()
      );
    });
  }

  return true;
};

/**
 * @ignore
 * @static
 * @function _hasMissingOption
 * @param {object} options All options provided for intiating the PayPal flow.
 * @param {array} required A list of required inputs that must be include as part of the options.
 * @returns {boolean} Returns a boolean.
 */

PayPalCheckout.prototype._hasMissingOption = function (options, required) {
  var i, option;

  required = required || [];

  if (
    !options.hasOwnProperty("amount") &&
    !options.hasOwnProperty("lineItems")
  ) {
    return true;
  }

  for (i = 0; i < required.length; i++) {
    option = required[i];

    if (!options.hasOwnProperty(option)) {
      return true;
    }
  }

  return false;
};

PayPalCheckout.prototype._formatUpdatePaymentData = function (options) {
  var self = this;
  var paymentResource = {
    merchantAccountId: this._merchantAccountId,
    paymentId: options.paymentId || options.orderId,
    currencyIsoCode: options.currency,
  };

  if (options.hasOwnProperty("amount")) {
    paymentResource.amount = options.amount;
  }

  if (options.hasOwnProperty("lineItems")) {
    paymentResource.lineItems = options.lineItems;
  }

  if (options.hasOwnProperty("shippingOptions")) {
    paymentResource.shippingOptions = options.shippingOptions;
  }

  /* shippingAddress not supported yet */
  if (options.hasOwnProperty("shippingAddress")) {
    analytics.sendEvent(
      self._clientPromise,
      "paypal-checkout.updatePayment.shippingAddress.provided.by-the-merchant"
    );

    paymentResource.line1 = options.shippingAddress.line1;

    if (options.shippingAddress.hasOwnProperty("line2")) {
      paymentResource.line2 = options.shippingAddress.line2;
    }

    paymentResource.city = options.shippingAddress.city;
    paymentResource.state = options.shippingAddress.state;
    paymentResource.postalCode = options.shippingAddress.postalCode;
    paymentResource.countryCode = options.shippingAddress.countryCode;

    if (options.shippingAddress.hasOwnProperty("phone")) {
      paymentResource.phone = options.shippingAddress.phone;
    }

    if (options.shippingAddress.hasOwnProperty("recipientName")) {
      paymentResource.recipientName = options.shippingAddress.recipientName;
    }
  }

  return paymentResource;
};

PayPalCheckout.prototype._formatTokenizeData = function (options, params) {
  var clientConfiguration = this._configuration;
  var gatewayConfiguration = clientConfiguration.gatewayConfiguration;
  var isTokenizationKey =
    clientConfiguration.authorizationType === "TOKENIZATION_KEY";
  var isVaultFlow = options.flow === "vault";
  var correlationId =
    this._riskCorrelationId || params.billingToken || params.ecToken;
  var data = {
    paypalAccount: {
      correlationId: correlationId,
      options: {
        validate: isVaultFlow && !isTokenizationKey && options.vault,
      },
    },
  };

  if (isVaultFlow) {
    data.paypalAccount.billingAgreementToken = params.billingToken;
  } else {
    data.paypalAccount.paymentToken = params.paymentId || params.orderId;
    data.paypalAccount.payerId = params.payerId;
    data.paypalAccount.unilateral =
      gatewayConfiguration.paypal.unvettedMerchant;

    if (options.intent) {
      data.paypalAccount.intent = options.intent;
    }
  }

  if (this._merchantAccountId) {
    data.merchantAccountId = this._merchantAccountId;
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
    type: account.type,
  };

  if (account.details && account.details.payerInfo) {
    payload.details = account.details.payerInfo;
  }

  if (account.details && account.details.creditFinancingOffered) {
    payload.creditFinancingOffered = account.details.creditFinancingOffered;
  }

  if (account.details && account.details.shippingOptionId) {
    payload.shippingOptionId = account.details.shippingOptionId;
  }

  if (account.details && account.details.cobrandedCardLabel) {
    payload.cobrandedCardLabel = account.details.cobrandedCardLabel;
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
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PayPalCheckout.prototype.teardown = function () {
  var self = this;

  convertMethodsToError(this, methods(PayPalCheckout.prototype));

  if (this._paypalScript && this._paypalScript.parentNode) {
    this._paypalScript.parentNode.removeChild(this._paypalScript);
  }

  return this._frameServicePromise
    .catch(function () {
      // no need to error in teardown for an error setting up the frame service
    })
    .then(function () {
      if (!self._frameService) {
        return Promise.resolve();
      }

      return self._frameService.teardown();
    });
};

module.exports = wrapPromise.wrapPrototype(PayPalCheckout);
