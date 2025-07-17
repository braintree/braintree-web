"use strict";

const sanitize = require("../../../src/lib/sanitize-html");
const { noop } = require("../../helpers");

describe("sanitizeHtml", () => {
  it("leaves safe strings untouched", () => {
    expect(sanitize("")).toBe("");
    expect(sanitize("cups with the ice")).toBe("cups with the ice");
  });

  it("filters HTML tags", () => {
    expect(sanitize("check<br>the<br />price")).toBe(
      "check&lt;br&gt;the&lt;br /&gt;price"
    );
    expect(sanitize("<P>no type</P>")).toBe("&lt;P&gt;no type&lt;/P&gt;");
  });

  it("filters ampersands", () => {
    expect(sanitize("& we do this")).toBe("&amp; we do this");
    expect(sanitize("&lt;")).toBe("&amp;lt;");
  });

  it("returns the empty string for non-strings", () => {
    expect(sanitize()).toBe("");
    expect(sanitize(null)).toBe("");
    expect(sanitize(false)).toBe("");
    expect(sanitize(true)).toBe("");
    expect(sanitize(0)).toBe("");
    expect(sanitize(noop)).toBe("");
    expect(sanitize(new String("nope"))).toBe("");
  });
});
