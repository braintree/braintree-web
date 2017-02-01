'use strict';

var BraintreeError = require('../../../src/lib/braintree-error');
var throwIfNoCallback = require('../../../src/lib/throw-if-no-callback');

describe('throwIfNoCallback', function () {
  it('throws if not passed a function', function () {
    var err;

    try {
      throwIfNoCallback('', 'test');
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceOf(BraintreeError);
    expect(err.message).to.equal('test must include a callback function.');
    expect(err.type).to.equal('MERCHANT');
    expect(err.code).to.equal('CALLBACK_REQUIRED');
  });

  it('does not throw if passed a function', function () {
    throwIfNoCallback(function () {}, 'test');
  });
});
