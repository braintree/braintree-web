'use strict';

var BraintreeError = require('./error');

module.exports = function (instance, methodNames) {
  methodNames.forEach(function (methodName) {
    instance[methodName] = function () {
      throw new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: methodName + ' cannot be called after teardown.'
      });
    };
  });
};
