import InputComponents from "../../../../src/hosted-fields/internal/components";
import { CreditCardForm } from "../../../../src/hosted-fields/internal/models/credit-card-form";

function getModelConfig(fieldKey, initial) {
  const config = {
    fields: {},
  };

  initial = initial || [];

  initial.concat(fieldKey || "cvv").forEach((fieldKey2) => {
    const container = document.createElement("div");

    container.id = fieldKey2;
    document.body.appendChild(container);
    config.fields[fieldKey2] = { selector: `#${fieldKey2}` };
  });

  if (!fieldKey) {
    fieldKey = "cvv";
  }
  config.fields[fieldKey] = { selector: "body" };

  return config;
}

function createInput(fieldKey, initial) {
  return new InputComponents[fieldKey]({
    type: fieldKey,
    model: new CreditCardForm(getModelConfig(fieldKey, initial)),
  });
}

export const triggerEvent = function (name, target) {
  const event = document.createEvent("Event");

  event.initEvent(name, true, true);
  target.dispatchEvent(event);
};

export { getModelConfig, createInput };

export default {
  getModelConfig,
  createInput,
  triggerEvent,
};
