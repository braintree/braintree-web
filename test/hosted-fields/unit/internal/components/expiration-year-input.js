"use strict";

const Bus = require("framebus");
const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const {
  ExpirationYearInput,
} = require("../../../../../src/hosted-fields/internal/components/expiration-year-input");
const {
  CreditCardForm,
} = require("../../../../../src/hosted-fields/internal/models/credit-card-form");
const constants = require("../../../../../src/hosted-fields/shared/constants");
const { createInput } = require("../../helpers");

window.bus = new Bus({ channel: "foo" });

describe("Expiration Year Input", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.input = createInput("expirationYear");
  });

  describe("inheritance", () => {
    it("extends BaseInput", () => {
      expect(testContext.input).toBeInstanceOf(BaseInput);
    });
  });

  describe("element creation", () => {
    describe("without a `select` option", () => {
      it("is an <input> element", () => {
        expect(testContext.input.element).toBeInstanceOf(HTMLInputElement);
      });

      it('has type="text"', () => {
        expect(testContext.input.element.getAttribute("type")).toBe("text");
      });

      it("sets the maxLength to 4", () => {
        expect(testContext.input.element.getAttribute("maxlength")).toBe("4");
      });
    });

    describe("with a `select` option", () => {
      it("select: false calls BaseInput's constructElement", () => {
        jest.spyOn(BaseInput.prototype, "constructElement");

        new ExpirationYearInput({
          type: "expirationYear",
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: "#expiration-year",
                select: false,
              },
            },
          }),
        });

        expect(BaseInput.prototype.constructElement).toHaveBeenCalledTimes(1);
        // expect(BaseInput.prototype.constructElement).calledOn(input);
      });

      it("select: true creates a <select> with year-related <option>s inside", () => {
        let i, year, thisYear, optionEl;
        const input = new ExpirationYearInput({
          type: "expirationYear",
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: "#expiration-year",
                select: true,
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toBe("expirationYear valid");
        expect(input.element.getAttribute("data-braintree-name")).toBe(
          "expirationYear"
        );
        expect(input.element.name).toBe("expiration-year");
        expect(input.element.id).toBe("expiration-year");

        thisYear = new Date().getFullYear();

        for (i = 0; i <= constants.maxExpirationYearAge; i++) {
          optionEl = input.element.childNodes[i];

          year = thisYear + i;

          expect(optionEl).toBeInstanceOf(HTMLOptionElement);
          expect(optionEl.value).toBe(year.toString());
          expect(optionEl.innerHTML).toBe(year.toString());
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(
          constants.maxExpirationYearAge + 1
        );
      });

      it("select: {} creates a <select> with year-related <option>s inside", () => {
        let i, year, thisYear, optionEl;
        const input = new ExpirationYearInput({
          type: "expirationYear",
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: "#expiration-year",
                select: {},
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toBe("expirationYear valid");
        expect(input.element.getAttribute("data-braintree-name")).toBe(
          "expirationYear"
        );
        expect(input.element.name).toBe("expiration-year");
        expect(input.element.id).toBe("expiration-year");

        thisYear = new Date().getFullYear();

        for (i = 0; i <= constants.maxExpirationYearAge; i++) {
          optionEl = input.element.childNodes[i];

          year = thisYear + i;

          expect(optionEl).toBeInstanceOf(HTMLOptionElement);
          expect(optionEl.value).toBe(year.toString());
          expect(optionEl.innerHTML).toBe(year.toString());
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(
          constants.maxExpirationYearAge + 1
        );
      });

      it("allows a placeholder in the select", () => {
        let placeholderEl;
        const input = new ExpirationYearInput({
          type: "expirationYear",
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: "#expiration-year",
                placeholder: "foo & <boo>",
                select: true,
              },
            },
          }),
        });

        placeholderEl = input.element.childNodes[0];
        expect(placeholderEl.value).toBe("");
        expect(placeholderEl.getAttribute("selected")).toBe("selected");
        expect(placeholderEl.getAttribute("disabled")).toBe("disabled");
        expect(placeholderEl.innerHTML).toBe("foo &amp; &lt;boo&gt;");

        expect(input.element.querySelectorAll("option")).toHaveLength(
          constants.maxExpirationYearAge + 2
        );
      });

      it("selects current year when no placeholder is set", () => {
        let i, el;
        const input = new ExpirationYearInput({
          type: "expirationYear",
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: "#expiration-year",
                select: true,
              },
            },
          }),
        });

        expect(input.element.childNodes[0].getAttribute("selected")).toBe(
          "selected"
        );
        for (i = 1; i < input.element.childNodes.length; i++) {
          el = input.element.childNodes[i];
          expect(el.getAttribute("selected")).toBeNull();
        }
        expect(input.element.selectedIndex).toBe(0);
      });
    });

    it("has autocomplete cc-exp-year", () => {
      expect(testContext.input.element.getAttribute("autocomplete")).toBe(
        "cc-exp-year"
      );
    });
  });
});
