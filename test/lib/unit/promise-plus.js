'use strict';

var makePromisePlus = require('../../../src/lib/promise-plus');
var Promise = require('../../../src/lib/promise');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;

describe('makePromisePlus', function () {
  it('it returns a promise', function () {
    var promise = makePromisePlus();

    expect(promise).to.be.an.instanceof(Promise);
  });

  it('defaults status properties to false', function () {
    var promisePlus = makePromisePlus();

    expect(promisePlus.isFulfilled).to.equal(false);
    expect(promisePlus.isResolved).to.equal(false);
    expect(promisePlus.isRejected).to.equal(false);
  });

  it('updates status properties when it resolves', function () {
    var promisePlus = makePromisePlus();

    promisePlus.resolve();

    expect(promisePlus.isFulfilled).to.equal(true);
    expect(promisePlus.isResolved).to.equal(true);
    expect(promisePlus.isRejected).to.equal(false);
  });

  it('updates status properties when it rejects', function () {
    var promisePlus = makePromisePlus();

    promisePlus.reject();

    expect(promisePlus.isFulfilled).to.equal(true);
    expect(promisePlus.isResolved).to.equal(false);
    expect(promisePlus.isRejected).to.equal(true);
  });

  it('can resolve with resolve function', function () {
    var promisePlus = makePromisePlus();
    var result = {foo: 'bar'};

    promisePlus.resolve(result);

    return promisePlus.then(function (payload) {
      expect(payload).to.equal(result);
    });
  });

  it('can reject with reject function', function () {
    var promisePlus = makePromisePlus();
    var error = new Error('foo');

    promisePlus.reject(error);

    return promisePlus.then(rejectIfResolves).catch(function (err) {
      expect(err).to.equal(error);
    });
  });

  it('will not update status properties when it has already resolved', function () {
    var promisePlus = makePromisePlus();

    promisePlus.resolve();

    expect(promisePlus.isFulfilled).to.equal(true);
    expect(promisePlus.isResolved).to.equal(true);
    expect(promisePlus.isRejected).to.equal(false);

    promisePlus.reject();

    expect(promisePlus.isFulfilled).to.equal(true);
    expect(promisePlus.isResolved).to.equal(true);
    expect(promisePlus.isRejected).to.equal(false);
  });

  it('will not update the resolved value after it has already been resolved', function () {
    var promisePlus = makePromisePlus();

    promisePlus.resolve('1');

    return promisePlus.then(function (result) {
      expect(result).to.equal('1');

      promisePlus.resolve('2');

      return promisePlus;
    }).then(function (result) {
      expect(result).to.equal('1');

      promisePlus.reject(new Error('foo'));

      return promisePlus;
    }).then(function (result) {
      expect(result).to.equal('1');
    });
  });

  it('will not update status properties when it has already rejected', function () {
    var promisePlus = makePromisePlus();

    promisePlus.reject();

    expect(promisePlus.isFulfilled).to.equal(true);
    expect(promisePlus.isResolved).to.equal(false);
    expect(promisePlus.isRejected).to.equal(true);

    promisePlus.resolve();

    expect(promisePlus.isFulfilled).to.equal(true);
    expect(promisePlus.isResolved).to.equal(false);
    expect(promisePlus.isRejected).to.equal(true);
  });

  it('will not update the rejected value after it has already been rejected', function () {
    var promisePlus = makePromisePlus();
    var error = new Error('1');

    promisePlus.reject(error);

    return promisePlus.then(rejectIfResolves).catch(function (result) {
      expect(result).to.equal(error);

      promisePlus.reject(new Error('2'));

      return promisePlus;
    }).then(rejectIfResolves).catch(function (result) {
      expect(result).to.equal(error);

      promisePlus.resolve('3');

      return promisePlus;
    }).then(rejectIfResolves).catch(function (result) {
      expect(result).to.equal(error);
    });
  });
});
