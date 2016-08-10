'use strict';

var dataCollector = require('../../../src/data-collector');
var kount = require('../../../src/data-collector/kount');
var fraudnet = require('../../../src/data-collector/fraudnet');
var BraintreeError = require('../../../src/lib/error');
var methods = require('../../../src/lib/methods');
var fake = require('../../helpers/fake');
var version = require('../../../package.json').version;

describe('dataCollector', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    this.configuration = configuration;
    this.configuration.gatewayConfiguration.kount = {kountMerchantId: '12345'};
    this.configuration.gatewayConfiguration.paypalEnabled = true;
    this.client = {
      getConfiguration: function () {
        return configuration;
      }
    };
    this.sandbox.stub(kount, 'setup');
    this.sandbox.stub(fraudnet, 'setup');
  });

  it('throws an error if no callback is given', function () {
    var err;

    try {
      dataCollector.create({client: this.client});
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.message).to.equal('create must include a callback function.');
    expect(err.code).to.equal('CALLBACK_REQUIRED');
    expect(err.type).to.equal('MERCHANT');
  });

  it('returns an error if no client is given', function (done) {
    dataCollector.create({kount: true}, function (err, actual) {
      expect(actual).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.message).to.equal('options.client is required when instantiating Data Collector.');
      expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
      expect(err.type).to.equal('MERCHANT');

      done();
    });
  });

  it('returns an error when called with a mismatched version', function (done) {
    this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

    dataCollector.create({
      client: this.client,
      kount: true
    }, function (err, actual) {
      expect(actual).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
      expect(err.message).to.equal('Client (version 1.2.3) and Data Collector (version ' + version + ') components must be from the same SDK version.');

      done();
    });
  });
  it('returns an error if merchant is not enabled for paypal but specified paypal', function (done) {
    this.configuration.gatewayConfiguration.paypalEnabled = false;

    dataCollector.create({client: this.client, paypal: true}, function (err, actual) {
      expect(actual).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.message).to.equal('PayPal is not enabled for this merchant.');
      expect(err.code).to.equal('DATA_COLLECTOR_PAYPAL_NOT_ENABLED');
      expect(err.type).to.equal('MERCHANT');

      done();
    });
  });

  it('returns an error if merchant is not enabled for kount but specified kount', function (done) {
    delete this.configuration.gatewayConfiguration.kount;

    dataCollector.create({client: this.client, kount: true}, function (err, actual) {
      expect(actual).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.message).to.equal('Kount is not enabled for this merchant.');
      expect(err.code).to.equal('DATA_COLLECTOR_KOUNT_NOT_ENABLED');
      expect(err.type).to.equal('MERCHANT');

      done();
    });
  });

  it('returns an error if kount and paypal are not defined', function (done) {
    dataCollector.create({client: this.client}, function (err, actual) {
      expect(actual).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.message).to.equal('Data Collector must be created with Kount and/or PayPal.');
      expect(err.code).to.equal('DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS');
      expect(err.type).to.equal('MERCHANT');

      done();
    });
  });

  it('returns an error if kount throws an error', function (done) {
    kount.setup.throws(new Error('foo boo'));

    dataCollector.create({
      client: this.client,
      kount: true
    }, function (err, actual) {
      expect(actual).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.message).to.equal('foo boo');
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('DATA_COLLECTOR_KOUNT_ERROR');

      done();
    });
  });

  it('sets Kount merchantId from gateway configuration', function (done) {
    var mockData = {
      deviceData: {
        device_session_id: 'did', // eslint-disable-line
        fraud_merchant_id: '12345' // eslint-disable-line
      }
    };

    kount.setup.returns(mockData);

    dataCollector.create({
      client: this.client,
      kount: true
    }, function () {
      expect(kount.setup).to.have.been.calledWith(sinon.match({
        merchantId: '12345'
      }));

      done();
    });
  });

  it('returns only kount information if kount is true but paypal is false', function (done) {
    var mockData = {
      deviceData: {
        device_session_id: 'did', // eslint-disable-line
        fraud_merchant_id: 'fmid' // eslint-disable-line
      }
    };

    kount.setup.returns(mockData);

    dataCollector.create({
      client: this.client,
      kount: true
    }, function (err, actual) {
      expect(err).not.to.exist;
      expect(actual.deviceData).to.equal(JSON.stringify(mockData.deviceData));

      done();
    });
  });

  it('returns only fraudnet information if kount is false but paypal is true', function (done) {
    var mockData = {
      sessionId: 'thingy'
    };

    fraudnet.setup.returns(mockData);

    dataCollector.create({
      client: this.client,
      paypal: true
    }, function (err, actual) {
      expect(err).not.to.exist;
      expect(actual.deviceData).to.equal('{"correlation_id":"' + mockData.sessionId + '"}');

      done();
    });
  });

  it('returns both fraudnet information if kount and paypal are present', function (done) {
    var mockPPid = 'paypal_id';
    var mockData = {
      deviceData: {
        device_session_id: 'did', // eslint-disable-line
        fraud_merchant_id: 'fmid' // eslint-disable-line
      }
    };

    kount.setup.returns(mockData);
    fraudnet.setup.returns({
      sessionId: mockPPid
    });

    dataCollector.create({
      client: this.client,
      paypal: true,
      kount: true
    }, function (err, data) {
      var actual;

      expect(err).not.to.exist;
      actual = JSON.parse(data.deviceData);
      expect(actual.correlation_id).to.equal(mockPPid);
      expect(actual.device_session_id).to.equal(mockData.deviceData.device_session_id);
      expect(actual.fraud_merchant_id).to.equal(mockData.deviceData.fraud_merchant_id);

      done();
    });
  });

  it('returns different data every invocation', function (done) {
    var mockPPid = 'paypal_id';
    var mockData = {
      deviceData: {
        device_session_id: 'did', // eslint-disable-line
        fraud_merchant_id: 'fmid' // eslint-disable-line
      }
    };

    kount.setup.returns(mockData);
    fraudnet.setup.returns({
      sessionId: mockPPid
    });

    dataCollector.create({
      client: this.client,
      paypal: true,
      kount: true
    }, function (err1, actual1) {
      kount.setup.returns({deviceData: {newStuff: 'anything'}});
      fraudnet.setup.returns({
        sessionId: 'newid'
      });

      dataCollector.create({
        client: this.client,
        paypal: true,
        kount: true
      }, function (err2, actual2) {
        expect(err1).not.to.exist;
        expect(err2).not.to.exist;

        expect(actual1.deviceData).not.to.equal(actual2.deviceData);

        done();
      });
    }.bind(this));
  });

  describe('teardown', function () {
    it('runs teardown on all instances', function (done) {
      var kountTeardown = this.sandbox.spy();
      var fraudnetTeardown = this.sandbox.spy();

      kount.setup.returns({
        deviceData: {},
        teardown: kountTeardown
      });
      fraudnet.setup.returns({
        sessionId: 'anything',
        teardown: fraudnetTeardown
      });

      dataCollector.create({
        client: this.client,
        paypal: true,
        kount: true
      }, function (err, actual) {
        expect(err).not.to.exist;

        actual.teardown();

        expect(fraudnetTeardown).to.have.been.called;
        expect(kountTeardown).to.have.been.called;

        done();
      });
    });

    it('calls provided callback on teardown', function (done) {
      kount.setup.returns({
        deviceData: {},
        teardown: function () {}
      });
      fraudnet.setup.returns({
        sessionId: 'anything',
        teardown: function () {}
      });

      dataCollector.create({
        client: this.client,
        paypal: true,
        kount: true
      }, function (err, actual) {
        actual.teardown(function () {
          expect(arguments).to.have.lengthOf(0);

          done();
        });
      });
    });

    it('does not require a callback for teardown', function (done) {
      kount.setup.returns({
        deviceData: {},
        teardown: function () {}
      });
      fraudnet.setup.returns({
        sessionId: 'anything',
        teardown: function () {}
      });

      dataCollector.create({
        client: this.client,
        paypal: true,
        kount: true
      }, function (err, actual) {
        expect(function () {
          actual.teardown();
        }).to.not.throw();

        done();
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var error;

      kount.setup.returns({
        deviceData: {},
        teardown: function () {}
      });
      fraudnet.setup.returns({
        sessionId: 'anything',
        teardown: function () {}
      });

      dataCollector.create({
        client: this.client,
        paypal: true,
        kount: true
      }, function (err, data) {
        data.teardown(function () {
          methods(data).forEach(function (method) {
            try {
              data[method]();
            } catch (e) {
              error = e;
            }

            expect(error).to.be.an.instanceof(BraintreeError);
            expect(error.type).to.equal('MERCHANT');
            expect(error.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
            expect(error.message).to.equal(method + ' cannot be called after teardown.');
          });

          done();
        });
      });
    });
  });
});
