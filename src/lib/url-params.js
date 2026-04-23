"use strict";

var querystring = require("./querystring");

function getUrlParams() {
  var targetUrl = window.location.href;

  // If in same-origin iframe, prefer top window (where redirect params are)
  try {
    if (window.top && window.top !== window && window.top.location) {
      targetUrl = window.top.location.href;
    }
    // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    // Cross-origin iframe - fall back to current window
  }

  return querystring.parse(targetUrl);
}

module.exports = {
  getUrlParams: getUrlParams,
};
