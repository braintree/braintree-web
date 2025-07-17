"use strict";

var Bus = require("framebus");
var isVerifiedDomain = require("../../lib/is-verified-domain");
var queryString = require("../../lib/querystring");
var BraintreeError = require("../../lib/braintree-error");
var sanitizeUrl = require("@braintree/sanitize-url").sanitizeUrl;
var Client = require("../../client/client");
var errors = require("../shared/errors");
var BUS_CONFIGURATION_REQUEST_EVENT =
  require("../../lib/constants").BUS_CONFIGURATION_REQUEST_EVENT;

module.exports = function () {
  var bus = new Bus({
    channel: window.name.split("_")[1],
  });
  var params = queryString.parse();

  if (params.showLoader === "true") {
    document.querySelector("#loader").className = "";
  }

  bus.emit(BUS_CONFIGURATION_REQUEST_EVENT, handleConfiguration);
};

// Validates cardinalcommerce domains and subdomains
// @returns Boolean
function isValidCardinalUrl(url) {
  return /^https:\/\/([a-z0-9]+[.])*cardinalcommerce[.]com$/.test(
    url.protocol + "//" + url.hostname
  );
}

function isCardinalCommerce(client, configuration) {
  return new Promise(function (resolve, reject) {
    var parser = document.createElement("a");

    parser.href = configuration.acsUrl;
    if (isValidCardinalUrl(parser)) {
      resolve(configuration.acsUrl);
      return;
    }

    client
      .request({
        api: "clientApi",
        method: "get",
        endpoint: "payment_method_nonces/" + configuration.nonce,
      })
      .then(function (response) {
        resolve(response.threeDSecureInfo.acsUrl);
      })
      .catch(function () {
        reject(new BraintreeError(errors.THREEDS_LOOKUP_ERROR));
      });
  });
}

function handleConfiguration(configuration) {
  return new Promise(function (resolve, reject) {
    var input, field;
    var fields = { pareq: "PaReq", md: "MD", termUrl: "TermUrl" };
    var form = document.createElement("form");
    var client = new Client(configuration.clientConfiguration);

    if (!isVerifiedDomain(configuration.termUrl)) {
      throw new BraintreeError(
        errors.THREEDS_TERM_URL_REQUIRES_BRAINTREE_DOMAIN
      );
    }

    isCardinalCommerce(client, configuration)
      .then(function (acsUrl) {
        form.action = sanitizeUrl(acsUrl);
        form.method = "POST";

        for (field in fields) {
          if (fields.hasOwnProperty(field)) {
            input = document.createElement("input");
            input.name = fields[field];
            input.type = "hidden";
            input.setAttribute("value", configuration[field]);
            form.appendChild(input);
          }
        }

        document.body.appendChild(form);

        form.submit();

        resolve();
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
