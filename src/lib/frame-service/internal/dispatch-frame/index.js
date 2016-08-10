'use strict';

var Bus = require('../../../bus');
var events = require('../../shared/events');
var clone = require('../../../json-clone');

function start() {
  var serviceChannel = global.name.split('_')[1];
  var configuration;

  global.bus = new Bus({channel: serviceChannel});
  global.bus.emit(Bus.events.CONFIGURATION_REQUEST, function (localConfiguration) {
    configuration = localConfiguration;
    global.bus.emit(events.DISPATCH_FRAME_READY);
  });
  global.getConfiguration = function () {
    return clone(configuration);
  };
}

module.exports = {
  start: start
};
