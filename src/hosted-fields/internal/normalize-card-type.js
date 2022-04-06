"use strict";

var removeIgnorableCharacters = require("./remove-ignorable-characters");

module.exports = function normalizeCardType(type) {
  return removeIgnorableCharacters(type).toLowerCase();
};
