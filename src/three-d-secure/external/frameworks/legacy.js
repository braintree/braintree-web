"use strict";

var BaseFramework = require("./base");
var deferred = require("../../../lib/deferred");

function LegacyFramework(options) {
  BaseFramework.call(this, options);
}

LegacyFramework.prototype = Object.create(BaseFramework.prototype, {
  constructor: LegacyFramework,
});

LegacyFramework.prototype.setUpEventListeners = function () {
  // noop
};

LegacyFramework.prototype.transformV1CustomerBillingAddress = function (
  customer
) {
  customer.billingAddress.line1 = customer.billingAddress.streetAddress;
  customer.billingAddress.line2 = customer.billingAddress.extendedAddress;
  customer.billingAddress.city = customer.billingAddress.locality;
  customer.billingAddress.state = customer.billingAddress.region;
  customer.billingAddress.countryCode =
    customer.billingAddress.countryCodeAlpha2;
  delete customer.billingAddress.streetAddress;
  delete customer.billingAddress.extendedAddress;
  delete customer.billingAddress.locality;
  delete customer.billingAddress.region;
  delete customer.billingAddress.countryCodeAlpha2;

  return customer;
};

LegacyFramework.prototype._createIframe = function (options) {
  var self = this;

  this._setupV1Elements({
    nonce: options.nonce,
    lookupResponse: options.lookupResponse,
    showLoader: options.showLoader,
    handleAuthResponse: function (data) {
      self._handleAuthResponse(data, options);
    },
  });

  return this._v1Iframe;
};

LegacyFramework.prototype._handleAuthResponse = function (data, options) {
  this._v1Bus.teardown();

  options.removeFrame();

  // This also has to be in a setTimeout so it executes after the `removeFrame`.
  deferred(
    function () {
      this._handleV1AuthResponse(data);
    }.bind(this)
  )();
};

LegacyFramework.prototype._checkForFrameworkSpecificVerifyCardErrors =
  function (options) {
    var errorOption;

    if (typeof options.addFrame !== "function") {
      errorOption = "an addFrame function";
    } else if (typeof options.removeFrame !== "function") {
      errorOption = "a removeFrame function";
    }

    return errorOption;
  };

LegacyFramework.prototype._formatVerifyCardOptions = function (options) {
  var modifiedOptions = BaseFramework.prototype._formatVerifyCardOptions.call(
    this,
    options
  );

  modifiedOptions.addFrame = deferred(options.addFrame);
  modifiedOptions.removeFrame = deferred(options.removeFrame);
  modifiedOptions.showLoader = options.showLoader !== false;

  return modifiedOptions;
};

LegacyFramework.prototype._formatLookupData = function (options) {
  var self = this;

  return BaseFramework.prototype._formatLookupData
    .call(this, options)
    .then(function (data) {
      if (options.customer && options.customer.billingAddress) {
        data.customer = self.transformV1CustomerBillingAddress(
          options.customer
        );
      }

      return data;
    });
};

LegacyFramework.prototype._presentChallenge = function (
  lookupResponse,
  options
) {
  options.addFrame(
    null,
    this._createIframe({
      showLoader: options.showLoader,
      lookupResponse: lookupResponse.lookup,
      nonce: lookupResponse.paymentMethod.nonce,
      removeFrame: options.removeFrame,
    })
  );
};

module.exports = LegacyFramework;
