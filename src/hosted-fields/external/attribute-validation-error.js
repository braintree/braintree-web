import BraintreeError from "../../lib/braintree-error";
import errors from "../shared/errors";
import { allowedAttributes } from "../shared/constants";

function attributeValidationError(attribute, value) {
  var err;

  if (!allowedAttributes.hasOwnProperty(attribute)) {
    err = new BraintreeError({
      type: errors.HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED.type,
      code: errors.HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED.code,
      message:
        'The "' + attribute + '" attribute is not supported in Hosted Fields.',
    });
  } else if (value != null && !_isValid(attribute, value)) {
    err = new BraintreeError({
      type: errors.HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED.type,
      code: errors.HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED.code,
      message:
        'Value "' +
        value +
        '" is not allowed for "' +
        attribute +
        '" attribute.',
    });
  }

  return err;
}

function _isValid(attribute, value) {
  if (allowedAttributes[attribute] === "string") {
    return typeof value === "string" || typeof value === "number";
  }
  if (allowedAttributes[attribute] === "boolean") {
    return String(value) === "true" || String(value) === "false";
  }

  return false;
}

export default attributeValidationError;
