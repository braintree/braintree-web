(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.braintree || (g.braintree = {})).client = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
'use strict';

var util = _dereq_('./util');
var prepBody = _dereq_('./prep-body');
var parseBody = _dereq_('./parse-body');
var constants = _dereq_('./constants');
var isXHRAvailable = global.XMLHttpRequest && 'withCredentials' in new global.XMLHttpRequest();

function getRequestObject() {
  return isXHRAvailable ? new XMLHttpRequest() : new XDomainRequest();
}

function get(url, attrs, deserializer, callback, timeout) {
  var urlParams = util.createURLParams(url, attrs);
  makeRequest('GET', urlParams, null, deserializer, callback, timeout);
}

function post(url, attrs, deserializer, callback, timeout) {
  makeRequest('POST', url, attrs, deserializer, callback, timeout);
}

function makeRequest(method, url, body, deserializer, callback, timeout) {
  var status, resBody;
  var req = getRequestObject();

  callback = callback || function () {};

  if (isXHRAvailable) {
    req.onreadystatechange = function () {
      if (req.readyState !== 4) { return; }

      status = req.status;
      resBody = parseBody(req.responseText);

      if (status >= 400 || status === 0) {
        callback.call(null, resBody || {errors: constants.errors.UNKNOWN_ERROR}, null);
      } else if (status > 0) {
        callback.call(null, null, deserializer(resBody));
      }
    };
  } else {
    req.onload = function () {
      callback.call(null, null, deserializer(parseBody(req.responseText)));
    };

    req.onerror = function () {
      callback.call(null, req.responseText, null);
    };

    // This must remain for IE9 to work
    req.onprogress = function() {};

    req.ontimeout = function () {
      callback.call(null, {errors: constants.errors.UNKNOWN_ERROR}, null);
    };
  }

  req.open(method, url, true);
  req.timeout = timeout == null ? 60000 : timeout;

  if (isXHRAvailable && method === 'POST') {
    req.setRequestHeader('Content-Type', 'application/json');
  }

  setTimeout(function () {
    req.send(prepBody(method, body));
  }, 0);
}

