'use strict';

var querystring = require('../../lib/querystring');
var once = require('../../lib/once');
var prepBody = require('./prep-body');
var parseBody = require('./parse-body');
var constants = require('./constants');
var isXHRAvailable = global.XMLHttpRequest && 'withCredentials' in new global.XMLHttpRequest();

function getRequestObject() {
  return isXHRAvailable ? new XMLHttpRequest() : new XDomainRequest();
}

function request(options, cb) {
  var status, resBody;
  var method = (options.method || 'GET').toUpperCase();
  var url = options.url;
  var body = options.data || {};
  var timeout = options.timeout == null ? 60000 : options.timeout;
  var req = getRequestObject();
  var callback = once(cb || Function.prototype);

  if (method === 'GET') {
    url = querystring.queryify(url, body);
    body = null;
  }

  if (isXHRAvailable) {
    req.onreadystatechange = function () {
      if (req.readyState !== 4) { return; }

      status = req.status;
      resBody = parseBody(req.responseText);

      if (status === 429) {
        callback(constants.errors.RATE_LIMIT_ERROR, null, 429);
      } else if (status >= 400) {
        callback(resBody || constants.errors.UNKNOWN_ERROR, null, status);
      } else if (status <= 0) {
        callback(resBody || constants.errors.UNKNOWN_ERROR, null, 500);
      } else {
        callback(null, resBody, status);
      }
    };
  } else {
    req.onload = function () {
      callback(null, parseBody(req.responseText), req.status);
    };

    req.onerror = function () {
      callback(constants.errors.UNKNOWN_ERROR, null, req.status);
    };

    // This must remain for IE9 to work
    req.onprogress = function () {};

    req.ontimeout = function () {
      callback(constants.errors.TIMEOUT_ERROR, null, 500);
    };
  }

  req.open(method, url, true);
  req.timeout = timeout;

  if (isXHRAvailable && method === 'POST') {
    req.setRequestHeader('Content-Type', 'application/json');
  }

  try {
    req.send(prepBody(method, body));
  } catch (e) { /* ignored */ }
}

module.exports = {
  request: request
};
