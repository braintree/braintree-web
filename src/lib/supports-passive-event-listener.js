"use strict";

// From https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
// Test via a getter in the options object to see if the passive property is accessed
var opts;
var supportsPassive = false;

try {
  opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassive = true;
    },
  });

  window.addEventListener("testPassive", null, opts);
  window.removeEventListener("testPassive", null, opts);
} catch (e) {
  // ignore errors
}

module.exports = supportsPassive;
