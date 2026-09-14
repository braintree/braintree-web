import isAndroid from "@braintree/browser-detection/is-android";
import isIos from "@braintree/browser-detection/is-ios";

function isMobileDevice() {
  return isAndroid() || isIos();
}

export { isMobileDevice };

export default {
  isMobileDevice,
};
