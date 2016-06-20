'use strict';

var constants = require('../../shared/constants');
var position = require('./position');

module.exports = function composePopupOptions() {
  return [
    constants.POPUP_BASE_OPTIONS,
    'top=' + position.top(),
    'left=' + position.left()
  ].join(',');
};
