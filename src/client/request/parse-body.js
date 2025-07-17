"use strict";

module.exports = function (body) {
  try {
    body = JSON.parse(body);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    /* ignored */
  }

  return body;
};
