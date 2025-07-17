"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("framebus");
jest.mock("../../../src/lib/create-assets-url");

beforeEach(() => {
  console.warn = jest.fn();

  document.body.innerHTML = "";

  window.bus = {
    on: jest.fn(),
    emit: jest.fn(),
    target: jest.fn().mockReturnThis(),
  };
});

module.exports = global;
