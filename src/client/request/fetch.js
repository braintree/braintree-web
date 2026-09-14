import querystring from "../../lib/querystring";
import { assign } from "../../lib/assign";
import prepBody from "./prep-body";
import parseBody from "./parse-body";

var MAX_TCP_RETRY_COUNT = 1;
var TCP_PRECONNECT_BUG_STATUS_CODE = 408;
var MERCHANT_ID_PATTERN = /\/merchants\/[A-Za-z0-9_-]+\/client_api/;
var THREE_D_SECURE_PAYMENT_METHOD_PATTERN =
  /payment_methods\/.*\/three_d_secure/;

function requestShouldRetry(status) {
  return !status || status === TCP_PRECONNECT_BUG_STATUS_CODE;
}

function sendApiLatencyAnalytics(url, options) {
  var domain, path, cleanedPath, parsedUrl, normalizedUrl;
  var analyticsConnectionStartTime, analyticsRequestStartTime, analyticsEndTime;
  var finalStartTime;
  var entries, entry;

  try {
    parsedUrl = new URL(url);
    domain = parsedUrl.hostname;
    path = parsedUrl.pathname;
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    domain = (url.match(/^https?:\/\/([^/]+)/) || [])[1] || "";
    path = (url.match(/^https?:\/\/[^/]+(\/.*)$/) || [])[1] || url;
  }
  cleanedPath = path
    .replace(MERCHANT_ID_PATTERN, "")
    .replace(
      THREE_D_SECURE_PAYMENT_METHOD_PATTERN,
      "payment_methods/three_d_secure"
    );

  if (cleanedPath === "/v1/tracking/batch/events") {
    return;
  }

  // Remove default HTTPS port (:443) to match Performance API entries
  normalizedUrl = url.replace(/:443(\/|$)/, "$1");

  if (
    typeof window !== "undefined" &&
    window.performance &&
    window.performance.getEntriesByName
  ) {
    entries = window.performance.getEntriesByName(normalizedUrl);
    if (entries && entries.length > 0) {
      entry = entries[entries.length - 1];
      analyticsConnectionStartTime = entry.connectStart
        ? Math.round(entry.connectStart)
        : null;
      analyticsRequestStartTime = entry.requestStart
        ? Math.round(entry.requestStart)
        : null;
      finalStartTime = Math.round(entry.startTime);
      analyticsEndTime = Math.round(entry.responseEnd);

      /* eslint-disable camelcase */
      options.sendAnalyticsEvent("core.api-request-latency", {
        connect_start_time: analyticsConnectionStartTime,
        domain: domain,
        endpoint: cleanedPath,
        end_time: analyticsEndTime,
        request_start_time: analyticsRequestStartTime,
        start_time: finalStartTime,
      });
      /* eslint-enable camelcase */
    }
  }
}

function _requestWithRetry(options, tcpRetryCount, cb) {
  var url, method, body, headers;
  var timeout = options.timeout;
  var callback = cb;
  var controller = new AbortController();
  var timedOut = false;
  var timer = null;

  options.headers = assign(
    { "Content-Type": "application/json" },
    options.headers
  );

  url = options.url;
  method = options.method;
  body = options.data;
  headers = options.headers;

  if (method === "GET") {
    url = querystring.queryify(url, body);
    body = null;
  }

  // fetch has no native timeout, so abort the request from a timer. Any abort
  // here can only be ours, tracked via timedOut so the catch handler can tell a
  // timeout apart from a genuine network error.
  if (timeout) {
    timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, timeout);
  }

  fetch(url, {
    method: method,
    headers: headers,
    body: prepBody(method, body),
    signal: controller.signal,
  })
    .then(function (response) {
      return response.text().then(function (text) {
        return { status: response.status, text: text };
      });
    })
    .then(function (result) {
      var resBody, status;

      clearTimeout(timer);

      resBody = parseBody(result.text);
      status = result.status;

      if (options.sendAnalyticsEvent) {
        sendApiLatencyAnalytics(url, options);
      }

      if (status >= 400 || status < 200) {
        if (tcpRetryCount < MAX_TCP_RETRY_COUNT && requestShouldRetry(status)) {
          return _requestWithRetry(options, tcpRetryCount + 1, cb);
        }

        return callback(resBody || "error", null, status);
      }

      callback(null, resBody, status);
    })
    .catch(function () {
      clearTimeout(timer);

      if (timedOut) {
        return callback("timeout", null, -1);
      }

      if (tcpRetryCount < MAX_TCP_RETRY_COUNT && requestShouldRetry()) {
        return _requestWithRetry(options, tcpRetryCount + 1, cb);
      }

      callback("error", null, undefined);
    });
}

function request(options, cb) {
  _requestWithRetry(options, 0, cb);
}

export { request };

export default {
  request,
};
