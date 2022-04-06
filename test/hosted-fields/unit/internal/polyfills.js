"use strict";

require("../../../../src/hosted-fields/internal/polyfills/ie9");

describe("placeholder shim", () => {
  it("calls inputEl.parentNode.appendChild", (done) => {
    const inputEl = {
      style: [],
      getAttribute: () => null,
      attributes: {},
      parentNode: {
        appendChild: () => {
          done();
        },
      },
    };

    jest.spyOn(document, "createElement").mockImplementation(() => {
      document.createElement.mockRestore();

      return {};
    });

    window.placeholderShim(inputEl);
  });
});
