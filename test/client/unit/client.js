'use strict';

var Client = require('../../../src/client/client');
var VERSION = require('package.version');
var fake = require('../../helpers/fake');
var BraintreeError = require('../../../src/lib/error');

describe('Client', function () {
  describe('bad instantiation', function () {
    it('throws an error when instantiated with no arguments', function () {
      expect(function () {
        new Client(); // eslint-disable-line no-new
      }).to.throw(BraintreeError);
    });

    it('throws an error when instantiated with no gatewayConfiguration', function () {
      expect(function () {
        new Client({}); // eslint-disable-line no-new
      }).to.throw(BraintreeError, 'Missing gatewayConfiguration');
    });

    it('throws an error when instantiated with invalid assetsUrl', function () {
      expect(function () {
        new Client({ // eslint-disable-line no-new
          gatewayConfiguration: {
            assetsUrl: 'http://example.com'
          }
        });
      }).to.throw(BraintreeError, 'Invalid assetsUrl');
    });

    it('throws an error when instantiated with invalid clientApiUrl', function () {
      expect(function () {
        new Client({ // eslint-disable-line no-new
          gatewayConfiguration: {
            clientApiUrl: 'http://example.com'
          }
        });
      }).to.throw(BraintreeError, 'Invalid clientApiUrl');
    });

    it('throws an error when instantiated with invalid configUrl', function () {
      expect(function () {
        new Client({ // eslint-disable-line no-new
          gatewayConfiguration: {
            configUrl: 'http://example.com'
          }
        });
      }).to.throw(BraintreeError, 'Invalid configUrl');
    });
  });

  describe('getConfiguration', function () {
    it('has an immutable configuration', function () {
      var first, second;
      var client = new Client(fake.configuration());

      first = client.getConfiguration();
      first.gatewayConfiguration.yes = 'yes';

      second = client.getConfiguration();
      expect(second.gatewayConfiguration.yes).not.to.exist;
    });

    it('has analytics metadata', function () {
      var client = new Client(fake.configuration());

      var actual = client.getConfiguration();

      expect(actual.analyticsMetadata.sdkVersion).to.equal(VERSION);
      expect(actual.analyticsMetadata.merchantAppId).to.equal('http://fakeDomain.com');
      expect(actual.analyticsMetadata.sessionId).to.equal('fakeSessionId');
    });
  });

  describe('toJSON', function () {
    it('is an alias for getConfiguration', function () {
      var client = new Client(fake.configuration());

      expect(client.toJSON).to.equal(client.getConfiguration);
    });
  });

  describe('request', function () {
    it('calls callback with an error when passed no HTTP method', function (done) {
      var client = new Client(fake.configuration());

      client.request({
        endpoint: 'payment_methods'
      }, function (err, data) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('options.method is required.');
        expect(data).not.to.exist;

        done();
      });
    });

    it('calls callback with an error when passed no endpoint', function (done) {
      var client = new Client(fake.configuration());

      client.request({
        method: 'get'
      }, function (err, data) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('options.endpoint is required.');
        expect(data).not.to.exist;

        done();
      });
    });

    it('calls driver with client for source in _meta if source is not provided', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        method: 'get'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        data: {_meta: {source: 'client'}}
      }));
    });

    it('calls driver with full URL with GET if specified', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        method: 'get'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        method: 'get',
        url: 'https://braintreegateway.com/v1/payment_methods'
      }));
    });

    it('calls driver with full URL with POST if specified', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        method: 'post'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        url: 'https://braintreegateway.com/v1/payment_methods',
        method: 'post'
      }));
    });

    it('calls driver with library version', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        method: 'get'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        data: {braintreeLibraryVersion: 'braintree/web/' + VERSION}
      }));
    });

    it('calls driver with sessionId in _meta', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        method: 'get'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        data: {_meta: {sessionId: client.getConfiguration().analyticsMetadata.sessionId}}
      }));
    });

    it('calls driver with client for source in _meta if source is not provided', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        method: 'post',
        endpoint: 'payment_methods'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        data: {_meta: {source: 'client'}}
      }));
    });

    it('calls driver with specified source in _meta', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        method: 'post',
        endpoint: 'payment_methods',
        data: {
          _meta: {source: 'custom source'}
        }
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        data: {_meta: {source: 'custom source'}}
      }));
    });

    it('passes through timeout to driver', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        timeout: 4000,
        method: 'get'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        timeout: 4000
      }));
    });

    it('passes through callback to driver', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      function callback() {}

      client.request({
        endpoint: 'payment_methods',
        method: 'get'
      }, callback);

      expect(client._request).to.have.been.calledWith(sinon.match.object, callback);
    });

    it('passes through data to driver', function () {
      var client = new Client(fake.configuration());

      this.sandbox.stub(client, '_request', function () {});

      client.request({
        endpoint: 'payment_methods',
        data: {some: 'stuffs'},
        method: 'get'
      }, function () {});

      expect(client._request).to.have.been.calledWith(sinon.match({
        data: {some: 'stuffs'}
      }));
    });
  });
});
