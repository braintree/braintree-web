"use strict";

const RestrictedInput = require("restricted-input");
const {
  CreditCardForm,
} = require("../../../../../src/hosted-fields/internal/models/credit-card-form");
const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const browserDetection = require("../../../../../src/hosted-fields/shared/browser-detection");
const {
  PostalCodeInput,
} = require("../../../../../src/hosted-fields/internal/components/postal-code-input");
const { createInput, getModelConfig } = require("../../helpers");

describe("Postal Code Input", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.input = createInput("postalCode");
  });

  describe("inheritance", () => {
    it("extends BaseInput", () => {
      expect(testContext.input).toBeInstanceOf(BaseInput);
    });
  });

  describe("element", () => {
    it('has type="text"', () => {
      expect(testContext.input.element.getAttribute("type")).toBe("text");
    });

    it("has autocomplete postal-code", () => {
      expect(testContext.input.element.getAttribute("autocomplete")).toBe(
        "billing postal-code"
      );
    });

    it("sets the maxLength to 10 when no custom maxlength is provided", () => {
      expect(testContext.input.element.getAttribute("maxlength")).toBe("10");
    });

    it("sets the maxLength to custom maxlength if one is provided", () => {
      jest
        .spyOn(BaseInput.prototype, "getConfiguration")
        .mockReturnValue({ maxlength: 5 });

      let input = createInput("postalCode");

      expect(input.element.getAttribute("maxlength")).toBe("5");

      BaseInput.prototype.getConfiguration.mockReturnValue({ maxlength: 11 });
      input = createInput("postalCode");

      expect(input.element.getAttribute("maxlength")).toBe("11");
    });

    it("handles a specific type being set", () => {
      const config = getModelConfig("postalCode");

      config.fields.postalCode = { type: "tel" };

      testContext.input = new PostalCodeInput({
        model: new CreditCardForm(config),
        type: "postalCode",
      });
      expect(testContext.input.element.getAttribute("type")).toBe("tel");
    });

    it("removes pattern attribute", () => {
      let config, input;

      // causes base input to set the pattern property
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

      config = getModelConfig("postalCode");
      input = new PostalCodeInput({
        model: new CreditCardForm(config),
        type: "postalCode",
      });

      expect(input.element.getAttribute("pattern")).toBeNull();
    });

    it("removes the inputmode attribute", () => {
      const config = getModelConfig("postalCode");
      const input = new PostalCodeInput({
        model: new CreditCardForm(config),
        type: "postalCode",
      });

      expect(input.element.getAttribute("inputmode")).toBeNull();
    });
  });

  describe("formatter", () => {
    it("sets the pattern to a 10-character pattern with default maxLength", () => {
      jest.spyOn(RestrictedInput.prototype, "setPattern");

      createInput("postalCode");

      expect(RestrictedInput.prototype.setPattern).toHaveBeenCalledWith(
        "{{**********}}"
      );
    });

    it("sets the pattern to custom maxLength when provided", () => {
      jest.spyOn(RestrictedInput.prototype, "setPattern");
      jest
        .spyOn(BaseInput.prototype, "getConfiguration")
        .mockReturnValue({ maxlength: 5 });

      createInput("postalCode");

      expect(RestrictedInput.prototype.setPattern).toHaveBeenCalledWith(
        "{{*****}}"
      );
    });
  });
});
