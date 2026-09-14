import RestrictedInput from "restricted-input";
import FakeRestrictedInput from "./fake-restricted-input";
var SUPPORTED_INPUT_TYPES = ["text", "tel", "url", "search", "password"];

export default function (options) {
  var shouldFormat = options.shouldFormat;

  if (SUPPORTED_INPUT_TYPES.indexOf(options.element.type) === -1) {
    shouldFormat = false;
  }

  return shouldFormat
    ? new RestrictedInput(options)
    : new FakeRestrictedInput(options);
}
