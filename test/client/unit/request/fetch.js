import { request } from "../../../../src/client/request/fetch.js";
const TEST_URL = "https://example.com/testUrl/";

// Build a real Fetch API Response so tests exercise the actual .text()/status
// semantics the driver relies on. Each call must return a fresh instance
// because a Response body can only be read once.
function jsonResponse(body, status) {
  return new Response(body === undefined ? "" : body, {
    status: status == null ? 200 : status,
  });
}

describe("Requests using fetch", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    global.fetch = vi.fn(() => Promise.resolve(jsonResponse("{}", 200)));
  });

  describe("tcp preconnect bug retry", () => {
    it("retries if a 408 error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse("", 408))
        .mockResolvedValueOnce(jsonResponse('{ "result": "yay" }', 200));

      const callback = vi.fn();

      request(
        {
          url: TEST_URL,
          method: "GET",
          metadata: testContext.fakeMetadata,
        },
        callback
      );

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith(null, { result: "yay" }, 200)
      );
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("only retries once", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse('{ "attempt": 1 }', 408))
        .mockResolvedValueOnce(jsonResponse('{ "attempt": 2 }', 408));

      const callback = vi.fn();

      request(
        {
          url: TEST_URL,
          method: "GET",
          metadata: testContext.fakeMetadata,
        },
        callback
      );

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith({ attempt: 2 }, null, 408)
      );
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("fetch with GET", () => {
    it("accepts a timeout, which will terminate the request if not completed", async () => {
      // overwrite the fetch request to a function that never calls resolve, so it hangs.
      // then use a listener to the abort call, and pass the reason for aborting out
      global.fetch = vi.fn(
        (url, opts) =>
          new Promise((_resolve, reject) => {
            opts.signal.addEventListener("abort", () => {
              reject(opts.signal.reason);
            });
          })
      );

      const callback = vi.fn();

      request({ url: TEST_URL, method: "GET", timeout: 90 }, callback);

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith("timeout", null, -1)
      );
    });

    it("parses a JSON body into an object", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse('{ "marco": "polo" }', 200));

      const callback = vi.fn();

      request({ url: TEST_URL, method: "GET" }, callback);

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith(null, { marco: "polo" }, 200)
      );
    });

    it("calls callback with 'error' if request fails", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse("", 500));

      const callback = vi.fn();

      request({ url: TEST_URL, method: "GET" }, callback);

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith("error", null, 500)
      );
    });

    it("calls callback with 'error' and no status when the request never gets a response", async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new TypeError("Failed to fetch"));

      const callback = vi.fn();

      request({ url: TEST_URL, method: "GET" }, callback);

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith("error", null, undefined)
      );
    });

    it("calls callback with error if request is rate limited", async () => {
      const body = "<!doctype html><html></html>";

      global.fetch = vi.fn().mockResolvedValue(jsonResponse(body, 429));

      const callback = vi.fn();

      request({ url: TEST_URL, method: "GET" }, callback);

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith(body, null, 429)
      );
    });
  });

  describe("fetch with POST", () => {
    it("sends a POST request with a serialized body", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse('{ "marco": "polo" }', 200));

      const callback = vi.fn();

      request(
        {
          url: "https://example.com/",
          method: "POST",
          data: { marco: "polo" },
        },
        callback
      );

      expect(fetch).toHaveBeenCalledWith(
        "https://example.com/",
        expect.objectContaining({
          body: JSON.stringify({ marco: "polo" }),
        })
      );

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith(null, { marco: "polo" }, 200)
      );
    });

    it("sets the Content-Type header to 'application/json'", () => {
      global.fetch = vi.fn(() => Promise.resolve(jsonResponse("{}", 200)));

      request(
        {
          url: "https://example.com/",
          method: "POST",
          data: { marco: "polo" },
        },
        vi.fn()
      );

      expect(fetch).toHaveBeenCalledWith(
        "https://example.com/",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("calls callback with 'error' if request fails", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse("", 500));

      const callback = vi.fn();

      request({ url: TEST_URL, method: "POST" }, callback);

      await vi.waitFor(() =>
        expect(callback).toHaveBeenCalledWith("error", null, 500)
      );
    });
  });

  describe("API latency tracking", () => {
    beforeEach(() => {
      if (!window.performance.getEntriesByName) {
        window.performance.getEntriesByName = vi.fn();
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("sends analytics event for all endpoints with Performance API data", () => {
      const sendAnalyticsEventSpy = vi.fn();

      const getEntriesByNameSpy = vi
        .spyOn(window.performance, "getEntriesByName")
        .mockImplementation((url) => {
          expect(url).toBe(
            "https://api.braintreegateway.com/merchants/test/client_api/v1/payment_methods/credit_cards"
          );
          return [
            {
              connectStart: 100,
              requestStart: 150,
              startTime: 50,
              responseEnd: 500,
              duration: 450,
            },
          ];
        });

      const callback = vi.fn(() => {
        expect(getEntriesByNameSpy).toHaveBeenCalledWith(
          "https://api.braintreegateway.com/merchants/test/client_api/v1/payment_methods/credit_cards"
        );
        expect(sendAnalyticsEventSpy).toHaveBeenCalledWith(
          "core.api-request-latency",
          expect.objectContaining({
            connect_start_time: 100,
            domain: "api.braintreegateway.com",
            endpoint: "/v1/payment_methods/credit_cards",
            end_time: 500,
            request_start_time: 150,
            start_time: 50,
          })
        );
      });

      request(
        {
          url: "https://api.braintreegateway.com:443/merchants/test/client_api/v1/payment_methods/credit_cards",
          method: "POST",
          data: {},
          sendAnalyticsEvent: sendAnalyticsEventSpy,
        },
        callback
      );

      return vi.waitFor(() => expect(callback).toHaveBeenCalled);
    });
  });
});
