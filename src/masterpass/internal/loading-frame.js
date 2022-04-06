"use strict";

var sanitizeUrl = require("@braintree/sanitize-url").sanitizeUrl;
var querystring = require("../../lib/querystring");

function noop() {}

function start() {
  var script = document.createElement("script");
  var config = querystring.parse();
  var envSubdomain = config.environment === "production" ? "" : "sandbox.";

  config.failureCallback = noop;
  config.cancelCallback = noop;
  config.successCallback = noop;
  config.callbackUrl = sanitizeUrl(config.callbackUrl);

  script.type = "text/javascript";
  script.src =
    "https://" +
    envSubdomain +
    "static.masterpass.com/dyn/js/switch/integration/MasterPass.client.js";

  script.onload = function () {
    window.MasterPass.client.checkout(config);
  };

  document.body.appendChild(script);
}

module.exports = {
  start: start,
};
