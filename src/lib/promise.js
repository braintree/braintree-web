'use strict';

var Promise = global.Promise || require('promise-polyfill');
var ExtendedPromise = require('@braintree/extended-promise');

ExtendedPromise.suppressUnhandledPromiseMessage = true;
ExtendedPromise.setPromise(Promise);

module.exports = Promise;
