import BraintreeError from "./braintree-error";
import * as sharedErrors from "./errors";

export default function (instance, methodNames) {
  methodNames.forEach(function (methodName) {
    instance[methodName] = function () {
      throw new BraintreeError({
        type: sharedErrors.METHOD_CALLED_AFTER_TEARDOWN.type,
        code: sharedErrors.METHOD_CALLED_AFTER_TEARDOWN.code,
        message: methodName + " cannot be called after teardown.",
      });
    };
  });
}
