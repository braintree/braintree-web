"use strict";

function LabelComponent(options) {
  this.element = document.createElement("label");

  this.element.setAttribute("for", options.name);
  this.element.innerText = options.label;
}

module.exports = {
  LabelComponent: LabelComponent,
};
