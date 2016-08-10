'use strict';

var parallel = require('async/parallel');
var Destructor = require('../../../src/lib/destructor');

describe('Destructor', function () {
  describe('constructor', function () {
    it('creates an empty collection', function () {
      expect(new Destructor()._teardownRegistry).to.deep.equal([]);
    });
  });

  describe('registerFunctionForTeardown', function () {
    it('adds passed in function to instance collection', function () {
      var destructor = new Destructor();

      function fn() {}

      destructor.registerFunctionForTeardown(fn);

      expect(destructor._teardownRegistry).to.deep.equal([fn]);
    });

    it('does not add non-functions to collection', function () {
      var destructor = new Destructor();

      destructor.registerFunctionForTeardown('str');
      destructor.registerFunctionForTeardown(true);
      destructor.registerFunctionForTeardown(1);
      destructor.registerFunctionForTeardown(null);
      destructor.registerFunctionForTeardown();
      destructor.registerFunctionForTeardown({foo: 'bar'});

      expect(destructor._teardownRegistry).to.deep.equal([]);
    });
  });

  describe('teardown', function () {
    it('empties collection of teardown functions', function (done) {
      var destructor = new Destructor();

      destructor.registerFunctionForTeardown(sinon.spy());
      destructor.registerFunctionForTeardown(sinon.spy());

      destructor.teardown(function () {
        expect(destructor._teardownRegistry).to.deep.equal([]);
        done();
      });
    });

    it('calls supplied callback', function (done) {
      var destructor = new Destructor();

      destructor.teardown(function (err) {
        expect(err).not.to.be.defined;
        done();
      });
    });

    it('calls supplied callback with an error if given a synchronous function', function () {
      var destructor = new Destructor();

      destructor._teardownRegistry = [
        function () { throw new Error(); }
      ];

      expect(function () {
        destructor.teardown();
      }).to.throw(Error);
    });

    it('calls supplied callback with an error if given an asynchronous function', function () {
      var destructor = new Destructor();

      destructor._teardownRegistry = [
        function (next) {
          next(new Error());
        }
      ];

      destructor.teardown(function (err) {
        expect(err).to.be.an.instanceof(Error);
      });
    });

    it('calls supplied callback with an error when calling teardown twice if already in progress', function (done) {
      var destructor = new Destructor();

      destructor.registerFunctionForTeardown(function (cb) {
        setTimeout(cb, 10);
      });

      parallel([
        function (next) {
          destructor.teardown(function (err) {
            expect(err).to.equal(null);
            next();
          });
        },
        function (next) {
          destructor.teardown(function (err) {
            expect(err).to.be.an.instanceof(Error);
            next();
          });
        }
      ], done);
    });
  });
});
