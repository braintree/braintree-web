"use strict";

const findRootNode = require("../../../src/lib/find-root-node");

describe("findRootNode", () => {
  it("returns the element when it is the root node", () => {
    const el = document.createElement("div");

    expect(findRootNode(el)).toBe(el);
  });

  it("returns the container element when it is the root node", () => {
    const el = document.createElement("div");

    el.innerHTML = `
      <div>
        <span>
          <h1 class="target-node"></h1>
        </span>
      </div>
    `;

    expect(findRootNode(el.querySelector(".target-node"))).toBe(el);
  });

  it("returns the document when it is the root node", () => {
    const el = document.createElement("div");

    el.innerHTML = `
      <div>
        <span>
          <h1 class="target-node"></h1>
        </span>
      </div>
    `;

    document.body.appendChild(el);

    const rootNode = findRootNode(el.querySelector(".target-node"));

    expect(rootNode).toBe(document);
  });
});
