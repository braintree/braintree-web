'use strict';

var sjcl = require('./vendor/sjcl');
var camelCaseToSnakeCase = require('../lib/camel-case-to-snake-case');

var QA_URL = 'https://assets.qa.braintreepayments.com/data';
var IFRAME_ID_PREFIX = 'braintreeDataFrame-';
var environmentUrls = {
  development: QA_URL,
  qa: QA_URL,
  sandbox: 'https://assets.braintreegateway.com/sandbox/data',
  production: 'https://assets.braintreegateway.com/data'
};
var cachedDeviceData = {};

function setup(o) {
  var options = o != null ? o : {};

  return new Kount(options);
}

function Kount(options) {
  var previouslyInitializedDeviceData = Kount.getCachedDeviceData(options.merchantId);

  if (previouslyInitializedDeviceData) {
    this.deviceData = previouslyInitializedDeviceData;
    this._isCached = true;

    return;
  }

  this._currentEnvironment = this._initializeEnvironment(options);

  sjcl.random.startCollectors();

  this._deviceSessionId = this._generateDeviceSessionId();
  this.deviceData = this._getDeviceData();

  Kount.setCachedDeviceData(options.merchantId, this.deviceData);

  this._iframe = this._setupIFrame();
}

Kount.getCachedDeviceData = function (merchantId) {
  return cachedDeviceData[merchantId];
};

Kount.setCachedDeviceData = function (merchantId, data) {
  cachedDeviceData[merchantId] = data;
};

Kount.prototype.teardown = function () {
  if (!this._isCached) {
    sjcl.random.stopCollectors();

    this._removeIframe();
  }
};

Kount.prototype._removeIframe = function () {
  this._iframe.parentNode.removeChild(this._iframe);
};

Kount.prototype._getDeviceData = function () {
  return camelCaseToSnakeCase({
    deviceSessionId: this._deviceSessionId,
    fraudMerchantId: this._currentEnvironment.id
  });
};

Kount.prototype._generateDeviceSessionId = function () {
  var bits, hexString;

  bits = sjcl.random.randomWords(4, 0);
  hexString = sjcl.codec.hex.fromBits(bits);

  return hexString;
};

Kount.prototype._setupIFrame = function () {
  var params, iframe;
  var self = this;

  params = '?m=' + this._currentEnvironment.id + '&s=' + this._deviceSessionId;

  iframe = document.createElement('iframe');
  iframe.width = 1;
  iframe.id = IFRAME_ID_PREFIX + this._deviceSessionId;
  iframe.height = 1;
  iframe.frameBorder = 0;
  iframe.scrolling = 'no';
  iframe.style.position = 'fixed';
  iframe.style.left = '-999999px';
  iframe.style.top = '-999999px';
  iframe.title = 'Braintree-Kount-iframe';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);
  setTimeout(function () {
    iframe.src = self._currentEnvironment.url + '/logo.htm' + params;
    iframe.innerHTML = '<img src="' + self._currentEnvironment.url + '/logo.gif' + params + '" alt="" />';
  }, 10);

  return iframe;
};

Kount.prototype._initializeEnvironment = function (options) {
  var url = environmentUrls[options.environment];

  if (url == null) {
    throw new Error(options.environment + ' is not a valid environment for kount.environment');
  }

  return {
    url: url,
    name: options.environment,
    id: options.merchantId
  };
};

module.exports = {
  setup: setup,
  Kount: Kount,
  environmentUrls: environmentUrls
};
