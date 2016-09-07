'use strict';

var assign = require('../../../src/lib/assign').assign;

beforeEach(function () {
  this.sandbox = sinon.sandbox.create();

  // PhantomJS doesn't have Object.assign but Safari 10+ does,
  // so we can polyfill it in tests.
  Object.assign = assign;
});

afterEach(function () {
  this.sandbox.restore();

  delete Object.assign;
});
