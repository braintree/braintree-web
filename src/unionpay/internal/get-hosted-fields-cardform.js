"use strict";

var composeHostedFieldsUrl = require("../../hosted-fields/external/compose-url");

function getCardForm(client, hostedFieldsInstance) {
  var i, frame;
  var frames = window.parent.frames;
  var clientConfig = client.getConfiguration();
  var assetsUrl = clientConfig.gatewayConfiguration.assetsUrl;
  var isDebug = clientConfig.isDebug;
  var hostedFieldsComponentId = hostedFieldsInstance._bus.channel;
  var hostedFieldsFrameUrl = composeHostedFieldsUrl(
    assetsUrl,
    hostedFieldsComponentId,
    isDebug
  );

  for (i = 0; i < frames.length; i++) {
    frame = frames[i];

    try {
      if (frame.location.href === hostedFieldsFrameUrl && frame.cardForm) {
        return frame.cardForm;
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      /* ignored */
    }
  }

  return null;
}

module.exports = {
  get: getCardForm,
};
