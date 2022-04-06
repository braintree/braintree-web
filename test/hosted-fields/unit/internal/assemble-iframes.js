"use strict";

const {
  assembleIFrames,
} = require("../../../../src/hosted-fields/internal/assemble-iframes");

describe("assembleIFrames", () => {
  it("iterates through window.frames to find frames on the same origin", () => {
    const myHref = location.href;
    const frameA = {
      location: { href: myHref },
      frames: [],
    };
    const frameB = {
      location: { href: myHref },
      frames: [],
    };
    const frameC = {
      location: { href: myHref },
      frames: [
        {
          location: { href: "http://example.com" },
          frames: [],
        },
        frameB,
      ],
    };
    const fakeWindow = {
      frames: [
        frameA,
        {
          location: { href: "http://bing.com" },
          frames: [],
        },
        {
          // location deliberately missing to throw error
          frames: [],
        },
        frameC,
      ],
    };
    const result = assembleIFrames(fakeWindow);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(frameA);
    expect(result[1]).toBe(frameC);
  });
});
