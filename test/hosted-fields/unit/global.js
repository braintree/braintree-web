'use strict';

var Bus = require('../../../src/lib/bus');

global.triggerEvent = function (name, target) {
  var event = document.createEvent('Event');

  event.initEvent(name, true, true);
  target.dispatchEvent(event);
};

global.helpers = require('./helpers/index');

beforeEach(function () {
  var fn;

  this.sandbox.stub(console, 'warn');

  document.body.innerHTML = '';

  for (fn in Bus.prototype) {
    if (!Bus.prototype.hasOwnProperty(fn)) { continue; }
    if (typeof Bus.prototype[fn] !== 'function') { continue; }

    this.sandbox.stub(Bus.prototype, fn);
  }

  global.bus = {
    on: this.sandbox.stub(),
    emit: this.sandbox.stub()
  };
});
