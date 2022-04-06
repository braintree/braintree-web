"use strict";

jest.mock("../../../../../src/hosted-fields/shared/focus-intercept");

const {
  FieldComponent,
} = require("../../../../../src/hosted-fields/internal/components/field-component");
const {
  CreditCardForm,
} = require("../../../../../src/hosted-fields/internal/models/credit-card-form");
const focusIntercept = require("../../../../../src/hosted-fields/shared/focus-intercept");
const {
  events,
  navigationDirections: directions,
} = require("../../../../../src/hosted-fields/shared/constants");
const { getModelConfig } = require("../../helpers");

describe("FieldComponent", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.focusBackElement = document.createElement("div");
    testContext.focusBackElement.id = "back-element";
    testContext.focusForwardElement = document.createElement("div");
    testContext.focusForwardElement.id = "forward-element";

    focusIntercept.generate
      .mockReturnValueOnce(testContext.focusBackElement)
      .mockReturnValueOnce(testContext.focusForwardElement);
  });

  it.todo("tests filling out logic in Field Component file");

  it("can set a custom label", () => {
    const modelConfig = getModelConfig(["number", "cvv", "expirationDate"]);

    modelConfig.fields.cvv.internalLabel = "Custom Label";

    const fieldComponent = new FieldComponent({
      componentId: "unique-id",
      cardForm: new CreditCardForm(modelConfig),
      type: "cvv",
    });

    expect(fieldComponent.element.querySelector("label").innerText).toBe(
      "Custom Label"
    );
  });

  describe("focus interceptors", () => {
    beforeEach(() => {
      testContext.fieldComponent = new FieldComponent({
        componentId: "unique-id",
        cardForm: new CreditCardForm(
          getModelConfig(["number", "cvv", "expirationDate"])
        ),
        type: "cvv",
      });
      document.body.appendChild(testContext.fieldComponent.element);
    });

    it("adds focusIntercept inputs within field iframe", () => {
      expect(document.getElementById("back-element")).toBe(
        testContext.focusBackElement
      );
      expect(document.getElementById("forward-element")).toBe(
        testContext.focusForwardElement
      );
    });

    it("emits a TRIGGER_FOCUS_CHANGE when focus intercept back handler is triggered", () => {
      const handler = focusIntercept.generate.mock.calls[0][3];

      handler();

      expect(window.bus.emit).toHaveBeenCalledWith(
        events.TRIGGER_FOCUS_CHANGE,
        {
          field: "cvv",
          direction: directions.BACK,
        }
      );
    });

    it("emits a TRIGGER_FOCUS_CHANGE when focus intercept forward handler is triggered", () => {
      const handler = focusIntercept.generate.mock.calls[1][3];

      handler();

      expect(window.bus.emit).toHaveBeenCalledWith(
        events.TRIGGER_FOCUS_CHANGE,
        {
          field: "cvv",
          direction: directions.FORWARD,
        }
      );
    });
  });
});
