'use strict';

var kount = require('../../../src/data-collector/kount');
var Kount = kount.Kount;
var sjcl = require('sjcl');

function deleteAllIframes() {
  var i, iframe;
  var iframes = document.getElementsByTagName('iframe');

  for (i = 0; i < iframes.length; i++) {
    iframe = iframes[i];
    iframe.parentNode.removeChild(iframe);
  }
}

describe('kount', function () {
  beforeEach(function () {
    deleteAllIframes();
  });

  afterEach(deleteAllIframes);

  it('appends an environment-specific iframe to the body', function (done) {
    var iframe;

    this.timeout(4000);
    kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});

    iframe = document.getElementById('braintreeDataFrame');

    setTimeout(function () {
      expect(iframe.src).to.match(new RegExp('^' + kount.environmentUrls.qa));
      done();
    }, 3000);
  });

  it('should start collecting entropy when set up', function () {
    this.sandbox.stub(sjcl.random, 'startCollectors');

    kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});

    expect(sjcl.random.startCollectors).to.have.beenCalled;
  });

  it('returns device_data from setup', function () {
    var actual = kount.setup({environment: 'qa', merchantId: '600000'});

    expect(actual.deviceData.device_session_id).to.exist;
    expect(actual.deviceData.fraud_merchant_id).to.exist;
  });

  it('generates a device_data field and populates it with JSON with a custom Kount merchant id', function () {
    var actual = kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});

    expect(actual.deviceData.device_session_id.length).to.equal(32);
    expect(actual.deviceData.fraud_merchant_id).to.equal('custom_Kount_mid');
  });

  it('can be called multiple times', function () {
    var iframes;

    kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});
    kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});

    iframes = document.getElementsByTagName('iframe');

    expect(iframes.length).to.equal(1);
  });

  it('creates an iframe, containing an img, with the device session id & merchant ids as params', function (done) {
    var actual, dsid, iframe;

    this.timeout(4000);

    actual = kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});
    dsid = actual.deviceData.device_session_id;
    iframe = document.getElementById('braintreeDataFrame');

    setTimeout(function () {
      expect(iframe.src).to.contain(dsid);
      expect(iframe.src).to.contain(kount.environmentUrls.qa);
      expect(iframe.innerHTML).to.contain(dsid);
      expect(iframe.innerHTML).to.contain(kount.environmentUrls.qa);
      done();
    }, 3000);
  });

  it('creates an iframe with a specific id', function (done) {
    var iframe;

    this.timeout(4000);
    kount.setup({environment: 'qa', merchantId: 'myid'});
    iframe = document.getElementById('braintreeDataFrame');

    setTimeout(function () {
      expect(iframe.src).to.contain('myid');
      expect(iframe.innerHTML).to.contain('myid');
      done();
    }, 3000);
  });

  it('safely urlencodes device session id & merchant ids as params', function () {
    var iframe;

    this.sandbox.stub(Kount.prototype, '_generateDeviceSessionId').returns('<script>alert("HACKED");</script>');

    kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});
    iframe = document.getElementById('braintreeDataFrame');

    expect(iframe.src).not.to.contain('<script>');
  });

  it('throws an exception when the given environment is not valid', function () {
    expect(function () {
      kount.setup({environment: 'badEnv'});
    }).to.throw('badEnv is not a valid environment for kount.environment');
  });

  it('includes the environment\'s url in the iframe', function (done) {
    var iframe;

    this.timeout(4000);
    kount.setup({environment: 'qa', merchantId: 'custom_Kount_mid'});

    iframe = document.getElementById('braintreeDataFrame');

    setTimeout(function () {
      expect(iframe.src).to.match(new RegExp('^' + kount.environmentUrls.qa));
      done();
    }, 3000);
  });
});

describe('_getDeviceData', function () {
  it('returns a serialized version of device data', function () {
    var actual = Kount.prototype._getDeviceData.call({
      _deviceSessionId: 'my_device_session_id',
      _currentEnvironment: {id: 'id'}
    });

    expect(actual).to.deep.equal({
      device_session_id: 'my_device_session_id', // eslint-disable-line
      fraud_merchant_id: 'id' // eslint-disable-line
    });
  });
});

describe('teardown', function () {
  it('stops sjcl collectors, and removes iframe', function () {
    this.sandbox.spy(sjcl.random, 'stopCollectors');
    this.sandbox.stub(Kount.prototype, '_removeIframe');

    Kount.prototype.teardown();

    expect(sjcl.random.stopCollectors).to.have.been.called;
    expect(Kount.prototype._removeIframe).to.have.been.called;
  });
});

describe('_removeIframe', function () {
  it('removes iframe from DOM', function () {
    var iframe = document.createElement('iframe');

    document.body.appendChild(iframe);

    expect(document.body.querySelector('iframe')).to.equal(iframe);

    Kount.prototype._removeIframe.call({_iframe: iframe});

    expect(document.body.querySelector('iframe')).to.equal(null);
  });
});

describe('_generateDeviceSessionId', function () {
  it('does not cache the value', function () {
    var dsid;

    dsid = Kount.prototype._generateDeviceSessionId();
    expect(Kount.prototype._generateDeviceSessionId()).not.to.equal(dsid);
  });
});
