"use strict";

const Destructor = require("../../../src/lib/destructor");
const { noop } = require("../../helpers");

describe("Destructor", () => {
  describe("constructor", () => {
    it("creates an empty collection", () => {
      expect(new Destructor()._teardownRegistry).toEqual([]);
    });
  });

  describe("registerFunctionForTeardown", () => {
    it("adds passed in function to instance collection", () => {
      const destructor = new Destructor();
      const fn = noop;

      destructor.registerFunctionForTeardown(fn);

      expect(destructor._teardownRegistry).toEqual([fn]);
    });

    it("does not add non-functions to collection", () => {
      const destructor = new Destructor();

      destructor.registerFunctionForTeardown("str");
      destructor.registerFunctionForTeardown(true);
      destructor.registerFunctionForTeardown(1);
      destructor.registerFunctionForTeardown(null);
      destructor.registerFunctionForTeardown();
      destructor.registerFunctionForTeardown({ foo: "bar" });

      expect(destructor._teardownRegistry).toEqual([]);
    });
  });

  describe("teardown", () => {
    it("empties collection of teardown functions", (done) => {
      const destructor = new Destructor();

      destructor.registerFunctionForTeardown(noop);
      destructor.registerFunctionForTeardown(noop);

      destructor.teardown(() => {
        expect(destructor._teardownRegistry).toEqual([]);

        done();
      });
    });

    it("calls supplied callback", (done) => {
      const destructor = new Destructor();

      destructor.teardown((err) => {
        expect(err).toBeFalsy();

        done();
      });
    });

    it("calls supplied callback with an error if given a synchronous function", () => {
      const destructor = new Destructor();

      destructor._teardownRegistry = [
        () => {
          throw new Error();
        },
      ];

      expect(() => {
        destructor.teardown();
      }).toThrowError(Error);
    });

    it("calls supplied callback with an error if given an asynchronous function", () => {
      const destructor = new Destructor();

      destructor._teardownRegistry = [
        (next) => {
          next(new Error());
        },
      ];

      destructor.teardown((err) => {
        expect(err).toBeInstanceOf(Error);
      });
    });

    it("calls supplied callback with an error when calling teardown twice if already in progress", (done) => {
      const destructor = new Destructor();
      let firstWasCalled = false;

      destructor.registerFunctionForTeardown((cb) => {
        setTimeout(cb, 10);
      });

      setTimeout(() => {
        destructor.teardown((err) => {
          expect(err).toBeNull();
          firstWasCalled = true;
        });
      }, 0);
      setTimeout(() => {
        destructor.teardown((err) => {
          expect(err).toBeInstanceOf(Error);

          setTimeout(() => {
            expect(firstWasCalled).toBe(true);
            done();
          }, 11);
        });
      }, 0);
    });
  });
});
