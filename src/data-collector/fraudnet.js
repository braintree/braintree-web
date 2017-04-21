'use strict';

function setup() {
  return new Fraudnet();
}

function Fraudnet() {
  this.sessionId = _generateSessionId();
  this._beaconId = _generateBeaconId(this.sessionId);

  this._parameterBlock = _createParameterBlock(this.sessionId, this._beaconId);
  this._thirdPartyBlock = _createThirdPartyBlock();
}

Fraudnet.prototype.teardown = function () {
  this._thirdPartyBlock.parentNode.removeChild(this._thirdPartyBlock);
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
  el.setAttribute('fncls', 'fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99');
  el.text = JSON.stringify({
    f: sessionId,
    s: 'BRAINTREE_SIGNIN',
    b: beaconId
  });

  return el;
}

function _createThirdPartyBlock() {
  var dom, doc;
  var scriptBaseURL = 'https://www.paypalobjects.com/webstatic/r/fb/';
  var iframe = document.createElement('iframe');

  iframe.src = 'about:blank';
  iframe.title = '';
  iframe.role = 'presentation'; // a11y
  (iframe.frameElement || iframe).style.cssText = 'width: 0; height: 0; border: 0; position: absolute; z-index: -999';
  document.body.appendChild(iframe);

  try {
    doc = iframe.contentWindow.document;
  } catch (e) {
    dom = document.domain;
    iframe.src = 'javascript:var d=document.open();d.domain="' + dom + '";void(0);'; // eslint-disable-line no-script-url
    doc = iframe.contentWindow.document;
  }

  doc.open()._l = function () {
    var js = this.createElement('script');

    if (dom) {
      this.domain = dom;
    }
    js.id = 'js-iframe-async';
    js.src = scriptBaseURL + 'fb-all-prod.pp.min.js';
    this.body.appendChild(js);
  };

  function listener() { doc._l(); }

  if (iframe.addEventListener) {
    iframe.addEventListener('load', listener, false);
  } else if (iframe.attachEvent) {
    iframe.attachEvent('onload', listener);
  } else {
    doc.write('<body onload="document._l();">');
  }

  doc.close();

  return iframe;
}

module.exports = {
  setup: setup
};
