'use strict';

var BraintreeError = require('../../../src/lib/error');

describe('BraintreeError', function () {
  it('returns a properly formatted error', function () {
    var options = {
      type: BraintreeError.types.UNKNOWN,
      code: 'YOU_GOOFED',
      message: 'yep it\'s an error'
    };

    var e = new BraintreeError(options);

    expect(e.name).to.equal('BraintreeError');
    expect(e.type).to.equal(options.type);
    expect(e.code).to.equal(options.code);
    expect(e.message).to.equal(options.message);
  });

  it('BraintreeError expects a non-empty message', function () {
    var err;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_GOOFED'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('Error message required.');
    err = null;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_GOOFED',
        message: ''
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('Error message required.');
  });

  it('BraintreeError expects a non-empty code', function () {
    var err;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: BraintreeError.types.UNKNOWN,
        message: 'You goofed'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('Error code required.');
    err = null;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: BraintreeError.types.UNKNOWN,
        code: '',
        message: 'You goofed'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('Error code required.');
  });

  it('BraintreeError type can only accept a value from the defined error types', function () {
    var err;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        message: 'you goofed',
        code: 'YOU_GOOFED'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('undefined is not a valid type.');
    err = null;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: '',
        code: 'YOU_GOOFED',
        message: 'you goofed'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal(' is not a valid type.');
    err = null;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: 'NOPE',
        code: 'YOU_GOOFED',
        message: 'I should fail'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('NOPE is not a valid type.');
    err = null;

    try {
      new BraintreeError({ // eslint-disable-line no-new
        type: 'hasOwnProperty',
        code: 'YOU_GOOFED',
        message: 'I should fail'
      });
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('hasOwnProperty is not a valid type.');
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
