'use strict';

var BraintreeError = require('../../lib/braintree-error');
var convertToBraintreeError = require('../../lib/convert-to-braintree-error');
var analytics = require('../../lib/analytics');
var assign = require('../../lib/assign').assign;
var assets = require('../../lib/assets');
var methods = require('../../lib/methods');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var constants = require('../shared/constants');
var useMin = require('../../lib/use-min');
var Bus = require('../../lib/bus');
var uuid = require('../../lib/vendor/uuid');
var deferred = require('../../lib/deferred');
var errors = require('../shared/errors');
var events = require('../shared/events');
var iFramer = require('@braintree/iframer');
var Promise = require('../../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');
var INTEGRATION_TIMEOUT_MS = require('../../lib/constants').INTEGRATION_TIMEOUT_MS;

var PLATFORM = require('../../lib/constants').PLATFORM;
var VERSION = process.env.npm_package_version;

var IFRAME_HEIGHT = 400;
var IFRAME_WIDTH = 400;

/**
 * @deprecated
 * @callback ThreeDSecure~addFrameCallback
 * @param {?BraintreeError} [err] `null` or `undefined` if there was no error.
 * @param {HTMLIFrameElement} iframe An iframe element containing the bank's authentication page that you must put on your page.
 * @description **Deprecated** The callback used for options.addFrame in 3DS 1.0's {@link ThreeDSecure#verifyCard|verifyCard}.
 * @returns {void}
 */

/**
 * @deprecated
 * @callback ThreeDSecure~removeFrameCallback
 * @description **Deprecated** The callback used for options.removeFrame in 3DS 1.0's {@link ThreeDSecure#verifyCard|verifyCard}.
 * @returns {void}
 */

/**
 * @deprecated
 * @typedef {object} ThreeDSecure~verifyCardCustomerObject
 * @property {string} [customer.mobilePhoneNumber] The mobile phone number used for verification. Only numbers; remove dashes, paranthesis and other characters.
 * @property {string} [customer.email] The email used for verification.
 * @property {string} [customer.shippingMethod] The 2-digit string indicating the shipping method chosen for the transaction.
 * @property {string} [customer.billingAddress.firstName] The first name associated with the address.
 * @property {string} [customer.billingAddress.lastName] The last name associated with the address.
 * @property {string} [customer.billingAddress.streetAddress] Line 1 of the Address (eg. number, street, etc).
 * @property {string} [customer.billingAddress.extendedAddress] Line 2 of the Address (eg. suite, apt #, etc.).
 * @property {string} [customer.billingAddress.locality] The locality (city) name associated with the address.
 * @property {string} [customer.billingAddress.region] The 2 letter code for US states, and the equivalent for other countries.
 * @property {string} [customer.billingAddress.postalCode] The zip code or equivalent for countries that have them.
 * @property {string} [customer.billingAddress.countryCodeAlpha2] The 2 character country code.
 * @property {string} [customer.billingAddress.phoneNumber] The phone number associated with the address. Only numbers; remove dashes, paranthesis and other characters.
 * @description **Deprecated** Optional customer information to be passed to 3DS 1.0 for verification.
 */

/**
 * @typedef {object} ThreeDSecure~verifyPayload
 * @property {string} nonce The new payment method nonce produced by the 3D Secure lookup. The original nonce passed into {@link ThreeDSecure#verifyCard|verifyCard} was consumed. This new nonce should be used to transact on your server.
 * @property {object} details Additional account details.
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastFour Last four digits of card number.
 * @property {string} details.lastTwo Last two digits of card number.
 * @property {string} description A human-readable description.
 * @property {object} binData Information about the card based on the bin.
 * @property {string} binData.commercial Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.countryOfIssuance The country of issuance.
 * @property {string} binData.debit Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.durbinRegulated Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.healthcare Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.issuingBank The issuing bank.
 * @property {string} binData.payroll Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.prepaid Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.productId The product id.
 * @property {boolean} liabilityShiftPossible *Deprecated:* Use `threeDSecureInfo.liabilityShiftPossible` instead.
 * @property {boolean} liabilityShifted *Deprecated:* Use `threeDSecureInfo.liabilityShifted` instead.
 * @property {object} threeDSecureInfo 3DS information about the card.
 * @property {boolean} threeDSecureInfo.liabilityShiftPossible Indicates whether the card was eligible for 3D Secure.
 * @property {boolean} threeDSecureInfo.liabilityShifted Indicates whether the liability for fraud has been shifted away from the merchant.
 */

/**
 * @typedef {string} ThreeDSecure~prepareLookupPayload The client data to pass on when doing a server side lookup call.
 */

/**
 * @typedef {object} ThreeDSecure~verificationData
 * @property {object} threeDSecureInfo Contains liability shift details.
 * @property {boolean} threeDSecureInfo.liabilityShiftPossible Indicates whether the card was eligible for 3D Secure.
 * @property {boolean} threeDSecureInfo.liabilityShifted Indicates whether the liability for fraud has been shifted away from the merchant.
 * @property {object} paymentMethod A {@link ThreeDSecure~verifyPayload|verifyPayload} object.
 * @property {object} lookup Details about the 3D Secure lookup.
 * @property {string} lookup.threeDSecureVersion The version of 3D Secure that will be used for the 3D Secure challenge.
*/

/**
 * @typedef {object} ThreeDSecure~billingAddress
 * @property {string} [givenName] The first name associated with the billing address.
 * @property {string} [surname] The last name associated with the billing address.
 * @property {string} [phoneNumber] The phone number associated with the billing address. Only numbers; remove dashes, paranthesis and other characters.
 * @property {string} [streetAddress] Line 1 of the billing address (eg. number, street, etc).
 * @property {string} [extendedAddress] Line 2 of the billing address (eg. suite, apt #, etc.).
 * @property {string} [line3] Line 3 of the billing address if needed (eg. suite, apt #, etc).
 * @property {string} [locality] The locality (city) name associated with the billing address.
 * @property {string} [region] The 2 letter code for US states, and the equivalent for other countries.
 * @property {string} [postalCode] The zip code or equivalent for countries that have them.
 * @property {string} [countryCodeAlpha2] The 2 character country code.
*/

