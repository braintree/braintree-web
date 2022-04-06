"use strict";

const prepBody = require("../../../../src/client/request/prep-body");

describe("prepBody", () => {
  it("stringifies object bodies for non GET requests", () => {
    const body = prepBody("post", { foo: "bar" });

    expect(body).toBe('{"foo":"bar"}');
  });

  it("handles non GET request bodies that are already a string", () => {
    const body = prepBody("post", "foo");

    expect(body).toBe("foo");
  });

  it("does not blow up if non GET body is null", () => {
    expect(() => {
      prepBody("post", null);
    }).not.toThrowError();
  });

  it("throws an error if method is not a string", () => {
    expect(() => {
      prepBody(false, {});
    }).toThrowError(/Method must be a string/);
  });
});
