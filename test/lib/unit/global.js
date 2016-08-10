'use strict';

var Bus = require('../../../src/lib/bus');
var redirect = require('../../../src/lib/redirect');

beforeEach(function () {
  this.sandbox = sinon.sandbox.create();

  this.sandbox.stub(Bus.prototype, 'on', function () {});
  this.sandbox.stub(Bus.prototype, 'off', function () {});
  this.sandbox.stub(Bus.prototype, 'emit', function () {});
  this.sandbox.stub(redirect, 'sync', function () {});
});

afterEach(function () {
  this.sandbox.restore();
});
