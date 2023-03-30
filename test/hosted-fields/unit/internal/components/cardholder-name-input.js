"use strict";

const RestrictedInput = require("restricted-input");
const {
  CreditCardForm,
} = require("../../../../../src/hosted-fields/internal/models/credit-card-form");
const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const {
  CardholderNameInput,
} = require("../../../../../src/hosted-fields/internal/components/cardholder-name-input");
const { createInput, getModelConfig } = require("../../helpers");
const browserDetection = require("../../../../../src/hosted-fields/shared/browser-detection");

describe("Cardholder Name Input", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.input = createInput("cardholderName");
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

    it("handles a specific type being set", () => {
      const config = getModelConfig("cardholderName");

      config.fields.cardholderName = { type: "tel" };

      const input = new CardholderNameInput({
        model: new CreditCardForm(config),
        type: "cardholderName",
      });

      expect(input.element.getAttribute("type")).toBe("tel");
    });

    it("has autocomplete for cardholder name", () => {
      expect(testContext.input.element.getAttribute("autocomplete")).toBe(
        "cc-name"
      );
    });

    it("sets the maxLength to 255", () => {
      expect(testContext.input.element.getAttribute("maxlength")).toBe("255");
    });

    it("removes the pattern attribute added for iOS keyboards", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

      const input = createInput("cardholderName");

      expect(input.element.pattern).toBeFalsy();
    });

    it("removes the inputmode attribute added for iOS keyboards", () => {
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

      const input = createInput("cardholderName");

      expect(input.element.inputmode).toBeFalsy();
    });
  });

  describe("formatter", () => {
    it("sets the pattern to a 255-character pattern", () => {
      jest.spyOn(RestrictedInput.prototype, "setPattern");

      createInput("cardholderName");

      expect(RestrictedInput.prototype.setPattern).toHaveBeenCalledWith(
        "{{***************************************************************************************************************************************************************************************************************************************************************}}"
      );
    });
  });
});
