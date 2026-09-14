import isAndroid from "@braintree/browser-detection/is-android";
import isChrome from "@braintree/browser-detection/is-chrome";
import isIos from "@braintree/browser-detection/is-ios";
import isIosSafari from "@braintree/browser-detection/is-ios-safari";
import isIosWebview from "@braintree/browser-detection/is-ios-webview";
import isIncognito from "@braintree/browser-detection/is-incognito";

function isAndroidWebview() {
  return (
    isAndroid() && window.navigator.userAgent.toLowerCase().indexOf("wv") > -1
  );
}

function doesNotSupportWindowOpenInIos() {
  if (!isIos()) {
    return false;
  }

  return isIosWebview() || !isIosSafari();
}

function isFacebookOwnedBrowserOnAndroid() {
  var ua = window.navigator.userAgent.toLowerCase();

  // Huawei's Facebook useragent does not include Android
  if (ua.indexOf("huawei") > -1 && ua.indexOf("fban") > -1) {
    return true;
  }

  if (!isAndroid()) {
    return false;
  }

  return ua.indexOf("fb_iab") > -1 || ua.indexOf("instagram") > -1;
}

function isIosChrome() {
  return isIos() && isChrome();
}

function isWebview() {
  return isAndroidWebview() || isIosWebview();
}

export {
  isAndroid,
  isAndroidWebview,
  isChrome,
  isIos,
  isIosChrome,
  isIosSafari,
  isIosWebview,
  isWebview,
  isFacebookOwnedBrowserOnAndroid,
  doesNotSupportWindowOpenInIos,
  isIncognito,
};

export default {
  isAndroid,
  isAndroidWebview,
  isChrome,
  isIos,
  isIosChrome,
  isIosSafari,
  isIosWebview,
  isWebview,
  isFacebookOwnedBrowserOnAndroid,
  doesNotSupportWindowOpenInIos,
  isIncognito,
};
