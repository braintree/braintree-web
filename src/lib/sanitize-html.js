"use strict";

module.exports = function (str) {
  if (typeof str === "string") {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return "";
};
