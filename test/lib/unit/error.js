'use strict';

var BraintreeError = require('../../../src/lib/error');

describe('BraintreeError', function () {
  it('returns a properly formatted error', function () {
    var options = {
      type: BraintreeError.types.UNKNOWN,
      message: 'yep it\'s an error'
    };

    var e = new BraintreeError(options);

    expect(e.type).to.equal(options.type);
    expect(e.message).to.equal(options.message);
  });

  it('BraintreeError expects a non-empty message', function () {
    expect(function () {
      new BraintreeError({ // eslint-disable-line no-new
        type: BraintreeError.types.UNKNOWN,
        message: ''
      });
    }).to.throw(Error, 'Error message required');

    expect(function () {
      new BraintreeError({ // eslint-disable-line no-new
        type: BraintreeError.types.UNKNOWN
      });
    }).to.throw(Error, 'Error message required');
  });

  it('BraintreeError type can only accept a value from the defined error types', function () {
    expect(function () {
      new BraintreeError({ // eslint-disable-line no-new
        type: 'NOPE',
        message: 'I should fail'
      });
    }).to.throw(Error, 'NOPE is not a valid type');

    expect(function () {
      new BraintreeError({ // eslint-disable-line no-new
        type: 'hasOwnProperty',
        message: 'I should fail'
      });
    }).to.throw(Error, 'hasOwnProperty is not a valid type');
  });

  it('BraintreeError.type is an enum of error types', function () {
    expect(BraintreeError.types).to.deep.equal({
      CUSTOMER: 'CUSTOMER',
      MERCHANT: 'MERCHANT',
      NETWORK: 'NETWORK',
      INTERNAL: 'INTERNAL',
      UNKNOWN: 'UNKNOWN'
    });
  });
});
