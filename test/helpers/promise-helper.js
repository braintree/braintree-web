"use strict";

function rejectIfResolves() {
  throw new Error("should not resolve");
}

function wait(time) {
  time = time || 1;

  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

module.exports = {
  rejectIfResolves: rejectIfResolves,
  wait: wait,
};