/**
 * @typedef {object} ThreeDSecure~additionalInformation
 * @property {string} [workPhoneNumber] The work phone number used for verification. Only numbers; remove dashes, parenthesis and other characters.
 * @property {string} [shippingGivenName] The first name associated with the shipping address.
 * @property {string} [shippingSurname] The last name associated with the shipping address.
 * @property {object} [shippingAddress]
 * @property {string} [shippingAddress.streetAddress] The first name associated with the shipping address.
 * @property {string} [shippingAddress.extendedAddress] The last name associated with the shipping address.
 * @property {string} [shippingAddress.line3] Line 3 of the shipping address if needed (eg. suite, apt #, etc).
 * @property {string} [shippingAddress.locality] The locality (city) name associated with the shipping address.
 * @property {string} [shippingAddress.region] The 2 letter code for US states, and the equivalent for other countries.
 * @property {string} [shippingAddress.postalCode] The zip code or equivalent for countries that have them.
 * @property {string} [shippingAddress.countryCodeAlpha2] The 2 character country code.
 * @property {string} [shippingPhone] The phone number associated with the shipping address. Only numbers; remove dashes, parenthesis and other characters.
 * @property {string} [shippingMethod] The 2-digit string indicating the name of the shipping method chosen for the transaction. Possible values:
 * - `01` Same Day
 * - `02` Overnight / Expedited
 * - `03` Priority (2-3 Days)
 * - `04` Ground
 * - `05` Electronic Delivery
 * - `06` Ship to Store
 * @property {string} [shippingMethodIndicator] The 2-digit string indicating the shipping method chosen for the transaction Possible values.
 * - `01` Ship to cardholder billing address
 * - `02` Ship to another verified address on file with merchant
 * - `03` Ship to address that is different than billing address
 * - `04` Ship to store (store address should be populated on request)
 * - `05` Digital goods
 * - `06` Travel and event tickets, not shipped
 * - `07` Other
 * @property {string} [productCode] The 3-letter string representing the merchant product code. Possible values:
 * - `AIR` Airline
 * - `GEN` General Retail
 * - `DIG` Digital Goods
 * - `SVC` Services
 * - `RES` Restaurant
 * - `TRA` Travel
 * - `DSP` Cash Dispensing
 * - `REN` Car Rental
 * - `GAS` Fueld
 * - `LUX` Luxury Retail
 * - `ACC` Accommodation Retail
 * - `TBD` Other
 * @property {string} [deliveryTimeframe] The 2-digit number indicating the delivery timeframe. Possible values:
 * - `01` Electronic delivery
 * - `02` Same day shipping
 * - `03` Overnight shipping
 * - `04` Two or more day shipping
 * @property {string} [deliveryEmail] For electronic delivery, email address to which the merchandise was delivered.
 * @property {string} [reorderindicator] The 2-digit number indicating whether the cardholder is reordering previously purchased merchandise. possible values:
 * - `01` First time ordered
 * - `02` Reordered
 * @property {string} [preorderIndicator] The 2-digit number indicating whether cardholder is placing an order with a future availability or release date. possible values:
 * - `01` Merchandise available
 * - `02` Future availability
 * @property {string} [preorderDate] The 8-digit number (format: YYYYMMDD) indicating expected date that a pre-ordered purchase will be available.
 * @property {string} [giftCardAmount] The purchase amount total for prepaid gift cards in major units.
 * @property {string} [giftCardCurrencyCode] ISO 4217 currency code for the gift card purchased.
 * @property {string} [giftCardCount] Total count of individual prepaid gift cards purchased.
 * @property {string} [accountAgeIndicator] The 2-digit value representing the length of time cardholder has had account. Possible values:
 * - `01` No Account
 * - `02` Created during transaction
 * - `03` Less than 30 days
 * - `04` 30-60 days
 * - `05` More than 60 days
 * @property {string} [accountCreateDate] The 8-digit number (format: YYYYMMDD) indicating the date the cardholder opened the account.
 * @property {string} [accountChangeIndicator] The 2-digit value representing the length of time since the last change to the cardholder account. This includes shipping address, new payment account or new user added. Possible values:
 * - `01` Changed during transaction
 * - `02` Less than 30 days
 * - `03` 30-60 days
 * - `04` More than 60 days
 * @property {string} [accountChangeDate] The 8-digit number (format: YYYYMMDD) indicating the date the cardholder's account was last changed. This includes changes to the billing or shipping address, new payment accounts or new users added.
 * @property {string} [accountPwdChangeIndicator] The 2-digit value representing the length of time since the cardholder changed or reset the password on the account. Possible values:
 * - `01` No change
 * - `02` Changed during transaction
 * - `03` Less than 30 days
 * - `04` 30-60 days
 * - `05` More than 60 days
 * @property {string} [accountPwdChangeDate] The 8-digit number (format: YYYYMMDD) indicating the date the cardholder last changed or reset password on account.
 * @property {string} [shippingAddressUsageIndicator] The 2-digit value indicating when the shipping address used for transaction was first used. Possible values:
 * - `01` This transaction
 * - `02` Less than 30 days
 * - `03` 30-60 days
 * - `04` More than 60 days
 * @property {string} [shippingAddressUsageDate] The 8-digit number (format: YYYYMMDD) indicating the date when the shipping address used for this transaction was first used.
 * @property {string} [transactionCountDay] Number of transactions (successful or abandoned) for this cardholder account within the last 24 hours.
 * @property {string} [transactionCountYear] Number of transactions (successful or abandoned) for this cardholder account within the last year.
 * @property {string} [addCardAttempts] Number of add card attempts in the last 24 hours.
 * @property {string} [accountPurchases] Number of purchases with this cardholder account during the previous six months.
 * @property {string} [fraudActivity] The 2-digit value indicating whether the merchant experienced suspicious activity (including previous fraud) on the account. Possible values:
 * - `01` No suspicious activity
 * - `02` Suspicious activity observed
 * @property {string} [shippingNameIndicator] The 2-digit value indicating if the cardholder name on the account is identical to the shipping name used for the transaction. Possible values:
 * - `01` Account and shipping name identical
 * - `02` Account and shipping name differ
 * @property {string} [paymentAccountIndicator] The 2-digit value indicating the length of time that the payment account was enrolled in the merchant account. Possible values:
 * - `01` No account (guest checkout)
 * - `02` During the transaction
 * - `03` Less than 30 days
 * - `04` 30-60 days
 * - `05` More than 60 days
 * @property {string} [paymentAccountAge] The 8-digit number (format: YYYYMMDD) indicating the date the payment account was added to the cardholder account.
 * @property {string} [acsWindowSize] The 2-digit number to set the challenge window size to display to the end cardholder.  The ACS will reply with content that is formatted appropriately to this window size to allow for the best user experience.  The sizes are width x height in pixels of the window displayed in the cardholder browser window. Possible values:
 * - `01` 250x400
 * - `02` 390x400
 * - `03` 500x600
 * - `04` 600x400
 * - `05` Full page
 * @property {string} [sdkMaxTimeout] The 2-digit number of minutes (minimum 05) to set the maximum amount of time for all 3DS 2.0 messages to be communicated between all components.
 * @property {string} [addressMatch] The 1-character value (Y/N) indicating whether cardholder billing and shipping addresses match.
 * @property {string} [accountId] Additional cardholder account information.
 * @property {string} [ipAddress] The IP address of the consumer. IPv4 and IPv6 are supported.
 * @property {string} [orderDescription] Brief description of items purchased.
 * @property {string} [taxAmount] Unformatted tax amount without any decimalization (ie. $123.67 = 12367).
 * @property {string} [userAgent] The exact content of the HTTP user agent header.
 * @property {string} [authenticationIndicator] The 2-digit number indicating the type of authentication request. This field is required if a recurring or installment transaction request. Possible values:
 *  - `02` Recurring
 *  - `03` Installment
 * @property {string} [installment] An integer value greater than 1 indicating the maximum number of permitted authorizations for installment payments. Required for recurring and installement transaction requests.
 * @property {string} [purchaseDate] The 14-digit number (format: YYYYMMDDHHMMSS) indicating the date in UTC of original purchase. Required for recurring and installement transaction requests.
 * @property {string} [recurringEnd] The 8-digit number (format: YYYYMMDD) indicating the date after which no further recurring authorizations should be performed. Required for recurring and installement transaction requests.
 * @property {string} [recurringFrequency] Integer value indicating the minimum number of days between recurring authorizations. A frequency of monthly is indicated by the value 28. Multiple of 28 days will be used to indicate months (ex. 6 months = 168). Required for recurring and installement transaction requests.
 */

