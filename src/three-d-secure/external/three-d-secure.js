'use strict';

var wrapPromise = require('@braintree/wrap-promise');
var methods = require('../../lib/methods');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var EventEmitter = require('@braintree/event-emitter');
var FRAMEWORKS = require('./frameworks');

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
 * @property {string} [customer.mobilePhoneNumber] The mobile phone number used for verification. Only numbers; remove dashes, parenthesis and other characters.
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
 * @property {string} [customer.billingAddress.phoneNumber] The phone number associated with the address. Only numbers; remove dashes, parenthesis and other characters.
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
 * @property {boolean} requiresUserAuthentication When `true`, the user will be presented with a 3D Secure challenge when calling `next` in the {@link ThreeDSecure#event:lookup-complete|`lookup-complete` event}.
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
 * @property {string} [phoneNumber] The phone number associated with the billing address. Only numbers; remove dashes, parenthesis and other characters.
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
 * - `03` Ship to address that is different from billing address
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
 * - `GAS` Fuel
 * - `LUX` Luxury Retail
 * - `ACC` Accommodation Retail
 * - `TBD` Other
 * @property {string} [deliveryTimeframe] The 2-digit number indicating the delivery time frame. Possible values:
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
 * @property {string} [authenticationIndicator] The 2-digit number indicating the type of authentication request. Possible values:
 *  - `02` Recurring
 *  - `03` Installment
 * @property {string} [installment] An integer value greater than 1 indicating the maximum number of permitted authorizations for installment payments.
 * @property {string} [purchaseDate] The 14-digit number (format: YYYYMMDDHHMMSS) indicating the date in UTC of original purchase.
 * @property {string} [recurringEnd] The 8-digit number (format: YYYYMMDD) indicating the date after which no further recurring authorizations should be performed.
 * @property {string} [recurringFrequency] Integer value indicating the minimum number of days between recurring authorizations. A frequency of monthly is indicated by the value 28. Multiple of 28 days will be used to indicate months (ex. 6 months = 168).
 */

/**
 * @name ThreeDSecure#on
 * @function
 * @param {string} event The name of the event to which you are subscribing.
 * @param {function} handler A callback to handle the event.
 * @description Subscribes a handler function to a named event.
 * @example
 * <caption>Listening to a 3D Secure event</caption>
 * braintree.threeDSecure.create({ ... }, function (createErr, threeDSecureInstance) {
 *   threeDSecureInstance.on('lookup-complete', function (data, next) {
 *     console.log(event);
 *     next();
 *   });
 * });
 * @returns {void}
 */

/**
 * @name ThreeDSecure#off
 * @function
 * @param {string} event The name of the event to which you are unsubscribing.
 * @param {function} handler The callback for the event you are unsubscribing from.
 * @description Unsubscribes the handler function to a named event.
 * @example
 * <caption>Subscribing and then unsubscribing from a 3D Secure eld event</caption>
 * braintree.threeDSecure.create({ ... }, function (createErr, threeDSecureInstance) {
 *   var callback = function (data, next) {
 *     console.log(data);
 *     next();
 *   };
 *
 *   threeDSecureInstance.on('lookup-complete', callback);
 *
 *   // later on
 *   threeDSecureInstance.off('lookup-complete', callback);
 * });
 * @returns {void}
 */

/**
 * This event is emitted when the `2-inline-iframe` version is specified when creating the 3D Secure instance and the authentication iframe becomes available.
 * @event ThreeDSecure#authentication-iframe-available
 * @type {object}
 * @example
 * <caption>Listening for the authentication iframe to be available</caption>
 *   threeDSecureInstance.on('authentication-iframe-available', function (event, next) {
 *     document.body.appendChild(event.element); // add iframe element to page
 *
 *     next(); // let the SDK know the iframe is ready
 *   });
 * });
 */

/**
 * This event is emitted when using the 3D Secure 2.0 flow and the initial lookup request completes. If this is not used, a `onLookupComplete` callback must be passed into the `verifyCard` method.
 * @event ThreeDSecure#lookup-complete
 * @type {object}
 * @example
 * <caption>Listening for when the lookup request is complete</caption>
 * braintree.threeDSecure.create({
 *   client: clientInstance,
 *   version: '2-inline-iframe'
 * }, function (createErr, threeDSecureInstance) {
 *   threeDSecureInstance.on('lookup-complete', function (data, next) {
 *     // inspect the data
 *
 *     // call next when ready to proceed with the challenge
 *     next();
 *   });
 * });
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
  var self = this;
  var Framework = FRAMEWORKS[options.framework];

  EventEmitter.call(this);

  this._framework = new Framework(options);
  this._framework.setUpEventListeners(function () {
    self._emit.apply(self, arguments);
  });
}

EventEmitter.createChild(ThreeDSecure);

/**
 * Launch the 3D Secure login flow, returning a nonce payload.
 *
 * @public
 * @param {object} options Options for card verification.
 * @param {string} options.nonce The nonce representing the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.nonce`.
 * @param {string} options.bin The numeric Bank Identification Number (bin) of the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.details.bin`.
 * @param {string} options.amount The amount of the transaction in the current merchant account's currency. This must be expressed in numbers with an optional decimal (using `.`) and precision up to the hundredths place. For example, if you're processing a transaction for 1.234,56 € then `amount` should be `1234.56`.
 * @param {boolean} [options.challengeRequested] If set to true, an authentication challenge will be forced if possible.
 * @param {boolean} [options.exemptionRequested] If set to true, an exemption to the authentication challenge will be requested.
 * @param {function} [options.onLookupComplete] *Deprecated:* Use {@link ThreeDSecure#event:lookup-complete|`threeDSecureInstance.on('lookup-complete')`} instead. Function to execute when lookup completes. The first argument, `data`, is a {@link ThreeDSecure~verificationData|verificationData} object, and the second argument, `next`, is a callback. `next` must be called to continue.
 * @param {string} [options.email] The email used for verification.
 * @param {string} [options.mobilePhoneNumber] The mobile phone number used for verification. Only numbers; remove dashes, parenthesis and other characters.
 * @param {object} [options.billingAddress] An {@link ThreeDSecure~billingAddress|billingAddress} object for verification.
 * @param {object} [options.additionalInformation] An {@link ThreeDSecure~additionalInformation|additionalInformation} object for verification.
 * @param {object} [options.customer] **Deprecated** Customer information for use in 3DS 1.0 verifications. Can contain any subset of a {@link ThreeDSecure~verifyCardCustomerObject|verifyCardCustomerObject}. Only to be used for 3DS 1.0 integrations.
 * @param {callback} options.addFrame **Deprecated** This {@link ThreeDSecure~addFrameCallback|addFrameCallback} will be called when the bank frame needs to be added to your page. Only to be used for 3DS 1.0 integrations.
 * @param {callback} options.removeFrame **Deprecated** For use in 3DS 1.0 Flows. This {@link ThreeDSecure~removeFrameCallback|removeFrameCallback} will be called when the bank frame needs to be removed from your page. Only to be used in 3DS 1.0 integrations.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link ThreeDSecure~verifyPayload|verifyPayload}. If no callback is provided, it will return a promise that resolves {@link ThreeDSecure~verifyPayload|verifyPayload}.

 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * <caption>Verifying a payment method nonce with 3DS 2.0</caption>
 * var my3DSContainer;
 *
 * // set up listener after initialization
 * threeDSecure.on(('lookup-complete', function (data, next) {
 *   // use `data` here, then call `next()`
 *   next();
 * });
 *
 * // call verifyCard after tokenizing a card
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
 *   }
 * }, function (err, payload) {
 *   if (err) {
 *     console.error(err);
 *     return;
 *   }
 *
 *   if (payload.liabilityShifted) {
 *     // Liability has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liability may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liability has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 * <caption>Verifying a payment method nonce with 3DS 2.0 with onLookupComplete callback</caption>
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
 *     // Liability has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liability may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liability has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 * @example
 * <caption>Handling 3DS lookup errors</caption>
 * var my3DSContainer;
 *
 * // set up listener after initialization
 * threeDSecure.on(('lookup-complete', function (data, next) {
 *   // use `data` here, then call `next()`
 *   next();
 * });
 *
 * // call verifyCard after tokenizing a card
 * threeDSecure.verifyCard({
 *   amount: '123.45',
 *   nonce: hostedFieldsTokenizationPayload.nonce,
 *   bin: hostedFieldsTokenizationPayload.details.bin,
 *   email: 'test@example.com',
 *   billingAddress: billingAddressFromCustomer,
 *   additionalInformation: additionalInfoFromCustomer
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
 *     // Liability has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liability may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liability has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 */
ThreeDSecure.prototype.verifyCard = function (options) {
  var privateOptions;

  if (this.hasListener('lookup-complete')) {
    privateOptions = {
      ignoreOnLookupCompleteRequirement: true
    };
  }

  return this._framework.verifyCard(options, privateOptions);
};

/* eslint-disable-next-line valid-jsdoc */
/**
 * Launch the iframe challenge using a 3D Secure lookup response from a server side lookup.
 *
 * @public
 * @param {(object|string)} lookupResponse The lookup response from the server side call to lookup the 3D Secure information. The raw string or a parsed object can be passed.
 * @returns {Promise} Returns a promise.
 * @example
 * var my3DSContainer;
 *
 * threeDSecure.initializeChallengeWithLookupResponse(lookupResponseFromServer).then(function (payload) {
 *   if (payload.liabilityShifted) {
 *     // Liability has shifted
 *     submitNonceToServer(payload.nonce);
 *   } else if (payload.liabilityShiftPossible) {
 *     // Liability may still be shifted
 *     // Decide if you want to submit the nonce
 *   } else {
 *     // Liability has not shifted and will not shift
 *     // Decide if you want to submit the nonce
 *   }
 * });
 */
ThreeDSecure.prototype.initializeChallengeWithLookupResponse = function (lookupResponse) {
  if (typeof lookupResponse === 'string') {
    lookupResponse = JSON.parse(lookupResponse);
  }

  return this._framework.initializeChallengeWithLookupResponse(lookupResponse);
};

/**
 * Gather the data needed for a 3D Secure lookup call.
 *
 * @public
 * @param {object} options Options for 3D Secure lookup.
 * @param {string} options.nonce The nonce representing the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.nonce`.
 * @param {string} [options.bin] The numeric Bank Identification Number (bin) of the card from a tokenization payload. For example, this can be a {@link HostedFields~tokenizePayload|tokenizePayload} returned by Hosted Fields under `payload.details.bin`. Though not required to start the verification, it is required to receive a 3DS 2.0 lookup response.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link ThreeDSecure~prepareLookupPayload|prepareLookupPayload}. If no callback is provided, it will return a promise that resolves {@link ThreeDSecure~prepareLookupPayload|prepareLookupPayload}.

 * @returns {(Promise|void)} Returns a promise if no callback is provided.
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
  return this._framework.prepareLookup(options).then(function (data) {
    return JSON.stringify(data);
  });
};

/**
 * Cancel the 3DS flow and return the verification payload if available. If using 3D Secure version 2, this will not close the UI of the authentication modal. It is recommended that this method only be used in the {@link ThreeDSecure#event:lookup-complete|`lookup-complete`} event or the `onLookupComplete` callback.
 * @public
 * @param {callback} [callback] The second argument is a {@link ThreeDSecure~verifyPayload|verifyPayload}. If there is no verifyPayload (the initial lookup did not complete), an error will be returned. If no callback is passed, `cancelVerifyCard` will return a promise.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example <caption>Cancel the verification in `lookup-complete` event</caption>
 * // set up listener after instantiation
 * threeDSecure.on('lookup-complete', function (data, next) {
 *   // determine if you want to call next to start the challenge,
 *   // if not, call cancelVerifyCard
 *   threeDSecure.cancelVerifyCard(function (err, verifyPayload) {
 *     if (err) {
 *       // Handle error
 *       console.log(err.message); // No verification payload available
 *       return;
 *     }
 *
 *     verifyPayload.nonce; // The nonce returned from the 3ds lookup call
 *     verifyPayload.liabilityShifted; // boolean
 *     verifyPayload.liabilityShiftPossible; // boolean
 *   });
 * });
 *
 * // after tokenizing a credit card
 * threeDSecure.verifyCard({
 *   amount: '100.00',
 *   nonce: nonceFromTokenizationPayload,
 *   bin: binFromTokenizationPayload
 *   // other fields such as billing address
 * }, function (verifyError, payload) {
 *   if (verifyError) {
 *     if (verifyError.code === 'THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT ') {
 *       // flow was cancelled by merchant, 3ds info can be found in the payload
 *       // for cancelVerifyCard
 *     }
 *   }
 * });
 * @example <caption>Cancel the verification in onLookupComplete callback</caption>
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
  return this._framework.cancelVerifyCard();
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
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
ThreeDSecure.prototype.teardown = function () {
  var methodNames = methods(ThreeDSecure.prototype).concat(methods(EventEmitter.prototype));

  convertMethodsToError(this, methodNames);

  return this._framework.teardown();
};

module.exports = wrapPromise.wrapPrototype(ThreeDSecure);
