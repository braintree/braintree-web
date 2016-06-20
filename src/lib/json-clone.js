'use strict';

module.exports = function (value) {
  return JSON.parse(JSON.stringify(value));
};
