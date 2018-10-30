'use strict';

var FRAUDNET_FNCLS = require('../lib/constants').FRAUDNET_FNCLS;
var FRAUDNET_SOURCE = require('../lib/constants').FRAUDNET_SOURCE;
var FRAUDNET_URL = require('../lib/constants').FRAUDNET_URL;
var loadScript = require('../lib/assets').loadScript;

function setup() {
  var fraudNet = new Fraudnet();

  return fraudNet.initialize();
}

function Fraudnet() {
  this.sessionId = _generateSessionId();
  this._beaconId = _generateBeaconId(this.sessionId);
}

Fraudnet.prototype.initialize = function () {
  var self = this;

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
  var iframe = document.querySelector('iframe[title="ppfniframe"]');

  if (iframe) {
    iframe.parentNode.removeChild(iframe);
  }

  iframe = document.querySelector('iframe[title="pbf"]');
  if (iframe) {
    iframe.parentNode.removeChild(iframe);
  }

  if (this._parameterBlock) {
    this._parameterBlock.parentNode.removeChild(this._parameterBlock);
  }

  if (this._thirdPartyBlock) {
    this._thirdPartyBlock.parentNode.removeChild(this._thirdPartyBlock);
  }
};

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
  setup: setup
};
