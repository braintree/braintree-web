'use strict';

var isXHRAvailable = typeof window !== 'undefined' && window.XMLHttpRequest && 'withCredentials' in new window.XMLHttpRequest();

function getRequestObject() {
  return isXHRAvailable ? new window.XMLHttpRequest() : new window.XDomainRequest();
}

module.exports = {
  isAvailable: isXHRAvailable,
  getRequestObject: getRequestObject
};
