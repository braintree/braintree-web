"use strict";

module.exports = function (body) {
  try {
    body = JSON.parse(body);
  } catch (e) {
    /* ignored */
  }

  return body;
};