/**
 * @class
 * @param {object} options 3D Secure {@link module:braintree-web/three-d-secure.create create} options
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/three-d-secure.create|braintree.threeDSecure.create} instead.</strong>
 * @classdesc This class represents a ThreeDSecure component produced by {@link module:braintree-web/three-d-secure.create|braintree.threeDSecure.create}. Instances of this class have a method for launching a 3D Secure authentication flow.
 *
 * **Note**: 3D Secure 2.0 is documented below and will become the default integration method in a future version of Braintree-web. Until then, version 1.0 will continue to be supported. To view 3D Secure 1.0 documentation, look at Braintree-web documentation from version [3.40.0](https://braintree.github.io/braintree-web/3.40.0/ThreeDSecure.html) and earlier, or upgrade your integration by referring to the [3D Secure 2.0 adoption guide](https://developers.braintreepayments.com/guides/3d-secure/migration/javascript/v3).
 */
function ThreeDSecure(options) {
  this._options = options;
  this._assetsUrl = options.client.getConfiguration().gatewayConfiguration.assetsUrl + '/web/' + VERSION;
  this._isDebug = options.client.getConfiguration().isDebug;
  this._client = options.client;
  this._clientMetadata = {
    sdkVersion: PLATFORM + '/' + VERSION,
    requestedThreeDSecureVersion: this._usesSongbirdFlow() ? '2' : '1'
  };
}

