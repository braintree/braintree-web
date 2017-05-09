'use strict';

var querystring = require('../../lib/querystring');
var sanitizeHtml = require('../../lib/sanitize-html');
var isWhitelistedDomain = require('../../lib/is-whitelisted-domain');

var TEXT_PARAMS = ['amount', 'currency', 'final_status'];
var REQUIRED_PARAMS = TEXT_PARAMS.concat('redirect_url');

function verifyParams(data) {
  REQUIRED_PARAMS.forEach(function (param) {
    if (typeof data[param] !== 'string') {
      throw new Error(param + ' param must be a string');
    }
  });

  if (!isWhitelistedDomain(data.redirect_url)) {
    throw new Error(data.redirect_url + ' is not a valid whitelisted url');
  }
}

function populateDom(data) {
  var link;

  TEXT_PARAMS.forEach(function (param) {
    var domNode = document.getElementById(param);

    domNode.textContent = sanitizeHtml(data[param]);
  });

  link = document.getElementById('redirect_url');
  link.href = data.redirect_url;
}

function start() {
  var params = querystring.parse();

  verifyParams(params);
  populateDom(params);
}

module.exports = {
  start: start
};
