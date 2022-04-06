"use strict";

var ajaxIsAvaliable;
var once = require("../../lib/once");
var JSONPDriver = require("./jsonp-driver");
var AJAXDriver = require("./ajax-driver");
var getUserAgent = require("./get-user-agent");
var isHTTP = require("./is-http");

function isAjaxAvailable() {
  if (ajaxIsAvaliable == null) {
    ajaxIsAvaliable = !(isHTTP() && /MSIE\s(8|9)/.test(getUserAgent()));
  }

  return ajaxIsAvaliable;
}

module.exports = function (options, cb) {
  cb = once(cb || Function.prototype);
  options.method = (options.method || "GET").toUpperCase();
  options.timeout = options.timeout == null ? 60000 : options.timeout;
  options.data = options.data || {};

  if (isAjaxAvailable()) {
    AJAXDriver.request(options, cb);
  } else {
    JSONPDriver.request(options, cb);
  }
};
