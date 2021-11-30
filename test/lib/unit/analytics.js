'use strict';

const analytics = require('../../../src/lib/analytics');
const constants = require('../../../src/lib/constants');
const { yieldsAsync } = require('../../helpers');

describe('analytics.sendEvent', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.fauxDate = 1000000;

    jest.useFakeTimers();

    jest.spyOn(Date, 'now').mockImplementation(() => {
      testContext.fauxDate += 400;

      return testContext.fauxDate;
    });
    testContext.client = {
      _request: jest.fn(yieldsAsync()),
      getConfiguration: () => ({
        authorization: 'development_testing_merchant_id',
        analyticsMetadata: { sessionId: 'sessionId' },
        gatewayConfiguration: {
          analytics: { url: 'https://example.com/analytics-url' }
        }
      })
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('correctly sends an analytics event with a callback', done => {
    analytics.sendEvent(testContext.client, 'test.event.kind', () => {
      const currentTimestamp = Date.now();
      const { timeout, url, method, data } = testContext.client._request.mock.calls[0][0];

      expect(testContext.client._request).toHaveBeenCalled();

      expect(url).toBe('https://example.com/analytics-url');
      expect(method).toBe('post');
      expect(data.analytics[0].kind).toBe('web.test.event.kind');
      expect(data.braintreeLibraryVersion).toBe(constants.BRAINTREE_LIBRARY_VERSION);
      expect(data._meta.sessionId).toBe('sessionId');
      expect(currentTimestamp - data.analytics[0].timestamp).toBeLessThan(2000);
      expect(currentTimestamp - data.analytics[0].timestamp).toBeGreaterThan(0);
      expect(timeout).toBe(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
      expect(data.analytics[0].isAsync).toBe(false);

      done();
    });
  });

  it('correctly sends an analytics event with no callback (fire-and-forget)', async () => {
    testContext.client._request.mockReset();

    analytics.sendEvent(testContext.client, 'test.event.kind');

    await Promise.resolve(() =>jest.runAllTimers());

    const currentTimestamp = Date.now();

    expect(testContext.client._request).toBeCalledTimes(1);

    const postArgs = testContext.client._request.mock.calls[0];
    const { timeout, url, method, data } = postArgs[0];

    expect(testContext.client._request).toHaveBeenCalled();
    expect(url).toBe('https://example.com/analytics-url');
    expect(method).toBe('post');
    expect(data.analytics[0].kind).toBe('web.test.event.kind');
    expect(data.braintreeLibraryVersion).toBe(constants.BRAINTREE_LIBRARY_VERSION);
    expect(data._meta.sessionId).toBe('sessionId');
    expect(currentTimestamp - data.analytics[0].timestamp).toBeLessThan(2000);
    expect(currentTimestamp - data.analytics[0].timestamp).toBeGreaterThan(0);
    expect(postArgs[1]).toBeFalsy();
    expect(timeout).toBe(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
    expect(data.analytics[0].isAsync).toBe(false);
  });

  it('can send a deferred analytics event if client is a promise', done => {
    const clientPromise = Promise.resolve(testContext.client);

    analytics.sendEvent(clientPromise, 'test.event.kind', () => {
      const currentTimestamp = Date.now();
      const { timeout, url, method, data } = testContext.client._request.mock.calls[0][0];

      expect(testContext.client._request).toHaveBeenCalled();

      expect(url).toBe('https://example.com/analytics-url');
      expect(method).toBe('post');
      expect(data.analytics[0].kind).toBe('web.test.event.kind');
      expect(data.braintreeLibraryVersion).toBe(constants.BRAINTREE_LIBRARY_VERSION);
      expect(data._meta.sessionId).toBe('sessionId');
      expect(currentTimestamp - data.analytics[0].timestamp).toBeLessThan(2000);
      expect(currentTimestamp - data.analytics[0].timestamp).toBeGreaterThan(0);
      expect(timeout).toBe(constants.ANALYTICS_REQUEST_TIMEOUT_MS);
      expect(data.analytics[0].isAsync).toBe(false);

      done();
    });
  });

  it('passes client creation rejection to callback', done => {
    const clientPromise = Promise.reject(new Error('failed to set up'));

    analytics.sendEvent(clientPromise, 'test.event.kind', (err) => {
      expect(err.message).toBe('failed to set up');

      done();
    });
  });

  it('ignores errors when client promise rejects and no callback is passed', async () => {
    let err;
    const clientPromise = Promise.reject(new Error('failed to set up'));

    try {
      await analytics.sendEvent(clientPromise, 'test.event.kind');
    } catch (e) {
      err = e;
    }

    expect(err).toBeFalsy();
  });

  it('sets timestamp to the time when the event was initialized, not when it was sent', done => {
    const client = testContext.client;

    testContext.fauxDate += 1500;
    const clientPromise = Promise.resolve(client);

    analytics.sendEvent(clientPromise, 'test.event.kind', () => {
      const currentTimestamp = Date.now();
      const { timestamp, isAsync } = client._request.mock.calls[0][0].data.analytics[0];

      expect(currentTimestamp - timestamp).toBeLessThan(2000);
      expect(currentTimestamp - timestamp).toBeGreaterThan(0);
      expect(isAsync).toBe(true);

      done();
    });

    jest.runAllTimers();
  });
});
