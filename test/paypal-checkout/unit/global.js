'use strict';

beforeEach(function () {
  this.sandbox = sinon.sandbox.create();
});

afterEach(function () {
  this.sandbox.restore();
});
