(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.braintree || (g.braintree = {})).unionpay = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var createAuthorizationData = _dereq_('./create-authorization-data');
var jsonClone = _dereq_('./json-clone');
var constants = _dereq_('./constants');

function addMetadata(configuration, data) {
  var key;
  var attrs = data ? jsonClone(data) : {};
  var authAttrs = createAuthorizationData(configuration.authorization).attrs;
  var _meta = jsonClone(configuration.analyticsMetadata);

  attrs.braintreeLibraryVersion = constants.BRAINTREE_LIBRARY_VERSION;

  for (key in attrs._meta) {
    if (attrs._meta.hasOwnProperty(key)) {
      _meta[key] = attrs._meta[key];
    }
  }

  attrs._meta = _meta;

  if (authAttrs.clientKey) {
    attrs.clientKey = authAttrs.clientKey;
  } else {
    attrs.authorizationFingerprint = authAttrs.authorizationFingerprint;
  }

  return attrs;
}

module.exports = addMetadata;

},{"./constants":3,"./create-authorization-data":4,"./json-clone":7}],2:[function(_dereq_,module,exports){
'use strict';

var constants = _dereq_('./constants');
var addMetadata = _dereq_('./add-metadata');

function _millisToSeconds(millis) {
  return Math.floor(millis / 1000);
}

function _id(x) { return x; }

function sendAnalyticsEvent(client, kind, callback) {
  var configuration = client.getConfiguration();
  var driver = client._driver;
  var timestamp = _millisToSeconds(Date.now());
  var url = configuration.gatewayConfiguration.analytics.url;
  var data = {
    analytics: [{kind: kind, timestamp: timestamp}]
  };

  driver.post(
    url,
    addMetadata(configuration, data),
    _id,
    callback,
    constants.ANALYTICS_REQUEST_TIMEOUT_MS
  );
}

module.exports = {
  sendEvent: sendAnalyticsEvent
};

},{"./add-metadata":1,"./constants":3}],3:[function(_dereq_,module,exports){
'use strict';

var VERSION = "3.0.0-beta.5";
var PLATFORM = 'web';

module.exports = {
  ANALYTICS_REQUEST_TIMEOUT_MS: 2000,
  INTEGRATION_TIMEOUT_MS: 60000,
  VERSION: VERSION,
  INTEGRATION: 'custom',
  SOURCE: 'client',
  PLATFORM: PLATFORM,
  BRAINTREE_LIBRARY_VERSION: 'braintree/' + PLATFORM + '/' + VERSION
};

},{}],4:[function(_dereq_,module,exports){
'use strict';

var atob = _dereq_('../lib/polyfill').atob;

var apiUrls = {
  production: 'https://api.braintreegateway.com:443',
  sandbox: 'https://api.sandbox.braintreegateway.com:443'
};

/* eslint-enable no-undef,block-scoped-var */

function _isTokenizationKey(str) {
  return /^[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9_]+$/.test(str);
}

function _parseTokenizationKey(tokenizationKey) {
  var tokens = tokenizationKey.split('_');
  var environment = tokens[0];
  var merchantId = tokens.slice(2).join('_');

  return {
    merchantId: merchantId,
    environment: environment
  };
}

function createAuthorizationData(authorization) {
  var parsedClientToken, parsedTokenizationKey;
  var data = {
    attrs: {},
    configUrl: ''
  };

  if (_isTokenizationKey(authorization)) {
    parsedTokenizationKey = _parseTokenizationKey(authorization);
    data.attrs.clientKey = authorization;
    data.configUrl = apiUrls[parsedTokenizationKey.environment] + '/merchants/' + parsedTokenizationKey.merchantId + '/client_api/v1/configuration';
  } else {
    parsedClientToken = JSON.parse(atob(authorization));
    data.attrs.authorizationFingerprint = parsedClientToken.authorizationFingerprint;
    data.configUrl = parsedClientToken.configUrl;
  }

  return data;
}

module.exports = createAuthorizationData;

},{"../lib/polyfill":8}],5:[function(_dereq_,module,exports){
'use strict';

function enumerate(values, prefix) {
  prefix = prefix == null ? '' : prefix;

  return values.reduce(function (enumeration, value) {
    enumeration[value] = prefix + value;
    return enumeration;
  }, {});
}

module.exports = enumerate;

},{}],6:[function(_dereq_,module,exports){
'use strict';

var enumerate = _dereq_('./enumerate');

/**
 * @class
 * @global
 * @param {object} options Construction options
 * @classdesc This class is used to report error conditions, frequently as the first parameter to callbacks throughout the Braintree SDK.
 * @description <strong>You cannot use this constructor directly. Interact with instances of this class through {@link errback errbacks}.</strong>
 */
function BraintreeError(options) {
  if (!BraintreeError.types.hasOwnProperty(options.type)) {
    throw new Error(options.type + ' is not a valid type');
  }

  if (!options.message) {
    throw new Error('Error message required');
  }

  /**
   * @type {string}
   * @description A short description of the error
   */
  this.message = options.message;

  /**
   * @type {BraintreeError.types}
   * @description The type of error
   */
  this.type = options.type;

  /**
   * @type {object=}
   * @description Additional information about the error, such as an underlying network error response
   */
  this.details = options.details;
}

BraintreeError.prototype = Object.create(Error.prototype);
BraintreeError.prototype.constructor = BraintreeError;

/**
 * Enum for {@link BraintreeError} types
 * @name BraintreeError.types
 * @enum
 * @readonly
 * @memberof BraintreeError
 * @property {string} CUSTOMER Error caused by the customer
 * @property {string} MERCHANT Error that is actionable by the merchant
 * @property {string} NETWORK Error due to a network problem
 * @property {string} INTERNAL Error caused by Braintree code
 * @property {string} UNKNOWN Error of unknown origin
 */
BraintreeError.types = enumerate([
  'CUSTOMER',
  'MERCHANT',
  'NETWORK',
  'INTERNAL',
  'UNKNOWN'
]);

module.exports = BraintreeError;

},{"./enumerate":5}],7:[function(_dereq_,module,exports){
'use strict';

module.exports = function (value) {
  return JSON.parse(JSON.stringify(value));
};

},{}],8:[function(_dereq_,module,exports){
(function (global){
'use strict';

var atobNormalized = typeof global.atob === 'function' ? global.atob : atob;

function atob(base64String) {
  var a, b, c, b1, b2, b3, b4, i;
  var base64Matcher = new RegExp('^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$');
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var result = '';

  if (!base64Matcher.test(base64String)) {
    throw new Error('Non base64 encoded input passed to window.atob polyfill');
  }

  i = 0;
  do {
    b1 = characters.indexOf(base64String.charAt(i++));
    b2 = characters.indexOf(base64String.charAt(i++));
    b3 = characters.indexOf(base64String.charAt(i++));
    b4 = characters.indexOf(base64String.charAt(i++));

    a = (b1 & 0x3F) << 2 | b2 >> 4 & 0x3;
    b = (b2 & 0xF) << 4 | b3 >> 2 & 0xF;
    c = (b3 & 0x3) << 6 | b4 & 0x3F;

    result += String.fromCharCode(a) + (b ? String.fromCharCode(b) : '') + (c ? String.fromCharCode(c) : '');
  } while (i < base64String.length);

  return result;
}

module.exports = {
  atob: atobNormalized,
  _atob: atob
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(_dereq_,module,exports){
'use strict';

var UnionPay = _dereq_('./unionpay');
var BraintreeError = _dereq_('../../lib/error');
var analytics = _dereq_('../../lib/analytics');

function create(options, callback) {
  var config;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'UnionPay creation requires a callback'
    });
  }

  if (options.client == null) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.client is required when instantiating UnionPay'
    }));
    return;
  }

  config = options.client.getConfiguration();

  if (!config.gatewayConfiguration.unionPay || config.gatewayConfiguration.unionPay.enabled !== true) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'UnionPay is not enabled for this merchant'
    }));
    return;
  }

  analytics.sendEvent(options.client, 'web.unionpay.initialized');

  callback(null, new UnionPay(options));
}

