"use strict";

var Promise = require("./promise");
var constants = require("./constants");
var addMetadata = require("./add-metadata");

function sendAnalyticsEvent(clientInstanceOrPromise, kind, callback) {
  var timestamp = Date.now(); // milliseconds

  return Promise.resolve(clientInstanceOrPromise)
    .then(function (client) {
      var timestampInPromise = Date.now();
      var configuration = client.getConfiguration();
      var request = client._request;
      var url = configuration.gatewayConfiguration.analytics.url;
      var data = {
        analytics: [
          {
            kind: constants.ANALYTICS_PREFIX + kind,
            isAsync:
              Math.floor(timestampInPromise / 1000) !==
              Math.floor(timestamp / 1000),
            timestamp: timestamp,
          },
        ],
      };

      request(
        {
          url: url,
          method: "post",
          data: addMetadata(configuration, data),
          timeout: constants.ANALYTICS_REQUEST_TIMEOUT_MS,
        },
        callback
      );
    })
    .catch(function (err) {
      // for all non-test cases, we don't provide a callback,
      // so this error will always be swallowed. In this case,
      // that's fine, it should only error when the deferred
      // client fails to set up, in which case we don't want
      // that error to report over and over again via these
      // deferred analytics events
      if (callback) {
        callback(err);
      }
    });
}

module.exports = {
  sendEvent: sendAnalyticsEvent,
};
