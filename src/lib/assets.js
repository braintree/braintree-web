"use strict";

var loadScript = require("@braintree/asset-loader/load-script");
var loadConnectScript = require("@paypal/fastlane-sdk-loader");

module.exports = {
  loadScript: loadScript,
  loadFastlane: loadConnectScript.loadAxo,
};
