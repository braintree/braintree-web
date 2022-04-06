"use strict";

const browserDetection = require("../../../../src/hosted-fields/shared/browser-detection");
const {
  navigationDirections: directions,
} = require("../../../../src/hosted-fields/shared/constants");
const focusChange = require("../../../../src/hosted-fields/external/focus-change");
const focusIntercept = require("../../../../src/hosted-fields/shared/focus-intercept");

jest.mock("../../../../src/hosted-fields/shared/browser-detection");

function createSampleIntercept(type, direction) {
  const sampleIntercept = document.createElement("input");

  sampleIntercept.id = `bt-${type}-${direction}-unique-id`;
  sampleIntercept.setAttribute("data-braintree-type", type);

  return sampleIntercept;
}

describe("focus-change", () => {
  let testContext;

  browserDetection.hasSoftwareKeyboard.mockReturnValue(true);

  describe("removeExtraFocusElements", () => {
    beforeEach(() => {
      testContext = {};

      testContext.removeStub = jest.fn();
      testContext.form = document.createElement("form");
      testContext.firstInput = document.createElement("input");
      testContext.firstInput.id = "first";
      testContext.middleInput = document.createElement("input");
      testContext.middleInput.id = "middle";
      testContext.lastInput = document.createElement("input");
      testContext.lastInput.id = "last";

      testContext.form.appendChild(document.createElement("div"));
      testContext.form.appendChild(document.createElement("div"));
      testContext.form.appendChild(testContext.firstInput);
      testContext.form.appendChild(document.createElement("div"));
      testContext.form.appendChild(document.createElement("input"));
      testContext.form.appendChild(document.createElement("div"));
      testContext.form.appendChild(testContext.lastInput);
      testContext.form.appendChild(document.createElement("div"));
      testContext.form.appendChild(document.createElement("div"));

      document.body.appendChild(testContext.form);

      jest.spyOn(focusIntercept, "matchFocusElement");
    });

    afterEach(() => {
      testContext.form.parentNode.removeChild(testContext.form);
      focusIntercept.matchFocusElement.mockReset();
    });

    it("does not call callback at all if none match the Braintree focus element", () => {
      focusChange.removeExtraFocusElements(
        testContext.form,
        testContext.removeStub
      );

      expect(testContext.removeStub).not.toBeCalled();
    });

    it("does not call callback at all if only a middle input matches the Braintree focus element", () => {
      focusIntercept.matchFocusElement.mockImplementation(
        (args) => args === "middle"
      );

      focusChange.removeExtraFocusElements(
        testContext.form,
        testContext.removeStub
      );

      expect(testContext.removeStub).not.toBeCalled();
    });

    it("finds the first and last user focusable element and calls provided callback on the id of the element if it is a braintree focus element", () => {
      focusIntercept.matchFocusElement.mockImplementation(
        (args) => args === "first" || args === "middle" || args === "last"
      );

      focusChange.removeExtraFocusElements(
        testContext.form,
        testContext.removeStub
      );

      expect(testContext.removeStub).toHaveBeenCalledTimes(2);
      expect(testContext.removeStub).toHaveBeenCalledWith("first");
      expect(testContext.removeStub).toHaveBeenCalledWith("last");
    });

    it("only calls the callback for the first focusable element if the last element does not match a braintree focus element", () => {
      focusIntercept.matchFocusElement.mockImplementation(
        (args) => args === "first" || args === "middle"
      );

      focusChange.removeExtraFocusElements(
        testContext.form,
        testContext.removeStub
      );

      expect(testContext.removeStub).toHaveBeenCalledTimes(1);
      expect(testContext.removeStub).toHaveBeenCalledWith("first");
    });

    it("only calls the callback for the last focusable element if the first element does not match a braintree focus element", () => {
      focusIntercept.matchFocusElement.mockImplementation(
        (args) => args === "middle" || args === "last"
      );

      focusChange.removeExtraFocusElements(
        testContext.form,
        testContext.removeStub
      );

      expect(testContext.removeStub).toHaveBeenCalledTimes(1);
      expect(testContext.removeStub).toHaveBeenCalledWith("last");
    });
  });

  describe("createFocusChangeHandler", () => {
    beforeEach(() => {
      testContext.numberNode = document.createElement("iframe");
      testContext.cvvNode = document.createElement("iframe");
      testContext.formNode = document.createElement("form");
      testContext.numberNode.id = "number";
      testContext.cvvNode.id = "cvv";
      testContext.formNode.id = "merchant-form";
      testContext.numberAfter = createSampleIntercept(
        "number",
        directions.FORWARD
      );
      testContext.cvvBefore = createSampleIntercept("cvv", directions.BACK);

      testContext.formNode.appendChild(testContext.numberNode);
      testContext.formNode.appendChild(testContext.numberAfter);
      testContext.formNode.appendChild(testContext.cvvBefore);
      testContext.formNode.appendChild(testContext.cvvNode);
      document.body.appendChild(testContext.formNode);

      testContext.removeStub = jest.fn();
      testContext.triggerStub = jest.fn();
      testContext.handler = focusChange.createFocusChangeHandler("unique-id", {
        onRemoveFocusIntercepts: testContext.removeStub,
        onTriggerInputFocus: testContext.triggerStub,
      });
    });

    afterEach(() => {
      document.body.removeChild(testContext.formNode);
      testContext = {};
    });

    it("fires the `onRemoveFocusIntercepts` callback if there is no form", () => {
      document.body.appendChild(testContext.numberNode);
      document.body.appendChild(testContext.numberAfter);
      document.body.appendChild(testContext.cvvBefore);
      document.body.appendChild(testContext.cvvNode);

      document.body.removeChild(testContext.formNode);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
      expect(testContext.removeStub).toHaveBeenCalledTimes(1);
      expect(testContext.removeStub).toHaveBeenCalledWith();
      document.body.appendChild(testContext.formNode);
    });

    it("moves focus forward when direction is forward", () => {
      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("moves focus backward when direction is backward", () => {
      testContext.handler({
        field: "cvv",
        direction: directions.BACK,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("number");
    });

    it("only focuses elements that are user-interactive on software keyboards", () => {
      const button = document.createElement("button");

      testContext.formNode.insertBefore(button, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type hidden on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "hidden");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type button on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "button");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type reset on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "reset");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type submit on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "submit");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type checkbox on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "checkbox");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type radio on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "radio");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type file on software keyboards", () => {
      const input = document.createElement("input");

      input.setAttribute("type", "file");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("ignores inputs with type hidden on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);

      input.setAttribute("type", "hidden");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });

    it("does not ignore inputs with type button on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
      input.setAttribute("type", "button");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
    });

    it("does not ignore inputs with type reset on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
      input.setAttribute("type", "reset");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
    });

    it("does not ignore inputs with type submit on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
      input.setAttribute("type", "submit");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
    });

    it("does not ignore inputs with type checkbox on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
      input.setAttribute("type", "checkbox");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
    });

    it("does not ignore inputs with type radio on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
      input.setAttribute("type", "radio");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
    });

    it("does not ignore inputs with type file on desktop browsers", () => {
      const input = document.createElement("input");

      browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
      input.setAttribute("type", "file");

      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
    });

    it("does nothing if there is no user-focusable element in the requested direction", () => {
      testContext.formNode.appendChild(
        createSampleIntercept("cvv", directions.FORWARD)
      );

      testContext.handler({
        field: "cvv",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
      expect(testContext.removeStub).not.toBeCalled();
    });

    it("focuses merchant field when merchant field is next user-focusable", () => {
      const input = document.createElement("input");

      input.setAttribute("name", "cardholder-name");
      testContext.formNode.insertBefore(input, testContext.cvvBefore);

      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).not.toBeCalled();
      expect(document.activeElement.getAttribute("name")).toContain(
        "cardholder-name"
      );
    });

    it("fires `onTriggerInputFocus` with correct type when hosted field is next user-focusable", () => {
      testContext.handler({
        field: "number",
        direction: directions.FORWARD,
      });

      expect(testContext.triggerStub).toHaveBeenCalledWith("cvv");
    });
  });
});
