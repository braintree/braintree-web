'use strict';

var composeOptions = require('./compose-options');

module.exports = function openPopup(options) {
  if (global.popupBridge) {
    return global.popupBridge.open(options.openFrameUrl);
  }
  return global.open(
    options.openFrameUrl,
    options.name,
    composeOptions(options)
  );
};
