"use strict";

const FakeRestrictedInput = require("../../../src/lib/fake-restricted-input");

describe("FakeRestrictedInput", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.element = { value: "" };
    testContext.formatter = new FakeRestrictedInput({
      element: testContext.element,
    });
  });

  it('has a method called "setPattern"', () => {
    expect(testContext.formatter.setPattern).toBeInstanceOf(Function);
  });

  it("returns the element value when calling getUnformattedValue", () => {
    expect(testContext.formatter.getUnformattedValue()).toBe("");

    testContext.element.value = "memes";
    expect(testContext.formatter.getUnformattedValue()).toBe("memes");
  });
});
