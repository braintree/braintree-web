'use strict';

var Promise = require('./promise');

module.exports = function makePromisePlus() {
  var resolveFunction, rejectFunction;

  var promise = new Promise(function (resolve, reject) {
    resolveFunction = resolve;
    rejectFunction = reject;
  });

  promise.isFulfilled = false;
  promise.isResolved = false;
  promise.isRejected = false;

  promise.resolve = function (arg) {
    if (promise.isFulfilled) {
      return;
    }
    promise.isFulfilled = true;
    promise.isResolved = true;

    resolveFunction(arg);
  };

  promise.reject = function (arg) {
    if (promise.isFulfilled) {
      return;
    }
    promise.isFulfilled = true;
    promise.isRejected = true;

    rejectFunction(arg);
  };

  return promise;
};
