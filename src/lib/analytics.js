"use strict";

var constants = require("./constants");
var metadata = require("./add-metadata");
var assign = require("./assign").assign;

function sendPaypalEvent(clientInstanceOrPromise, eventName, callback) {
  return sendPaypalEventPlusFields(
    clientInstanceOrPromise,
    eventName,
    {},
    callback
  );
}

function sendPaypalEventPlusFields(
  clientInstanceOrPromise,
  eventName,
  extraFields,
  callback
) {
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

      if (extraFields && typeof extraFields === "object") {
        data.tracking = [appendExtraFieldsTo(trackingMeta, extraFields)];
      }

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

function appendExtraFieldsTo(trackingMeta, extraFields) {
  var result = {};
  var allowedExtraFields = assign({}, extraFields);

  Object.keys(allowedExtraFields).forEach(function (field) {
    if (constants.ALLOWED_EXTRA_EVENT_FIELDS.indexOf(field) === -1) {
      delete allowedExtraFields[field];
    }
  });

  result = assign(trackingMeta, allowedExtraFields);

  return result;
}

module.exports = {
  sendEvent: sendPaypalEvent,
  sendEventPlus: sendPaypalEventPlusFields,
};
