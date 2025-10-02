"use strict";

var FRAUDNET_FNCLS = require("../lib/constants").FRAUDNET_FNCLS;
var FRAUDNET_SOURCE = require("../lib/constants").FRAUDNET_SOURCE;
var FRAUDNET_URL = require("../lib/constants").FRAUDNET_URL;
var loadScript = require("../lib/assets").loadScript;

var TRUNCATION_LENGTH = 32;

var cachedSessionId;

function setup(options) {
  var fraudNet = new Fraudnet();

  options = options || {};

  if (!options.sessionId && cachedSessionId) {
    fraudNet.sessionId = cachedSessionId;

    return Promise.resolve(fraudNet);
  }

  return fraudNet.initialize(options);
}

function clearSessionIdCache() {
  cachedSessionId = null;
}

function Fraudnet() {}

Fraudnet.prototype.initialize = function (options) {
  var self = this;

  this.sessionId = options.sessionId || options.clientSessionId;

  if (this.sessionId) {
    this.sessionId = this.sessionId.substring(0, TRUNCATION_LENGTH);
  }

  if (!options.sessionId) {
    cachedSessionId = this.sessionId;
  }

  var parameterBlockConfig = {
    f: this.sessionId,
    s: FRAUDNET_SOURCE,
  };

  if (!options.hasOwnProperty("beacon") || options.beacon === true) {
    parameterBlockConfig.b = _generateBeaconId(this.sessionId);
  } else {
    parameterBlockConfig.bu = false;
  }

  if (options.hasOwnProperty("cb1")) {
    parameterBlockConfig.cb1 = options.cb1;
  }

  this._parameterBlock = _createParameterBlock(
    parameterBlockConfig,
    options.environment
  );

  return loadScript({
    src: FRAUDNET_URL,
  })
    .then(function (block) {
      self._thirdPartyBlock = block;

      return self;
    })
    .catch(function () {
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

function _generateBeaconId(sessionId) {
  var timestamp = new Date().getTime() / 1000;

  return (
    "https://b.stats.paypal.com/counter.cgi" +
    "?i=127.0.0.1" +
    "&p=" +
    sessionId +
    "&t=" +
    timestamp +
    "&a=14"
  );
}

function _createParameterBlock(config, environment) {
  var el = document.body.appendChild(document.createElement("script"));
  // for some reason, the presence of the sandbox
  // attribute in a production environment causes
  // some weird behavior with what url paths are
  // hit, so instead, we only apply this attribute
  // when it is not a production environment
  if (environment !== "production") {
    config.sandbox = true;
  }

  el.type = "application/json";
  el.setAttribute("fncls", FRAUDNET_FNCLS);
  el.text = JSON.stringify(config);

  return el;
}

module.exports = {
  setup: setup,
  clearSessionIdCache: clearSessionIdCache,
};
