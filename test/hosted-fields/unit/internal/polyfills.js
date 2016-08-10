'use strict';

require('../../../../src/hosted-fields/internal/polyfills/ie9');

describe('placeholder shim', function () {
  it('calls inputEl.parentNode.appendChild', function (done) {
    var inputEl = {
      style: [],
      getAttribute: function () { return null; },
      attributes: {}
    };
    var parentNode = {appendChild: function () { done(); }};
    var originalCreateElement = document.createElement;

    inputEl.parentNode = parentNode;
    this.sandbox.stub(document, 'createElement', function (string) {
      if (string === 'input') {
        return {};
      }
      return originalCreateElement.apply(document, arguments);
    });

    global.placeholderShim(inputEl);
  });
});
