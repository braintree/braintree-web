(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.braintree || (g.braintree = {})).paypal = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

},{"./constants":12,"./create-authorization-data":14,"./json-clone":26}],7:[function(_dereq_,module,exports){
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

},{"./add-metadata":6,"./constants":12}],8:[function(_dereq_,module,exports){
(function (global){
'use strict';

function isOperaMini(ua) {
  ua = ua || global.navigator.userAgent;
  return ua.indexOf('Opera Mini') > -1;
}

function getIEVersion(ua) {
  ua = ua || global.navigator.userAgent;

  if (ua.indexOf('MSIE') !== -1) {
    return parseInt(ua.replace(/.*MSIE ([0-9]+)\..*/, '$1'), 10);
  } else if (/Trident.*rv:11/.test(ua)) {
    return 11;
  }

  return null;
}

module.exports = {
  isOperaMini: isOperaMini,
  getIEVersion: getIEVersion
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(_dereq_,module,exports){
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

},{}],10:[function(_dereq_,module,exports){
'use strict';

var enumerate = _dereq_('../enumerate');

module.exports = enumerate([
  'CONFIGURATION_REQUEST'
], 'bus:');

},{"../enumerate":16}],11:[function(_dereq_,module,exports){
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

},{"../error":17,"./check-origin":9,"./events":10,"framebus":1}],12:[function(_dereq_,module,exports){
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

},{}],13:[function(_dereq_,module,exports){
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

},{"./error":17}],14:[function(_dereq_,module,exports){
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

},{"../lib/polyfill":29}],15:[function(_dereq_,module,exports){
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

},{}],16:[function(_dereq_,module,exports){
'use strict';

function enumerate(values, prefix) {
  prefix = prefix == null ? '' : prefix;

  return values.reduce(function (enumeration, value) {
    enumeration[value] = prefix + value;
    return enumeration;
  }, {});
}

module.exports = enumerate;

},{}],17:[function(_dereq_,module,exports){
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

},{"./enumerate":16}],18:[function(_dereq_,module,exports){
'use strict';

var popup = _dereq_('./popup');
var Bus = _dereq_('../../bus');
var events = _dereq_('../shared/events');
var constants = _dereq_('../shared/constants');
var uuid = _dereq_('../../uuid');
var iFramer = _dereq_('iframer');
var BraintreeError = _dereq_('../../error');

var REQUIRED_CONFIG_KEYS = [
  'name',
  'dispatchFrameUrl',
  'openFrameUrl'
];

function _validateFrameConfiguration(options) {
  if (!options) {
    throw new Error('Valid configuration is required');
  }

  REQUIRED_CONFIG_KEYS.forEach(function (key) {
    if (!options.hasOwnProperty(key)) {
      throw new Error('A valid frame ' + key + ' must be provided');
    }
  });

  if (!(/^[\w_]+$/.test(options.name))) { // eslint-disable-line
    throw new Error('A valid frame name must be provided');
  }
}

function FrameService(options) {
  _validateFrameConfiguration(options);

  this._serviceId = uuid().replace(/-/g, '');

  this._options = {
    name: options.name + '_' + this._serviceId,
    dispatchFrameUrl: options.dispatchFrameUrl,
    openFrameUrl: options.openFrameUrl
  };
  this._state = options.state;

  this._bus = new Bus({channel: this._serviceId});
  this._setBusEvents();
}

FrameService.prototype.initialize = function (callback) {
  var dispatchFrameReadyHandler = function () {
    callback();
    this._bus.off(events.DISPATCH_FRAME_READY, dispatchFrameReadyHandler);
  }.bind(this);

  this._bus.on(events.DISPATCH_FRAME_READY, dispatchFrameReadyHandler);
  this._writeDispatchFrame();
};

FrameService.prototype._writeDispatchFrame = function () {
  var frameName = constants.DISPATCH_FRAME_NAME + '_' + this._serviceId;
  var frameSrc = this._options.dispatchFrameUrl;

  this._dispatchFrame = iFramer({
    name: frameName,
    src: frameSrc,
    height: 0,
    width: 0
  });

  document.body.appendChild(this._dispatchFrame);
};

FrameService.prototype._setBusEvents = function () {
  this._bus.on(events.DISPATCH_FRAME_REPORT, function (res) {
    this.close();

    if (this._onCompleteCallback) {
      this._onCompleteCallback.call(null, res.err, res.payload);
    }

    this._onCompleteCallback = null;
  }.bind(this));

  this._bus.on(Bus.events.CONFIGURATION_REQUEST, function (reply) {
    reply(this._state);
  }.bind(this));
};

FrameService.prototype.open = function (callback) {
  this._onCompleteCallback = callback;

  this._frame = popup.open(this._options);
  this._pollForPopupClose();
};

FrameService.prototype.redirect = function (url) {
  if (this._frame && !this.isFrameClosed()) {
    this._frame.location.href = url;
  }
};

FrameService.prototype.close = function () {
  if (!this.isFrameClosed()) {
    this._frame.close();
  }
};

FrameService.prototype.teardown = function () {
  this.close();
  this._dispatchFrame.parentNode.removeChild(this._dispatchFrame);
  this._dispatchFrame = null;
  this._cleanupFrame();
};

FrameService.prototype.isFrameClosed = function () {
  return this._frame == null || this._frame.closed;
};

FrameService.prototype._cleanupFrame = function () {
  this._frame = null;
  clearInterval(this._popupInterval);
  this._popupInterval = null;
};

FrameService.prototype._pollForPopupClose = function () {
  this._popupInterval = setInterval(function () {
    if (this.isFrameClosed()) {
      this._cleanupFrame();
      if (this._onCompleteCallback) {
        this._onCompleteCallback(new BraintreeError({
          type: BraintreeError.types.CUSTOMER,
          message: constants.FRAME_CLOSED_ERROR_MESSAGE
        }));
      }
    }
  }.bind(this), constants.POPUP_POLL_INTERVAL);

  return this._popupInterval;
};

module.exports = FrameService;

},{"../../bus":11,"../../error":17,"../../uuid":30,"../shared/constants":24,"../shared/events":25,"./popup":21,"iframer":2}],19:[function(_dereq_,module,exports){
'use strict';

var FrameService = _dereq_('./frame-service');

module.exports = {
  create: function createFrameService(options, callback) {
    var frameService = new FrameService(options);

    frameService.initialize(function () {
      callback(frameService);
    });
  }
};

},{"./frame-service":18}],20:[function(_dereq_,module,exports){
'use strict';

var constants = _dereq_('../../shared/constants');
var position = _dereq_('./position');

module.exports = function composePopupOptions() {
  return [
    constants.POPUP_BASE_OPTIONS,
    'top=' + position.top(),
    'left=' + position.left()
  ].join(',');
};

},{"../../shared/constants":24,"./position":23}],21:[function(_dereq_,module,exports){
'use strict';

module.exports = {
  open: _dereq_('./open')
};

},{"./open":22}],22:[function(_dereq_,module,exports){
(function (global){
'use strict';

var composeOptions = _dereq_('./compose-options');

module.exports = function openPopup(options) {
  return global.open(
    options.openFrameUrl,
    options.name,
    composeOptions()
  );
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./compose-options":20}],23:[function(_dereq_,module,exports){
(function (global){
'use strict';

var constants = _dereq_('../../shared/constants');

function top() {
  var windowHeight = global.outerHeight || document.documentElement.clientHeight;
  var windowTop = global.screenY == null ? global.screenTop : global.screenY;

  return center(windowHeight, constants.POPUP_HEIGHT, windowTop);
}

function left() {
  var windowWidth = global.outerWidth || document.documentElement.clientWidth;
  var windowLeft = global.screenX == null ? global.screenLeft : global.screenX;

  return center(windowWidth, constants.POPUP_WIDTH, windowLeft);
}

function center(windowMetric, popupMetric, offset) {
  return (windowMetric - popupMetric) / 2 + offset;
}

module.exports = {
  top: top,
  left: left,
  center: center
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../shared/constants":24}],24:[function(_dereq_,module,exports){
'use strict';

// TODO: May be dependent on payment method in the future
var POPUP_HEIGHT = 535;
var POPUP_WIDTH = 450;

module.exports = {
  DISPATCH_FRAME_NAME: 'dispatch',
  FRAME_CLOSED_ERROR_MESSAGE: 'Frame closed before tokenization could occur.',
  POPUP_BASE_OPTIONS: 'resizable,scrollbars,height=' + POPUP_HEIGHT + ',width=' + POPUP_WIDTH,
  POPUP_WIDTH: POPUP_WIDTH,
  POPUP_HEIGHT: POPUP_HEIGHT,
  POPUP_POLL_INTERVAL: 100,
  POPUP_CLOSE_TIMEOUT: 100
};

},{}],25:[function(_dereq_,module,exports){
'use strict';

var enumerate = _dereq_('../../enumerate');

module.exports = enumerate([
  'DISPATCH_FRAME_READY',
  'DISPATCH_FRAME_REPORT'
], 'frameService:');

},{"../../enumerate":16}],26:[function(_dereq_,module,exports){
'use strict';

module.exports = function (value) {
  return JSON.parse(JSON.stringify(value));
};

},{}],27:[function(_dereq_,module,exports){
'use strict';

module.exports = function (obj) {
  return Object.keys(obj).filter(function (key) {
    return typeof obj[key] === 'function';
  });
};

},{}],28:[function(_dereq_,module,exports){
'use strict';

function once(fn) {
  var called = false;

  return function () {
    if (!called) {
      called = true;
      fn.apply(null, arguments);
    }
  };
}

module.exports = once;

},{}],29:[function(_dereq_,module,exports){
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
},{}],30:[function(_dereq_,module,exports){
'use strict';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;

    return v.toString(16);
  });
}

module.exports = uuid;

},{}],31:[function(_dereq_,module,exports){
'use strict';

var frameService = _dereq_('../../lib/frame-service/external');
var BraintreeError = _dereq_('../../lib/error');
var once = _dereq_('../../lib/once');
var VERSION = "3.0.0-beta.9";
var constants = _dereq_('../shared/constants');
var INTEGRATION_TIMEOUT_MS = _dereq_('../../lib/constants').INTEGRATION_TIMEOUT_MS;
var analytics = _dereq_('../../lib/analytics');
var methods = _dereq_('../../lib/methods');
var deferred = _dereq_('../../lib/deferred');
var getCountry = _dereq_('../shared/get-country');
var convertMethodsToError = _dereq_('../../lib/convert-methods-to-error');

/**
 * @typedef {object} PayPal~tokenizePayload
 * @property {string} nonce The payment method nonce.
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
 */

/**
 * @typedef {object} PayPal~tokenizeReturn
 * @property {Function} close A handle to close the PayPal checkout flow.
 */

/**
 * @class
 * @param {object} options see {@link module:braintree-web/paypal.create|paypal.create}
 * @classdesc This class represents a PayPal component. Instances of this class have methods for launching auth dialogs and other programmatic interactions with the PayPal component.
 */
function PayPal(options) {
  this._client = options.client;
  this._assetsUrl = options.client.getConfiguration().gatewayConfiguration.paypal.assetsUrl + '/web/' + VERSION;
  this._authorizationInProgress = false;
}

PayPal.prototype._initialize = function (callback) {
  var client = this._client;
  var failureTimeout = setTimeout(function () {
    analytics.sendEvent(client, 'web.paypal.load.timed-out');
  }, INTEGRATION_TIMEOUT_MS);

  frameService.create({
    name: constants.LANDING_FRAME_NAME,
    dispatchFrameUrl: this._assetsUrl + '/html/dispatch-frame.html',
    openFrameUrl: this._assetsUrl + '/html/paypal-landing-frame.html'
  }, function (service) {
    this._frameService = service;
    clearTimeout(failureTimeout);
    analytics.sendEvent(client, 'web.paypal.load.succeeded');
    callback();
  }.bind(this));
};

/**
 * Launches the PayPal login flow and returns a nonce payload.
 * @public
 * @param {object} options All tokenization options for the PayPal component.
 * @param {string} options.flow Set to 'checkout' for one-time payment flow, or 'vault' for Vault flow.
 * @param {string} [options.intent=authorize]
 * Checkout flows only.
 * * `authorize` - Submits the transaction for authorization but not settlement.
 * * `sale` - Payment will be immediately submitted for settlement upon creating a transaction.
 * @param {boolean} [options.offerCredit=false] Offers the customer PayPal Credit if they qualify. Checkout flows only.
 * @param {string|number} [options.amount] The amount of the transaction. Required when using the Checkout flow.
 * @param {string} [options.currency] The currency code of the amount, such as 'USD'. Required when using the Checkout flow.
 * @param {string} [options.displayName] The merchant name displayed inside of the PayPal lightbox; defaults to the company name on your Braintree account
 * @param {string} [options.locale=en_us] Use this option to change the language, links, and terminology used in the PayPal flow to suit the country and language of your customer.
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
 * @param {boolean} [options.billingAgreementsDescription] Use this option to set the description of the preapproved payment agreement visible to customers in their PayPal profile. Max 255 characters.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link PayPal~tokenizePayload|tokenizePayload}.
 * @returns {PayPal~tokenizeReturn} A handle to close the PayPal checkout frame.
 */
PayPal.prototype.tokenize = function (options, callback) {
  var client = this._client;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'tokenize must include a callback function.'
    });
  }

  callback = once(deferred(callback));

  if (this._authorizationInProgress) {
    analytics.sendEvent(client, 'web.paypal.tokenization.error.already-opened');

    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'Another tokenization request is active.'
    }));
  } else {
    this._authorizationInProgress = true;

    analytics.sendEvent(client, 'web.paypal.tokenization.opened');
    this._navigateFrameToAuth(options, callback);
    // This MUST happen after _navigateFrameToAuth for Metro browsers to work.
    this._frameService.open(this._createFrameServiceCallback(options, callback));
  }

  return {
    close: function () {
      analytics.sendEvent(client, 'web.paypal.tokenization.closed.by-merchant');
      this._frameService.close();
    }.bind(this)
  };
};

PayPal.prototype._createFrameServiceCallback = function (options, callback) {
  var client = this._client;

  return function (err, params) {
    this._authorizationInProgress = false;

    if (err) {
      if (err.message === constants.FRAME_CLOSED_ERROR_MESSAGE) {
        analytics.sendEvent(client, 'web.paypal.tokenization.closed.by-user');
      }
      callback(err);
    } else {
      this._tokenizePayPal(options, params, callback);
    }
  }.bind(this);
};

PayPal.prototype._tokenizePayPal = function (options, params, callback) {
  var client = this._client;

  client.request({
    endpoint: 'payment_methods/paypal_accounts',
    method: 'post',
    data: this._formatTokenizeData(options, params)
  }, function (err, response) {
    if (err) {
      analytics.sendEvent(client, 'web.paypal.tokenization.failed');
      callback(err instanceof BraintreeError ? err : new BraintreeError({
        type: BraintreeError.types.NETWORK,
        message: 'Could not tokenize user\'s PayPal account.',
        details: err
      }));
    } else {
      analytics.sendEvent(client, 'web.paypal.tokenization.success');
      callback(null, this._formatTokenizePayload(response));
    }
  }.bind(this));
};

PayPal.prototype._formatTokenizePayload = function (response) {
  var payload;
  var account = {};

  if (response.paypalAccounts) {
    account = response.paypalAccounts[0];
  }

  payload = {
    nonce: account.nonce,
    details: {}
  };

  if (account.details && account.details.payerInfo) {
    payload.details = account.details.payerInfo;
  }

  return payload;
};

PayPal.prototype._formatTokenizeData = function (options, params) {
  var gatewayConfiguration = this._client.getConfiguration().gatewayConfiguration;
  var data = {
    paypalAccount: {correlationId: this._frameService._serviceId}
  };

  if (params.ba_token) {
    data.paypalAccount.billingAgreementToken = params.ba_token;
  } else {
    data.paypalAccount.paymentToken = params.paymentId;
    data.paypalAccount.payerId = params.PayerID;
    data.paypalAccount.unilateral = gatewayConfiguration.paypal.unvettedMerchant;

    if (options.hasOwnProperty('intent')) {
      data.paypalAccount.intent = options.intent;
    }
  }

  return data;
};

PayPal.prototype._navigateFrameToAuth = function (options, callback) {
  var client = this._client;
  var endpoint = 'paypal_hermes/';

  if (options.flow === 'checkout') {
    endpoint += 'create_payment_resource';
  } else if (options.flow === 'vault') {
    endpoint += 'setup_billing_agreement';
  } else {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'PayPal flow property is invalid or missing.'
    }));
    return;
  }

  client.request({
    endpoint: endpoint,
    method: 'post',
    data: this._formatPaymentResourceData(options)
  }, function (err, response) {
    var redirectUrl;

    if (err) {
      callback(err instanceof BraintreeError ? err : new BraintreeError({
        type: BraintreeError.types.NETWORK,
        message: constants.AUTH_INIT_ERROR_MESSSAGE,
        details: err
      }));
      this._frameService.close();
    } else {
      if (options.flow === 'checkout') {
        redirectUrl = response.paymentResource.redirectUrl;
      } else {
        redirectUrl = response.agreementSetup.approvalUrl;
      }

      this._frameService.redirect(redirectUrl);
    }
  }.bind(this));
};

