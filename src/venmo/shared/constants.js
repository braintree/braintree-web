"use strict";

/**
 * Venmo shared constants
 * @typedef {object} Venmo~venmoConstants
 * @ignore
 * @property {string} VENMO_APP_OR_MOBILE_AUTH_URL A deep-linked url that will open the Venmo app if installed, or navigate to a Venmo web-login experience if the Venmo app is not present.
 * @property {string} VENMO_MOBILE_APP_AUTH_ONLY_URL A deep-linked url that leads to a Venmo dead-end page if the Venmo app is not installed (page asks customer to download the app).
 * @property {string} VENMO_WEB_LOGIN_URL A non-deeplinked url that leads to a Venmo login page. For use when explicitly wanting to avoid using the Venmo mobile app via a deep-linked url.
 */
module.exports = {
  DOCUMENT_VISIBILITY_CHANGE_EVENT_DELAY: 500,
  DEFAULT_PROCESS_RESULTS_DELAY: 1000,
  VENMO_APP_OR_MOBILE_AUTH_URL: "https://venmo.com/go/checkout",
  VENMO_MOBILE_APP_AUTH_ONLY_URL: "https://venmo.com/braintree/checkout",
  VENMO_WEB_LOGIN_URL: "https://account.venmo.com/go/web",
};
