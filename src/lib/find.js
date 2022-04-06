"use strict";

module.exports = function (array, key, value) {
  var i;

  for (i = 0; i < array.length; i++) {
    if (array[i].hasOwnProperty(key) && array[i][key] === value) {
      return array[i];
    }
  }

  return null;
};
