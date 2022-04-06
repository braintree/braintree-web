"use strict";

const {
  allowedStyles,
} = require("../../../../src/hosted-fields/shared/constants");
const getStylesFromClass = require("../../../../src/hosted-fields/external/get-styles-from-class");

describe("getStylesFromClass", () => {
  let testContext = {};

  beforeEach(() => {
    const styleNode = document.createElement("style");

    testContext = {};
    testContext.bodyContent = document.body.innerHTML;

    styleNode.setAttribute("type", "text/css");
    styleNode.innerHTML = `
.custom-class {
  font-size: 5px;
  color: rgb(0, 0, 255);
}

.invalid-class {
  background: red;
  color: rgb(0, 255, 0);
}`;
    document.head.appendChild(styleNode);
  });

  afterEach(() => {
    document.body.innerHTML = testContext.bodyContent;
  });

  it("returns styles from class", () => {
    const styles = getStylesFromClass("custom-class");

    expect(styles.color).toBe("rgb(0, 0, 255)");
    expect(styles["font-size"]).toBe("5px");
  });

  it("strips leading . from class name", () => {
    const styles = getStylesFromClass(".custom-class");

    expect(styles.color).toBe("rgb(0, 0, 255)");
    expect(styles["font-size"]).toBe("5px");
  });

  it("ignores styles that are not part of the allowed styles", () => {
    const styles = getStylesFromClass("invalid-class");

    expect(styles.color).toBe("rgb(0, 255, 0)");
    expect(styles.background).toBeFalsy();
  });

  it("creates and then removes a dom node", () => {
    jest.spyOn(document.body, "appendChild");
    jest.spyOn(document.body, "removeChild");

    getStylesFromClass("custom-class");

    expect(document.body.appendChild).toHaveBeenCalledTimes(1);
    expect(document.body.removeChild).toHaveBeenCalledTimes(1);
  });

  it("hidden properties in hidden dom node do not interfere with allowed styles", () => {
    expect(allowedStyles).toEqual(expect.not.arrayContaining(["display"]));
    expect(allowedStyles).toEqual(expect.not.arrayContaining(["position"]));
    expect(allowedStyles).toEqual(expect.not.arrayContaining(["left"]));
    expect(allowedStyles).toEqual(expect.not.arrayContaining(["top"]));
  });
});
