'use strict';

var isXHRAvailable = global.XMLHttpRequest && 'withCredentials' in new global.XMLHttpRequest();

function getRequestObject() {
  return isXHRAvailable ? new global.XMLHttpRequest() : new global.XDomainRequest();
}

module.exports = {
  isAvailable: isXHRAvailable,
  getRequestObject: getRequestObject
};
