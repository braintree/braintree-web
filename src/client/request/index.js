'use strict';

var ajaxIsAvaliable;
var JSONPDriver = require('./jsonp-driver');
var AJAXDriver = require('./ajax-driver');
var getUserAgent = require('./get-user-agent');
var isHTTP = require('./is-http');

function isAjaxAvailable() {
  if (ajaxIsAvaliable == null) {
    ajaxIsAvaliable = !(isHTTP() && /MSIE\s(8|9)/.test(getUserAgent()));
  }

  return ajaxIsAvaliable;
}

module.exports = function () {
  var request = isAjaxAvailable() ? AJAXDriver.request : JSONPDriver.request;

  request.apply(null, arguments);
};
