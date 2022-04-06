"use strict";

const createRestrictedInput = require("../../../src/lib/create-restricted-input");
const RestrictedInput = require("restricted-input");
const FakeRestrictedInput = require("../../../src/lib/fake-restricted-input");

describe("createRestrictedInput", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.element = document.createElement("input");
  });

  describe("with formatting", () => {
    it.each(["", "tel", "url", "password"])(
      "returns a RestrictedInput for input type %p",
      (type) => {
        testContext.element.type = type;

        expect(
          createRestrictedInput({
            shouldFormat: true,
            element: testContext.element,
            pattern: " ",
          })
        ).toBeInstanceOf(RestrictedInput);
      }
    );

    it.each(["date", "month"])(
      "returns a FakeRestrictedInput for input type %p",
      (type) => {
        expect(
          createRestrictedInput({
            shouldFormat: true,
            element: { type },
            pattern: " ",
          })
        ).toBeInstanceOf(FakeRestrictedInput);
      }
    );
  });

  describe("without formatting", () => {
    it("returns a FakeRestrictedInput", () => {
      expect(
        createRestrictedInput({
          shouldFormat: false,
          element: testContext.element,
          pattern: " ",
        })
      ).toBeInstanceOf(FakeRestrictedInput);
    });
  });
});
