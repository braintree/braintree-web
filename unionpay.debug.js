(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.braintree || (g.braintree = {})).unionpay = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
'use strict';
(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(typeof global === 'undefined' ? root : global);
  } else if (typeof define === 'function' && define.amd) {
    define([], function () { return factory(root); });
  } else {
    root.framebus = factory(root);
  }
})(this, function (root) { // eslint-disable-line no-invalid-this
  var win, framebus;
  var popups = [];
  var subscribers = {};
  var prefix = '/*framebus*/';

  function include(popup) {
    if (popup == null) { return false; }
    if (popup.Window == null) { return false; }
    if (popup.constructor !== popup.Window) { return false; }

    popups.push(popup);
    return true;
  }

  function target(origin) {
    var key;
    var targetedFramebus = {};

    for (key in framebus) {
      if (!framebus.hasOwnProperty(key)) { continue; }

      targetedFramebus[key] = framebus[key];
    }

    targetedFramebus._origin = origin || '*';

    return targetedFramebus;
  }

  function publish(event) {
    var payload, args;
    var origin = _getOrigin(this); // eslint-disable-line no-invalid-this

    if (_isntString(event)) { return false; }
    if (_isntString(origin)) { return false; }

    args = Array.prototype.slice.call(arguments, 1);

    payload = _packagePayload(event, args, origin);
    if (payload === false) { return false; }

    _broadcast(win.top, payload, origin);

    return true;
  }

  function subscribe(event, fn) {
    var origin = _getOrigin(this); // eslint-disable-line no-invalid-this

    if (_subscriptionArgsInvalid(event, fn, origin)) { return false; }

    subscribers[origin] = subscribers[origin] || {};
    subscribers[origin][event] = subscribers[origin][event] || [];
    subscribers[origin][event].push(fn);

    return true;
  }

  function unsubscribe(event, fn) {
    var i, subscriberList;
    var origin = _getOrigin(this); // eslint-disable-line no-invalid-this

    if (_subscriptionArgsInvalid(event, fn, origin)) { return false; }

    subscriberList = subscribers[origin] && subscribers[origin][event];
    if (!subscriberList) { return false; }

    for (i = 0; i < subscriberList.length; i++) {
      if (subscriberList[i] === fn) {
        subscriberList.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function _getOrigin(scope) {
    return scope && scope._origin || '*';
  }

  function _isntString(string) {
    return typeof string !== 'string';
  }

  function _packagePayload(event, args, origin) {
    var packaged = false;
    var payload = {
      event: event,
      origin: origin
    };
    var reply = args[args.length - 1];

    if (typeof reply === 'function') {
      payload.reply = _subscribeReplier(reply, origin);
      args = args.slice(0, -1);
    }

    payload.args = args;

    try {
      packaged = prefix + JSON.stringify(payload);
    } catch (e) {
      throw new Error('Could not stringify event: ' + e.message);
    }
    return packaged;
  }

  function _unpackPayload(e) {
    var payload, replyOrigin, replySource, replyEvent;

    if (e.data.slice(0, prefix.length) !== prefix) { return false; }

    try {
      payload = JSON.parse(e.data.slice(prefix.length));
    } catch (err) {
      return false;
    }

    if (payload.reply != null) {
      replyOrigin = e.origin;
      replySource = e.source;
      replyEvent = payload.reply;

      payload.reply = function reply(data) { // eslint-disable-line consistent-return
        var replyPayload = _packagePayload(replyEvent, [data], replyOrigin);

        if (replyPayload === false) { return false; }

        replySource.postMessage(replyPayload, replyOrigin);
      };

      payload.args.push(payload.reply);
    }

    return payload;
  }

  function _attach(w) {
    if (win) { return; }
    win = w || root;

    if (win.addEventListener) {
      win.addEventListener('message', _onmessage, false);
    } else if (win.attachEvent) {
      win.attachEvent('onmessage', _onmessage);
    } else if (win.onmessage === null) {
      win.onmessage = _onmessage;
    } else {
      win = null;
    }
  }

  function _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : r & 0x3 | 0x8;

      return v.toString(16);
    });
  }

  function _onmessage(e) {
    var payload;

    if (_isntString(e.data)) { return; }

    payload = _unpackPayload(e);
    if (!payload) { return; }

    _dispatch('*', payload.event, payload.args, e);
    _dispatch(e.origin, payload.event, payload.args, e);
    _broadcastPopups(e.data, payload.origin, e.source);
  }

  function _dispatch(origin, event, args, e) {
    var i;

    if (!subscribers[origin]) { return; }
    if (!subscribers[origin][event]) { return; }

    for (i = 0; i < subscribers[origin][event].length; i++) {
      subscribers[origin][event][i].apply(e, args);
    }
  }

  function _hasOpener(frame) {
    if (frame.top !== frame) { return false; }
    if (frame.opener == null) { return false; }
    if (frame.opener === frame) { return false; }
    if (frame.opener.closed === true) { return false; }

    return true;
  }

  function _broadcast(frame, payload, origin) {
    var i;

    try {
      frame.postMessage(payload, origin);

      if (_hasOpener(frame)) {
        _broadcast(frame.opener.top, payload, origin);
      }

      for (i = 0; i < frame.frames.length; i++) {
        _broadcast(frame.frames[i], payload, origin);
      }
    } catch (_) { /* ignored */ }
  }

  function _broadcastPopups(payload, origin, source) {
    var i, popup;

    for (i = popups.length - 1; i >= 0; i--) {
      popup = popups[i];

      if (popup.closed === true) {
        popups = popups.slice(i, 1);
      } else if (source !== popup) {
        _broadcast(popup.top, payload, origin);
      }
    }
  }

  function _subscribeReplier(fn, origin) {
    var uuid = _uuid();

    function replier(d, o) {
      fn(d, o);
      framebus.target(origin).unsubscribe(uuid, replier);
    }

    framebus.target(origin).subscribe(uuid, replier);
    return uuid;
  }

  function _subscriptionArgsInvalid(event, fn, origin) {
    if (_isntString(event)) { return true; }
    if (typeof fn !== 'function') { return true; }
    if (_isntString(origin)) { return true; }

    return false;
  }

  _attach();

  framebus = {
    target: target,
    include: include,
    publish: publish,
    pub: publish,
    trigger: publish,
    emit: publish,
    subscribe: subscribe,
    sub: subscribe,
    on: subscribe,
    unsubscribe: unsubscribe,
    unsub: unsubscribe,
    off: unsubscribe
  };

  return framebus;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(_dereq_,module,exports){
'use strict';

var setAttributes = _dereq_('./lib/set-attributes');
var defaultAttributes = _dereq_('./lib/default-attributes');
var assign = _dereq_('./lib/assign');

module.exports = function createFrame(options) {
  var iframe = document.createElement('iframe');
  var config = assign({}, defaultAttributes, options);

  if (config.style && typeof config.style !== 'string') {
    assign(iframe.style, config.style);
    delete config.style;
  }

  setAttributes(iframe, config);

  if (!iframe.getAttribute('id')) {
    iframe.id = iframe.name;
  }

  return iframe;
};

},{"./lib/assign":3,"./lib/default-attributes":4,"./lib/set-attributes":5}],3:[function(_dereq_,module,exports){
'use strict';

module.exports = function assign(target) {
  var objs = Array.prototype.slice.call(arguments, 1);

  objs.forEach(function (obj) {
    if (typeof obj !== 'object') { return; }

    Object.keys(obj).forEach(function (key) {
      target[key] = obj[key];
    });
  });

  return target;
}

},{}],4:[function(_dereq_,module,exports){
module.exports={
  "src": "about:blank",
  "frameBorder": 0,
  "allowtransparency": true,
  "scrolling": "no"
}

},{}],5:[function(_dereq_,module,exports){
'use strict';

module.exports = function setAttributes(element, attributes) {
  var value;

  for (var key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      value = attributes[key];

      if (value == null) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    }
  }
};

},{}],6:[function(_dereq_,module,exports){
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

  if (authAttrs.tokenizationKey) {
    attrs.tokenizationKey = authAttrs.tokenizationKey;
  } else {
    attrs.authorizationFingerprint = authAttrs.authorizationFingerprint;
  }

  return attrs;
}

module.exports = addMetadata;

},{"./constants":11,"./create-authorization-data":13,"./json-clone":17}],7:[function(_dereq_,module,exports){
'use strict';

var constants = _dereq_('./constants');
var addMetadata = _dereq_('./add-metadata');

function _millisToSeconds(millis) {
  return Math.floor(millis / 1000);
}

function sendAnalyticsEvent(client, kind, callback) {
  var configuration = client.getConfiguration();
  var request = client._request;
  var timestamp = _millisToSeconds(Date.now());
  var url = configuration.gatewayConfiguration.analytics.url;
  var data = {
    analytics: [{kind: kind, timestamp: timestamp}]
  };

  request({
    url: url,
    method: 'post',
    data: addMetadata(configuration, data),
    timeout: constants.ANALYTICS_REQUEST_TIMEOUT_MS
  }, callback);
}

module.exports = {
  sendEvent: sendAnalyticsEvent
};

},{"./add-metadata":6,"./constants":11}],8:[function(_dereq_,module,exports){
'use strict';

var BT_ORIGIN_REGEX = /^https:\/\/([a-zA-Z0-9-]+\.)*(braintreepayments|braintreegateway|paypal)\.com(:\d{1,5})?$/;

function checkOrigin(postMessageOrigin, merchantUrl) {
  var merchantOrigin, merchantHost;
  var a = document.createElement('a');

  a.href = merchantUrl;

  if (a.protocol === 'https:') {
    merchantHost = a.host.replace(/:443$/, '');
  } else if (a.protocol === 'http:') {
    merchantHost = a.host.replace(/:80$/, '');
  } else {
    merchantHost = a.host;
  }

  merchantOrigin = a.protocol + '//' + merchantHost;

  return merchantOrigin === postMessageOrigin || BT_ORIGIN_REGEX.test(postMessageOrigin);
}

module.exports = {
  checkOrigin: checkOrigin
};

},{}],9:[function(_dereq_,module,exports){
'use strict';

var enumerate = _dereq_('../enumerate');

module.exports = enumerate([
  'CONFIGURATION_REQUEST'
], 'bus:');

},{"../enumerate":15}],10:[function(_dereq_,module,exports){
'use strict';

var bus = _dereq_('framebus');
var events = _dereq_('./events');
var checkOrigin = _dereq_('./check-origin').checkOrigin;
var BraintreeError = _dereq_('../error');

function BraintreeBus(options) {
  options = options || {};

  this.channel = options.channel;
  if (!this.channel) {
    throw new BraintreeError({
      type: BraintreeError.types.INTERNAL,
      message: 'Channel ID must be specified.'
    });
  }

  this.merchantUrl = options.merchantUrl;

  this._isDestroyed = false;
  this._isVerbose = false;

  this._listeners = [];

  this._log('new bus on channel ' + this.channel, [location.href]);
}

BraintreeBus.prototype.on = function (eventName, originalHandler) {
  var namespacedEvent, args;
  var handler = originalHandler;
  var self = this;

  if (this._isDestroyed) { return; }

  if (this.merchantUrl) {
    handler = function () {
      /* eslint-disable no-invalid-this */
      if (checkOrigin(this.origin, self.merchantUrl)) {
        originalHandler.apply(this, arguments);
      }
      /* eslint-enable no-invalid-this */
    };
  }

  namespacedEvent = this._namespaceEvent(eventName);
  args = Array.prototype.slice.call(arguments);
  args[0] = namespacedEvent;
  args[1] = handler;

  this._log('on', args);
  bus.on.apply(bus, args);

  this._listeners.push({
    eventName: eventName,
    handler: handler,
    originalHandler: originalHandler
  });
};

BraintreeBus.prototype.emit = function (eventName) {
  var args;

  if (this._isDestroyed) { return; }

  args = Array.prototype.slice.call(arguments);
  args[0] = this._namespaceEvent(eventName);

  this._log('emit', args);
  bus.emit.apply(bus, args);
};

BraintreeBus.prototype._offDirect = function (eventName) {
  var args = Array.prototype.slice.call(arguments);

  if (this._isDestroyed) { return; }

  args[0] = this._namespaceEvent(eventName);

  this._log('off', args);
  bus.off.apply(bus, args);
};

BraintreeBus.prototype.off = function (eventName, originalHandler) {
  var i, listener;
  var handler = originalHandler;

  if (this._isDestroyed) { return; }

  if (this.merchantUrl) {
    for (i = 0; i < this._listeners.length; i++) {
      listener = this._listeners[i];

      if (listener.originalHandler === originalHandler) {
        handler = listener.handler;
      }
    }
  }

  this._offDirect(eventName, handler);
};

BraintreeBus.prototype._namespaceEvent = function (eventName) {
  return ['braintree', this.channel, eventName].join(':');
};

BraintreeBus.prototype.teardown = function () {
  var listener, i;

  for (i = 0; i < this._listeners.length; i++) {
    listener = this._listeners[i];
    this._offDirect(listener.eventName, listener.handler);
  }

  this._listeners.length = 0;

  this._isDestroyed = true;
};

BraintreeBus.prototype._log = function (functionName, args) {
  if (this._isVerbose) {
    console.log(functionName, args); // eslint-disable-line no-console
  }
};

BraintreeBus.events = events;

module.exports = BraintreeBus;

},{"../error":16,"./check-origin":8,"./events":9,"framebus":1}],11:[function(_dereq_,module,exports){
'use strict';

var VERSION = "3.0.0-beta.9";
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

},{}],12:[function(_dereq_,module,exports){
'use strict';

var BraintreeError = _dereq_('./error');

module.exports = function (instance, methodNames) {
  methodNames.forEach(function (methodName) {
    instance[methodName] = function () {
      throw new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: methodName + ' cannot be called after teardown.'
      });
    };
  });
};

},{"./error":16}],13:[function(_dereq_,module,exports){
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
    data.attrs.tokenizationKey = authorization;
    data.configUrl = apiUrls[parsedTokenizationKey.environment] + '/merchants/' + parsedTokenizationKey.merchantId + '/client_api/v1/configuration';
  } else {
    parsedClientToken = JSON.parse(atob(authorization));
    data.attrs.authorizationFingerprint = parsedClientToken.authorizationFingerprint;
    data.configUrl = parsedClientToken.configUrl;
  }

  return data;
}

