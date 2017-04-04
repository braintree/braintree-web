'use strict';

var constants = require('../../../shared/constants');
var position = require('./position');

module.exports = function composePopupOptions(options) {
  var height = options.height || constants.DEFAULT_POPUP_HEIGHT;
  var width = options.width || constants.DEFAULT_POPUP_WIDTH;

  return [
    constants.POPUP_BASE_OPTIONS,
    'height=' + height,
    'width=' + width,
    'top=' + position.top(height),
    'left=' + position.left(width)
  ].join(',');
};
