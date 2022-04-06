"use strict";

const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const {
  ExpirationSplitInput,
} = require("../../../../../src/hosted-fields/internal/components/expiration-split-input");

describe("Expiration Split Input", () => {
  let testContext;

  beforeEach(() => {
    const fakeFirstOption = document.createElement("option");

    testContext = {};

    testContext.element = document.createElement("select");
    fakeFirstOption.innerHTML = "01 - January";
    fakeFirstOption.value = "1";
    testContext.element.appendChild(fakeFirstOption);

    testContext.configuration = {
      select: true,
    };

    testContext.context = {
      type: "fakeType",
      element: testContext.element,
      getConfiguration() {
        return testContext.configuration;
      },
      createPlaceholderOption:
        ExpirationSplitInput.prototype.createPlaceholderOption,
    };
  });

  describe("setPlaceholder", () => {
    it("calls BaseInput's setPlaceholder if there is no `select` configuration", () => {
      delete testContext.configuration.select;

      jest.spyOn(BaseInput.prototype, "setPlaceholder").mockReturnValue(null);

      ExpirationSplitInput.prototype.setPlaceholder.call(
        testContext.context,
        "fakeType",
        "foo & <boo>"
      );

      expect(BaseInput.prototype.setPlaceholder).toBeCalledTimes(1);
      // expect(BaseInput.prototype.setPlaceholder).to.be.calledOn(testContext.context);
    });

    describe("when no placeholder existed", () => {
      it("adds the placeholder if the type matches", () => {
        let placeholderEl;

        ExpirationSplitInput.prototype.setPlaceholder.call(
          testContext.context,
          "fakeType",
          "foo & <boo>"
        );

        placeholderEl = testContext.element.firstChild;
        expect(placeholderEl.value).toBe("");
        expect(placeholderEl.getAttribute("selected")).toBe("selected");
        expect(placeholderEl.getAttribute("disabled")).toBe("disabled");
        expect(placeholderEl.innerHTML).toBe("foo &amp; &lt;boo&gt;");

        expect(testContext.element.querySelectorAll("option")).toHaveLength(2);
      });

      it("does nothing if the type doesn't match", () => {
        ExpirationSplitInput.prototype.setPlaceholder.call(
          testContext.context,
          "ugh",
          "foo & <boo>"
        );

        expect(testContext.element.querySelectorAll("option")).toHaveLength(1);
      });
    });

    describe("when a placeholder existed", () => {
      beforeEach(() => {
        testContext.placeholderEl = document.createElement("option");
        testContext.placeholderEl.value = "";
        testContext.placeholderEl.innerHTML = "foo";

        testContext.element.insertBefore(
          testContext.placeholderEl,
          testContext.element.firstChild
        );
      });

      it("updates the placeholder if the type matches", () => {
        ExpirationSplitInput.prototype.setPlaceholder.call(
          testContext.context,
          "fakeType",
          "foo & <boo>"
        );

        expect(testContext.placeholderEl.innerHTML).toBe(
          "foo &amp; &lt;boo&gt;"
        );

        expect(testContext.element.querySelectorAll("option")).toHaveLength(2);
      });

      it("does nothing if the type doesn't match", () => {
        ExpirationSplitInput.prototype.setPlaceholder.call(
          testContext.context,
          "ugh",
          "foo to the boo"
        );

        expect(testContext.placeholderEl.innerHTML).toBe("foo");
      });
    });
  });
});