module.exports = createAuthorizationData;

},{"../lib/polyfill":19}],14:[function(_dereq_,module,exports){
'use strict';

module.exports = function (fn) {
  return function () {
    // IE9 doesn't support passing arguments to setTimeout so we have to emulate it.
    var args = arguments;

    setTimeout(function () {
      fn.apply(null, args);
    }, 1);
  };
};

},{}],15:[function(_dereq_,module,exports){
'use strict';

function enumerate(values, prefix) {
  prefix = prefix == null ? '' : prefix;

  return values.reduce(function (enumeration, value) {
    enumeration[value] = prefix + value;
    return enumeration;
  }, {});
}

module.exports = enumerate;

},{}],16:[function(_dereq_,module,exports){
'use strict';

var enumerate = _dereq_('./enumerate');

/**
 * @class
 * @global
 * @param {object} options Construction options
 * @classdesc This class is used to report error conditions, frequently as the first parameter to callbacks throughout the Braintree SDK.
 * @description <strong>You cannot use this constructor directly. Interact with instances of this class through {@link callback callbacks}.</strong>
 */
function BraintreeError(options) {
  if (!BraintreeError.types.hasOwnProperty(options.type)) {
    throw new Error(options.type + ' is not a valid type.');
  }

  if (!options.message) {
    throw new Error('Error message required.');
  }

  /**
   * @type {string}
   * @description A short description of the error.
   */
  this.message = options.message;

  /**
   * @type {BraintreeError.types}
   * @description The type of error.
   */
  this.type = options.type;

  /**
   * @type {object=}
   * @description Additional information about the error, such as an underlying network error response.
   */
  this.details = options.details;
}

BraintreeError.prototype = Object.create(Error.prototype);
BraintreeError.prototype.constructor = BraintreeError;

/**
 * Enum for {@link BraintreeError} types.
 * @name BraintreeError.types
 * @enum
 * @readonly
 * @memberof BraintreeError
 * @property {string} CUSTOMER An error caused by the customer.
 * @property {string} MERCHANT An error that is actionable by the merchant.
 * @property {string} NETWORK An error due to a network problem.
 * @property {string} INTERNAL An error caused by Braintree code.
 * @property {string} UNKNOWN An error where the origin is unknown.
 */
BraintreeError.types = enumerate([
  'CUSTOMER',
  'MERCHANT',
  'NETWORK',
  'INTERNAL',
  'UNKNOWN'
]);

module.exports = BraintreeError;

},{"./enumerate":15}],17:[function(_dereq_,module,exports){
'use strict';

module.exports = function (value) {
  return JSON.parse(JSON.stringify(value));
};

},{}],18:[function(_dereq_,module,exports){
'use strict';

module.exports = function (obj) {
  return Object.keys(obj).filter(function (key) {
    return typeof obj[key] === 'function';
  });
};

},{}],19:[function(_dereq_,module,exports){
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
},{}],20:[function(_dereq_,module,exports){
'use strict';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;

    return v.toString(16);
  });
}

