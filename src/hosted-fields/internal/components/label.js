'use strict';

function LabelComponent(options) {
  this.element = document.createElement('label');

  this.element.setAttribute('for', options.name);
  this.element.innerHTML = options.label;
}

module.exports = {
  LabelComponent: LabelComponent
};