/**
 * Launch the 3D Secure login flow, returning a nonce payload.
 *
 * @public
 * @param {object} options Options for card verification.
 * @param {string} options.nonce The nonce representing the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.nonce`.
 * @param {string} options.bin The numeric Bank Identification Number (bin) of the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.details.bin`.
 * @param {string} options.amount The amount of the transaction in the current merchant account's currency. For example, if you are running a transaction of $123.45 US dollars, `amount` would be 123.45.
 * @param {boolean} [options.challengeRequested] If set to true, an authentication challenge will be forced if possible.
 * @param {boolean} [options.exemptionRequested] If set to true, an exemption to the authentication challenge will be requested.
 * @param {function} options.onLookupComplete Function to execute when lookup completes. The first argument, `data`, is a {@link ThreeDSecure~verificationData|verificationData} object, and the second argument, `next`, is a callback. `next` must be called to continue.
 * @param {string} [options.email] The email used for verification.
 * @param {string} [options.mobilePhoneNumber] The mobile phone number used for verification. Only numbers; remove dashes, paranthesis and other characters.
 * @param {object} [options.billingAddress] An {@link ThreeDSecure~billingAddress|billingAddress} object for verification.
 * @param {object} [options.additionalInformation] An {@link ThreeDSecure~additionalInformation|additionalInformation} object for verification.
 * @param {object} [options.customer] **Deprecated** Customer information for use in 3DS 1.0 verifications. Can contain any subset of a {@link ThreeDSecure~verifyCardCustomerObject|verifyCardCustomerObject}. Only to be used for 3DS 1.0 integrations.
 * @param {callback} options.addFrame **Deprecated** This {@link ThreeDSecure~addFrameCallback|addFrameCallback} will be called when the bank frame needs to be added to your page. Only to be used for 3DS 1.0 integrations.
 * @param {callback} options.removeFrame **Deprecated** For use in 3DS 1.0 Flows. This {@link ThreeDSecure~removeFrameCallback|removeFrameCallback} will be called when the bank frame needs to be removed from your page. Only to be used in 3DS 1.0 integrations.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link ThreeDSecure~verifyPayload|verifyPayload}. If no callback is provided, it will return a promise that resolves {@link ThreeDSecure~verifyPayload|verifyPayload}.

 * @returns {Promise|void} Returns a promise if no callback is provided.
 * @example
 * <caption>Verifying a payment method nonce with 3DS 2.0</caption>
 * var my3DSContainer;
 *
 * threeDSecure.verifyCard({
 *   amount: '123.45',
 *   nonce: hostedFieldsTokenizationPayload.nonce,
 *   bin: hostedFieldsTokenizationPayload.details.bin,
 *   email: 'test@example.com'
 *   billingAddress: {
 *     givenName: 'Jill',
 *     surname: 'Doe',
 *     phoneNumber: '8101234567',
 *     streetAddress: '555 Smith St.',
 *     extendedAddress: '#5',
 *     locality: 'Oakland',
 *     region: 'CA',
 *     postalCode: '12345',
 *     countryCodeAlpha2: 'US'
 *   },
 *   additionalInformation: {
 *     workPhoneNumber: '5555555555',
 *     shippingGivenName: 'Jill',
 *     shippingSurname: 'Doe',
 *     shippingAddress: {
 *       streetAddress: '555 Smith st',
 *       extendedAddress: '#5',
 *       locality: 'Oakland',
 *       region: 'CA',
 *       postalCode: '12345',
 *       countryCodeAlpha2: 'US'
 *     }
 *     shippingPhone: '8101234567'
 *   },
 *   onLookupComplete: function (data, next) {
 *     // use `data` here, then call `next()`
 *     next();
 *   }
 * }, function (err, payload) {
 *   if (err) {
 *     console.error(err);
 *     return;
 *   }
 *
 *   if (payload.liabilityShifted) {
 *     // Liablity has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liablity may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liablity has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 * <caption>Handling 3DS lookup errors</caption>
 * var my3DSContainer;
 *
 * threeDSecure.verifyCard({
 *   amount: '123.45',
 *   nonce: hostedFieldsTokenizationPayload.nonce,
 *   bin: hostedFieldsTokenizationPayload.details.bin,
 *   email: 'test@example.com'
 *   billingAddress: billingAddressFromCustomer,,
 *   additionalInformation: additionalInfoFromCustomer,,
 *   onLookupComplete: function (data, next) {
 *     // use `data` here, then call `next()`
 *     next();
 *   }
 * }, function (err, payload) {
 *   if (err) {
 *     if (err.code.indexOf('THREEDS_LOOKUP') === 0) {
 *       // an error occurred during the initial lookup request
 *
 *       if (err.code === 'THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR') {
 *         // either the passed payment method nonce does not exist
 *         // or it was already consumed before the lookup call was made
 *       } else if (err.code.indexOf('THREEDS_LOOKUP_VALIDATION') === 0) {
 *         // a validation error occurred
 *         // likely some non-ascii characters were included in the billing
 *         // address given name or surname fields, or the cardholdername field
 *
 *         // Instruct your user to check their data and try again
 *       } else {
 *         // an unknown lookup error occurred
 *       }
 *     } else {
 *       // some other kind of error
 *     }
 *     return;
 *   }
 *
 *   // handle success
 * });
 * @example
 * <caption>Deprecated: Verifying an existing nonce with 3DS 1.0</caption>
 * var my3DSContainer;
 *
 * threeDSecure.verifyCard({
 *   nonce: existingNonce,
 *   amount: 123.45,
 *   addFrame: function (err, iframe) {
 *     // Set up your UI and add the iframe.
 *     my3DSContainer = document.createElement('div');
 *     my3DSContainer.appendChild(iframe);
 *     document.body.appendChild(my3DSContainer);
 *   },
 *   removeFrame: function () {
 *     // Remove UI that you added in addFrame.
 *     document.body.removeChild(my3DSContainer);
 *   }
 * }, function (err, payload) {
 *   if (err) {
 *     console.error(err);
 *     return;
 *   }
 *
 *   if (payload.liabilityShifted) {
 *     // Liablity has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liablity may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liablity has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 */
ThreeDSecure.prototype.verifyCard = function (options) {
  var data,
    showLoader,
    addFrame,
    removeFrame,
    onLookupComplete,
    error,
    nonce;
  var promise = Promise.resolve();
  var additionalInformation = options.additionalInformation || {};
  var self = this;

  options = assign({}, options);

  error = this._checkForVerifyCardError(options);

  if (error) {
    return Promise.reject(error);
  }

  showLoader = options.showLoader !== false;

  this._verifyCardInProgress = true;

  data = {
    amount: options.amount
  };

  nonce = options.nonce;

  if (this._usesSongbirdFlow()) {
    onLookupComplete = deferred(options.onLookupComplete);
    additionalInformation = this._transformBillingAddress(additionalInformation, options.billingAddress);
    additionalInformation = this._transformShippingAddress(additionalInformation);
    if (options.email) {
      additionalInformation.email = options.email;
    }
    if (options.mobilePhoneNumber) {
      additionalInformation.mobilePhoneNumber = options.mobilePhoneNumber;
    }

    data.additionalInfo = additionalInformation;

    if (options.challengeRequested) {
      data.challengeRequested = options.challengeRequested;
    }
    if (options.exemptionRequested) {
      data.exemptionRequested = options.exemptionRequested;
    }

    if (options.bin) {
      data.bin = options.bin;
    }

    promise = this._prepareRawLookup(data).then(function (transformedData) {
      data = transformedData;
    });
  } else {
    addFrame = deferred(options.addFrame);
    removeFrame = deferred(options.removeFrame);
    if (options.customer && options.customer.billingAddress) {
      options.customer = this._transformV1CustomerBillingAddress(options.customer);
      data.customer = options.customer;
    }
  }

  analytics.sendEvent(this._options.client, 'three-d-secure.verification-flow.started');

  return promise.then(function () {
    var url = 'payment_methods/' + nonce + '/three_d_secure/lookup';

    return self._client.request({
      endpoint: url,
      method: 'post',
      data: data
    }).catch(function (err) {
      var status = err && err.details && err.details.httpStatus;
      var analyticsMessage = 'three-d-secure.verification-flow.lookup-failed';
      var lookupError;

      if (status === 404) {
        lookupError = errors.THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR;
        analyticsMessage += '.404';
      } else if (status === 422) {
        lookupError = errors.THREEDS_LOOKUP_VALIDATION_ERROR;
        analyticsMessage += '.422';
      } else {
        lookupError = errors.THREEDS_LOOKUP_ERROR;
      }

      analytics.sendEvent(self._options.client, analyticsMessage);

      return Promise.reject(new BraintreeError({
        type: lookupError.type,
        code: lookupError.code,
        message: lookupError.message,
        details: {
          originalError: err
        }
      }));
    });
  }).then(function (response) {
    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.3ds-version.' + response.lookup.threeDSecureVersion);

    return self._initializeChallengeWithLookupResponse(response, {
      showLoader: showLoader,
      addFrame: addFrame,
      removeFrame: removeFrame,
      onLookupComplete: onLookupComplete
    });
  }).then(function (payload) {
    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.completed');

    return payload;
  }).catch(function (err) {
    self._verifyCardInProgress = false;

    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.failed');

    return Promise.reject(err);
  });
};