module.exports = uuid;

},{}],21:[function(_dereq_,module,exports){
'use strict';
/** @module braintree-web/unionpay */

var VERSION = "3.0.0-beta.9";
var UnionPay = _dereq_('./shared/unionpay');
var BraintreeError = _dereq_('../lib/error');
var analytics = _dereq_('../lib/analytics');
var deferred = _dereq_('../lib/deferred');

function create(options, callback) {
  var config, clientVersion;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'UnionPay creation requires a callback.'
    });
  }

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.client is required when instantiating UnionPay.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'Client (version ' + clientVersion + ') and UnionPay (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (!config.gatewayConfiguration.unionPay || config.gatewayConfiguration.unionPay.enabled !== true) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'UnionPay is not enabled for this merchant.'
    }));
    return;
  }

  analytics.sendEvent(options.client, 'web.unionpay.initialized');

  callback(null, new UnionPay(options));
}

module.exports = {
  /**
   * @static
   * @function
   * @param {object} options Object containing configuration options for this module.
   * @param {Client} options.client A {@link Client} instance.
   * @example
   * braintree.unionpay.create({ client: clientInstance }, function (createErr, unionpayInstance) {
   *   if (createErr) {
   *     console.error(createErr);
   *     return;
   *   }
   *   // ...
   * });
   * @returns {@link UnionPay}
   */
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};

},{"../lib/analytics":7,"../lib/deferred":14,"../lib/error":16,"./shared/unionpay":23}],22:[function(_dereq_,module,exports){
'use strict';

var enumerate = _dereq_('../../lib/enumerate');

module.exports = {
  events: enumerate([
    'HOSTED_FIELDS_FETCH_CAPABILITIES',
    'HOSTED_FIELDS_ENROLL',
    'HOSTED_FIELDS_TOKENIZE'
  ], 'union-pay:'),
  HOSTED_FIELDS_FRAME_NAME: 'braintreeunionpayhostedfields',
  INVALID_HOSTED_FIELDS_ERROR_MESSAGE: 'Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance.',
  CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE: 'A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance.',
  CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE: 'Please supply either a card or a Hosted Fields instance, not both.',
  NO_HOSTED_FIELDS_ERROR_MESSAGE: 'Could not find the Hosted Fields instance.'
};

},{"../../lib/enumerate":15}],23:[function(_dereq_,module,exports){
'use strict';

var BraintreeError = _dereq_('../../lib/error');
var Bus = _dereq_('../../lib/bus');
var analytics = _dereq_('../../lib/analytics');
var iFramer = _dereq_('iframer');
var uuid = _dereq_('../../lib/uuid');
var methods = _dereq_('../../lib/methods');
var deferred = _dereq_('../../lib/deferred');
var convertMethodsToError = _dereq_('../../lib/convert-methods-to-error');
var VERSION = "3.0.0-beta.9";
var constants = _dereq_('./constants');
var events = constants.events;

/**
 * @class
 * @param {object} options See {@link module:braintree-web/unionpay.create|unionpay.create}.
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/unionpay.create|braintree-web.unionpay.create} instead.</strong>
 * @classdesc This class represents a UnionPay component. Instances of this class have methods for {@link UnionPay#fetchCapabilities fetching capabilities} of UnionPay cards, {@link UnionPay#enroll enrolling} a UnionPay card, and {@link UnionPay#tokenize tokenizing} a UnionPay card.
 */
function UnionPay(options) {
  this._options = options;
}

/**
 * @typedef {object} UnionPay~fetchCapabilitiesPayload
 * @property {boolean} isUnionPay Determines if this card is a UnionPay card.
 * @property {boolean} isDebit Determines if this card is a debit card. This property is only present if `isUnionPay` is `true`.
 * @property {object} unionPay UnionPay specific properties. This property is only present if `isUnionPay` is `true`.
 * @property {boolean} unionPay.supportsTwoStepAuthAndCapture Determines if the card allows for an authorization, but settling the transaction later.
 * @property {boolean} unionPay.isUnionPayEnrollmentRequired Notifies if {@link UnionPay#enroll|enrollment} should be completed.
 */

/**
 * Fetches the capabilities of a card, including whether or not the card needs to be enrolled before use. If the card needs to be enrolled, use {@link UnionPay#enroll|enroll}.
 * @public
 * @param {object} options UnionPay {@link UnionPay#fetchCapabilities fetchCapabilities} options
 * @param {object} [options.card] The card from which to fetch capabilities. Note that this will only have one property, `number`. Required if you are not using the `hostedFields` option.
 * @param {string} options.card.number Card number.
 * @param {HostedFields} [options.hostedFields] The Hosted Fields instance used to collect card data. Required if you are not using the `card` option.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link UnionPay#fetchCapabilitiesPayload fetchCapabilitiesPayload}.
 * @example <caption>With raw card data</caption>
 * unionpayInstance.fetchCapabilities({
 *   card: {
 *     number: '4111111111111111'
 *   }
 * }, function (fetchErr, cardCapabilities) {
 *   if (fetchErr) {
 *     console.error(fetchErr);
 *     return;
 *   }
 *
 *   if (cardCapabilities.isUnionPay) {
 *     if (cardCapabilities.isDebit) {
 *       // CVV and expiration date are not required
 *     } else {
 *       // CVV and expiration date are required
 *     }
 *   }
 *
 *   if (cardCapabilities.unionPay && cardCapabilities.unionPay.isUnionPayEnrollmentRequired) {
 *     // Show mobile phone number field for enrollment
 *   }
 * });
 * @example <caption>With Hosted Fields</caption>
 * // Fetch capabilities on `blur` inside of the Hosted Fields `create` callback
 * hostedFieldsInstance.on('blur', function (event) {
 *   // Only attempt to fetch capabilities when a valid card number has been entered
 *   if (event.emittedBy === 'number' && event.fields.number.isValid) {
 *     unionpayInstance.fetchCapabilities({
 *       hostedFields: hostedFieldsInstance
 *     }, function (fetchErr, cardCapabilities) {
 *       if (fetchErr) {
 *         console.error(fetchErr);
 *         return;
 *       }
 *
 *       if (cardCapabilities.isUnionPay) {
 *         if (cardCapabilities.isDebit) {
 *           // CVV and expiration date are not required
 *           // Hide the containers with your `cvv` and `expirationDate` fields
 *         } else {
 *           // CVV and expiration date are required
 *         }
 *       } else {
 *         // Not a UnionPay card
 *         // When form is complete, tokenize using your Hosted Fields instance
 *       }
 *
 *       if (cardCapabilities.unionPay && cardCapabilities.unionPay.isUnionPayEnrollmentRequired) {
 *         // Show your own mobile country code and phone number inputs for enrollment
 *       }
 *     });
 *   });
 * });
 * @returns {void}
 */
UnionPay.prototype.fetchCapabilities = function (options, callback) {
  var client = this._options.client;
  var cardNumber = options.card ? options.card.number : null;
  var hostedFields = options.hostedFields;

  callback = deferred(callback);

  if (cardNumber && hostedFields) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE
    }));
    return;
  } else if (cardNumber) {
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
        callback(new BraintreeError({
          type: BraintreeError.types.NETWORK,
          message: 'Fetch capabilities network error.',
          details: {
            originalError: err
          }
        }));
        analytics.sendEvent(client, 'web.unionpay.capabilities-failed');
        return;
      }

      analytics.sendEvent(client, 'web.unionpay.capabilities-received');
      callback(null, response);
    });
  } else if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.INVALID_HOSTED_FIELDS_ERROR_MESSAGE
      }));
      return;
    }
    this._initializeHostedFields(function () {
      this._bus.emit(events.HOSTED_FIELDS_FETCH_CAPABILITIES, {hostedFields: hostedFields}, function (response) {
        if (response.err) {
          callback(new BraintreeError(response.err));
          return;
        }

        callback(null, response.payload);
      });
    }.bind(this));
  } else {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE
    }));
    return;
  }
};

