"use strict";

var BraintreeError = require("./braintree-error");
var sharedErrors = require("./errors");
var VERSION = process.env.npm_package_version;

function basicComponentVerification(options) {
  var client, authorization, name;

  if (!options) {
    return Promise.reject(
      new BraintreeError({
        type: sharedErrors.INVALID_USE_OF_INTERNAL_FUNCTION.type,
        code: sharedErrors.INVALID_USE_OF_INTERNAL_FUNCTION.code,
        message:
          "Options must be passed to basicComponentVerification function.",
      })
    );
  }

  name = options.name;
  client = options.client;
  authorization = options.authorization;

  if (!client && !authorization) {
    return Promise.reject(
      new BraintreeError({
        type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
        code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
        // NEXT_MAJOR_VERSION in major version, we expose passing in authorization for all components
        // instead of passing in a client instance. Leave this a silent feature for now.
        message: "options.client is required when instantiating " + name + ".",
      })
    );
  }

  if (!authorization && client.getVersion() !== VERSION) {
    return Promise.reject(
      new BraintreeError({
        type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
        code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
        message:
          "Client (version " +
          client.getVersion() +
          ") and " +
          name +
          " (version " +
          VERSION +
          ") components must be from the same SDK version.",
      })
    );
  }

  return Promise.resolve();
}

module.exports = {
  verify: basicComponentVerification,
};
