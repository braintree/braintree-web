"use strict";

const initializeAuthenticationCompleteFrame = require("../../../../src/three-d-secure/internal/authentication-complete-frame");
const Bus = require("framebus");
const events = require("../../../../src/three-d-secure/shared/events");
const querystring = require("../../../../src/lib/querystring");

describe("initializeAuthenticationCompleteFrame", () => {
  it("emits an AUTHENTICATION_COMPLETE event on the bus with the parsed parameters", () => {
    const url = "http://example.com/foo?boo=bar&baz=123&channel=abc123";
    const params = querystring.parse(url);

    initializeAuthenticationCompleteFrame(url);

    expect(Bus.prototype.emit).toHaveBeenCalledWith(
      events.AUTHENTICATION_COMPLETE,
      expect.objectContaining(params)
    );
  });
});