/**
 * @typedef {object} UnionPay~enrollPayload
 * @property {string} enrollmentId UnionPay enrollment ID. This value should be passed to `tokenize`.
 */

/**
 * Enrolls a UnionPay card. Only call this method if the card needs to be enrolled. Use {@link UnionPay#fetchCapabilities|fetchCapabilities} to determine if the user's card needs to be enrolled.
 * @public
 * @param {object} options UnionPay enrollment options:
 * @param {object} [options.card] The card to enroll. Required if you are not using the `hostedFields` option.
 * @param {string} options.card.number The card number.
 * @param {string} [options.card.expirationDate] The card's expiration date. May be in the form `MM/YY` or `MM/YYYY`. When defined `expirationMonth` and `expirationYear` are ignored.
 * @param {string} [options.card.expirationMonth] The card's expiration month. This should be used with the `expirationYear` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {string} [options.card.expirationYear] The card's expiration year. This should be used with the `expirationMonth` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {HostedFields} [options.hostedFields] The Hosted Fields instance used to collect card data. Required if you are not using the `card` option.
 * @param {object} options.mobile The mobile information collected from the customer.
 * @param {string} options.mobile.countryCode The country code of the customer's mobile phone number.
 * @param {string} options.mobile.number The customer's mobile phone number.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link UnionPay~enrollPayload|enrollPayload}.
 * @example <caption>With raw card data</caption>
 * unionpayInstance.enroll({
 *   card: {
 *     number: '4111111111111111',
 *     expirationMonth: '12',
 *     expirationYear: '2038'
 *   },
 *   mobile: {
 *     countryCode: '62',
 *     number: '111111111111'
 *   }
 * }, function (enrollErr, response) {
 *   if (enrollErr) {
 *      console.error(enrollErr);
 *      return;
 *   }
 *
 *   // Wait for SMS auth code from customer
 *   // Then use response.enrollmentId in tokenization
 * });
 * @example <caption>With Hosted Fields</caption>
 * unionpayInstance.enroll({
 *   hostedFields: hostedFields,
 *   mobile: {
 *     countryCode: '62',
 *     number: '111111111111'
 *   }
 * }, function (enrollErr, response) {
 *   if (enrollErr) {
 *     console.error(enrollErr);
 *     return;
 *   }
 *
 *   // Wait for SMS auth code from customer
 *   // Then use response.enrollmentId in tokenization
 * });
 * @returns {void}
 */