PayPal.prototype._formatPaymentResourceData = function (options) {
  var key;
  var gatewayConfiguration = this._client.getConfiguration().gatewayConfiguration;
  var serviceId = this._frameService._serviceId;
  var paymentResource = {
    returnUrl: gatewayConfiguration.paypal.assetsUrl + '/web/' + VERSION + '/html/paypal-redirect-frame.html?channel=' + serviceId,
    cancelUrl: gatewayConfiguration.paypal.assetsUrl + '/web/' + VERSION + '/html/paypal-cancel-frame.html?channel=' + serviceId,
    correlationId: serviceId,
    experienceProfile: {
      brandName: options.displayName || gatewayConfiguration.paypal.displayName,
      localeCode: getCountry(options.locale),
      noShipping: (!options.enableShippingAddress).toString(),
      addressOverride: options.shippingAddressEditable === false
    }
  };

  if (options.flow === 'checkout') {
    paymentResource.amount = parseFloat(options.amount).toFixed(2);
    paymentResource.currencyIsoCode = options.currency;
    paymentResource.offerPaypalCredit = options.offerCredit === true;

    if (options.hasOwnProperty('intent')) {
      paymentResource.intent = options.intent;
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

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/paypal.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @returns {void}
 */
PayPal.prototype.teardown = function (callback) {
  this._frameService.teardown();

  convertMethodsToError(this, methods(PayPal.prototype));

  analytics.sendEvent(this._client, 'web.paypal.teardown-completed');

  if (typeof callback === 'function') {
    callback = deferred(callback);
    callback();
  }
};

module.exports = PayPal;

},{"../../lib/analytics":7,"../../lib/constants":12,"../../lib/convert-methods-to-error":13,"../../lib/deferred":15,"../../lib/error":17,"../../lib/frame-service/external":19,"../../lib/methods":27,"../../lib/once":28,"../shared/constants":33,"../shared/get-country":34}],32:[function(_dereq_,module,exports){
'use strict';
/** @module braintree-web/paypal */

var PayPal = _dereq_('./external/paypal');
var browserDetection = _dereq_('../lib/browser-detection');
var BraintreeError = _dereq_('../lib/error');
var analytics = _dereq_('../lib/analytics');
var deferred = _dereq_('../lib/deferred');
var VERSION = "3.0.0-beta.9";

function create(options, callback) {
  var config, pp, clientVersion;

  if (!callback) {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'create must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.client is required when instantiating PayPal.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'Client (version ' + clientVersion + ') and PayPal (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (config.gatewayConfiguration.paypalEnabled !== true) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'PayPal is not enabled for this merchant.'
    }));
    return;
  }

  if (!_isBrowserSupported()) {
    callback(new BraintreeError({
      type: BraintreeError.types.CUSTOMER,
      message: 'Browser is not supported.'
    }));
    return;
  }

  analytics.sendEvent(options.client, 'web.paypal.initialized');

  pp = new PayPal(options);
  pp._initialize(function () {
    callback(null, pp);
  });
}

function _isBrowserSupported() {
  return !browserDetection.isOperaMini();
}

module.exports = {
  /**
   * @static
   * @function
   * @param {object} options All creation options for the PayPal component.
   * @param {Client} options.client A {@link Client} instance.
   * @param {callback} callback The second argument, <code>data</code>, is the {@link PayPal} instance.
   * @returns {void}
   */
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};

},{"../lib/analytics":7,"../lib/browser-detection":8,"../lib/deferred":15,"../lib/error":17,"./external/paypal":31}],33:[function(_dereq_,module,exports){
'use strict';

var POPUP_HEIGHT = 535;
var POPUP_WIDTH = 450;

module.exports = {
  AUTH_INIT_ERROR_MESSSAGE: 'Could not initialize PayPal flow.',
  LANDING_FRAME_NAME: 'braintreepaypallanding',
  POPUP_BASE_OPTIONS: 'resizable,scrollbars,height=' + POPUP_HEIGHT + ',width=' + POPUP_WIDTH,
  POPUP_WIDTH: POPUP_WIDTH,
  POPUP_HEIGHT: POPUP_HEIGHT,
  POPUP_POLL_INTERVAL: 100
};

},{}],34:[function(_dereq_,module,exports){
'use strict';

var lookupTable = {
  us: 'en_us',
  gb: 'en_uk',
  uk: 'en_uk',
  de: 'de_de',
  fr: 'fr_fr',
  it: 'it_it',
  es: 'es_es',
  ca: 'en_ca',
  au: 'en_au',
  at: 'de_de',
  be: 'en_us',
  ch: 'de_de',
  dk: 'da_dk',
  nl: 'nl_nl',
  no: 'no_no',
  pl: 'pl_pl',
  se: 'sv_se',
  tr: 'tr_tr',
  bg: 'en_us',
  cy: 'en_us',
  hr: 'en_us',
  is: 'en_us',
  kh: 'en_us',
  mt: 'en_us',
  my: 'en_us',
  ru: 'ru_ru'
};

function getCountry(code) {
  var country = code ? code.toLowerCase().replace(/-/g, '_') : 'us';

  if (country.indexOf('_') !== -1) {
    country = country.split('_')[1];
  }

  country = lookupTable[country] ? country : 'us';

  if (country === 'uk') {
    country = 'gb';
  }

  return country;
}

module.exports = getCountry;

},{}]},{},[32])(32)
});