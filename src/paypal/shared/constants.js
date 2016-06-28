'use strict';

var POPUP_HEIGHT = 535;
var POPUP_WIDTH = 450;

module.exports = {
  AUTH_INIT_ERROR_MESSAGE: 'Could not initialize PayPal flow.',
  LANDING_FRAME_NAME: 'braintreepaypallanding',
  POPUP_BASE_OPTIONS: 'resizable,scrollbars,height=' + POPUP_HEIGHT + ',width=' + POPUP_WIDTH,
  POPUP_WIDTH: POPUP_WIDTH,
  POPUP_HEIGHT: POPUP_HEIGHT,
  POPUP_POLL_INTERVAL: 100
};
