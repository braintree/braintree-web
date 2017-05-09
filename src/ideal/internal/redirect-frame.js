'use strict';

var Bus = require('../../lib/bus');
var events = require('../shared/events');

function start() {
  var bus = new Bus({
    channel: window.name.split('_')[1]
  });

  bus.emit(events.REDIRECT_PAGE_REACHED);
}

module.exports = {
  start: start
};
