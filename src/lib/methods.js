"use strict";

module.exports = function (obj) {
  return Object.keys(obj).filter(function (key) {
    return typeof obj[key] === "function";
  });
};
