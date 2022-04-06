"use strict";

module.exports = function removeIgnorableCharacters(str) {
  if (str) {
    return str.replace(/[-\s]/g, "");
  }

  return "";
};
