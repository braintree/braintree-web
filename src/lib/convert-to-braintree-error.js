import BraintreeError from "./braintree-error";

function convertToBraintreeError(originalErr, btErrorObject) {
  if (
    originalErr &&
    originalErr.name &&
    originalErr.name === "BraintreeError"
  ) {
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

export default convertToBraintreeError;
