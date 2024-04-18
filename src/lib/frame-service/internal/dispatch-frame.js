"use strict";

var Bus = require("framebus");
var events = require("../shared/events");
var clone = require("../../json-clone");
var BUS_CONFIGURATION_REQUEST_EVENT =
  require("../../constants").BUS_CONFIGURATION_REQUEST_EVENT;

function start() {
  var serviceChannel = window.name.split("_")[1].split("?")[0];
  var configuration;

  window.bus = new Bus({
    channel: serviceChannel,
    targetFrames: [window.parent],
  });

  window.bus.emit(
    BUS_CONFIGURATION_REQUEST_EVENT,
    function (localConfiguration) {
      configuration = localConfiguration;
      window.bus.emit(events.DISPATCH_FRAME_READY);
    }
  );
  window.getConfiguration = function () {
    return clone(configuration);
  };
}

module.exports = {
  start: start,
};
