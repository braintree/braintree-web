"use strict";

var querystring = require("./querystring");

function getUrlParams() {
  return querystring.parse(window.location.href);
}

module.exports = {
  getUrlParams: getUrlParams,
};
