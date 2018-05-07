'use strict';

var whitelistedStyles = require('../shared/constants').whitelistedStyles;

module.exports = function getStylesFromClass(cssClass) {
  var element = document.createElement('input');
  var styles = {};
  var computedStyles;

  if (cssClass[0] === '.') {
    cssClass = cssClass.substring(1);
  }

  element.className = cssClass;
  element.style.display = 'none !important';
  element.style.position = 'fixed !important';
  element.style.left = '-99999px !important';
  element.style.top = '-99999px !important';
  global.document.body.appendChild(element);

  computedStyles = global.getComputedStyle(element);

  whitelistedStyles.forEach(function (style) {
    var value = computedStyles[style];

    if (value) {
      styles[style] = value;
    }
  });

  global.document.body.removeChild(element);

  return styles;
};
