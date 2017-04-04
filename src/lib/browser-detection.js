'use strict';

var MINIMUM_SUPPORTED_CHROME_IOS_VERSION = 48;

function isOperaMini(ua) {
  ua = ua || global.navigator.userAgent;
  return ua.indexOf('Opera Mini') > -1;
}

function isAndroidFirefox(ua) {
  ua = ua || global.navigator.userAgent;
  return isAndroid(ua) && ua.indexOf('Firefox') > -1;
}

function getIEVersion(ua) {
  ua = ua || global.navigator.userAgent;

  if (ua.indexOf('MSIE') !== -1) {
    return parseInt(ua.replace(/.*MSIE ([0-9]+)\..*/, '$1'), 10);
  } else if (/Trident.*rv:11/.test(ua)) {
    return 11;
  }

  return null;
}

function isIe9(ua) {
  ua = ua || navigator.userAgent;
  return ua.indexOf('MSIE 9') !== -1;
}

function isHTTPS(protocol) {
  protocol = protocol || global.location.protocol;
  return protocol === 'https:';
}

function isIos(ua) {
  ua = ua || global.navigator.userAgent;
  return /iPhone|iPod|iPad/i.test(ua);
}

function isAndroid(ua) {
  ua = ua || global.navigator.userAgent;
  return /Android/.test(ua);
}

function isUnsupportedIosChrome(ua) {
  var match, version;

  ua = ua || global.navigator.userAgent;
  match = ua.match(/CriOS\/(\d+)\./);

  if (!match) {
    return false;
  }

  version = parseInt(match[1], 10);

  return version < MINIMUM_SUPPORTED_CHROME_IOS_VERSION;
}

function supportsPopups(ua) {
  ua = ua || global.navigator.userAgent;
  return !(isIosWebview(ua) || isAndroidWebview(ua) || isOperaMini(ua) || isUnsupportedIosChrome(ua));
}

// The Google Search iOS app is technically a webview and doesn't support popups.
function isGoogleSearchApp(ua) {
  return /\bGSA\b/.test(ua);
}

function isIosWebview(ua) {
  ua = ua || global.navigator.userAgent;
  if (isIos(ua)) {
    if (isGoogleSearchApp(ua)) {
      return true;
    }
    return /.+AppleWebKit(?!.*Safari)/.test(ua);
  }
  return false;
}

function isAndroidWebview(ua) {
  var androidWebviewRegExp = /Version\/[\d\.]+/;

  ua = ua || global.navigator.userAgent;
  if (isAndroid(ua)) {
    return androidWebviewRegExp.test(ua) && !isOperaMini(ua);
  }
  return false;
}

module.exports = {
  isOperaMini: isOperaMini,
  isAndroidFirefox: isAndroidFirefox,
  getIEVersion: getIEVersion,
  isIe9: isIe9,
  isHTTPS: isHTTPS,
  isIos: isIos,
  isAndroid: isAndroid,
  isUnsupportedIosChrome: isUnsupportedIosChrome,
  supportsPopups: supportsPopups
};
