'use strict';

var FRAUDNET_FNCLS = require('../lib/constants').FRAUDNET_FNCLS;
var FRAUDNET_SOURCE = require('../lib/constants').FRAUDNET_SOURCE;
var FRAUDNET_URL = require('../lib/constants').FRAUDNET_URL;
var loadScript = require('../lib/assets').loadScript;
var Promise = require('../lib/promise');

var cachedSessionId;

function setup() {
  var fraudNet = new Fraudnet();

  if (cachedSessionId) {
    fraudNet.sessionId = cachedSessionId;

    return Promise.resolve(fraudNet);
  }

  return fraudNet.initialize();
}

function clearSessionIdCache() {
  cachedSessionId = null;
}

function Fraudnet() {
}

Fraudnet.prototype.initialize = function () {
  var self = this;

  this.sessionId = cachedSessionId = _generateSessionId();
  this._beaconId = _generateBeaconId(this.sessionId);
  this._parameterBlock = _createParameterBlock(this.sessionId, this._beaconId);

  return loadScript({
    src: FRAUDNET_URL
  }).then(function (block) {
    self._thirdPartyBlock = block;

    return self;
  }).catch(function () {
    // if the fraudnet script fails to load
    // we just resolve with nothing
    // and data collector ignores it
    return null;
  });
};

Fraudnet.prototype.teardown = function () {
  removeElementIfOnPage(document.querySelector('iframe[title="ppfniframe"]'));
  removeElementIfOnPage(document.querySelector('iframe[title="pbf"]'));

  removeElementIfOnPage(this._parameterBlock);
  removeElementIfOnPage(this._thirdPartyBlock);
};

function removeElementIfOnPage(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function _generateSessionId() {
  var i;
  var id = '';

  for (i = 0; i < 32; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }

  return id;
}

function _generateBeaconId(sessionId) {
  var timestamp = new Date().getTime() / 1000;

  return 'https://b.stats.paypal.com/counter.cgi' +
    '?i=127.0.0.1' +
    '&p=' + sessionId +
    '&t=' + timestamp +
    '&a=14';
}

function _createParameterBlock(sessionId, beaconId) {
  var el = document.body.appendChild(document.createElement('script'));

  el.type = 'application/json';
  el.setAttribute('fncls', FRAUDNET_FNCLS);
  el.text = JSON.stringify({
    f: sessionId,
    s: FRAUDNET_SOURCE,
    b: beaconId
  });

  return el;
}

module.exports = {
  setup: setup,
  clearSessionIdCache: clearSessionIdCache
};
