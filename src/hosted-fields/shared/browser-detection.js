import isAndroid from "@braintree/browser-detection/is-android";
import isChromeOS from "@braintree/browser-detection/is-chrome-os";
import isIos from "@braintree/browser-detection/is-ios";
import isChrome from "@braintree/browser-detection/is-chrome";
import isSafari from "@braintree/browser-detection/is-safari";
import isIosSafari from "@braintree/browser-detection/is-ios-safari";
import isFirefox from "@braintree/browser-detection/is-firefox";
import isIosWebview from "@braintree/browser-detection/is-ios-webview";

function hasSoftwareKeyboard() {
  return isAndroid() || isChromeOS() || isIos();
}

function isChromeIos() {
  return isChrome() && isIos();
}

export {
  isAndroid,
  isChromeOS,
  isChromeIos,
  isFirefox,
  isIos,
  isIosWebview,
  isSafari,
  isIosSafari,
  hasSoftwareKeyboard,
};

export default {
  isAndroid,
  isChromeOS,
  isChromeIos,
  isFirefox,
  isIos,
  isIosWebview,
  isSafari,
  isIosSafari,
  hasSoftwareKeyboard,
};