module.exports = create;

},{"../../lib/analytics":2,"../../lib/error":6,"./unionpay":10}],10:[function(_dereq_,module,exports){
'use strict';

var BraintreeError = _dereq_('../../lib/error');
var analytics = _dereq_('../../lib/analytics');

/**
 * @class
 * @param {object} options see {@link module:braintree-web/unionpay.create|unionpay.create}
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/unionpay.create|braintree-web.unionpay.create} instead.</strong>
 * @classdesc This class represents a UnionPay component. Instances of this class have methods for {@link UnionPay#fetchCapabilities fetching capabilities} of UnionPay cards, {@link UnionPay#enroll enrolling} a UnionPay card, and {@link UnionPay#tokenize tokenizing} a UnionPay card.
 */
function UnionPay(options) {
  this._options = options;
  this._merchantAccountId = options.client.getConfiguration().gatewayConfiguration.unionPay.merchantAccountId;
}

/**
 * @typedef {object} UnionPay~fetchCapabilitiesPayload
 * @property {boolean} isUnionPay Determines if this card is a UnionPay card
 * @property {boolean} isDebit Determines if this card is a debit card
 * @property {object} unionPay UnionPay specific properties
 * @property {boolean} unionPay.supportsTwoStepAuthAndCapture Determines if the card allows for an authorization, but settling the transaction later
 * @property {boolean} unionPay.isUnionPayEnrollmentRequired Notifies if {@link UnionPay#enroll|enrollment} should be completed
 */

/**
 * Fetches the capabilities of a card, including whether or not the card needs to be enrolled before use. If the card needs to be enrolled, use {@link UnionPay#enroll|enroll}
 * @public
 * @param {object} options UnionPay {@link UnionPay#fetchCapabilities fetchCapabilities} options
 * @param {object} options.cardNumber The card number to fetch capabilities for
 * @param {errback} errback The second argument, <code>data</code>, is a {@link UnionPay#fetchCapabilitiesPayload fetchCapabilitiesPayload}
 * @returns {void}
 */
UnionPay.prototype.fetchCapabilities = function (options, errback) {
  var client = this._options.client;
  var cardNumber = options.cardNumber;

  if (!cardNumber) {
    errback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'A card number is required'
    }));
    return;
  }

  client.request({
    method: 'get',
    endpoint: 'payment_methods/credit_cards/capabilities',
    data: {
      _meta: {source: 'unionpay'},
      creditCard: {
        number: cardNumber
      }
    }
  }, function (err, response) {
    if (err) {
      errback(new BraintreeError({
        type: BraintreeError.types.NETWORK,
        message: 'Fetch capabilities network error',
        details: {
          originalError: err
        }
      }));
      analytics.sendEvent(client, 'web.unionpay.capabilities-failed');
      return;
    }

    analytics.sendEvent(client, 'web.unionpay.capabilities-received');
    errback(null, response);
  });
};

