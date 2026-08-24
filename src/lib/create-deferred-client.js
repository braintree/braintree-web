"use strict";

var BraintreeError = require("./braintree-error");
var assets = require("./assets");
var analytics = require("./analytics");
var assetLoadDetail = require("./asset-load-detail");
var sharedErrors = require("./errors");

var VERSION = process.env.npm_package_version;

function loadClientScript(src, forceReload) {
  var options = { src: src };

  if (forceReload) {
    options.forceScriptReload = true;
  }

  return assets.loadScript(options);
}

function createDeferredClient(options) {
  var didRetry = false;
  var firstError;
  var promise = Promise.resolve();
  var src;

  if (options.client) {
    return Promise.resolve(options.client);
  }

  if (!(window.braintree && window.braintree.client)) {
    src = options.assetsUrl + "/web/" + VERSION + "/js/client.min.js";

    promise = loadClientScript(src, false)
      .catch(function (err) {
        // A load killed by an app suspend caches a rejected promise, so
        // retry once with a cache-busting reload before giving up.
        didRetry = true;
        firstError = err;

        return loadClientScript(src, true);
      })
      .catch(function (err) {
        return Promise.reject(
          new BraintreeError({
            type: sharedErrors.CLIENT_SCRIPT_FAILED_TO_LOAD.type,
            code: sharedErrors.CLIENT_SCRIPT_FAILED_TO_LOAD.code,
            message:
              "Braintree client script failed to load (" +
              (err && err.failureKind ? err.failureKind : "error") +
              ").",
            details: {
              originalError: err,
            },
          })
        );
      });
  }

  return promise
    .then(function () {
      if (window.braintree.client.VERSION !== VERSION) {
        return Promise.reject(
          new BraintreeError({
            type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
            code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
            message:
              "Client (version " +
              window.braintree.client.VERSION +
              ") and " +
              options.name +
              " (version " +
              VERSION +
              ") components must be from the same SDK version.",
          })
        );
      }

      return window.braintree.client.create({
        authorization: options.authorization,
        debug: options.debug,
      });
    })
    .then(function (client) {
      if (didRetry) {
        analytics.sendEventPlus(
          client,
          options.name + ".deferred-client.load-recovered",
          assetLoadDetail(firstError)
        );
      }

      return client;
    });
}

module.exports = {
  create: createDeferredClient,
};