ThreeDSecure.prototype._checkForVerifyCardError = function (options) {
  var errorOption;

  if (this._verifyCardBlockingError) {
    return this._verifyCardBlockingError;
  } else if (this._verifyCardInProgress === true) {
    return new BraintreeError(errors.THREEDS_AUTHENTICATION_IN_PROGRESS);
  } else if (!options.nonce) {
    errorOption = 'a nonce';
  } else if (!options.amount) {
    errorOption = 'an amount';
  }

  if (!errorOption) {
    if (this._usesSongbirdFlow()) {
      if (typeof options.onLookupComplete !== 'function') {
        errorOption = 'an onLookupComplete function';
      }
    } else if (typeof options.addFrame !== 'function') {
      errorOption = 'an addFrame function';
    } else if (typeof options.removeFrame !== 'function') {
      errorOption = 'a removeFrame function';
    }
  }

  if (errorOption) {
    return new BraintreeError({
      type: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.type,
      code: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.code,
      message: 'verifyCard options must include ' + errorOption + '.'
    });
  }

  return null;
};

/* eslint-disable-next-line valid-jsdoc */
/**
 * Launch the iframe challenge using a 3D Secure lookup response from a server side lookup.
 *
 * @public
 * @param {object} lookupResponse The lookup response from the server side call to lookup the 3D Secure information.
 * @returns {Promise} Returns a promise.
 * @example
 * var my3DSContainer;
 *
 * threeDSecure.initializeChallengeWithLookupResponse(lookupResponseFromServer).then(function (payload) {
 *   if (payload.liabilityShifted) {
 *     // Liablity has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liablity may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liablity has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 */
ThreeDSecure.prototype.initializeChallengeWithLookupResponse = function (lookupResponse) {
  return this._initializeChallengeWithLookupResponse(lookupResponse);
};

// private version of the public method that allows additional options to be passed
ThreeDSecure.prototype._initializeChallengeWithLookupResponse = function (lookupResponse, options) {
  var self = this;

  options = options || {};

  this._lookupPaymentMethod = lookupResponse.paymentMethod;

  return new Promise(function (resolve, reject) {
    self._verifyCardCallback = function (verifyErr, payload) {
      self._verifyCardInProgress = false;

      if (verifyErr) {
        reject(verifyErr);
      } else {
        analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.liability-shifted.' + String(payload.liabilityShifted));
        analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.liability-shift-possible.' + String(payload.liabilityShiftPossible));

        resolve(payload);
      }
    };
    self._handleLookupResponse({
      showLoader: options.showLoader,
      lookupResponse: lookupResponse,
      addFrame: options.addFrame,
      removeFrame: options.removeFrame,
      onLookupComplete: options.onLookupComplete
    });
  });
};

/**
 * Gather the data needed for a 3D Secure lookup call.
 *
 * @public
 * @param {object} options Options for 3D Secure lookup.
 * @param {string} options.nonce The nonce representing the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.nonce`.
 * @param {string} [options.bin] The numeric Bank Identification Number (bin) of the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.details.bin`. Though not required to start the verification, it is required to receive a 3DS 2.0 lookup response.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link ThreeDSecure~prepareLookupPayload|prepareLookupPayload}. If no callback is provided, it will return a promise that resolves {@link ThreeDSecure~prepareLookupPayload|prepareLookupPayload}.

 * @returns {Promise|void} Returns a promise if no callback is provided.
 * @example
 * <caption>Preparing data for a 3D Secure lookup</caption>
 * threeDSecure.prepareLookup({
 *   nonce: hostedFieldsTokenizationPayload.nonce,
 *   bin: hostedFieldsTokenizationPayload.details.bin
 * }, function (err, payload) {
 *   if (err) {
 *     console.error(err);
 *     return;
 *   }
 *
 *   // send payload to server to do server side lookup
 * });
 */
ThreeDSecure.prototype.prepareLookup = function (options) {
  return this._prepareRawLookup(options).then(function (result) {
    return JSON.stringify(result);
  });
};

ThreeDSecure.prototype._prepareRawLookup = function (options) {
  var data = assign({}, options);
  var self = this;

  return this._getDfReferenceId().then(function (id) {
    data.dfReferenceId = id;
  }).then(function () {
    return self._triggerCardinalBinProcess(options.bin);
  }).catch(function () {
    // catch and ignore errors from looking up
    // df reference and Cardinal bin process
  }).then(function () {
    data.clientMetadata = self._clientMetadata;
    data.authorizationFingerprint = self._client.getConfiguration().authorizationFingerprint;
    data.braintreeLibraryVersion = 'braintree/web/' + VERSION;

    return data;
  });
};