/**
 */

/**
 * @typedef {object} UnionPay~enrollPayload
 * @property {string} unionPayEnrollmentId UnionPay enrollment ID
 */

/**
 * Enrolls a UnionPay card. Only call this method if the card needs to be enrolled. Use {@link UnionPay#fetchCapabilities|fetchCapabilities} to determine if the user's card needs to be enrolled.
 * @public
 * @param {object} options UnionPay enrollment options
 * @param {object} options.card The card to enroll
 * @param {string} options.card.number Card number
 * @param {string} options.card.expirationMonth The card's expiration month
 * @param {string} options.card.expirationYear The card's expiration year
 * @param {string} options.card.mobileCountryCode Customer's mobile country code
 * @param {string} options.card.mobileNumber Customer's mobile phone number. This is the mobile phone number UnionPay will send an SMS auth code to
 * @param {errback} callback The second argument, <code>data</code>, is a {@link UnionPay~enrollPayload|enrollPayload}
 * @returns {void}
 */
UnionPay.prototype.enroll = function (options, callback) {
  var client = this._options.client;
  var card = options.card;
  var data = {
    _meta: {source: 'unionpay'},
    unionPayEnrollment: {
      number: card.number,
      expirationMonth: card.expirationMonth,
      expirationYear: card.expirationYear,
      mobileCountryCode: card.mobileCountryCode,
      mobileNumber: card.mobileNumber
    }
  };

  if (this._merchantAccountId) {
    data.merchantAccountId = this._merchantAccountId;
  }

  client.request({
    method: 'post',
    endpoint: 'union_pay_enrollments',
    data: data
  }, function (err, response) {
    var message;

    if (err) {
      // TODO: We cannot get response codes, so we can't know whose "fault" this error is.
      // This requires a new feature of braintree-request which we are waiting on.
      if (err.type === BraintreeError.types.CUSTOMER) {
        message = 'Enrollment invalid due to customer input error';
      } else {
        err.type = BraintreeError.types.NETWORK;
        message = 'Enrollment network error';
      }

      analytics.sendEvent(client, 'web.unionpay.enrollment-failed');
      callback(new BraintreeError({
        type: err.type,
        message: message,
        details: {
          originalError: err
        }
      }));
      return;
    }

    analytics.sendEvent(client, 'web.unionpay.enrollment-succeeded');
    callback(null, {unionPayEnrollmentId: response.unionPayEnrollmentId});
  });
};

