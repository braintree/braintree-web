'use strict';

var Bus = require('../../../src/lib/bus');
var chai = require('chai');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

global.triggerEvent = function (name, target) {
  var event = document.createEvent('Event');

  event.initEvent(name, true, true);
  target.dispatchEvent(event);
};

global.sinon = require('sinon');
global.expect = require('chai').expect;
global.helpers = require('./helpers/index');

beforeEach(function () {
  var fn;

  this.sandbox = sinon.sandbox.create();
  this.sandbox.stub(console, 'warn');

  document.body.innerHTML = '';

  for (fn in Bus.prototype) {
    if (!Bus.prototype.hasOwnProperty(fn)) { continue; }
    if (typeof Bus.prototype[fn] !== 'function') { continue; }

    this.sandbox.stub(Bus.prototype, fn);
  }
});

beforeEach(function () {
  global.bus = {
    on: sinon.stub(),
    emit: sinon.stub()
  };
});

afterEach(function () {
  this.sandbox.restore();
});
