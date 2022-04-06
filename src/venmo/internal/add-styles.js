"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function addStyles(cssString) {
  var style = document.createElement("style");
  style.innerHTML = cssString;
  document.head.appendChild(style);
}
exports.default = addStyles;
