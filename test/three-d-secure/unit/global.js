'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/lib/bus');

const Bus = require('../../../src/lib/bus');

/*
// for debugging uncaught promise rejections.
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
});
*/

beforeEach(() => {
  jest.spyOn(Bus.prototype, 'on');
  jest.spyOn(Bus.prototype, 'off');
  jest.spyOn(Bus.prototype, 'emit');
  jest.spyOn(Bus.prototype, 'teardown');
});
