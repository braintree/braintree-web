"use strict";

const {
  getVisibilityChangeEventName,
  isDocumentHidden,
} = require("../../../src/lib/document-visibility");

describe("document-visibility", () => {
  describe("getVisibilityChangeEventName", () => {
    it("returns the standard event name when document.hidden is supported", () => {
      expect(getVisibilityChangeEventName()).toBe("visibilitychange");
    });
  });

  describe("isDocumentHidden", () => {
    it("returns false when the document is visible", () => {
      jest.spyOn(document, "hidden", "get").mockReturnValue(false);

      expect(isDocumentHidden()).toBe(false);
    });

    it("returns true when document.hidden is true", () => {
      jest.spyOn(document, "hidden", "get").mockReturnValue(true);

      expect(isDocumentHidden()).toBe(true);
    });

    it("returns true when only a prefixed hidden property is set", () => {
      jest.spyOn(document, "hidden", "get").mockReturnValue(undefined);
      Object.defineProperty(document, "webkitHidden", {
        configurable: true,
        get: () => true,
      });

      expect(isDocumentHidden()).toBe(true);

      delete document.webkitHidden;
    });
  });
});
