'use strict';

var Bus = require('../../../src/lib/bus');

beforeEach(function () {
  this.sandbox.stub(Bus.prototype, 'on');
  this.sandbox.stub(Bus.prototype, 'off');
  this.sandbox.stub(Bus.prototype, 'emit');
  this.sandbox.stub(Bus.prototype, 'teardown');
});
