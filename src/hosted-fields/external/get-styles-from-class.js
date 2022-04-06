"use strict";

var allowedStyles = require("../shared/constants").allowedStyles;

module.exports = function getStylesFromClass(cssClass) {
  var element = document.createElement("input");
  var styles = {};
  var computedStyles;

  if (cssClass[0] === ".") {
    cssClass = cssClass.substring(1);
  }

  element.className = cssClass;
  element.style.display = "none !important";
  element.style.position = "fixed !important";
  element.style.left = "-99999px !important";
  element.style.top = "-99999px !important";
  document.body.appendChild(element);

  computedStyles = window.getComputedStyle(element);

  allowedStyles.forEach(function (style) {
    var value = computedStyles[style];

    if (value) {
      styles[style] = value;
    }
  });

  document.body.removeChild(element);

  return styles;
};
