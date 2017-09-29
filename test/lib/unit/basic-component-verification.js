'use strict';

var verify = require('../../../src/lib/basic-component-verification').verify;
var BraintreeError = require('../../../src/lib/braintree-error');
var sharedErrors = require('../../../src/lib/errors');

function rejectIfResolves() {
  throw new Error('should not get here');
}

describe('basicComponentVerification', function () {
  it('rejects with an internal error if options are not provided', function () {
    return verify().then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('INTERNAL');
      expect(err.code).to.equal('INVALID_USE_OF_INTERNAL_FUNCTION');
      expect(err.message).to.equal('Options must be passed to basicComponentVerification function.');
    });
  });

  it('rejects with a braintree error if client is not provided', function () {
    return verify({
      name: 'Component'
    }).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal(sharedErrors.INSTANTIATION_OPTION_REQUIRED.type);
      expect(err.code).to.equal(sharedErrors.INSTANTIATION_OPTION_REQUIRED.code);
      expect(err.message).to.equal('options.client is required when instantiating Component.');
    });
  });

  it('rejects with a braintree error if clientversion does not match provided version', function () {
    var client = {
      getVersion: this.sandbox.stub().returns('3.1.0')
    };

    return verify({
      name: 'Component',
      client: client
    }).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
      expect(err.message).to.equal('Client (version 3.1.0) and Component (version ' + process.env.npm_package_version + ') components must be from the same SDK version.');
    });
  });
});
