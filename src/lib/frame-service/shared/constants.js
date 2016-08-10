'use strict';

var POPUP_HEIGHT = 535;
var POPUP_WIDTH = 450;

module.exports = {
  DISPATCH_FRAME_NAME: 'dispatch',
  POPUP_BASE_OPTIONS: 'resizable,scrollbars,height=' + POPUP_HEIGHT + ',width=' + POPUP_WIDTH,
  POPUP_WIDTH: POPUP_WIDTH,
  POPUP_HEIGHT: POPUP_HEIGHT,
  POPUP_POLL_INTERVAL: 100,
  POPUP_CLOSE_TIMEOUT: 100
};
