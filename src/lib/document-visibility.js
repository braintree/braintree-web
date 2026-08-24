"use strict";

// Cross-browser Page Visibility helpers. Some browsers only expose the
// vendor-prefixed hidden property and change event, so resolve both together
// to keep the event we listen for and the property we read consistent.

function getVisibilityChangeEventName() {
  if (typeof window.document.hidden !== "undefined") {
    return "visibilitychange";
  }

  if (typeof window.document.msHidden !== "undefined") {
    return "msvisibilitychange";
  }

  if (typeof window.document.webkitHidden !== "undefined") {
    return "webkitvisibilitychange";
  }

  return "visibilitychange";
}

function isDocumentHidden() {
  return Boolean(
    window.document.hidden ||
    window.document.msHidden ||
    window.document.webkitHidden
  );
}

module.exports = {
  getVisibilityChangeEventName: getVisibilityChangeEventName,
  isDocumentHidden: isDocumentHidden,
};
