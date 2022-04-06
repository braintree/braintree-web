"use strict";

var querystring = require("../../lib/querystring");
var assign = require("../../lib/assign").assign;
var prepBody = require("./prep-body");
var parseBody = require("./parse-body");
var xhr = require("./xhr");
var isXHRAvailable = xhr.isAvailable;
var GraphQLRequest = require("./graphql/request");
var DefaultRequest = require("./default-request");

var MAX_TCP_RETRYCOUNT = 1;
var TCP_PRECONNECT_BUG_STATUS_CODE = 408;

function requestShouldRetry(status) {
  return !status || status === TCP_PRECONNECT_BUG_STATUS_CODE;
}

function graphQLRequestShouldRetryWithClientApi(body) {
  var errorClass =
    !body.data &&
    body.errors &&
    body.errors[0] &&
    body.errors[0].extensions &&
    body.errors[0].extensions.errorClass;

  return errorClass === "UNKNOWN" || errorClass === "INTERNAL";
}

function _requestWithRetry(options, tcpRetryCount, cb) {
  var status, resBody, ajaxRequest, body, method, headers, parsedBody;
  var url = options.url;
  var graphQL = options.graphQL;
  var timeout = options.timeout;
  var req = xhr.getRequestObject();
  var callback = cb;
  var isGraphQLRequest = Boolean(
    graphQL && graphQL.isGraphQLRequest(url, options.data)
  );

  options.headers = assign(
    { "Content-Type": "application/json" },
    options.headers
  );

  if (isGraphQLRequest) {
    ajaxRequest = new GraphQLRequest(options);
  } else {
    ajaxRequest = new DefaultRequest(options);
  }

  url = ajaxRequest.getUrl();
  body = ajaxRequest.getBody();
  method = ajaxRequest.getMethod();
  headers = ajaxRequest.getHeaders();

  if (method === "GET") {
    url = querystring.queryify(url, body);
    body = null;
  }

  if (isXHRAvailable) {
    req.onreadystatechange = function () {
      if (req.readyState !== 4) {
        return;
      }

      if (req.status === 0 && isGraphQLRequest) {
        // If a merchant experiences a connection
        // issue to the GraphQL endpoint (possibly
        // due to a Content Security Policy), retry
        // the request against the old client API.
        delete options.graphQL;
        _requestWithRetry(options, tcpRetryCount, cb);

        return;
      }

      parsedBody = parseBody(req.responseText);
      resBody = ajaxRequest.adaptResponseBody(parsedBody);
      status = ajaxRequest.determineStatus(req.status, parsedBody);

      if (status >= 400 || status < 200) {
        if (
          isGraphQLRequest &&
          graphQLRequestShouldRetryWithClientApi(parsedBody)
        ) {
          delete options.graphQL;
          _requestWithRetry(options, tcpRetryCount, cb);

          return;
        }

        if (tcpRetryCount < MAX_TCP_RETRYCOUNT && requestShouldRetry(status)) {
          tcpRetryCount++;
          _requestWithRetry(options, tcpRetryCount, cb);

          return;
        }
        callback(resBody || "error", null, status || 500);
      } else {
        callback(null, resBody, status);
      }
    };
  } else {
    if (options.headers) {
      url = querystring.queryify(url, headers);
    }

    req.onload = function () {
      callback(null, parseBody(req.responseText), req.status);
    };

    req.onerror = function () {
      // XDomainRequest does not report a body or status for errors, so
      // hardcode to 'error' and 500, respectively
      callback("error", null, 500);
    };

    // This must remain for IE9 to work
    req.onprogress = function () {};

    req.ontimeout = function () {
      callback("timeout", null, -1);
    };
  }

  try {
    req.open(method, url, true);
  } catch (requestOpenError) {
    // If a merchant has a Content Security Policy and they have
    // not allowed our endpoints, some browsers may
    // synchronously throw an error. If it is not a GraphQL
    // request, we throw the error. If it is a GraphQL request
    // we remove the GraphQL option and try the request against
    // the old client API.
    if (!isGraphQLRequest) {
      throw requestOpenError;
    }

    delete options.graphQL;

    _requestWithRetry(options, tcpRetryCount, cb);

    return;
  }

  req.timeout = timeout;

  if (isXHRAvailable) {
    Object.keys(headers).forEach(function (headerKey) {
      req.setRequestHeader(headerKey, headers[headerKey]);
    });
  }

  try {
    req.send(prepBody(method, body));
  } catch (e) {
    /* ignored */
  }
}

function request(options, cb) {
  _requestWithRetry(options, 0, cb);
}

module.exports = {
  request: request,
};
