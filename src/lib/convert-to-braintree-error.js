"use strict";

var BraintreeError = require("./braintree-error");

function convertToBraintreeError(originalErr, btErrorObject) {
  if (originalErr instanceof BraintreeError) {
    return originalErr;
  }

  return new BraintreeError({
    type: btErrorObject.type,
    code: btErrorObject.code,
    message: btErrorObject.message,
    details: {
      originalError: originalErr,
    },
  });
}

module.exports = convertToBraintreeError;
