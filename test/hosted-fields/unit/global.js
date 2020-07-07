'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/lib/bus');
jest.mock('../../../src/lib/create-assets-url');

beforeEach(() => {
  console.warn = jest.fn(); // eslint-disable-line no-console

  document.body.innerHTML = '';

  window.bus = {
    on: jest.fn(),
    emit: jest.fn()
  };
});

module.exports = global;
