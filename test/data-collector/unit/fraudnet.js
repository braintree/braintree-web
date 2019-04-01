'use strict';

var fraudNet = require('../../../src/data-collector/fraudnet');

describe('FraudNet', function () {
  var instance, el, script;
  var parsedData = {};

  before(function () {
    this.originalBody = document.body.innerHTML;

    return fraudNet.setup().then(function (result) {
      instance = result;
      el = document.querySelector('[fncls][type="application/json"]');
      script = document.querySelector('script[src="https://c.paypal.com/da/r/fb.js"]');
      parsedData = JSON.parse(el.text);
    });
  });

  after(function () {
    document.body.innerHTML = this.originalBody;
    fraudNet.clearSessionIdCache();
  });

  it('appends a script type of "application/json" to the document', function () {
    expect(el).not.to.be.null;
  });

  it('appends the FraudNet library to the document', function () {
    expect(script).not.to.be.null;
  });

  it('contains expected values in parsed data', function () {
    var sessionId = instance.sessionId;

    expect(parsedData.b).to.contain(sessionId);
    expect(parsedData.f).to.equal(sessionId);
    expect(parsedData.s).to.equal('BRAINTREE_SIGNIN');
  });

  it('re-uses session id when initialized more than once', function () {
    var originalSessionId = instance.sessionId;

    return fraudNet.setup().then(function (result) {
      expect(result.sessionId).to.exist;
      expect(result.sessionId).to.equal(originalSessionId);
    });
  });
});
