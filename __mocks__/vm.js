"use strict";

const vm = jest.genMockFromModule("vm");
// r.js calls vm.runInThisContext during initialization
// but when running under jest it does not work as expected.
// This assumes nothing else calls this method during the tests...
vm.runInThisContext = function () {
  return undefined;
};

module.exports = vm;
