'use strict';

var BraintreeError = require('../../../src/lib/braintree-error');
var convertToBraintreeError = require('../../../src/lib/convert-to-braintree-error');

describe('convertToBraintreeError', function () {
  it('returns original error if it is a Braintree Error', function () {
    var originalError = new BraintreeError({
      type: 'MERCHANT',
      code: 'A_CODE',
      message: 'My Message'
    });

    expect(convertToBraintreeError(originalError, {
      type: 'NETWORK',
      code: 'ANOTHER_CODE',
      message: 'Another message'
    })).to.equal(originalError);
  });

  it('wraps error when it is not a Braintree Error', function () {
    var originalError = new Error('An Error');
    var btError = convertToBraintreeError(originalError, {
      type: 'NETWORK',
      code: 'A_CODE',
      message: 'message'
    });

    expect(btError).to.be.an.instanceof(BraintreeError);
    expect(btError.type).to.equal('NETWORK');
    expect(btError.code).to.equal('A_CODE');
    expect(btError.message).to.equal('message');
    expect(btError.details.originalError).to.equal(originalError);
  });
});
