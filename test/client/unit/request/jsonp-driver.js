"use strict";

const JSONPDriver = require("../../../../src/client/request/jsonp-driver");
const TEST_SERVER_URL = "http://localhost:6060/";
const querystring = require("../../../../src/lib/querystring");

function _handler(node) {
  let status, polo, timeout;
  const src = node.src;
  const params = querystring.parse(src);
  const callbackName = params.callback;

  if (/timeout/.test(src)) {
    timeout = parseInt(params.duration, 10);
    setTimeout(() => {
      global[callbackName]({ status: 200 });
    }, timeout);
  } else if (/marco/.test(src)) {
    polo = params.marco;
    global[callbackName]({ marco: polo, status: 200 });
  } else if (/return-status/.test(src)) {
    status = src.replace(/^.*\/return-status\/(\d+).*$/, "$1");
    global[callbackName]({ status: parseInt(status, 10) });
  } else {
    node.onerror();

    return;
  }
}

describe("JSONPDriver", () => {
  beforeEach(() => {
    document.head.appendChild = (node) => {
      if (!(node instanceof HTMLScriptElement)) {
        return Node.prototype.appendChild.apply(document.head, arguments);
      }

      return _handler(node);
    };
  });

  afterEach(() => {
    delete document.head.appendChild;
  });

  it("accepts a timeout value which will terminate the request if it is not completed", (done) => {
    JSONPDriver.request(
      {
        url: `${TEST_SERVER_URL}timeout`,
        data: { duration: 1000 },
        method: "GET",
        timeout: 50,
      },
      (err, _, status) => {
        expect(err).toBeDefined();
        expect(err.error).toBe("timeout");
        expect(status).toBe(-1);
        done();
      }
    );
  });

  describe("#request with GET", () => {
    it("makes a serialized jsonp request", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}marco`,
          method: "GET",
          data: { marco: "polo" },
        },
        (err, resp) => {
          if (err) {
            done(err);

            return;
          }

          expect(resp.marco).toBe("polo");
          done();
        }
      );
    });

    it("calls callback with no error if the status code is 200", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/200`,
          method: "GET",
        },
        (err) => {
          expect(err).toBeFalsy();
          done();
        }
      );
    });

    it("calls callback with error if status code is 400", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/400`,
          method: "GET",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });

    it("calls callback with error if status code is 404", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/404`,
          method: "GET",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });

    it("calls callback with error if status code is 500", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/500`,
          method: "GET",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });

    it("calls callback with error when requesting a bad url", (done) => {
      JSONPDriver.request(
        {
          url: "this is a bogus url",
          method: "GET",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });
  });

  describe("#request with post", () => {
    it("makes a serialized jsonp request", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}marco`,
          method: "POST",
          data: { marco: "polo" },
        },
        (err, resp) => {
          if (err) {
            done(err);

            return;
          }

          expect(resp.marco).toBe("polo");
          done();
        }
      );
    });

    it("calls callback with no error if the status code is 200", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/200`,
          method: "POST",
        },
        (err) => {
          expect(err).toBeFalsy();
          done();
        }
      );
    });

    it("calls callback with error if status code is 400", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/400`,
          method: "POST",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });

    it("calls callback with error if status code is 404", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/404`,
          method: "POST",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });

    it("calls callback with error if status code is 500", (done) => {
      JSONPDriver.request(
        {
          url: `${TEST_SERVER_URL}return-status/500`,
          method: "POST",
        },
        (err) => {
          expect(err).toBeDefined();
          done();
        }
      );
    });
  });
});
