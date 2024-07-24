"use strict";

var loadScript = require("@braintree/asset-loader/load-script");
var loadConnectScript = require("@paypal/accelerated-checkout-loader");

module.exports = {
  loadScript: loadScript,
  loadFastlane: loadConnectScript.loadAxo,
};
