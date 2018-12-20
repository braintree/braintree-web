'use strict';

var Bus = require('../../../src/lib/bus');
var redirect = require('../../../src/lib/redirect');

beforeEach(function () {
  this.sandbox.stub(Bus.prototype, 'on');
  this.sandbox.stub(Bus.prototype, 'off');
  this.sandbox.stub(Bus.prototype, 'emit');
  this.sandbox.stub(redirect, 'sync');
});
