'use strict';

var events = require('../shared/events');
var constants = require('../shared/constants');

function getServiceId() {
  return global.name.split('_')[1];
}

function getFrame() {
  var frameRef = constants.DISPATCH_FRAME_NAME + '_' + getServiceId();
  var frame = global.opener.frames[frameRef];

  if (!frame) {
    throw new Error('Braintree is inactive');
  }

  return frame;
}

function report(err, payload) {
  var frame = getFrame();

  frame.bus.emit(events.DISPATCH_FRAME_REPORT, {
    err: err,
    payload: payload
  });
}

function asyncClose() {
  setTimeout(function () {
    global.close();
  }, constants.POPUP_CLOSE_TIMEOUT);
}

module.exports = {
  asyncClose: asyncClose,
  constants: constants,
  getFrame: getFrame,
  getServiceId: getServiceId,
  report: report
};
