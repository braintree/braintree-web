// @ts-nocheck
import InputComponents from "./index";
import constants from "../../shared/constants";
import { assign } from "../../../lib/assign";
import { LabelComponent } from "./label";
import focusIntercept from "../../shared/focus-intercept";
var events = constants.events;
var allowedFields = constants.allowedFields;
var directions = constants.navigationDirections;

const _default = {
  FieldComponent: function FieldComponent(options) {
    var type = options.type;

    if (
      !(
        InputComponents.hasOwnProperty(type) &&
        typeof InputComponents[type] === "function"
      )
    ) {
      throw new Error("Invalid field type: " + type);
    }

    var attribution = assign({}, allowedFields[type]);
    var customLabel = options.cardForm.configuration.fields[type].internalLabel;
    var componentId = options.componentId;

    if (customLabel) {
      attribution.label = customLabel;
    }

    this.element = document.createDocumentFragment();

    this.element.appendChild(
      focusIntercept.generate(componentId, type, directions.BACK, function () {
        window.bus.emit(events.TRIGGER_FOCUS_CHANGE, {
          field: type,
          direction: directions.BACK,
        });
      })
    );

    this.label = new LabelComponent(attribution);
    this.element.appendChild(this.label.element);

    this.input = new InputComponents[type]({
      model: options.cardForm,
      type: type,
    });
    this.input.element.setAttribute(
      "aria-describedby",
      "field-description-" + type
    );
    this.element.appendChild(this.input.element);
    this.element.appendChild(
      focusIntercept.generate(
        componentId,
        type,
        directions.FORWARD,
        function () {
          window.bus.emit(events.TRIGGER_FOCUS_CHANGE, {
            field: type,
            direction: directions.FORWARD,
          });
        }
      )
    );

    this.description = document.createElement("div");
    this.description.id = "field-description-" + type;
    this.description.classList.add("field-description");
    this.description.style.height = "1px";
    this.description.style.width = "1px";
    this.description.style.overflow = "hidden";

    this.element.appendChild(this.description);

    window.bus.on(
      events.SET_MESSAGE,
      function (data) {
        if (data.field === type) {
          this.description.textContent = data.message;
        }
      }.bind(this)
    );
  },
};

export const { FieldComponent } = _default;

export default _default;
