"use strict";

var constants = require("./constants");
var metadata = require("./add-metadata");

function sendPaypalEvent(clientInstanceOrPromise, eventName, callback) {
  var timestamp = Date.now();

  return Promise.resolve(clientInstanceOrPromise)
    .then(function (client) {
      var request = client._request;
      var url = constants.ANALYTICS_URL;
      var qualifiedEvent = constants.ANALYTICS_PREFIX + eventName;
      var configuration = client.getConfiguration();
      var isProd =
        configuration.gatewayConfiguration.environment === "production";
      var data = {
        events: [],
        tracking: [],
      };
      var trackingMeta = metadata.addEventMetadata(client, data);

      trackingMeta.event_name = qualifiedEvent; // eslint-disable-line camelcase
      trackingMeta.t = timestamp; // eslint-disable-line camelcase

      data.events = [
        {
          level: "info",
          event: qualifiedEvent,
          payload: {
            env: isProd ? "production" : "sandbox",
            timestamp: timestamp,
          },
        },
      ];
      data.tracking = [trackingMeta];

      return request(
        {
          url: url,
          method: "post",
          data: data,
          timeout: constants.ANALYTICS_REQUEST_TIMEOUT_MS,
        },
        callback
      );
    })
    .catch(function (err) {
      if (callback) {
        callback(err);
      }
    });
}

module.exports = {
  sendEvent: sendPaypalEvent,
};
