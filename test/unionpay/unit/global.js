'use strict';

var Bus = require('../../../src/lib/bus');

beforeEach(function () {
  this.sandbox = sinon.sandbox.create();
});

beforeEach(function () {
  this.sandbox.stub(Bus.prototype, 'on');
  this.sandbox.stub(Bus.prototype, 'off');
  this.sandbox.stub(Bus.prototype, 'emit');

  global.bus = {
    on: sinon.stub(),
    emit: sinon.stub()
  };
});

afterEach(function () {
  this.sandbox.restore();
});
