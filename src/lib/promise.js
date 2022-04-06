"use strict";

var PromisePolyfill = require("promise-polyfill");
var ExtendedPromise = require("@braintree/extended-promise");

// eslint-disable-next-line no-undef
var PromiseGlobal = typeof Promise !== "undefined" ? Promise : PromisePolyfill;

ExtendedPromise.suppressUnhandledPromiseMessage = true;
ExtendedPromise.setPromise(PromiseGlobal);

module.exports = PromiseGlobal;
