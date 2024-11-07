"use strict";

// Taken from https://github.com/sindresorhus/decamelize/blob/95980ab6fb44c40eaca7792bdf93aff7c210c805/index.js
function transformKey(key) {
  return key
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1_$2")
    .toLowerCase();
}

function camelCaseToSnakeCase(input) {
  var converted;

  if (input === null) {
    converted = null;
  } else if (Array.isArray(input)) {
    converted = [];

    input.forEach(function (x) {
      converted.push(camelCaseToSnakeCase(x));
    });
  } else if (typeof input === "object") {
    converted = Object.keys(input).reduce(function (newObj, key) {
      var transformedKey = transformKey(key);

      if (typeof input[key] === "object") {
        newObj[transformedKey] = camelCaseToSnakeCase(input[key]);
      } else {
        newObj[transformedKey] = input[key];
      }

      return newObj;
    }, {});
  } else {
    converted = input;
  }

  return converted;
}

module.exports = camelCaseToSnakeCase;
