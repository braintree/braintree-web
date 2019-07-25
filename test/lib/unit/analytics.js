'use strict';

var Promise = require('../../../src/lib/promise');
var analytics = require('../../../src/lib/analytics');
var constants = require('../../../src/lib/constants');

describe('analytics.sendEvent', function () {
  beforeEach(function () {
    this.client = {
      _request: this.sandbox.stub().yieldsAsync(),
      getConfiguration: function () {
        return {
          authorization: 'development_testing_merchant_id',
          analyticsMetadata: {sessionId: 'sessionId'},
          gatewayConfiguration: {
            analytics: {url: 'https://example.com/analytics-url'}
          }
        };
      }
    };
  });

  it('correctly sends an analytics event with a callback', function (done) {
    analytics.sendEvent(this.client, 'test.event.kind', function () {
      var currentTimestamp = Date.now();
      var postArgs = this.client._request.firstCall.args;

      expect(this.client._request).to.be.called;

      expect(postArgs[0].url).to.equal('https://example.com/analytics-url');
      expect(postArgs[0].method).to.equal('post');
      expect(postArgs[0].data.analytics[0].kind).to.equal('web.test.event.kind');
      expect(postArgs[0].data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION);
      expect(postArgs[0].data._meta.sessionId).to.equal('sessionId');
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.lessThan(2000);
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.greaterThan(0);
      expect(postArgs[0].timeout).to.equal(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
      expect(postArgs[0].data.analytics[0].isAsync).to.equal(false);

      done();
    }.bind(this));
  });

  it('correctly sends an analytics event with no callback (fire-and-forget)', function (done) {
    this.client._request.reset();

    analytics.sendEvent(this.client, 'test.event.kind');

    setTimeout(function () {
      var currentTimestamp = Date.now();
      var postArgs = this.client._request.firstCall.args;

      expect(this.client._request).to.be.called;

      expect(postArgs[0].url).to.equal('https://example.com/analytics-url');
      expect(postArgs[0].method).to.equal('post');
      expect(postArgs[0].data.analytics[0].kind).to.equal('web.test.event.kind');
      expect(postArgs[0].data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION);
      expect(postArgs[0].data._meta.sessionId).to.equal('sessionId');
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.lessThan(2000);
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.greaterThan(0);
      expect(postArgs[1]).not.to.exist;
      expect(postArgs[0].timeout).to.equal(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
      expect(postArgs[0].data.analytics[0].isAsync).to.equal(false);

      done();
    }.bind(this), 1);
  });

  it('can send a defered analytics event if client is a promise', function (done) {
    var clientPromise = Promise.resolve(this.client);

    analytics.sendEvent(clientPromise, 'test.event.kind', function () {
      var currentTimestamp = Date.now();
      var postArgs = this.client._request.firstCall.args;

      expect(this.client._request).to.be.called;

      expect(postArgs[0].url).to.equal('https://example.com/analytics-url');
      expect(postArgs[0].method).to.equal('post');
      expect(postArgs[0].data.analytics[0].kind).to.equal('web.test.event.kind');
      expect(postArgs[0].data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION);
      expect(postArgs[0].data._meta.sessionId).to.equal('sessionId');
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.lessThan(2000);
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.greaterThan(0);
      expect(postArgs[0].timeout).to.equal(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
      expect(postArgs[0].data.analytics[0].isAsync).to.equal(false);

      done();
    }.bind(this));
  });

  it('sets timestamp to the time when the event was initialized, not when it was sent', function (done) {
    var client = this.client;
    var clientPromise = new Promise(function (resolve) {
      setTimeout(function () {
        resolve(client);
      }, 1000);
    });

    analytics.sendEvent(clientPromise, 'test.event.kind', function () {
      var currentTimestamp = Date.now();
      var postArgs = client._request.firstCall.args;

      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.lessThan(2000);
      expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.greaterThan(0);
      expect(postArgs[0].data.analytics[0].isAsync).to.equal(true);

      done();
    });
  });
});