UnionPay.prototype.enroll = function (options, callback) {
  var client = this._options.client;
  var card = options.card;
  var mobile = options.mobile;
  var hostedFields = options.hostedFields;
  var data;

  callback = deferred(callback);

  if (!mobile) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'A `mobile` with `countryCode` and `number` is required.'
    }));
    return;
  }

  if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.INVALID_HOSTED_FIELDS_ERROR_MESSAGE
      }));
      return;
    } else if (card) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE
      }));
      return;
    }

    this._initializeHostedFields(function () {
      this._bus.emit(events.HOSTED_FIELDS_ENROLL, {hostedFields: hostedFields, mobile: mobile}, function (response) {
        if (response.err) {
          callback(new BraintreeError(response.err));
          return;
        }

        callback(null, response.payload);
      });
    }.bind(this));
  } else if (card && card.number) {
    data = {
      _meta: {source: 'unionpay'},
      unionPayEnrollment: {
        number: card.number,
        mobileCountryCode: mobile.countryCode,
        mobileNumber: mobile.number
      }
    };

    if (card.expirationDate) {
      data.unionPayEnrollment.expirationDate = card.expirationDate;
    } else if (card.expirationMonth || card.expirationYear) {
      if (card.expirationMonth && card.expirationYear) {
        data.unionPayEnrollment.expirationYear = card.expirationYear;
        data.unionPayEnrollment.expirationMonth = card.expirationMonth;
      } else {
        callback(new BraintreeError({
          type: BraintreeError.types.MERCHANT,
          message: 'You must supply expiration month and year or neither.'
        }));
        return;
      }
    }

    client.request({
      method: 'post',
      endpoint: 'union_pay_enrollments',
      data: data
    }, function (err, response, status) {
      var message, type;

      if (err) {
        if (status < 500) {
          type = BraintreeError.types.CUSTOMER;
          message = 'Enrollment invalid due to customer input error.';
        } else {
          type = BraintreeError.types.NETWORK;
          message = 'An enrollment network error occurred.';
        }

        analytics.sendEvent(client, 'web.unionpay.enrollment-failed');
        callback(new BraintreeError({
          type: type,
          message: message,
          details: {
            originalError: err
          }
        }));
        return;
      }

      analytics.sendEvent(client, 'web.unionpay.enrollment-succeeded');
      callback(null, {enrollmentId: response.unionPayEnrollmentId});
    });
  } else {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE
    }));
    return;
  }
};

