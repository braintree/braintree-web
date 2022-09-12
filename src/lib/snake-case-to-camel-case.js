"use strict";

module.exports = function (snakeString) {
  if (snakeString.indexOf("_") === -1) {
    return snakeString;
  }

  return snakeString.toLowerCase().replace(/(\_\w)/g, function (match) {
    return match[1].toUpperCase();
  });
};
