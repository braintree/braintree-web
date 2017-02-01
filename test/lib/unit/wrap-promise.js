'use strict';

var Promise = require('../../../src/lib/promise');
var wrapPromise = require('../../../src/lib/wrap-promise');

function noop() {}

describe('wrapPromise', function () {
  it('returns a function', function () {
    var fn = wrapPromise(noop);

    expect(fn).to.be.a('function');
  });

  context('functions without callbacks', function () {
    it('invokes first parameter', function () {
      var returnValue = {foo: 'bar'};
      var fn;

      function dummy() {
        return returnValue;
      }

      fn = wrapPromise(dummy);

      expect(fn()).to.equal(returnValue);
    });

    it('passes argument to first parameter', function (done) {
      var fn;
      var options = {
        foo: 'bar'
      };

      function dummy(data) {
        expect(data).to.equal(options);

        done();
      }

      fn = wrapPromise(dummy);

      fn(options);
    });

    it('passes along many arguments to first parameter', function (done) {
      var fn;
      var firstArg = {
        foo: 'bar'
      };
      var secondArg = {
        bar: 'baz'
      };
      var thirdArg = {
        baz: 'buz'
      };

      function dummy(one, two, three) {
        expect(one).to.equal(firstArg);
        expect(two).to.equal(secondArg);
        expect(three).to.equal(thirdArg);

        done();
      }

      fn = wrapPromise(dummy);

      fn(firstArg, secondArg, thirdArg);
    });
  });

  context('last parameter is a callback', function () {
    it('does not pass callback to the first param function', function () {
      var promise = new Promise(noop);
      var dummy = this.sandbox.stub().returns(promise);
      var fn = wrapPromise(dummy);
      var cb = noop;
      var arg1 = {};
      var arg2 = {};

      fn(arg1, arg2, cb);

      expect(dummy).to.be.calledWithExactly(arg1, arg2);
    });

    it('calls the callback with resolved promise', function (done) {
      var data = {foo: 'bar'};
      var promise = Promise.resolve(data);
      var dummy = this.sandbox.stub().returns(promise);
      var fn = wrapPromise(dummy);

      fn({}, function (err, resolvedData) {
        expect(err).to.not.exist;
        expect(resolvedData).to.equal(data);

        done();
      });
    });

    it('calls the callback with rejected promise', function (done) {
      var error = new Error('An Error');
      var promise = Promise.reject(error);
      var dummy = this.sandbox.stub().returns(promise);
      var fn = wrapPromise(dummy);

      fn({}, function (err, resolvedData) {
        expect(resolvedData).to.not.exist;
        expect(err).to.equal(error);

        done();
      });
    });
  });
});
