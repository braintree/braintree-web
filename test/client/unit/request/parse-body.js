"use strict";

const parseBody = require("../../../../src/client/request/parse-body");

describe("parseBody", () => {
  it("parses body as JSON", () => {
    const body = parseBody('{"foo":"bar"}');

    expect(body).toEqual({ foo: "bar" });
  });

  it("returns body if it is invalid JSON ", () => {
    const body = parseBody('{"invalid"}');

    expect(body).toBe('{"invalid"}');
  });
});
