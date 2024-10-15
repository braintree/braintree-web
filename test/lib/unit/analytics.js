"use strict";

const analytics = require("../../../src/lib/analytics");
const { yieldsAsync } = require("../../helpers");

describe("analytics", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.fauxDate = 1000000;

    jest.useFakeTimers();

    jest.spyOn(Date, "now").mockImplementation(() => {
      testContext.fauxDate += 400;

      return testContext.fauxDate;
    });

    testContext.client = {
      _request: jest.fn(yieldsAsync()),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("send loggernodeweb events", () => {
    beforeEach(() => {
      testContext.client.getConfiguration = () => {
        return {
          authorization: "development_testing_merchant_id",
          analyticsMetadata: {
            sessionId: "sessionId",
            integrationType: "custom",
          },
          gatewayConfiguration: {
            analytics: { url: "https://example.com/analytics-url" },
            environment: "sandbox",
            merchantId: "merchant-id",
          },
        };
      };
    });

    it("passes client creation rejection to callback", (done) => {
      const clientPromise = Promise.reject(new Error("failed to set up"));

      analytics.sendEvent(clientPromise, "test.event.kind", (err) => {
        expect(err.message).toBe("failed to set up");

        done();
      });
    });

    it("ignores errors when client promise rejects and no callback is passed", async () => {
      let err;
      const clientPromise = Promise.reject(new Error("failed to set up"));

      try {
        await analytics.sendEvent(clientPromise, "test.event.kind");
      } catch (e) {
        err = e;
      }

      expect(err).toBeFalsy();
    });

    it("sets timestamp to the time when the event was initialized, not when it was sent", (done) => {
      const client = testContext.client;

      testContext.fauxDate += 1500;
      const clientPromise = Promise.resolve(client);

      /* eslint-disable new-cap */
      client._request = jest.fn().mockImplementation((options, cb) => {
        if (cb) {
          cb();
        }

        return Promise();
      });

      analytics.sendEvent(clientPromise, "test.event.kind", () => {
        const currentTimestamp = Date.now();
        /* eslint-disable camelcase */
        const eventData = client._request.mock.calls[0][0].data;
        const timestamp = eventData.events[0].payload.timestamp;
        /* eslint-disable camelcase */
        const tenant_name = eventData.tracking[0].tenant_name;

        expect(currentTimestamp - timestamp).toBeLessThan(2000);
        expect(currentTimestamp - timestamp).toBeGreaterThan(0);
        expect(tenant_name).toBe(
          "braintree"
        ); /* eslint-disable-line camelcase */

        jest.runAllTimers();
        done();
      });
    });

    it("sends specified event/analytic", (done) => {
      const expectedEventName = "api.module.thing.happened";
      const client = testContext.client;

      analytics.sendEvent(client, expectedEventName, () => {
        /* eslint-disable camelcase */
        const actualEventName =
          /* eslint-disable camelcase */
          client._request.mock.calls[0][0].events[0].event;

        expect(actualEventName).toBe("web." + expectedEventName);

        jest.runAllTimers();
      });

      done();
    });

    it("sends expected event envelope", (done) => {
      const expectedEventName = "api.module.thing.happened";
      const expectedEventEnvelope = {
        events: [],
        tracking: [],
      };
      const client = testContext.client;

      analytics.sendEvent(client, expectedEventName, () => {
        /* eslint-disable camelcase */
        const actualEventSent =
          /* eslint-disable camelcase */
          client._request.mock.calls[0][0].data;

        expect(actualEventSent).toMatchObject(expectedEventEnvelope);
        expect(actualEventSent).toHaveProperty("events");
        expect(actualEventSent).toHaveProperty("tracking");
        expect(actualEventSent.events[0].level).not.toBeNull();
        expect(actualEventSent.events[0].event).not.toBeNull();
        expect(actualEventSent.events[0].payload).not.toBeNull();
        /* eslint-disable camelcase */
        expect(actualEventSent.events[0].payload).toHaveProperty("env");
        /* eslint-disable camelcase */
        expect(actualEventSent.events[0].payload).toHaveProperty("timestamp");
        /* eslint-disable camelcase */
        expect(actualEventSent.events[0].event).toBe(
          "web." + expectedEventName
        );

        jest.runAllTimers();
      });

      done();
    });
  });
});
