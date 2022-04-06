"use strict";

const injectFrame = require("../../../../src/hosted-fields/external/inject-frame");

describe("injectFrame", () => {
  it("adds frame to container and returns it as result", () => {
    const frame = document.createElement("iframe");
    const container = document.createElement("div");
    const result = injectFrame("id", frame, container);

    expect(container.children[0]).toBe(frame);
    expect(result[0]).toBe(frame);
  });

  it("adds clear: both element to the container and returns it in the result", () => {
    const frame = document.createElement("iframe");
    const container = document.createElement("div");
    const result = injectFrame("id", frame, container);

    expect(container.children[1]).toBeInstanceOf(HTMLDivElement);
    expect(result[1].style.clear).toBe("both");
    expect(container.children[1]).toBe(result[1]);
  });
});