/**
 * @typedef {object} UnionPay~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type Always <code>CreditCard</code>.
 * @property {object} details Additional account details:
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastTwo Last two digits of card number.
 * @property {string} description A human-readable description.
 */

/**
 * Tokenizes a UnionPay card and returns a nonce payload.
 * @public
 * @param {object} options UnionPay tokenization options:
 * @param {object} [options.card] The card to enroll. Required if you are not using the `hostedFields` option.
 * @param {string} options.card.number The card number.
 * @param {string} [options.card.expirationDate] The card's expiration date. May be in the form `MM/YY` or `MM/YYYY`. When defined `expirationMonth` and `expirationYear` are ignored.
 * @param {string} [options.card.expirationMonth] The card's expiration month. This should be used with the `expirationYear` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {string} [options.card.expirationYear] The card's expiration year. This should be used with the `expirationMonth` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {string} [options.card.cvv] The card's security number.
 * @param {HostedFields} [options.hostedFields] The Hosted Fields instance used to collect card data. Required if you are not using the `card` option.
 * @param {string} options.enrollmentId The enrollment ID if {@link UnionPay#enroll} was required.
 * @param {string} options.smsCode The SMS code recieved from the user if {@link UnionPay#enroll} was required.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link UnionPay~tokenizePayload|tokenizePayload}.
 * @example <caption>With raw card data</caption>
 * unionpayInstance.tokenize({
 *   card: {
 *     number: '4111111111111111',
 *     expirationMonth: '12',
 *     expirationYear: '2038',
 *     cvv: '123'
 *   },
 *   enrollmentId: enrollResponse.enrollmentId, // Returned from enroll
 *   smsCode: '11111' // Sent to customer's phone
 * }, function (tokenizeErr, response) {
 *   if (tokenizeErr) {
 *     console.error(tokenizeErr);
 *     return;
 *   }
 *
 *   // Send response.nonce to your server
 * });
 * @example <caption>With Hosted Fields</caption>
 * unionpayInstance.tokenize({
 *   hostedFields: hostedFieldsInstance,
 *   enrollmentId: enrollResponse.enrollmentId, // Returned from enroll
 *   smsCode: '11111' // Sent to customer's phone
 * }, function (tokenizeErr, response) {
 *   if (tokenizeErr) {
 *     console.error(tokenizeErr);
 *     return;
 *   }
 *
 *   // Send response.nonce to your server
 * });
 * @returns {void}
 */