ThreeDSecure.prototype._triggerCardinalBinProcess = function (bin) {
  var self = this;
  var issuerStartTime = Date.now();

  if (!bin) {
    // skip bin lookup because bin wasn't passed in
    return Promise.resolve();
  }

  return global.Cardinal.trigger('bin.process', bin).then(function (binResults) {
    self._clientMetadata.issuerDeviceDataCollectionTimeElapsed = Date.now() - issuerStartTime;
    self._clientMetadata.issuerDeviceDataCollectionResult = binResults && binResults.Status;
  });
};

/**
 * Cancel the 3DS flow and return the verification payload if available. If using 3D Secure version 2, this will not close the UI of the authentication modal. It is recommended that this method only be used in the `onLookupComplete` callback.
 * @public
 * @param {callback} [callback] The second argument is a {@link ThreeDSecure~verifyPayload|verifyPayload}. If there is no verifyPayload (the initial lookup did not complete), an error will be returned. If no callback is passed, `cancelVerifyCard` will return a promise.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 * @example <caption>Cancel the verification in onLookupComplete</caption>
 * threeDSecure.verifyCard({
 *   amount: '100.00',
 *   nonce: nonceFromTokenizationPayload,
 *   bin: binFromTokenizationPayload,
 *   // other fields such as billing address
 *   onLookupComplete: function (data, next) {
 *     // determine if you want to call next to start the challenge,
 *     // if not, call cancelVerifyCard
 *     threeDSecure.cancelVerifyCard(function (err, verifyPayload) {
 *       if (err) {
 *         // Handle error
 *         console.log(err.message); // No verification payload available
 *         return;
 *       }
 *
 *       verifyPayload.nonce; // The nonce returned from the 3ds lookup call
 *       verifyPayload.liabilityShifted; // boolean
 *       verifyPayload.liabilityShiftPossible; // boolean
 *     });
 *   }
 * }, function (verifyError, payload) {
 *   if (verifyError) {
 *     if (verifyError.code === 'THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT ') {
 *       // flow was cancelled by merchant, 3ds info can be found in the payload
 *       // for cancelVerifyCard
 *     }
 *   }
 * });
 * @example <caption>Cancel the verification in 3D Secure version 1</caption>
 * // unlike with v2, this will not cause `verifyCard` to error, it will simply
 * // never call the callback
 * threeDSecure.cancelVerifyCard(function (err, verifyPayload) {
 *   if (err) {
 *     // Handle error
 *     console.log(err.message); // No verification payload available
 *     return;
 *   }
 *
 *   verifyPayload.nonce; // The nonce returned from the 3ds lookup call
 *   verifyPayload.liabilityShifted; // boolean
 *   verifyPayload.liabilityShiftPossible; // boolean
 * });
 */
ThreeDSecure.prototype.cancelVerifyCard = function () {
  var response;

  this._verifyCardInProgress = false;

  if (!this._lookupPaymentMethod) {
    return Promise.reject(new BraintreeError(errors.THREEDS_NO_VERIFICATION_PAYLOAD));
  }

  response = assign({}, this._lookupPaymentMethod, {
    liabilityShiftPossible: this._lookupPaymentMethod.threeDSecureInfo.liabilityShiftPossible,
    liabilityShifted: this._lookupPaymentMethod.threeDSecureInfo.liabilityShifted,
    verificationDetails: this._lookupPaymentMethod.threeDSecureInfo.verificationDetails
  });

  if (this._usesSongbirdFlow() && this._verifyCardCallback) {
    this._verifyCardCallback(new BraintreeError(errors.THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT));
  }

  return Promise.resolve(response);
};

ThreeDSecure.prototype._handleLookupResponse = function (options) {
  var details;
  var self = this;
  var lookupResponse = options.lookupResponse;

  options.onLookupComplete = options.onLookupComplete || function (data, next) {
    next();
  };

  options.onLookupComplete(lookupResponse, function () {
    var challengePresented = Boolean(lookupResponse.lookup && lookupResponse.lookup.acsUrl);

    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.challenge-presented.' + String(challengePresented));

    if (challengePresented) {
      if (self._usesSongbirdFlow()) {
        // set up listener for ref id to call out to bt before calling verify callback
        global.Cardinal.continue('cca',
          {
            AcsUrl: lookupResponse.lookup.acsUrl,
            Payload: lookupResponse.lookup.pareq
          },
          {
            OrderDetails: {TransactionId: lookupResponse.lookup.transactionId}
          }
        );
      } else {
        // fallback to old iframe flow:
        options.addFrame(null, self._createIframe({
          showLoader: options.showLoader,
          response: lookupResponse.lookup,
          removeFrame: options.removeFrame
        }));
      }
    } else {
      details = self._formatAuthResponse(lookupResponse.paymentMethod, lookupResponse.threeDSecureInfo);
      details.verificationDetails = lookupResponse.threeDSecureInfo;

      self._verifyCardCallback(null, details);
    }
  });
};

ThreeDSecure.prototype._transformV1CustomerBillingAddress = function (customer) {
  customer.billingAddress.line1 = customer.billingAddress.streetAddress;
  customer.billingAddress.line2 = customer.billingAddress.extendedAddress;
  customer.billingAddress.city = customer.billingAddress.locality;
  customer.billingAddress.state = customer.billingAddress.region;
  customer.billingAddress.countryCode = customer.billingAddress.countryCodeAlpha2;
  delete customer.billingAddress.streetAddress;
  delete customer.billingAddress.extendedAddress;
  delete customer.billingAddress.locality;
  delete customer.billingAddress.region;
  delete customer.billingAddress.countryCodeAlpha2;

  return customer;
};

ThreeDSecure.prototype._transformBillingAddress = function (additionalInformation, billingAddress) {
  if (billingAddress) {
    // map from public API to the API that the Gateway expects
    additionalInformation.billingLine1 = billingAddress.streetAddress;
    additionalInformation.billingLine2 = billingAddress.extendedAddress;
    additionalInformation.billingLine3 = billingAddress.line3;
    additionalInformation.billingCity = billingAddress.locality;
    additionalInformation.billingState = billingAddress.region;
    additionalInformation.billingPostalCode = billingAddress.postalCode;
    additionalInformation.billingCountryCode = billingAddress.countryCodeAlpha2;
    additionalInformation.billingPhoneNumber = billingAddress.phoneNumber;
    additionalInformation.billingGivenName = billingAddress.givenName;
    additionalInformation.billingSurname = billingAddress.surname;
  }

  return additionalInformation;
};

