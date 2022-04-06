"use strict";

const { _atob: atob } = require("../../../src/lib/vendor/polyfill");

describe("Polyfill", () => {
  describe("atob", () => {
    it("decodes a base64 encoded string", () => {
      const base64Encoded = btoa("hello world");
      const decoded = atob(base64Encoded);

      expect(decoded).toBe("hello world");
    });

    it("raises an exception if the string is not base64 encoded", () => {
      const error = /Non base64 encoded input passed to window.atob polyfill/;

      expect(() => {
        atob("not-base64-encoded");
      }).toThrowError(error);
    });
  });
});
