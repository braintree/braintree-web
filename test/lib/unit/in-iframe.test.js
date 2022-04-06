"use strict";

const inIframe = require("../../../src/lib/in-iframe");

describe("inIframe", () => {
  it("returns false when window.self equals window.top", () => {
    expect(inIframe()).toBe(false);
  });

  it("returns true when window.self does not equal window.top", () => {
    const win = {
      self: "foo",
      top: "bar",
    };

    expect(inIframe(win)).toBe(true);
  });

  it("returns true when accessing win.top throws an error", () => {
    const win = {
      self: "foo",
      get top() {
        throw new Error("not allowed");
      },
    };

    expect(inIframe(win)).toBe(true);
  });
});
