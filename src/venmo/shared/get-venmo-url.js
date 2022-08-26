"use strict";
var venmoConstants = require("./constants");

function getVenmoUrl(options) {
  if (options.useAllowDesktopWebLogin)
    return venmoConstants.VENMO_WEB_LOGIN_URL;

  if (options.mobileWebFallBack)
    return venmoConstants.VENMO_APP_OR_MOBILE_AUTH_URL;

  return venmoConstants.VENMO_MOBILE_APP_AUTH_ONLY_URL;
}

module.exports = getVenmoUrl;
