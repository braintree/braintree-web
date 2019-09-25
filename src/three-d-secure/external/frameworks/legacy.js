'use strict';

var BaseFramework = require('./base');
var BraintreeError = require('../../../lib/braintree-error');
var iFramer = require('@braintree/iframer');
var deferred = require('../../../lib/deferred');
var Bus = require('../../../lib/bus');
var uuid = require('../../../lib/vendor/uuid');
var constants = require('../../shared/constants');
var useMin = require('../../../lib/use-min');

var events = require('../../shared/events');

var VERSION = process.env.npm_package_version;
var IFRAME_HEIGHT = 400;
var IFRAME_WIDTH = 400;

function LegacyFramework(options) {
  BaseFramework.call(this, options);
}

LegacyFramework.prototype = Object.create(BaseFramework.prototype, {
  constructor: LegacyFramework
});

LegacyFramework.prototype.setUpEventListeners = function () {
  // noop
};

LegacyFramework.prototype.teardown = function () {
  if (this._bus) {
    this._bus.teardown();
  }

  if (this._bankIframe && this._bankIframe.parentNode) {
    this._bankIframe.parentNode.removeChild(this._bankIframe);
  }

  return BaseFramework.prototype.teardown.call(this);
};

LegacyFramework.prototype.transformV1CustomerBillingAddress = function (customer) {
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

LegacyFramework.prototype._createIframe = function (options) {
  var url;
  var parentURL = global.location.href;
  var response = options.response;

  if (parentURL.indexOf('#') > -1) {
    parentURL = parentURL.split('#')[0];
  }

  this._setupBusForIframe(parentURL, response, options);

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

LegacyFramework.prototype._setupBusForIframe = function (parentURL, response, options) {
  var authenticationCompleteBaseUrl;

  this._bus = new Bus({
    channel: uuid(),
    merchantUrl: global.location.href
  });

  authenticationCompleteBaseUrl = this._assetsUrl + '/html/three-d-secure-authentication-complete-frame.html?channel=' + encodeURIComponent(this._bus.channel) + '&';

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
};

LegacyFramework.prototype._handleAuthResponse = function (data, options) {
  var authResponse = JSON.parse(data.auth_response);

  this._bus.teardown();

  options.removeFrame();

  // This also has to be in a setTimeout so it executes after the `removeFrame`.
  deferred(function () {
    if (authResponse.success) {
      this._verifyCardPromisePlus.resolve(this._formatAuthResponse(authResponse.paymentMethod, authResponse.threeDSecureInfo));
    } else if (authResponse.threeDSecureInfo && authResponse.threeDSecureInfo.liabilityShiftPossible) {
      this._verifyCardPromisePlus.resolve(this._formatAuthResponse(this._lookupPaymentMethod, authResponse.threeDSecureInfo));
    } else {
      this._verifyCardPromisePlus.reject(new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'UNKNOWN_AUTH_RESPONSE',
        message: authResponse.error.message
      }));
    }
  }.bind(this))();
};

LegacyFramework.prototype._checkForFrameworkSpecificVerifyCardErrors = function (options) {
  var errorOption;

  if (typeof options.addFrame !== 'function') {
    errorOption = 'an addFrame function';
  } else if (typeof options.removeFrame !== 'function') {
    errorOption = 'a removeFrame function';
  }

  return errorOption;
};

LegacyFramework.prototype._formatVerifyCardOptions = function (options) {
  var modifiedOptions = BaseFramework.prototype._formatVerifyCardOptions.call(this, options);

  modifiedOptions.addFrame = deferred(options.addFrame);
  modifiedOptions.removeFrame = deferred(options.removeFrame);
  modifiedOptions.showLoader = options.showLoader !== false;

  return modifiedOptions;
};

LegacyFramework.prototype._formatLookupData = function (options) {
  var self = this;

  return BaseFramework.prototype._formatLookupData.call(this, options).then(function (data) {
    if (options.customer && options.customer.billingAddress) {
      data.customer = self.transformV1CustomerBillingAddress(options.customer);
    }

    return data;
  });
};

LegacyFramework.prototype._presentChallenge = function (lookupResponse, options) {
  options.addFrame(null, this._createIframe({
    showLoader: options.showLoader,
    response: lookupResponse.lookup,
    removeFrame: options.removeFrame
  }));
};

module.exports = LegacyFramework;
