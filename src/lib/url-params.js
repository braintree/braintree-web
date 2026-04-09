"use strict";

var querystring = require("./querystring");

function getUrlParams() {
  var targetWindow = window;

  // If in same-origin iframe, prefer top window (where redirect params are)
  try {
    if (window.top && window.top !== window && window.top.location) {
      targetWindow = window.top;
    }
    // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    // Cross-origin iframe - fall back to current window
  }

  return querystring.parse(targetWindow.location.href);
}

module.exports = {
  getUrlParams: getUrlParams,
};
