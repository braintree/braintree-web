"use strict";

// NEXT_MAJOR_VERSION old versions of IE don't have atob, in the
// next major version, we're dropping support for those versions
// so we can eliminate the need to have this atob polyfill
var atobNormalized = typeof atob === "function" ? atob : atobPolyfill;

function atobPolyfill(base64String) {
  var a, b, c, b1, b2, b3, b4, i;
  var base64Matcher = new RegExp(
    "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$"
  );
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";

  if (!base64Matcher.test(base64String)) {
    throw new Error("Non base64 encoded input passed to window.atob polyfill");
  }

  i = 0;
  do {
    b1 = characters.indexOf(base64String.charAt(i++));
    b2 = characters.indexOf(base64String.charAt(i++));
    b3 = characters.indexOf(base64String.charAt(i++));
    b4 = characters.indexOf(base64String.charAt(i++));

    a = ((b1 & 0x3f) << 2) | ((b2 >> 4) & 0x3);
    b = ((b2 & 0xf) << 4) | ((b3 >> 2) & 0xf);
    c = ((b3 & 0x3) << 6) | (b4 & 0x3f);

    result +=
      String.fromCharCode(a) +
      (b ? String.fromCharCode(b) : "") +
      (c ? String.fromCharCode(c) : "");
  } while (i < base64String.length);

  return result;
}

module.exports = {
  atob: function (base64String) {
    return atobNormalized.call(window, base64String);
  },
  _atob: atobPolyfill,
};
