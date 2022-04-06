"use strict";

const deferred = require("../../../src/lib/deferred");

describe("deferred", () => {
  it("delays the call to the function", (done) => {
    expect.assertions(2);

    const demo = {
      fn: jest.fn((...rest) => {
        expect(rest.length).toBe(0);

        done();
      }),
    };

    const def = deferred(demo.fn);

    def();

    expect(demo.fn).not.toHaveBeenCalled();
  });

  it("can pass arguments to the delayed function", (done) => {
    expect.assertions(4);

    const demo = {
      fn: jest.fn((...rest) => {
        expect(rest.length).toBe(2);
        expect(rest[0]).toBe(1);
        expect(rest[1]).toBe(2);

        done();
      }),
    };

    const def = deferred(demo.fn);

    def(1, 2);

    expect(demo.fn).not.toHaveBeenCalled();
  });
});
