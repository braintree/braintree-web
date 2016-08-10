'use strict';

var fraudNet = require('../../../src/data-collector/fraudnet');

describe('FraudNet', function () {
  var instance, el, frames;
  var parsedData = {};

  beforeEach(function () {
    instance = fraudNet.setup();
    el = document.querySelector('[fncls][type="application/json"]');
    frames = document.querySelectorAll('iframe[src="about:blank"]');
    parsedData = JSON.parse(el.text);
  });

  afterEach(function () {
    var iframe, iframes, i;

    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }

    iframes = document.getElementsByTagName('iframe');

    for (i = 0; i < iframes.length; i++) {
      iframe = iframes[i];
      iframe.parentNode.removeChild(iframe);
    }
  });

  it('appends a script type of "application/json" to the document', function () {
    expect(el).not.to.be.null;
  });

  it('appends the FraudNet library to the document', function () {
    expect(frames).not.to.be.null;
    expect(frames.length).to.equal(1);
  });

  it('contains expected values in parsed data', function () {
    var sessionId = instance.sessionId;

    expect(parsedData.b).to.contain(sessionId);
    expect(parsedData.f).to.equal(sessionId);
    expect(parsedData.s).to.equal('BRAINTREE_SIGNIN');
  });
});