/**
 * @typedef {object} UnionPay~tokenizePayload
 * @property {string} nonce The payment method nonce
 * @property {string} type Always <code>CreditCard</code>
 * @property {object} details Additional account details
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard
 * @property {string} details.lastTwo Last two digits of card number
 * @property {string} description A human-readable description
 */

/**
 * Tokenizes a UnionPay card, returning a nonce payload!
 * @public
 * @param {object} options UnionPay tokenization options
 * @param {object} options.card The card to enroll
 * @param {string} options.card.number Card number
 * @param {string} options.card.expirationMonth The card's expiration month
 * @param {string} options.card.expirationYear The card's expiration year
 * @param {string} options.card.cvv The card's security number
 * @param {object} options.options Additional options
 * @param {string} options.options.id The enrollment id if {@link UnionPay#enroll} was required
 * @param {string} options.options.smsCode The SMS code recieved from the user if {@link UnionPay#enroll} was required
 * @param {errback} callback The second argument, <code>data</code>, is a {@link UnionPay~tokenizePayload|tokenizePayload}
 * @returns {void}
 */
UnionPay.prototype.tokenize = function (options, callback) {
  var tokenizedCard;
  var client = this._options.client;

  client.request({
    method: 'post',
    endpoint: 'payment_methods/credit_cards',
    data: {
      _meta: {source: 'unionpay'},
      creditCard: {
        number: options.card.number,
        expirationMonth: options.card.expirationMonth,
        expirationYear: options.card.expirationYear,
        cvv: options.card.cvv
      },
      options: options.options
    }
  }, function (err, response) {
    if (err) {
      analytics.sendEvent(client, 'web.unionpay.nonce-failed');
      // TODO: We cannot get response codes, so we can't know whose "fault" this error is.
      // This requires a new feature of braintree-request which we are waiting on.
      callback(new BraintreeError({
        type: BraintreeError.types.NETWORK,
        message: 'Tokenization network error',
        details: {
          originalError: err
        }
      }));
      return;
    }

    tokenizedCard = response.creditCards[0];
    delete tokenizedCard.consumed;
    delete tokenizedCard.threeDSecureInfo;
    delete tokenizedCard.type;

    analytics.sendEvent(client, 'web.unionpay.nonce-received');
    callback(null, tokenizedCard);
  });
};

module.exports = UnionPay;

},{"../../lib/analytics":2,"../../lib/error":6}],11:[function(_dereq_,module,exports){
'use strict';
/** @module braintree-web/unionpay */

var create = _dereq_('./external/create');
var packageVersion = "3.0.0-beta.5";

module.exports = {
  /**
   * @static
   * @function
   * @param {object} options Object containing configuration options for this module
   * @param {Client} options.client A {@link Client} instance
   * @returns {@link UnionPay}
   */
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: packageVersion
};

},{"./external/create":9}]},{},[11])(11)
});