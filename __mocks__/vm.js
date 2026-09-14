const vm = vi.createMockFromModule("vm");
// r.js calls vm.runInThisContext during initialization
// but when running under vitest it does not work as expected.
// This assumes nothing else calls this method during the tests...
vm.runInThisContext = function () {
  return undefined;
};

export default vm;
