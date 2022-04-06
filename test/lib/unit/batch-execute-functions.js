"use strict";

const batchExecuteFunctions = require("../../../src/lib/batch-execute-functions");

describe("batchExecuteFunctions", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.syncFn = jest.fn(() => 123);
    testContext.asyncFn = jest.fn((done) => {
      process.nextTick(done);
    });
    testContext.asyncFnWithError = jest.fn((done) => {
      process.nextTick(() => {
        done(new Error("Error async"));
      });
    });
  });

  it("calls the callback when running 0 functions", (done) => {
    batchExecuteFunctions([], done);
  });

  it("calls the callback when running 1 synchronous function", (done) => {
    const fn = testContext.syncFn;

    batchExecuteFunctions([fn], (err) => {
      expect(err).toBeFalsy();
      expect(fn).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback when running 2 synchronous functions", (done) => {
    const fn = testContext.syncFn;

    batchExecuteFunctions([fn, fn], (err) => {
      expect(err).toBeFalsy();
      expect(fn).toHaveBeenCalledTimes(2);
      done();
    });
  });

  it("calls the callback when running 1 asynchronous function", (done) => {
    const fn = testContext.asyncFn;

    batchExecuteFunctions([fn], (err) => {
      expect(err).toBeFalsy();
      expect(fn).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback when running 2 asynchronous functions", (done) => {
    const fn = testContext.asyncFn;

    batchExecuteFunctions([fn, fn], (err) => {
      expect(err).toBeFalsy();
      expect(fn).toHaveBeenCalledTimes(2);
      done();
    });
  });

  it("calls the callback when running 1 synchronous and 1 asynchronous function", (done) => {
    const sync = testContext.syncFn;
    const async = testContext.asyncFn;

    batchExecuteFunctions([sync, async], (err) => {
      expect(err).toBeFalsy();
      expect(sync).toHaveBeenCalledTimes(1);
      expect(async).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback when running 1 asynchronous and 1 synchronous function", (done) => {
    const sync = testContext.syncFn;
    const async = testContext.asyncFn;

    batchExecuteFunctions([async, sync], (err) => {
      expect(err).toBeFalsy();
      expect(async).toHaveBeenCalledTimes(1);
      expect(sync).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback with an error when running 1 asynchronous function with an error", (done) => {
    const fn = testContext.asyncFnWithError;

    batchExecuteFunctions([fn], (errs) => {
      expect(errs).toStrictEqual(new Error("Error async"));
      expect(fn).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback with an error when running 1 asynchronous function with an error, and 1 synchronous function", (done) => {
    const async = testContext.asyncFnWithError;
    const sync = testContext.syncFn;

    batchExecuteFunctions([async, sync], (errs) => {
      expect(errs).toStrictEqual(new Error("Error async"));
      expect(sync).toHaveBeenCalledTimes(1);
      expect(async).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback with an error when running 1 synchronous function, and 1 asynchronous function with an error", (done) => {
    const async = testContext.asyncFnWithError;
    const sync = testContext.syncFn;

    batchExecuteFunctions([sync, async], (errs) => {
      expect(errs).toStrictEqual(new Error("Error async"));
      expect(async).toHaveBeenCalledTimes(1);
      expect(sync).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("calls the callback with an error when running 2 asynchronous functions, 1 with an error", (done) => {
    const async = testContext.asyncFn;
    const asyncError = testContext.asyncFnWithError;

    batchExecuteFunctions([asyncError, async], (errs) => {
      expect(errs).toStrictEqual(new Error("Error async"));
      expect(asyncError).toHaveBeenCalledTimes(1);
      expect(async).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
