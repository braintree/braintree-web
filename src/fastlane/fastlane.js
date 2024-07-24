"use strict";

var BraintreeError = require("../lib/braintree-error");
var errors = require("./errors");
var loadFastlane = require("../lib/assets").loadFastlane;
var wrapPromise = require("@braintree/wrap-promise");
var assign = require("../lib/assign").assign;

function fastlane(options) {
  var config = options.client.getConfiguration();
  var sdkVersion = options.client.getVersion();
  var environment = config.gatewayConfiguration.environment;

  var minified = true;

  if (environment !== "production") {
    minified = false;
  }

  return loadFastlane(
    assign(
      { platform: "BT", btSdkVersion: sdkVersion, minified: minified },
      options
    )
  )
    .then(function (result) {
      var platformOptions = {
        platform: "BT",
        authorization: options.authorization,
        client: options.client,
        deviceData: options.deviceData,
      };

      // We need the following options to be nested inside platformOptions rather than
      // top level
      delete options.authorization;
      delete options.client;
      delete options.deviceData;

      // The following are options that we know are needed for the Fastlane Loader, but which
      // we know are not needed for initializing the fastlane sdk.
      delete options.minified;
      delete options.btSdkVersion;

      return window.braintree.fastlane.create(
        assign({ platformOptions: platformOptions }, options, result.metadata)
      );
    })
    .catch(function (err) {
      return Promise.reject(
        new BraintreeError({
          type: errors.FASTLANE_SDK_LOAD_ERROR.type,
          code: errors.FASTLANE_SDK_LOAD_ERROR.code,
          message: err.message,
        })
      );
    });
}

module.exports = wrapPromise(fastlane);
