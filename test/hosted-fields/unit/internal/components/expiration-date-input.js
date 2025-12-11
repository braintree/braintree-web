"use strict";

const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const {
  ExpirationDateInput,
} = require("../../../../../src/hosted-fields/internal/components/expiration-date-input");
const browserDetection = require("../../../../../src/hosted-fields/shared/browser-detection");
const { createInput } = require("../../helpers");
const RestrictedInput = require("restricted-input");

describe("Expiration Date Input", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.input = createInput("expirationDate");
  });

  describe("inheritance", () => {
    it("extends BaseInput", () => {
      expect(testContext.input).toBeInstanceOf(BaseInput);
    });

    it('sets element type to "text" when browser does not support formatting', () => {
      const inputWithFormatting = createInput("expirationDate");

      expect(inputWithFormatting.element.type).toBe("text");

      jest.spyOn(RestrictedInput, "supportsFormatting").mockReturnValue(false);

      const inputWithoutFormatting = createInput("expirationDate");

      expect(inputWithoutFormatting.element.type).toBe("text");
    });
  });

  describe("getUnformattedValue", () => {
    it("returns monthyear format for month input type", () => {
      const context = {
        element: { type: "month" },
        formatter: {
          getUnformattedValue() {
            return "2020-01";
          },
        },
      };
      const value =
        ExpirationDateInput.prototype.getUnformattedValue.call(context);

      expect(value).toBe("012020");
    });

    it("returns empty value for empty month input type", () => {
      const context = {
        element: { type: "month" },
        formatter: {
          getUnformattedValue() {
            return "";
          },
        },
      };
      const value =
        ExpirationDateInput.prototype.getUnformattedValue.call(context);

      expect(value).toBe("");
    });
  });

  describe("element", () => {
    it('has type="text"', () => {
      expect(testContext.input.element.getAttribute("type")).toBe("text");
    });

    it("has autocomplete cc-exp", () => {
      expect(testContext.input.element.getAttribute("autocomplete")).toBe(
        "cc-exp"
      );
    });

    it("has pattern set to [0-9/ ]*", () => {
      jest.spyOn(browserDetection, "isIosSafari").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

      testContext.input = createInput("expirationDate");
      expect(testContext.input.element.getAttribute("pattern")).toBe(
        "[0-9/ ]*"
      );
    });

    it("sets the maxLength to 9", () => {
      expect(testContext.input.element.getAttribute("maxlength")).toBe("9");
    });
  });

  describe("formatting", () => {
    beforeEach(() => {
      jest.spyOn(testContext.input.formatter, "setPattern");
    });

    describe.each([
      ["zero", ["01", "0122", "01222"]],
      ["one", ["1", "122", "1222"]],
    ])(
      "uses a 2 digit month when the date starts with %s",
      (startingDigit, sampleDate) => {
        it.each(sampleDate)("for date %s", (date) => {
          testContext.input.model.set("expirationDate.value", date);
          expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
            "{{99}} / {{9999}}"
          );
        });
      }
    );

    describe("uses a 1 digit month when the date is greater than one", () => {
      const expDates = ["2", "3", "4", "5", "6", "7", "8", "9"];

      it.each(expDates)("for date %s", (date) => {
        testContext.input.model.set("expirationDate.value", date);
        expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
          "0{{9}} / {{9999}}"
        );
      });
    });

    describe("uses a 2 digit month for valid 3 digit dates starting with 1", () => {
      const expDates = ["121", "122"];

      it.each(expDates)("for date %s", (date) => {
        testContext.input.model.set("expirationDate.value", date);
        expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
          "{{99}} / {{9999}}"
        );
      });
    });

    describe("uses a 2 digit month for 3 digit dates that are potentially valid but not valid yet", () => {
      const expDates = ["011", "020", "021", "022", "101", "102", "111", "112"];

      it.each(expDates)("for date %s", (date) => {
        testContext.input.model.set("expirationDate.value", date);
        expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
          "{{99}} / {{9999}}"
        );
      });
    });

    it("handles changes in ambiguous dates, for date 122", () => {
      testContext.input.model.set("expirationDate.value", "22");
      expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
        "0{{9}} / {{9999}}"
      );
      testContext.input.model.set("expirationDate.value", "122");
      expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
        "{{99}} / {{9999}}"
      );
    });

    describe("handles changes in ambiguous dates", () => {
      const expDates = ["1220", "12202", "122020"];

      it.each(expDates)("for date %s", (date) => {
        testContext.input.model.set("expirationDate.value", date);
        expect(testContext.input.formatter.setPattern).toHaveBeenCalledWith(
          "{{99}} / {{9999}}"
        );
      });
    });
  });
});