ThreeDSecure.prototype._transformShippingAddress = function (additionalInformation) {
  var shippingAddress = additionalInformation.shippingAddress;

  if (shippingAddress) {
    // map from public API to the API that the Gateway expects
    additionalInformation.shippingLine1 = shippingAddress.streetAddress;
    additionalInformation.shippingLine2 = shippingAddress.extendedAddress;
    additionalInformation.shippingLine3 = shippingAddress.line3;
    additionalInformation.shippingCity = shippingAddress.locality;
    additionalInformation.shippingState = shippingAddress.region;
    additionalInformation.shippingPostalCode = shippingAddress.postalCode;
    additionalInformation.shippingCountryCode = shippingAddress.countryCodeAlpha2;

    delete additionalInformation.shippingAddress;
  }

  return additionalInformation;
};

ThreeDSecure.prototype._createIframe = function (options) {
  var url,
    authenticationCompleteBaseUrl;
  var parentURL = window.location.href;
  var response = options.response;

  this._bus = new Bus({
    channel: uuid(),
    merchantUrl: location.href
  });

  authenticationCompleteBaseUrl = this._assetsUrl + '/html/three-d-secure-authentication-complete-frame.html?channel=' + encodeURIComponent(this._bus.channel) + '&';

  if (parentURL.indexOf('#') > -1) {
    parentURL = parentURL.split('#')[0];
  }

  this._bus.on(Bus.events.CONFIGURATION_REQUEST, function (reply) {
    reply({
      acsUrl: response.acsUrl,
      pareq: response.pareq,
      termUrl: response.termUrl + '&three_d_secure_version=' + VERSION + '&authentication_complete_base_url=' + encodeURIComponent(authenticationCompleteBaseUrl),
      md: response.md,
      parentUrl: parentURL
    });
  });

  this._bus.on(events.AUTHENTICATION_COMPLETE, function (data) {
    this._handleAuthResponse(data, options);
  }.bind(this));

  url = this._assetsUrl + '/html/three-d-secure-bank-frame' + useMin(this._isDebug) + '.html?showLoader=' + options.showLoader;

  this._bankIframe = iFramer({
    src: url,
    height: IFRAME_HEIGHT,
    width: IFRAME_WIDTH,
    name: constants.LANDING_FRAME_NAME + '_' + this._bus.channel,
    title: '3D Secure Authorization Frame'
  });

  return this._bankIframe;
};

ThreeDSecure.prototype._handleAuthResponse = function (data, options) {
  var authResponse = JSON.parse(data.auth_response);

  this._bus.teardown();

  options.removeFrame();

  // This also has to be in a setTimeout so it executes after the `removeFrame`.
  deferred(function () {
    if (authResponse.success) {
      this._verifyCardCallback(null, this._formatAuthResponse(authResponse.paymentMethod, authResponse.threeDSecureInfo));
    } else if (authResponse.threeDSecureInfo && authResponse.threeDSecureInfo.liabilityShiftPossible) {
      this._verifyCardCallback(null, this._formatAuthResponse(this._lookupPaymentMethod, authResponse.threeDSecureInfo));
    } else {
      this._verifyCardCallback(new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'UNKNOWN_AUTH_RESPONSE',
        message: authResponse.error.message
      }));
    }
  }.bind(this))();
};

ThreeDSecure.prototype._formatAuthResponse = function (paymentMethod, threeDSecureInfo) {
  return {
    nonce: paymentMethod.nonce,
    binData: paymentMethod.binData,
    details: paymentMethod.details,
    description: paymentMethod.description && paymentMethod.description.replace(/\+/g, ' '),
    liabilityShifted: threeDSecureInfo && threeDSecureInfo.liabilityShifted,
    liabilityShiftPossible: threeDSecureInfo && threeDSecureInfo.liabilityShiftPossible,
    threeDSecureInfo: paymentMethod.threeDSecureInfo
  };
};

/**
 * Cleanly remove anything set up by {@link module:braintree-web/three-d-secure.create|create}.
 * @public
 * @param {callback} [callback] Called on completion. If no callback is passed, `teardown` will return a promise.
 * @example
 * threeDSecure.teardown();
 * @example <caption>With callback</caption>
 * threeDSecure.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
ThreeDSecure.prototype.teardown = function () {
  convertMethodsToError(this, methods(ThreeDSecure.prototype));

  analytics.sendEvent(this._options.client, 'three-d-secure.teardown-completed');

  if (this._bus) {
    this._bus.teardown();
  }

  if (this._bankIframe && this._bankIframe.parentNode) {
    this._bankIframe.parentNode.removeChild(this._bankIframe);
  }

  if (global.Cardinal) {
    global.Cardinal.off('payments.setupComplete');
    global.Cardinal.off('payments.validated');
  }

  return Promise.resolve();
};

ThreeDSecure.prototype._usesSongbirdFlow = function () {
  return this._options.version === 2;
};

ThreeDSecure.prototype._createPaymentsSetupCompleteCallback = function (resolve, timeoutReference) {
  var self = this;

  return function (data) {
    if (self._getDfReferenceIdResolveFunction) {
      self._getDfReferenceIdResolveFunction(data.sessionId);
    } else {
      self._getDfReferenceIdPromise = Promise.resolve(data.sessionId);
    }

    global.clearTimeout(timeoutReference);
    analytics.sendEvent(self._client, 'three-d-secure.cardinal-sdk.init.setup-completed');
    resolve();
  };
};

ThreeDSecure.prototype._createPaymentsValidatedCallback = function () {
  var self = this;

  /**
   * @param {object} data Response Data
   * @see {@link https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/98315/Response+Objects#ResponseObjects-ObjectDefinition}
   * @param {string} data.ActionCode The resulting state of the transaction.
   * @param {boolean} data.Validated Represents whether transaction was successfully or not.
   * @param {number} data.ErrorNumber A non-zero value represents the error encountered while attempting the process the message request.
   * @param {string} data.ErrorDescription Application error description for the associated error number.
   * @param {string} validatedJwt Response JWT
   * @returns {void}
   * */
  return function (data, validatedJwt) {
    var formattedError = '';

    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.cardinal-sdk.action-code.' + data.ActionCode.toLowerCase());

    switch (data.ActionCode) {
      // Handle these scenarios based on liability shift information in the response.
      case 'SUCCESS':
      case 'NOACTION':
      case 'FAILURE':
        self._performJWTValidation(validatedJwt).then(function (payload) {
          self._verifyCardCallback(null, payload);
        }).catch(function (err) {
          self._verifyCardCallback(err);
        });
        break;

      case 'ERROR':
        switch (data.ErrorNumber) {
          case 10001:
          case 10002:
            formattedError = new BraintreeError(errors.THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT);
            break;
          case 10003:
          case 10007:
          case 10009:
            formattedError = new BraintreeError(errors.THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT);
            break;
          case 10005:
          case 10006:
            formattedError = new BraintreeError(errors.THREEDS_CARDINAL_SDK_BAD_CONFIG);
            break;
          case 10008:
          case 10010:
            formattedError = new BraintreeError(errors.THREEDS_CARDINAL_SDK_BAD_JWT);
            break;
          case 10011:
            analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.canceled');
            formattedError = new BraintreeError(errors.THREEDS_CARDINAL_SDK_CANCELED);
            break;
          case 10004:
          case 10012:
          default:
            formattedError = new BraintreeError(errors.THREEDS_CARDINAL_SDK_ERROR);
        }

        formattedError.details = {
          originalError: {
            code: data.ErrorNumber,
            description: data.ErrorDescription
          }
        };

        if (self._verifyCardCallback) {
          self._verifyCardCallback(formattedError, null);
        } else {
          self._verifyCardBlockingError = formattedError;
        }
        break;

      default:
    }
  };
};

