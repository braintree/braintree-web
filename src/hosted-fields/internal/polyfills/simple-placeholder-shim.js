"use strict";

var assign = require("../../../lib/assign").assign;

var CSS_PROPERTIES_TO_STEAL = [
  "border-width",
  "font",
  "fontFamily",
  "fontSize",
  "fontSizeAdjust",
  "fontStretch",
  "fontStyle",
  "fontVariant",
  "fontVariantAlternates",
  "fontVariantCaps",
  "fontVariantEastAsian",
  "fontVariantLigatures",
  "fontVariantNumeric",
  "fontWeight",
  "lineHeight",
  "padding",
  "textAlign",
  "textShadow",
];

var hasAddedGlobalStyles = false;

// the big kahuna
function placeholderShim(inputEl) {
  var placeholderEl, displayShow;
  var testInput = document.createElement("input");
  var isNativelySupported = testInput.placeholder !== void 0; // eslint-disable-line no-void

  if (isNativelySupported) {
    return;
  }

  addGlobalStyles();

  placeholderEl = createPlaceholderFor(inputEl);
  inputEl.parentNode.appendChild(placeholderEl);

  displayShow = getStyle(inputEl, "display") || "block";
  function update(force) {
    var shouldShow = force == null ? !inputEl.value : force;

    placeholderEl.style.display = shouldShow ? displayShow : "none";
  }

  update();

  if (inputEl.attachEvent) {
    inputEl.attachEvent("onfocus", function () {
      update(false);
    });
    inputEl.attachEvent("onblur", function () {
      update();
    });
    placeholderEl.attachEvent("onclick", function () {
      inputEl.focus();
    });
  }
}

// the private methods

function addGlobalStyles() {
  var sheet, head, style;

  if (hasAddedGlobalStyles) {
    return;
  }

  sheet = document.styleSheets && document.styleSheets[0];

  if (!sheet) {
    head = document.head || document.getElementsByTagName("head")[0];
    style = document.createElement("style");
    head.appendChild(style);
    sheet = style.sheet;
  }

  sheet.insertRule(".placeholder-shim { color: #999; }", 0);

  hasAddedGlobalStyles = true;
}

function createPlaceholderFor(el) {
  var result = document.createElement("div");

  updateParentPositionFor(el);
  addProperties(result);
  stealStyles(el, result);
  addStyles(result);
  stealPlaceholder(el, result);

  return result;
}

function addProperties(result) {
  result.setAttribute("unselectable", "on");
}

function stealStyles(src, dest) {
  var newStyles = {
    width: src.offsetWidth + "px",
    height: src.offsetHeight + "px",
  };
  var i, property, zIndex, borderTop, borderLeft;

  for (i = 0; i < CSS_PROPERTIES_TO_STEAL.length; i++) {
    property = CSS_PROPERTIES_TO_STEAL[i];
    newStyles[property] = getStyle(src, property);
  }

  zIndex = getStyle(src, "zIndex");
  newStyles.zIndex = typeof zIndex === "number" ? zIndex + 1 : 999;

  if (getStyle(src, "position") === "fixed") {
    assign(newStyles, {
      position: "fixed",
      margin: getStyle(src, "margin"),
      top: getStyle(src, "top"),
      left: getStyle(src, "left"),
      bottom: getStyle(src, "bottom"),
      right: getStyle(src, "right"),
    });
  } else {
    borderTop = parseFloat(getStyle(src, "borderTopWidth")) || 0;
    borderLeft = parseFloat(getStyle(src, "borderLeftWidth")) || 0;

    assign(newStyles, {
      position: "absolute",
      top: src.offsetTop + borderTop + "px",
      left: src.offsetLeft + borderLeft + "px",
    });
  }

  assign(dest.style, newStyles);
}

function addStyles(dest) {
  dest.className = "placeholder-shim";

  assign(dest.style, {
    boxSizing: "border-box",
    borderColor: "transparent",
    overflow: "hidden",
    whiteSpace: "nowrap",
  });
}

function updateParentPositionFor(el) {
  var parent = el.offsetParent;

  if (parent && getStyle(parent, "position") === "static") {
    parent.style.position = "relative";
  }
}

function stealPlaceholder(src, dest) {
  var result =
    src.getAttribute("placeholder") ||
    (src.attributes.placeholder && src.attributes.placeholder.nodeValue) ||
    "";

  result = result
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  dest.innerHTML = result;
}

function getStyle(elem, prop) {
  if (elem.currentStyle) {
    return elem.currentStyle[prop];
  }
  if (window.getComputedStyle && elem instanceof HTMLElement) {
    return document.defaultView.getComputedStyle(elem, null)[prop];
  }
  if (prop in elem.style) {
    return elem.style[prop];
  }

  return null;
}

module.exports = placeholderShim;
