'use strict';

var BraintreeError = require('../../../src/lib/braintree-error');

describe('BraintreeError', function () {
  it('inherits from Error', function () {
    var btError = new BraintreeError({
      type: 'CUSTOMER',
      code: 'SOME_CODE',
      message: 'Foo'
    });

    expect(btError).to.be.an.instanceof(Error);
  });

  it('errors if type is invalid', function () {
    expect(function () {
      new BraintreeError({
        type: 'INVALID',
        code: 'SOME_CODE',
        message: 'Foo'
      });
    }).to.throw('INVALID is not a valid type');
  });

  it('errors if code is missing', function () {
    expect(function () {
      new BraintreeError({
        type: 'CUSTOMER',
        message: 'Foo'
      });
    }).to.throw('Error code required');
  });

  it('errors if message is missing', function () {
    expect(function () {
      new BraintreeError({
        type: 'CUSTOMER',
        code: 'SOME_CODE'
      });
    }).to.throw('Error message required');
  });

  it('creates a Braintree Error', function () {
    var btError = new BraintreeError({
      type: 'CUSTOMER',
      code: 'SOME_CODE',
      message: 'Foo'
    });

    expect(btError.type).to.equal('CUSTOMER');
    expect(btError.code).to.equal('SOME_CODE');
    expect(btError.message).to.equal('Foo');
  });

  it('can include a details object', function () {
    var details = {
      originalError: new Error('foo')
    };
    var btError = new BraintreeError({
      type: 'CUSTOMER',
      code: 'SOME_CODE',
      message: 'Foo',
      details: details
    });

    expect(btError.details).to.equal(details);
  });

  describe('findRootError', function () {
    it('returns the passed in error if it is not a Braintree Error', function () {
      var error = new Error('Foo');
      var rootError = BraintreeError.findRootError(error);

      expect(rootError).to.equal(error);
    });

    it('returns the passed in error if it does not have details', function () {
      var error = new BraintreeError({
        type: 'CUSTOMER',
        code: 'CODE',
        message: 'Message'
      });
      var rootError = BraintreeError.findRootError(error);

      expect(rootError).to.equal(error);
    });

    it('returns the passed in error if it does not have details.originalError', function () {
      var error = new BraintreeError({
        type: 'CUSTOMER',
        code: 'CODE',
        message: 'Message',
        details: {}
      });
      var rootError = BraintreeError.findRootError(error);

      expect(rootError).to.equal(error);
    });

    it('returns the error in details.originalError', function () {
      var originalError = new Error('Foo');
      var btError = new BraintreeError({
        type: 'CUSTOMER',
        code: 'CODE',
        message: 'Message',
        details: {
          originalError: originalError
        }
      });

      var rootError = BraintreeError.findRootError(btError);

      expect(rootError).to.equal(originalError);
    });

    it('returns the most deeply nested error', function () {
      var originalError = new Error('Foo');
      var btError = new BraintreeError({
        type: 'CUSTOMER',
        code: 'FIRST',
        message: 'Message',
        details: {
          originalError: new BraintreeError({
            type: 'CUSTOMER',
            code: 'SECOND',
            message: 'Message',
            details: {
              originalError: new BraintreeError({
                type: 'CUSTOMER',
                code: 'THIRD',
                message: 'Message',
                details: {
                  originalError: originalError
                }
              })
            }
          })
        }
      });

      var rootError = BraintreeError.findRootError(btError);

      expect(rootError).to.equal(originalError);
    });

    it('returns the most deeply nested Braintree Error', function () {
      var originalError = new BraintreeError({
        type: 'CUSTOMER',
        code: 'ORIGINAL',
        message: 'Message'
      });
      var btError = new BraintreeError({
        type: 'CUSTOMER',
        code: 'FIRST',
        message: 'Message',
        details: {
          originalError: new BraintreeError({
            type: 'CUSTOMER',
            code: 'SECOND',
            message: 'Message',
            details: {
              originalError: new BraintreeError({
                type: 'CUSTOMER',
                code: 'THIRD',
                message: 'Message',
                details: {
                  originalError: originalError
                }
              })
            }
          })
        }
      });

      var rootError = BraintreeError.findRootError(btError);

      expect(rootError).to.equal(originalError);
    });
  });
});