ThreeDSecure.prototype._setupSongbird = function (setupOptions) {
  var self = this;
  var scriptSource = constants.CARDINAL_SCRIPT_SOURCE.sandbox;
  var jwt = this._client.getConfiguration().gatewayConfiguration.threeDSecure.cardinalAuthenticationJWT;
  var startTime = Date.now();

  setupOptions = setupOptions || {};

  return new Promise(function (resolve, reject) {
    var timeoutReference = global.setTimeout(function () {
      analytics.sendEvent(self._client, 'three-d-secure.cardinal-sdk.init.setup-timeout');
      reject(new BraintreeError(errors.THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT));
    }, setupOptions.timeout || INTEGRATION_TIMEOUT_MS);

    if (setupOptions.isProduction) {
      scriptSource = constants.CARDINAL_SCRIPT_SOURCE.production;
    }
    assets.loadScript({src: scriptSource}).catch(function (err) {
      return Promise.reject(convertToBraintreeError(err, errors.THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED));
    }).then(function (script) {
      self._cardinalScript = script;
      global.Cardinal.on('payments.setupComplete', self._createPaymentsSetupCompleteCallback(resolve, timeoutReference));

      if (setupOptions.loggingEnabled) {
        global.Cardinal.configure({
          logging: {
            level: 'verbose'
          }
        });
      }

      global.Cardinal.setup('init', {
        jwt: jwt
      });

      self._clientMetadata.cardinalDeviceDataCollectionTimeElapsed = Date.now() - startTime;

      global.Cardinal.on('payments.validated', self._createPaymentsValidatedCallback());
    }).catch(function (err) {
      var error = convertToBraintreeError(err, {
        type: errors.THREEDS_CARDINAL_SDK_SETUP_FAILED.type,
        code: errors.THREEDS_CARDINAL_SDK_SETUP_FAILED.code,
        message: errors.THREEDS_CARDINAL_SDK_SETUP_FAILED.message
      });

      if (self._getDfReferenceIdPromise) {
        self._getDfReferenceIdRejectFunction(error);
      } else {
        self._getDfReferenceIdError = error;
      }

      global.clearTimeout(timeoutReference);
      analytics.sendEvent(self._client, 'three-d-secure.cardinal-sdk.init.setup-failed');
      reject(error);
    });
  });
};

ThreeDSecure.prototype._getDfReferenceId = function () {
  if (this._getDfReferenceIdError) {
    return Promise.reject(this._getDfReferenceIdError);
  }

  if (!this._getDfReferenceIdPromise) {
    this._getDfReferenceIdPromise = new Promise(function (resolve, reject) {
      this._getDfReferenceIdResolveFunction = resolve;
      this._getDfReferenceIdRejectFunction = reject;
    }.bind(this));
  }

  return this._getDfReferenceIdPromise;
};

ThreeDSecure.prototype._performJWTValidation = function (jwt) {
  var nonce = this._lookupPaymentMethod.nonce;
  var url = 'payment_methods/' + nonce + '/three_d_secure/authenticate_from_jwt';
  var self = this;

  analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.upgrade-payment-method.started');

  return this._client.request({
    method: 'post',
    endpoint: url,
    data: {
      jwt: jwt,
      paymentMethodNonce: nonce
    }
  }).then(function (response) {
    var paymentMethod = response.paymentMethod || self._lookupPaymentMethod;
    var formattedResponse = self._formatAuthResponse(paymentMethod, response.threeDSecureInfo);

    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.upgrade-payment-method.succeeded');

    return Promise.resolve(formattedResponse);
  }).catch(function (err) {
    var error = new BraintreeError({
      type: errors.THREEDS_JWT_AUTHENTICATION_FAILED.type,
      code: errors.THREEDS_JWT_AUTHENTICATION_FAILED.code,
      message: errors.THREEDS_JWT_AUTHENTICATION_FAILED.message,
      details: {
        originalError: err
      }
    });

    analytics.sendEvent(self._options.client, 'three-d-secure.verification-flow.upgrade-payment-method.errored');

    return Promise.reject(error);
  });
};

module.exports = wrapPromise.wrapPrototype(ThreeDSecure);
