"use strict";

const urlParams = require("../../../src/lib/url-params");

describe("getUrlParams", () => {
  let originalLocation, originalTop;

  beforeEach(() => {
    originalLocation = window.location;
    originalTop = window.top;

    delete window.location;
    delete window.top;

    window.location = { href: "https://example.com?foo=bar" };
    window.top = window; // default: not in an iframe
  });

  afterEach(() => {
    window.location = originalLocation;
    window.top = originalTop;
  });

  it("returns params from current window when not in an iframe", () => {
    const result = urlParams.getUrlParams();

    expect(result.foo).toBe("bar");
  });

  it("returns params from top window when in a same-origin iframe", () => {
    window.top = { location: { href: "https://example.com?token=abc" } };

    const result = urlParams.getUrlParams();

    expect(result.token).toBe("abc");
  });

  it("falls back to current window when window.top.location.href throws a SecurityError", () => {
    // Simulate a cross-origin iframe: window.top.location exists (passes the
    // if-condition check) but reading .href throws a SecurityError, which is
    // the real browser behavior for cross-origin frames.
    window.top = {
      location: {
        get href() {
          const err = new Error("Blocked a frame with origin");

          err.name = "SecurityError";
          throw err;
        },
      },
    };

    expect(() => urlParams.getUrlParams()).not.toThrow();

    const result = urlParams.getUrlParams();

    expect(result.foo).toBe("bar");
  });

  it("falls back to current window when window.top is null", () => {
    window.top = null;

    const result = urlParams.getUrlParams();

    expect(result.foo).toBe("bar");
  });

  it("falls back to current window when window.top.location is undefined", () => {
    window.top = { location: undefined };

    const result = urlParams.getUrlParams();

    expect(result.foo).toBe("bar");
  });
});
