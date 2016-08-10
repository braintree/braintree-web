'use strict';
/* eslint-disable camelcase */

var sjcl = require('sjcl');

var QA_URL = 'https://assets.qa.braintreepayments.com/data';
var IFRAME_ID = 'braintreeDataFrame';
var environmentUrls = {
  development: QA_URL,
  qa: QA_URL,
  sandbox: 'https://assets.braintreegateway.com/sandbox/data',
  production: 'https://assets.braintreegateway.com/data'
};

function setup(o) {
  var options = o != null ? o : {};

  return new Kount(options);
}

function Kount(options) {
  sjcl.random.startCollectors();

  this._currentEnvironment = this._initializeEnvironment(options);
  this._deviceSessionId = this._generateDeviceSessionId();
  this.deviceData = this._getDeviceData();

  this._iframe = this._setupIFrame();
}

Kount.prototype.teardown = function () {
  sjcl.random.stopCollectors();
  this._removeIframe();
};

Kount.prototype._removeIframe = function () {
  this._iframe.parentNode.removeChild(this._iframe);
};

Kount.prototype._getDeviceData = function () {
  return {
    device_session_id: this._deviceSessionId,
    fraud_merchant_id: this._currentEnvironment.id
  };
};

Kount.prototype._generateDeviceSessionId = function () {
  var bits, hexString;

  bits = sjcl.random.randomWords(4, 0);
  hexString = sjcl.codec.hex.fromBits(bits);

  return hexString;
};

Kount.prototype._setupIFrame = function () {
  var params;
  var self = this;
  var iframe = document.getElementById(IFRAME_ID);

  if (iframe != null) {
    return iframe;
  }

  params = '?m=' + this._currentEnvironment.id + '&s=' + this._deviceSessionId;

  iframe = document.createElement('iframe');
  iframe.width = 1;
  iframe.id = IFRAME_ID;
  iframe.height = 1;
  iframe.frameBorder = 0;
  iframe.scrolling = 'no';

  document.body.appendChild(iframe);
  setTimeout(function () {
    iframe.src = self._currentEnvironment.url + '/logo.htm' + params;
    iframe.innerHTML = '<img src="' + self._currentEnvironment.url + '/logo.gif' + params + '" />';
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
