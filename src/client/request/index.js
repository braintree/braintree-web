"use strict";

var once = require("../../lib/once");
var AJAXDriver = require("./ajax-driver");

module.exports = function (options, cb) {
  cb = once(cb || Function.prototype);
  options.method = (options.method || "GET").toUpperCase();
  options.timeout = options.timeout == null ? 60000 : options.timeout;
  options.data = options.data || {};

  AJAXDriver.request(options, cb);
};
