'use strict';

var composeHostedFieldsUrl = require('../../hosted-fields/external/compose-url');

function getCardForm(client, hostedFieldsInstance) {
  var i, frame;
  var frames = global.parent.frames;
  var assetsUrl = client.getConfiguration().gatewayConfiguration.assetsUrl;
  var hostedFieldsComponentId = hostedFieldsInstance._bus.channel;
  var hostedFieldsFrameUrl = composeHostedFieldsUrl(assetsUrl, hostedFieldsComponentId);

  for (i = 0; i < frames.length; i++) {
    frame = frames[i];

    try {
      if ((frame.location.href === hostedFieldsFrameUrl) && frame.cardForm) { // eslint-disable-line no-extra-parens
        return frame.cardForm;
      }
    } catch (e) { /* ignored */ }
  }

  return null;
}

module.exports = {
  get: getCardForm
};
