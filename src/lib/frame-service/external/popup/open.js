'use strict';

var composeOptions = require('./compose-options');

module.exports = function openPopup(options) {
  return global.open(
    options.openFrameUrl,
    options.name,
    composeOptions()
  );
};
