'use strict';

module.exports = function isIe9(userAgent) {
  userAgent = userAgent || navigator.userAgent;
  return userAgent.indexOf('MSIE 9') !== -1;
};
