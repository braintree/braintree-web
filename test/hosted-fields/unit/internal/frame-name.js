"use strict";

const {
  getFrameName,
} = require("../../../../src/hosted-fields/internal/get-frame-name");

describe("getFrameName", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.oldWindowName = window.name;
  });

  afterEach(() => {
    window.name = testContext.oldWindowName;
  });

  it("replaces braintree-hosted-field in window name", () => {
    window.name = "braintree-hosted-field-foo";
    expect(getFrameName()).toBe("foo");
  });

  it("replaces braintree-hosted-field in any position", () => {
    window.name = "foo-bar-braintree-hosted-field-baz";
    expect(getFrameName()).toBe("foo-bar-baz");
  });

  it("returns window.name if braintree-hosted-field is not in it", () => {
    window.name = "really-cool-window";
    expect(getFrameName()).toBe("really-cool-window");
  });

  it("does not replace multiple occurrences of braintree-hosted-field", () => {
    window.name = "foo-braintree-hosted-field-bar-braintree-hosted-field-baz";
    expect(getFrameName()).toBe("foo-bar-braintree-hosted-field-baz");
  });

  it("returns an empty string if window.name is an empty string", () => {
    window.name = "";
    expect(getFrameName()).toBe("");
  });
});
