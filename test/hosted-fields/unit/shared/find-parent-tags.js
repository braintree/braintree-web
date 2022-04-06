"use strict";

const findParentTags = require("../../../../src/hosted-fields/shared/find-parent-tags");

describe("findParentTags", () => {
  it("returns an empty array for an element that has no parents", () => {
    const el = document.createElement("div");
    const result = findParentTags(el, "span");

    expect(result).toEqual([]);
  });

  it("returns an empty array for the <html> element", () => {
    const result = findParentTags(document.documentElement, "span");

    expect(result).toEqual([]);
  });

  it('returns the <html> element for <body> when looking for "html" elements', () => {
    const result = findParentTags(document.body, "html");

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(document.documentElement);
  });

  it('returns an empty array for <body> when looking for "span" elements', () => {
    const result = findParentTags(document.body, "span");

    expect(result).toEqual([]);
  });

  it("finds relevant parent elements", () => {
    let result;
    const topLevel = document.createElement("div");
    const grandparent = document.createElement("span");
    const greatAunt = document.createElement("span");
    const parent = document.createElement("span");
    const el = document.createElement("span");

    topLevel.appendChild(grandparent);
    topLevel.appendChild(greatAunt);
    grandparent.appendChild(parent);
    parent.appendChild(el);

    result = findParentTags(el, "span");
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(parent);
    expect(result[1]).toBe(grandparent);

    result = findParentTags(el, "div");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(topLevel);
  });
});
