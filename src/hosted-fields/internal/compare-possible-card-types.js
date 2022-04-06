"use strict";

function comparePossibleCardTypes(a, b) {
  var aHash;

  if (a.length !== b.length) {
    return false;
  }

  aHash = a.reduce(function (accum, type) {
    accum[type.type] = true;

    return accum;
  }, {});

  return b.every(function (type) {
    return aHash.hasOwnProperty(type.type);
  });
}

module.exports = comparePossibleCardTypes;
