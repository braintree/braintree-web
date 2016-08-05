'use strict';

var convertMethodsToError = require('../../../src/lib/convert-methods-to-error');
var BraintreeError = require('../../../src/lib/error');

describe('convertMethodsToError', function () {
  it('can convert an array of methods to throw an error', function () {
    var err;
    var obj = {
      foo: originalFoo,
      boo: originalBoo,
      baz: originalBaz
    };

    function originalFoo() {}
    function originalBoo() {}
    function originalBaz() {}

    convertMethodsToError(obj, ['boo', 'baz']);

    expect(obj.foo).to.equal(originalFoo);

    expect(obj.boo).not.to.equal(originalBoo);

    try {
      obj.boo();
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.type).to.equal('MERCHANT');
    expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
    expect(err.message).to.equal('boo cannot be called after teardown.');
    err = null;

    expect(obj.baz).not.to.equal(originalBaz);

    try {
      obj.baz();
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.type).to.equal('MERCHANT');
    expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
    expect(err.message).to.equal('baz cannot be called after teardown.');
  });
});
