import analytics from "../../../src/lib/analytics";
import { yieldsAsync } from "../../helpers";

describe("analytics", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.fauxDate = 1000000;

    vi.useFakeTimers();

    vi.spyOn(Date, "now").mockImplementation(() => {
      testContext.fauxDate += 400;

      return testContext.fauxDate;
    });

    testContext.client = {
      _request: vi.fn(yieldsAsync()),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("send loggernodeweb events", () => {
    beforeEach(() => {
      testContext.client.getConfiguration = () => {
        return {
          authorization: "development_testing_merchant_id",
          analyticsMetadata: {
            sessionId: "sessionId",
            integration: "custom",
          },
          gatewayConfiguration: {
            analytics: { url: "https://example.com/analytics-url" },
            environment: "sandbox",
            merchantId: "merchant-id",
          },
        };
      };
    });

    it("passes client creation rejection to callback", () =>
      new Promise((resolve) => {
        const clientPromise = Promise.reject(new Error("failed to set up"));

        analytics.sendEvent(clientPromise, "test.event.kind", (err) => {
          expect(err.message).toBe("failed to set up");

          resolve();
        });
      }));

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

    it("sets timestamp to the time when the event was initialized, not when it was sent", () =>
      new Promise((resolve) => {
        const client = testContext.client;

        testContext.fauxDate += 1500;
        const clientPromise = Promise.resolve(client);

        client._request = vi.fn().mockImplementation((options, cb) => {
          if (cb) {
            return cb();
          }

          return new Promise(function (innerResolve) {
            innerResolve();
          });
        });

        analytics.sendEvent(clientPromise, "test.event.kind", () => {
          const currentTimestamp = Date.now();

          const eventData = client._request.mock.calls[0][0].data;
          const timestamp = eventData.events[0].payload.timestamp;

          const tenant_name = eventData.tracking[0].tenant_name;

          expect(currentTimestamp - timestamp).toBeLessThan(2000);
          expect(currentTimestamp - timestamp).toBeGreaterThan(0);
          expect(tenant_name).toBe("braintree");

          vi.runAllTimers();
          resolve();
        });
      }));

    it("sends specified event/analytic", () =>
      new Promise((resolve) => {
        const expectedEventName = "api.module.thing.happened";
        const client = testContext.client;

        analytics.sendEvent(client, expectedEventName, () => {
          const actualEventName =
            client._request.mock.calls[0][0].data.events[0].event;

          expect(actualEventName).toBe("web." + expectedEventName);

          vi.runAllTimers();
          resolve();
        });
      }));

    it("sends expected event envelope", () =>
      new Promise((resolve) => {
        const expectedEventName = "api.module.thing.happened";
        const client = testContext.client;

        analytics.sendEvent(client, expectedEventName, () => {
          const actualEventSent = client._request.mock.calls[0][0].data;

          expect(Array.isArray(actualEventSent.events)).toBe(true);
          expect(Array.isArray(actualEventSent.tracking)).toBe(true);
          expect(actualEventSent.events[0].level).not.toBeNull();
          expect(actualEventSent.events[0].event).not.toBeNull();
          expect(actualEventSent.events[0].payload).not.toBeNull();

          expect(actualEventSent.events[0].payload).toHaveProperty("env");

          expect(actualEventSent.events[0].payload).toHaveProperty("timestamp");

          expect(actualEventSent.events[0].event).toBe(
            "web." + expectedEventName
          );

          vi.runAllTimers();
          resolve();
        });
      }));

    describe("add additional data to events", () => {
      it("adds specified fields to event metadata", () =>
        new Promise((resolve) => {
          const client = testContext.client;
          const expectedContextId = "venmo-1234-id";
          const expectedEventName = "api.module.thing.happened";
          var actualEventSent, actualTracking;

          analytics.sendEventPlus(
            client,
            expectedEventName,
            {
              flow: "vault",
              context_id: expectedContextId,
            },
            () => {
              actualEventSent = client._request.mock.calls[0][0].data;
              expect(actualEventSent).not.toBeNull();
              actualTracking = actualEventSent.tracking[0];
              expect(actualTracking).not.toBeNull();
              expect(actualTracking.context_type).toBe("BA_Token");
              expect(actualTracking.context_id).toBe(expectedContextId);
              resolve();
            }
          );
        }));

      it("sets context_type to EC_Token for checkout flow", () =>
        new Promise((resolve) => {
          const client = testContext.client;
          const expectedContextId = "paypal-5678-id";
          const expectedEventName = "api.module.thing.happened";

          analytics.sendEventPlus(
            client,
            expectedEventName,
            {
              flow: "checkout",
              context_id: expectedContextId,
            },
            () => {
              const actualEventSent = client._request.mock.calls[0][0].data;
              const actualTracking = actualEventSent.tracking[0];

              expect(actualTracking.context_type).toBe("EC_Token");
              expect(actualTracking.context_id).toBe(expectedContextId);

              resolve();
            }
          );
        }));

      it("does not clobber preset metadata fields", () =>
        new Promise((resolve) => {
          const altComponent = "overwritten";
          const client = testContext.client;
          const expectedContextId = "venmo-1234-id";
          const expectedEventName = "api.module.thing.happened";
          var actualEventSent, actualTracking;

          analytics.sendEventPlus(
            client,
            expectedEventName,
            {
              context_id: expectedContextId,
              component: altComponent,
            },
            () => {
              actualEventSent = client._request.mock.calls[0][0].data;
              expect(actualEventSent).not.toBeNull();
              actualTracking = actualEventSent.tracking[0];
              expect(actualTracking).not.toBeNull();
              expect(actualTracking.component).toBe("braintreeclientsdk");
              resolve();
            }
          );
        }));
    });
  });
});
