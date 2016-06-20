'use strict';

var analytics = require('../../../src/lib/analytics');
var constants = require('../../../src/lib/constants');

describe('analytics.sendEvent', function () {
  beforeEach(function () {
    this.client = {
      _request: this.sandbox.stub(),
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

  it('correctly sends an analytics event with a callback', function () {
    var postArgs, currentTimestamp;

    function callback() {}

    analytics.sendEvent(this.client, 'test.event.kind', callback);

    expect(this.client._request).to.have.been.called;
    postArgs = this.client._request.firstCall.args;

    expect(postArgs[0].url).to.equal('https://example.com/analytics-url');
    expect(postArgs[0].method).to.equal('post');
    expect(postArgs[0].data.analytics[0].kind).to.equal('test.event.kind');
    expect(postArgs[0].data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION);
    expect(postArgs[0].data._meta.sessionId).to.equal('sessionId');
    currentTimestamp = Date.now() / 1000;
    expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.lessThan(2);
    expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.greaterThan(0);
    expect(postArgs[1]).to.equal(callback);
    expect(postArgs[0].timeout).to.equal(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
  });

  it('correctly sends an analytics event with no callback (fire-and-forget)', function () {
    var postArgs, currentTimestamp;

    analytics.sendEvent(this.client, 'test.event.kind');

    expect(this.client._request).to.have.been.called;
    postArgs = this.client._request.firstCall.args;

    expect(postArgs[0].url).to.equal('https://example.com/analytics-url');
    expect(postArgs[0].method).to.equal('post');
    expect(postArgs[0].data.analytics[0].kind).to.equal('test.event.kind');
    expect(postArgs[0].data.braintreeLibraryVersion).to.equal(constants.BRAINTREE_LIBRARY_VERSION);
    expect(postArgs[0].data._meta.sessionId).to.equal('sessionId');
    currentTimestamp = Date.now() / 1000;
    expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.lessThan(2);
    expect(currentTimestamp - postArgs[0].data.analytics[0].timestamp).to.be.greaterThan(0);
    expect(postArgs[1]).not.to.exist;
    expect(postArgs[0].timeout).to.equal(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
  });
});
