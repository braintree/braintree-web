'use strict';

var Bus = require('../../bus');
var events = require('../shared/events');
var clone = require('../../json-clone');

function start() {
  var serviceChannel = window.name.split('_')[1].split('?')[0];
  var configuration;

  window.bus = new Bus({channel: serviceChannel});
  window.bus.emit(Bus.events.CONFIGURATION_REQUEST, function (localConfiguration) {
    configuration = localConfiguration;
    window.bus.emit(events.DISPATCH_FRAME_READY);
  });
  window.getConfiguration = function () {
    return clone(configuration);
  };
}

module.exports = {
  start: start
};
