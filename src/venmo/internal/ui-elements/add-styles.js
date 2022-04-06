"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ID = "venmo-desktop__injected-styles";
function addStyles(cssString) {
  var style = document.getElementById(ID);
  if (!style) {
    style = document.createElement("style");
    style.id = ID;
    document.head.appendChild(style);
  }
  style.innerHTML = style.innerHTML + "\n\n" + cssString;
}
exports.default = addStyles;
