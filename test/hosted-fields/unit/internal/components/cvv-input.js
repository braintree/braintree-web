"use strict";

const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const { createInput } = require("../../helpers");

describe("CVV Input", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.input = createInput("cvv", ["number"]);
  });

  describe("setup", () => {
    describe("inheritance", () => {
      it("extends BaseInput", () => {
        expect(testContext.input).toBeInstanceOf(BaseInput);
      });
    });

    describe("element", () => {
      it('has type="text"', () => {
        expect(testContext.input.element.getAttribute("type")).toBe("text");
      });

      it("has autocomplete cc-csc", () => {
        expect(testContext.input.element.getAttribute("autocomplete")).toBe(
          "cc-csc"
        );
      });

      it("sets the maxLength to 4 when no custom maxlength is provided", () => {
        expect(testContext.input.element.getAttribute("maxlength")).toBe("4");
      });

      it("sets the maxLength to 4 if a custom maxlength is provided but is greater than 4", () => {
        let input;

        jest
          .spyOn(BaseInput.prototype, "getConfiguration")
          .mockReturnValue({ maxlength: 5 });

        input = createInput("cvv", ["number"]);

        expect(input.element.getAttribute("maxlength")).toBe("4");
      });

      it("sets the maxLength to custom maxlength if one is provided and is less than 4", () => {
        let input;

        jest
          .spyOn(BaseInput.prototype, "getConfiguration")
          .mockReturnValue({ maxlength: 3 });

        input = createInput("cvv", ["number"]);

        expect(input.element.getAttribute("maxlength")).toBe("3");
      });
    });
  });

  describe("setInputState", () => {
    beforeEach(() => {
      jest.spyOn(testContext.input.formatter, "setPattern");
    });

    it("sets the maxlength on possibleCardTypes change", () => {
      testContext.input.model.set("possibleCardTypes", [{ code: { size: 6 } }]);

      expect(testContext.input.element.getAttribute("maxlength")).toBe("6");
      expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
        "{{999999}}"
      );

      testContext.input.model.set("possibleCardTypes", []);

      expect(testContext.input.element.getAttribute("maxlength")).toBe("4");
      expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
        "{{9999}}"
      );
    });

    it("does not set the maxlength on possibleCardTypes change if a custom maxlength is set", () => {
      let input;

      jest
        .spyOn(BaseInput.prototype, "getConfiguration")
        .mockReturnValue({ maxlength: 2 });

      input = createInput("cvv", ["number"]);

      jest.spyOn(input.formatter, "setPattern");

      input.model.set("possibleCardTypes", [{ code: { size: 6 } }]);

      expect(input.element.getAttribute("maxlength")).toBe("2");
      expect(input.formatter.setPattern).not.toHaveBeenCalled();

      input.model.set("possibleCardTypes", []);

      expect(input.element.getAttribute("maxlength")).toBe("2");
      expect(input.formatter.setPattern).not.toHaveBeenCalled();
    });

    it("accounts for masked value if masking is being used", () => {
      const input = createInput("cvv", ["number"]);

      jest.spyOn(input.formatter, "setPattern");

      input.shouldMask = true;
      input.hiddenMaskedValue = "1234";
      input.element.value = input.maskValue(input.hiddenMaskedValue);
      input.model.set("possibleCardTypes", [{ code: { size: 3 } }]);

      expect(input.hiddenMaskedValue).toBe("123");
      expect(input.element.value).toBe("•••");
    });
  });
});