module.exports = {
  get: get,
  post: post
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./constants":3,"./parse-body":6,"./prep-body":7,"./util":8}],2:[function(_dereq_,module,exports){
'use strict';

var JSONPDriver = _dereq_('./jsonp-driver');
var AJAXDriver = _dereq_('./ajax-driver');
var util = _dereq_('./util');

function chooseRequestDriver(options) {
  var ua = util.getUserAgent();
  var isAJAXAvailable = !(util.isHTTP() && /(MSIE\s(8|9))|(Phantom)/.test(ua));

  options = options || {};

  if (options.enableCORS && isAJAXAvailable) {
    return AJAXDriver;
  } else {
    return JSONPDriver;
  }
}

module.exports = chooseRequestDriver;

},{"./ajax-driver":1,"./jsonp-driver":4,"./util":8}],3:[function(_dereq_,module,exports){
module.exports={
  "errors": {
    "UNKNOWN_ERROR": "Unknown error",
    "INVALID_TIMEOUT": "Timeout must be a number"
  }
};

},{}],4:[function(_dereq_,module,exports){
'use strict';

var JSONP = _dereq_('./jsonp');
var constants = _dereq_('./constants');
var timeoutWatchers = [];

function deserialize(response, mapper) {
  if (response.status >= 400) {
    return [response, null];
  } else {
    return [null, mapper(response)];
  }
}

function noop() {}

function requestWithTimeout(url, attrs, deserializer, method, callback, timeout) {
  var uniqueName;

  callback = callback || noop;

  if (timeout == null) {
    timeout = 60000;
  }

  uniqueName = method(url, attrs, function (err, data, name) {
    if (timeoutWatchers[name]) {
      clearTimeout(timeoutWatchers[name]);

      if (err) {
        callback.call(null, err);
      } else {
        callback.apply(null, deserialize(data, function (d) { return deserializer(d); }));
      }
    }
  });

  if (typeof timeout === 'number') {
    timeoutWatchers[uniqueName] = setTimeout(function () {
      timeoutWatchers[uniqueName] = null;
      callback.apply(null, [{errors: constants.errors.UNKNOWN_ERROR}, null]);
    }, timeout);
  } else {
    callback.apply(null, [{errors: constants.errors.INVALID_TIMEOUT}, null]);
  }
}

function post(url, attrs, deserializer, callback, timeout) {
  attrs._method = 'POST';
  requestWithTimeout(url, attrs, deserializer, JSONP.get, callback, timeout);
}

function get(url, attrs, deserializer, callback, timeout) {
  requestWithTimeout(url, attrs, deserializer, JSONP.get, callback, timeout);
}

module.exports = {
  get: get,
  post: post
};

},{"./constants":3,"./jsonp":5}],5:[function(_dereq_,module,exports){
(function (global){
'use strict';

var util = _dereq_('./util');

/*
* Lightweight JSONP fetcher
* Copyright 2010-2012 Erik Karlsson. All rights reserved.
* BSD licensed
*/
var head,
    window = global,
    config = {};

function load(url, pfnError) {
  var script = document.createElement('script'),
  done = false;
  script.src = url;
  script.async = true;

  var errorHandler = pfnError || config.error;
  if ( typeof errorHandler === 'function' ) {
    script.onerror = function (ex){
      errorHandler({url: url, event: ex});
    };
  }

  script.onload = script.onreadystatechange = function () {
    if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      script.onload = script.onreadystatechange = null;
      if ( script && script.parentNode ) {
        script.parentNode.removeChild( script );
      }
    }
  };

  if ( !head ) {
    head = document.getElementsByTagName('head')[0];
  }
  head.appendChild( script );
}

function jsonp(url, params, callback, callbackName) {
  var urlParams, key, uniqueName;

  callbackName = (callbackName||config['callbackName']||'callback');
  uniqueName = callbackName + "_json" + util.generateUUID();
  params[callbackName] = uniqueName;
  urlParams = util.createURLParams(url, params)

  window[ uniqueName ] = function (data){
    callback(null, data, uniqueName);
    try {
      delete window[ uniqueName ];
    } catch (e) {}
    window[ uniqueName ] = null;
  };

  load(urlParams, function (err) {
    callback(err, null, uniqueName);
  });
  return uniqueName;
}

function setDefaults(obj){
  config = obj;
}

module.exports = {
  get: jsonp,
  init: setDefaults
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":8}],6:[function(_dereq_,module,exports){
'use strict';

module.exports = function (body) {
  try {
    body = JSON.parse(body);
  } catch (e) {}

  return body;
};

},{}],7:[function(_dereq_,module,exports){
'use strict';

module.exports = function (method, body) {
  if (typeof method !== 'string') {
    throw new Error('Method must be a string');
  }

  if (method.toLowerCase() !== 'get' && body != null) {
    body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return body;
};

},{}],8:[function(_dereq_,module,exports){
(function (global){
'use strict';

function notEmpty(obj) {
  var key;

  for (key in obj) {
    if (obj.hasOwnProperty(key)) { return true; }
  }

  return false;
}

function isArray(value) {
  return value && typeof value === 'object' && typeof value.length === 'number' &&
    Object.prototype.toString.call(value) === '[object Array]' || false;
}

function stringify(params, namespace) {
  var query = [], k, v, p;

  for (p in params) {
    if (!params.hasOwnProperty(p)) {
      continue;
    }

    v = params[p];

    if (namespace) {
      if (isArray(params)) {
        k = namespace + '[]';
      } else {
        k = namespace + '[' + p + ']';
      }
    } else {
      k = p;
    }
    if (typeof v === 'object') {
      query.push(stringify(v, k));
    } else {
      query.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }

  return query.join('&');
}

function generateUUID() { // RFC 4122 v4 (pseudo-random) UUID without hyphens
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (xORy) {
    var randomHex = Math.floor(Math.random() * 16);
    var uuidHex = xORy === 'x' ? randomHex : randomHex & 0x3 | 0x8; // jshint ignore:line
    return uuidHex.toString(16);
  });
}

function createURLParams(url, params) {
  url = url || '';

  if (params != null && typeof params === 'object' && notEmpty(params)) {
    url += url.indexOf('?') === -1 ? '?' : '';
    url += url.indexOf('=') !== -1 ? '&' : '';
    url += stringify(params);
  }

  return url;
}

function getUserAgent() {
  return global.navigator.userAgent;
}

function isHTTP() {
  return global.location.protocol === 'http:';
}

module.exports = {
  isArray: isArray,
  generateUUID: generateUUID,
  stringify: stringify,
  createURLParams: createURLParams,
  getUserAgent: getUserAgent,
  isHTTP: isHTTP
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(_dereq_,module,exports){
'use strict';

var AJAXDriver = _dereq_('./lib/ajax-driver');
var JSONPDriver = _dereq_('./lib/jsonp-driver');
var chooseDriver = _dereq_('./lib/choose-driver');
var util = _dereq_('./lib/util');

module.exports = {
  AJAXDriver: AJAXDriver,
  JSONPDriver: JSONPDriver,
  chooseDriver: chooseDriver,
  util: util
};

},{"./lib/ajax-driver":1,"./lib/choose-driver":2,"./lib/jsonp-driver":4,"./lib/util":8}],10:[function(_dereq_,module,exports){
'use strict';

var nativeIndexOf = Array.prototype.indexOf;

var indexOf;
if (nativeIndexOf) {
  indexOf = function (haystack, needle) {
    return haystack.indexOf(needle);
  };
} else {
  indexOf = function indexOf(haystack, needle) {
    for (var i = 0, len = haystack.length; i < len; i++) {
      if (haystack[i] === needle) {
        return i;
      }
    }
    return -1;
  };
}

module.exports = {
  indexOf: indexOf
};

},{}],11:[function(_dereq_,module,exports){
'use strict';

function _escape(string) {
  var i, hex;
  var escaped = '';

  for (i = 0; i < string.length; i++) {
    escaped += '%';
    hex = string[i].charCodeAt(0).toString(16).toUpperCase();

    if (hex.length < 2) {
      escaped += '0';
    }

    escaped += hex;
  }

  return escaped;
}

function decodeUtf8(b64) {
  return decodeURIComponent(_escape(atob(b64)));
}

module.exports = {
  decodeUtf8: decodeUtf8
};

},{}],12:[function(_dereq_,module,exports){
'use strict';

function normalizeElement (element, errorMessage) {
  errorMessage = errorMessage || '[' + element + '] is not a valid DOM Element';

  if (element && element.nodeType && element.nodeType === 1) {
    return element;
  }
  if (element && window.jQuery && (element instanceof jQuery || 'jquery' in Object(element)) && element.length !== 0) {
    return element[0];
  }

  if (typeof element === 'string' && document.getElementById(element)) {
    return document.getElementById(element);
  }

  throw new Error(errorMessage);
}

module.exports = {
  normalizeElement: normalizeElement
};

},{}],13:[function(_dereq_,module,exports){
'use strict';

function addEventListener(element, type, listener, useCapture) {
  if (element.addEventListener) {
    element.addEventListener(type, listener, useCapture || false);
  } else if (element.attachEvent) {
    element.attachEvent('on' + type, listener);
  }
}

function removeEventListener(element, type, listener, useCapture) {
  if (element.removeEventListener) {
    element.removeEventListener(type, listener, useCapture || false);
  } else if (element.detachEvent) {
    element.detachEvent('on' + type, listener);
  }
}

function preventDefault(event) {
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

module.exports = {
  addEventListener: addEventListener,
  removeEventListener: removeEventListener,
  preventDefault: preventDefault
};

},{}],14:[function(_dereq_,module,exports){
'use strict';

var toString = Object.prototype.toString;

function isFunction(func) {
  return toString.call(func) === '[object Function]';
}

function bind(func, context) {
  return function () {
    return func.apply(context, arguments);
  };
}

module.exports = {
  bind: bind,
  isFunction: isFunction
};

},{}],15:[function(_dereq_,module,exports){
'use strict';

function getMaxCharLength(width) {
  var max, i, range, len;
  var ranges = [
    { min: 0, max: 180, chars: 7 },
    { min: 181, max: 620, chars: 14 },
    { min: 621, max: 960, chars: 22 }
  ];

  len = ranges.length;

  width = width || window.innerWidth;

  for (i = 0; i < len; i++) {
    range = ranges[i];

    if (width >= range.min && width <= range.max) {
      max = range.chars;
    }
  }

  return max || 60;
}

function truncateEmail(email, maxLength) {
  var address, domain;

  if (email.indexOf('@') === -1) {
    return email;
  }

  email = email.split('@');
  address = email[0];
  domain = email[1];

  if (address.length > maxLength) {
    address = address.slice(0, maxLength) + '...';
  }

  if (domain.length > maxLength) {
    domain = '...' + domain.slice(-maxLength);
  }

  return address + '@' + domain;
}

module.exports = {
  truncateEmail: truncateEmail,
  getMaxCharLength: getMaxCharLength
};

},{}],16:[function(_dereq_,module,exports){
'use strict';

var array = _dereq_('./array');

function isBrowserHttps() {
  return window.location.protocol === 'https:';
}

function encode(str) {
  switch (str) {
    case null:
    case undefined:
      return '';
    case true:
      return '1';
    case false:
      return '0';
    default:
      return encodeURIComponent(str);
  }
}

function makeQueryString(params, namespace) {
  var query = [], k, p;
  for (p in params) {
    if (params.hasOwnProperty(p)) {
      var v = params[p];
      if (namespace) {
        k = namespace + '[' + p + ']';
      } else {
        k = p;
      }
      if (typeof v === 'object') {
        query.push(makeQueryString(v, k));
      } else if (v !== undefined && v !== null) {
        query.push(encode(k) + '=' + encode(v));
      }
    }
  }
  return query.join('&');
}

function decodeQueryString(queryString) {
  var params = {},
  paramPairs = queryString.split('&');

  for (var i = 0; i < paramPairs.length; i++) {
    var paramPair = paramPairs[i].split('=');
    var key = paramPair[0];
    var value = decodeURIComponent(paramPair[1]);
    params[key] = value;
  }

  return params;
}

function getParams(url) {
  var urlSegments = url.split('?');

  if (urlSegments.length !== 2) {
    return {};
  }

  return decodeQueryString(urlSegments[1]);
}

var parser = document.createElement('a');
var legalHosts = [
  'paypal.com',
  'braintreepayments.com',
  'braintreegateway.com',
  'localhost'
];

function isWhitelistedDomain(url) {
  url = url.toLowerCase();

  if (!/^http/.test(url)) {
    return false;
  }

  parser.href = url;

  var pieces = parser.hostname.split('.');
  var topLevelDomain = pieces.slice(-2).join('.');

  if (array.indexOf(legalHosts, topLevelDomain) === -1) {
    return false;
  }

  return true;
}

module.exports = {
  isBrowserHttps: isBrowserHttps,
  makeQueryString: makeQueryString,
  decodeQueryString: decodeQueryString,
  getParams: getParams,
  isWhitelistedDomain: isWhitelistedDomain
};

},{"./array":10}],17:[function(_dereq_,module,exports){
'use strict';

// RFC 4122 v4 (pseudo-random) UUID
function generate() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

module.exports = generate;

},{}],18:[function(_dereq_,module,exports){
var dom = _dereq_('./lib/dom');
var url = _dereq_('./lib/url');
var fn = _dereq_('./lib/fn');
var events = _dereq_('./lib/events');
var string = _dereq_('./lib/string');
var array = _dereq_('./lib/array');
var base64 = _dereq_('./lib/base64');
var uuid = _dereq_('./lib/uuid');

module.exports = {
  string: string,
  array: array,
  normalizeElement: dom.normalizeElement,
  isBrowserHttps: url.isBrowserHttps,
  makeQueryString: url.makeQueryString,
  decodeQueryString: url.decodeQueryString,
  getParams: url.getParams,
  isWhitelistedDomain: url.isWhitelistedDomain,
  removeEventListener: events.removeEventListener,
  addEventListener: events.addEventListener,
  preventDefault: events.preventDefault,
  bind: fn.bind,
  isFunction: fn.isFunction,
  base64ToUtf8: base64.decodeUtf8,
  uuid: uuid
};

},{"./lib/array":10,"./lib/base64":11,"./lib/dom":12,"./lib/events":13,"./lib/fn":14,"./lib/string":15,"./lib/url":16,"./lib/uuid":17}],19:[function(_dereq_,module,exports){
'use strict';

var chooseDriver = _dereq_('braintree-request').chooseDriver;
var utils = _dereq_('braintree-utilities');
var BraintreeError = _dereq_('../lib/error');
var addMetadata = _dereq_('../lib/add-metadata');

function _id(x) { return x; }

/**
 * This object is returned by {@link Client#getConfiguration|getConfiguration}. This information is used extensively by other Braintree modules to properly configure themselves.
 * @typedef {object} Client~configuration
 * @property {object} client braintree-web/client parameters
 * @property {string} client.authorization A tokenizationKey or clientToken
 * @property {object} gatewayConfiguration Gateway-supplied configuration
 * @property {object} analyticsMetadata Analytics-specific data
 * @property {string} analyticsMetadata.sessionId Uniquely identifies a browsing session
 * @property {string} analyticsMetadata.sdkVersion The braintree.js version
 * @property {string} analyticsMetadata.merchantAppId Identifies the merchant's web app
 */

/**
 * @class
 * @param {Client~configuration} configuration Options
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/client.create|braintree.client.create} instead.</strong>
 * @classdesc This class is required by many other Braintree components. It serves as the base API layer that communicates with our servers. It is also capable of being used to formulate direct calls to our servers, such as direct credit card tokenization. See {@link Client#request}.
 */
function Client(configuration) {
  var configurationJSON, gatewayConfiguration;

  configuration = configuration || {};

  configurationJSON = JSON.stringify(configuration);
  gatewayConfiguration = configuration.gatewayConfiguration;

  if (!gatewayConfiguration) {
    throw new BraintreeError({
      type: BraintreeError.types.INTERNAL,
      message: 'Missing gatewayConfiguration'
    });
  }

  [
    'assetsUrl',
    'clientApiUrl',
    'configUrl'
  ].forEach(function (property) {
    if (property in gatewayConfiguration && !utils.isWhitelistedDomain(gatewayConfiguration[property])) {
      throw new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: 'Invalid ' + property
      });
    }
  });

  /**
   * Returns a copy of the configuration values
   * @public
   * @returns {Client~configuration} configuration
   */
  this.getConfiguration = function () {
    return JSON.parse(configurationJSON);
  };

  this._driver = chooseDriver({enableCORS: true});
  this._baseUrl = configuration.gatewayConfiguration.clientApiUrl + '/v1/';
  this._configuration = this.getConfiguration();

  this.toJSON = this.getConfiguration;
}

/**
 * Used by other modules to formulate all network requests to the Braintree gateway. It is also capable of being used directly from your own form to tokenize credit card information. However, be sure to satisfy PCI compliance if you use direct card tokenization.
 * @public
 * @param {object} options Request options
 * @param {string} options.method HTTP method. i.e. "get" or "post"
 * @param {string} options.endpoint Enpoint path. i.e. "payment_methods"
 * @param {object} options.data Data to send with the request
 * @param {string} [options.timeout=60000] Timeout limit
 * @param {errback} callback The second argument, <code>data</code>, is the returned server data
 * @example
 * <caption>Direct Credit Card Tokenization</caption>
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_TOKEN
 * }, function (err, client) {
 *   var form = document.getElementById('my-form-id');
 *   var data = {
 *     creditCard: {
 *       number: form['cc-number'].value,
 *       cvv: form['cc-cvv'].value,
 *       expirationDate: form['cc-date'].value,
 *       billingAddress: {
 *         postalCode: form['cc-postal'].value
 *       }
 *     }
 *   };
 *
 *   // Warning: For a merchant to be eligible for the easiest level of PCI compliance (SAQ A),
 *   // payment fields cannot be hosted on your checkout page.
 *   // For an alternative to the following, use Hosted Fields.
 *   client.request({
 *     endpoint: 'payment_methods/credit_cards',
 *     method: 'post',
 *     data: data
 *   }, function (err, response) {
 *     if (err) { throw new Error(err); }
 *
 *     console.log('Got nonce:', response.creditCards[0].nonce);
 *   });
 * });
 * @returns {void}
 */
Client.prototype.request = function (options, callback) {
  var errorMsg;

  if (!options.method) {
    errorMsg = 'options.method is required';
  } else if (!options.endpoint) {
    errorMsg = 'options.endpoint is required';
  }

  if (errorMsg) {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: errorMsg
    });
  }

  this._driver[options.method](
    this._baseUrl + options.endpoint,
    addMetadata(this._configuration, options.data),
    _id,
    callback,
    options.timeout
  );
};

module.exports = Client;

},{"../lib/add-metadata":22,"../lib/error":26,"braintree-request":9,"braintree-utilities":18}],20:[function(_dereq_,module,exports){
(function (global){
'use strict';

var BraintreeError = _dereq_('../lib/error');
var chooseDriver = _dereq_('braintree-request').chooseDriver;
var uuid = _dereq_('../lib/uuid');
var constants = _dereq_('../lib/constants');
var createAuthorizationData = _dereq_('../lib/create-authorization-data');

function getConfiguration(options, callback) {
  var configuration, authData, attrs, configUrl;
  var sessionId = uuid();
  var analyticsMetadata = {
    merchantAppId: global.location.host,
    platform: constants.PLATFORM,
    sdkVersion: constants.VERSION,
    source: constants.SOURCE,
    integration: constants.INTEGRATION,
    integrationType: constants.INTEGRATION,
    sessionId: sessionId
  };

  try {
    authData = createAuthorizationData(options.authorization);
  } catch (err) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'Authorization is invalid. Make sure your client token or tokenization key is valid.'
    }));
    return;
  }
  attrs = authData.attrs;
  configUrl = authData.configUrl;

  attrs._meta = analyticsMetadata;
  attrs.braintreeLibraryVersion = constants.BRAINTREE_LIBRARY_VERSION;

  chooseDriver({enableCORS: true}).get(
    configUrl,
    attrs,
    function (d) {
      return d;
    },
    function (err, response) {
      // TODO: We will refactor this when braintree-request has better error handling.
      if (err) {
        callback(err);
        return;
      }

      configuration = {
        authorization: options.authorization,
        analyticsMetadata: analyticsMetadata,
        gatewayConfiguration: response
      };

      callback(null, configuration);
    }
  );
}

module.exports = {
  getConfiguration: getConfiguration
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/constants":23,"../lib/create-authorization-data":24,"../lib/error":26,"../lib/uuid":29,"braintree-request":9}],21:[function(_dereq_,module,exports){
'use strict';

var BraintreeError = _dereq_('../lib/error');
var Client = _dereq_('./client');
var getConfiguration = _dereq_('./get-configuration').getConfiguration;
var packageVersion = "3.0.0-beta.4";

/** @module braintree-web/client */

/**
 * @function
 * @description This function is the entry point for the <code>braintree.client</code> module. It is used for creating {@link Client} instances that service communication to Braintree servers.
 * @param {object} options Object containing all {@link Client} options
 * @param {string} options.authorization A tokenizationKey or clientToken
 * @param {errback} callback The second argument, <code>data</code>, is the {@link Client} instance
 * @returns {void}
 * @example
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_TOKEN
 * }, function (err, client) {
 *   ...
 * });
 * @static
 */
function create(options, callback) {
  if (!options.authorization) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.authorization is required'
    }));
    return;
  }

  getConfiguration(options, function (err, configuration) {
    var client;

    if (err != null) {
      // TODO: We will refactor this when braintree-request has better error handling.
      if (err.errors === 'Unknown error') {
        callback(new BraintreeError({
          type: BraintreeError.types.NETWORK,
          message: 'Cannot contact the gateway at this time.'
        }));
      } else {
        // TODO: This is not a BraintreeError; blocked by braintree-request refactor.
        callback(err);
      }

      return;
    }

    try {
      client = new Client(configuration);
    } catch (clientCreationError) {
      callback(clientCreationError);
      return;
    }

    callback(null, client);
  });
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: packageVersion
};

},{"../lib/error":26,"./client":19,"./get-configuration":20}],22:[function(_dereq_,module,exports){
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

},{"./constants":23,"./create-authorization-data":24,"./json-clone":27}],23:[function(_dereq_,module,exports){
'use strict';

var VERSION = "3.0.0-beta.4";
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

},{}],24:[function(_dereq_,module,exports){
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

},{"../lib/polyfill":28}],25:[function(_dereq_,module,exports){
'use strict';

function enumerate(values, prefix) {
  prefix = prefix == null ? '' : prefix;

  return values.reduce(function (enumeration, value) {
    enumeration[value] = prefix + value;
    return enumeration;
  }, {});
}

module.exports = enumerate;

},{}],26:[function(_dereq_,module,exports){
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

},{"./enumerate":25}],27:[function(_dereq_,module,exports){
'use strict';

module.exports = function (value) {
  return JSON.parse(JSON.stringify(value));
};

},{}],28:[function(_dereq_,module,exports){
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
},{}],29:[function(_dereq_,module,exports){
'use strict';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;

    return v.toString(16);
  });
}

module.exports = uuid;

},{}]},{},[21])(21)
});