UnionPay.prototype.tokenize = function (options, callback) {
  var data, tokenizedCard;
  var client = this._options.client;
  var card = options.card;
  var hostedFields = options.hostedFields;

  callback = deferred(callback);

  if (card && hostedFields) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE
    }));
    return;
  } else if (card) {
    data = {
      _meta: {source: 'unionpay'},
      creditCard: {
        number: options.card.number,
        options: {
          unionPayEnrollment: {
            id: options.enrollmentId,
            smsCode: options.smsCode
          }
        }
      }
    };

    if (card.expirationDate) {
      data.creditCard.expirationDate = card.expirationDate;
    } else if (card.expirationMonth && card.expirationYear) {
      data.creditCard.expirationYear = card.expirationYear;
      data.creditCard.expirationMonth = card.expirationMonth;
    }

    if (options.card.cvv) {
      data.creditCard.cvv = options.card.cvv;
    }

    client.request({
      method: 'post',
      endpoint: 'payment_methods/credit_cards',
      data: data
    }, function (err, response, status) {
      if (err) {
        analytics.sendEvent(client, 'web.unionpay.nonce-failed');

        if (status < 500) {
          callback(new BraintreeError({
            type: BraintreeError.types.CUSTOMER,
            message: 'The supplied card data failed tokenization.',
            details: {
              originalError: err
            }
          }));
        } else {
          callback(new BraintreeError({
            type: BraintreeError.types.NETWORK,
            message: 'A tokenization network error occurred.',
            details: {
              originalError: err
            }
          }));
        }

        return;
      }

      tokenizedCard = response.creditCards[0];
      delete tokenizedCard.consumed;
      delete tokenizedCard.threeDSecureInfo;
      delete tokenizedCard.type;

      analytics.sendEvent(client, 'web.unionpay.nonce-received');
      callback(null, tokenizedCard);
    });
  } else if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.INVALID_HOSTED_FIELDS_ERROR_MESSAGE
      }));
      return;
    }

    this._initializeHostedFields(function () {
      this._bus.emit(events.HOSTED_FIELDS_TOKENIZE, options, function (response) {
        if (response.err) {
          callback(new BraintreeError(response.err));
          return;
        }

        callback(null, response.payload);
      });
    }.bind(this));
  } else {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE
    }));
    return;
  }
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/unionpay.create|create}. This only needs to be called when using UnionPay with Hosted Fields.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * unionpayInstance.teardown(function (teardownErr) {
 *   if (teardownErr) {
 *     console.error('Could not tear down UnionPay.');
 *   } else {
 *     console.log('UnionPay has been torn down.');
 *   }
 * });
 * @returns {void}
 */
