"use strict";

var querystring = require("../../lib/querystring");
var Bus = require("framebus");
var events = require("../shared/events");

module.exports = function (currentURL) {
  var params = querystring.parse(currentURL);
  var bus = new Bus({ channel: params.channel });

  bus.emit(events.AUTHENTICATION_COMPLETE, params);
};
