"use strict";

function _notEmpty(obj) {
  var key;

  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      return true;
    }
  }

  return false;
}

/* eslint-disable no-mixed-operators */
function _isArray(value) {
  return (
    (value &&
      typeof value === "object" &&
      typeof value.length === "number" &&
      Object.prototype.toString.call(value) === "[object Array]") ||
    false
  );
}
/* eslint-enable no-mixed-operators */

function hasQueryParams(url) {
  url = url || window.location.href;

  return /\?/.test(url);
}

function parse(url) {
  var query, params;

  url = url || window.location.href;

  if (!hasQueryParams(url)) {
    return {};
  }

  query = url.split("?")[1] || "";
  query = query.replace(/#.*$/, "").split("&");

  params = query.reduce(function (toReturn, keyValue) {
    var parts = keyValue.split("=");
    var key = decodeURIComponent(parts[0]);
    var value = decodeURIComponent(parts[1]);

    toReturn[key] = value;

    return toReturn;
  }, {});

  return params;
}

function stringify(params, namespace) {
  var k, v, p;
  var query = [];

  for (p in params) {
    if (!params.hasOwnProperty(p)) {
      continue;
    }

    v = params[p];

    if (namespace) {
      if (_isArray(params)) {
        k = namespace + "[]";
      } else {
        k = namespace + "[" + p + "]";
      }
    } else {
      k = p;
    }
    if (typeof v === "object") {
      query.push(stringify(v, k));
    } else {
      query.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    }
  }

  return query.join("&");
}

function queryify(url, params) {
  url = url || "";

  if (params != null && typeof params === "object" && _notEmpty(params)) {
    url += url.indexOf("?") === -1 ? "?" : "";
    url += url.indexOf("=") !== -1 ? "&" : "";
    url += stringify(params);
  }

  return url;
}

module.exports = {
  parse: parse,
  stringify: stringify,
  queryify: queryify,
  hasQueryParams: hasQueryParams,
};
