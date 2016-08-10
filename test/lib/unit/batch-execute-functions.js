'use strict';

var batchExecuteFunctions = require('../../../src/lib/batch-execute-functions');
var assert = require('assert');

describe('batchExecuteFunctions', function () {
  beforeEach(function () {
    this.syncFn = sinon.spy(function () {
      return 123;
    });

    this.asyncFn = sinon.spy(function (done) {
      setTimeout(done, 10);
    });

    this.asyncFnWithError = sinon.spy(function (done) {
      setTimeout(function () {
        done(new Error('Error async'));
      }, 10);
    });
  });

  it('calls the callback when running 0 functions', function (done) {
    batchExecuteFunctions([], done);
  });

  it('calls the callback when running 1 synchronous function', function (done) {
    var fn = this.syncFn;

    batchExecuteFunctions([fn], function (err) {
      assert.equal(err, null);
      assert(fn.calledOnce);
      done();
    });
  });

  it('calls the callback when running 2 synchronous functions', function (done) {
    var fn = this.syncFn;

    batchExecuteFunctions([fn, fn], function (err) {
      assert.equal(err, null);
      assert(fn.calledTwice);
      done();
    });
  });

  it('calls the callback when running 1 asynchronous function', function (done) {
    var fn = this.asyncFn;

    batchExecuteFunctions([fn], function (err) {
      assert.equal(err, null);
      assert(fn.calledOnce);
      done();
    });
  });

  it('calls the callback when running 2 asynchronous functions', function (done) {
    var fn = this.asyncFn;

    batchExecuteFunctions([fn, fn], function (err) {
      assert.equal(err, null);
      assert(fn.calledTwice);
      done();
    });
  });

  it('calls the callback when running 1 synchronous and 1 asynchronous function', function (done) {
    var sync = this.syncFn;
    var async = this.asyncFn;

    batchExecuteFunctions([sync, async], function (err) {
      assert.equal(err, null);
      assert(sync.calledOnce);
      assert(async.calledOnce);
      done();
    });
  });

  it('calls the callback when running 1 asynchronous and 1 synchronous function', function (done) {
    var sync = this.syncFn;
    var async = this.asyncFn;

    batchExecuteFunctions([async, sync], function (err) {
      assert.equal(err, null);
      assert(sync.calledOnce);
      assert(async.calledOnce);
      done();
    });
  });

  it('calls the callback with an error when running 1 asynchronous function with an error', function (done) {
    var fn = this.asyncFnWithError;

    batchExecuteFunctions([fn], function (errs) {
      assert.deepEqual(errs, new Error('Error sync'));
      assert(fn.calledOnce);
      done();
    });
  });

  it('calls the callback with an error when running 1 asynchronous function with an error, and 1 synchronous function', function (done) {
    var async = this.asyncFnWithError;
    var sync = this.syncFn;

    batchExecuteFunctions([async, sync], function (errs) {
      assert.deepEqual(errs, new Error('Error sync'));
      assert(async.calledOnce);
      assert(sync.calledOnce);
      done();
    });
  });

  it('calls the callback with an error when running 1 synchronous function, and 1 asynchronous function with an error', function (done) {
    var async = this.asyncFnWithError;
    var sync = this.syncFn;

    batchExecuteFunctions([sync, async], function (errs) {
      assert.deepEqual(errs, new Error('Error sync'));
      assert(async.calledOnce);
      assert(sync.calledOnce);
      done();
    });
  });

  it('calls the callback with an error when running 2 asynchronous functions, 1 with an error', function (done) {
    var async = this.asyncFn;
    var asyncError = this.asyncFnWithError;

    batchExecuteFunctions([asyncError, async], function (errs) {
      assert.deepEqual(errs, new Error('Error sync'));
      assert(asyncError.calledOnce);
      assert(async.calledOnce);
      done();
    });
  });
});