UnionPay.prototype.teardown = function (callback) {
  if (this._bus) {
    this._hostedFieldsFrame.parentNode.removeChild(this._hostedFieldsFrame);
    this._bus.teardown();
  }

  convertMethodsToError(this, methods(UnionPay.prototype));

  if (typeof callback === 'function') {
    callback = deferred(callback);
    callback();
  }
};

UnionPay.prototype._initializeHostedFields = function (callback) {
  var componentId = uuid();

  if (this._bus) {
    callback();
    return;
  }

  this._bus = new Bus({
    channel: componentId,
    merchantUrl: location.href
  });
  this._hostedFieldsFrame = iFramer({
    name: constants.HOSTED_FIELDS_FRAME_NAME + '_' + componentId,
    src: this._options.client.getConfiguration().gatewayConfiguration.assetsUrl + '/web/' + VERSION + '/html/unionpay-hosted-fields-frame.html',
    height: 0,
    width: 0
  });

  this._bus.on(Bus.events.CONFIGURATION_REQUEST, function (reply) {
    reply(this._options.client);

    callback();
  }.bind(this));

  document.body.appendChild(this._hostedFieldsFrame);
};

module.exports = UnionPay;

},{"../../lib/analytics":7,"../../lib/bus":10,"../../lib/convert-methods-to-error":12,"../../lib/deferred":14,"../../lib/error":16,"../../lib/methods":18,"../../lib/uuid":20,"./constants":22,"iframer":2}]},{},[21])(21)
});