'use strict';

var convertMethodsToError = require('../../../src/lib/convert-methods-to-error');
var BraintreeError = require('../../../src/lib/error');

describe('convertMethodsToError', function () {
  it('can convert an array of methods to throw an error', function () {
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
    expect(obj.boo).to.throw(BraintreeError, 'boo cannot be called after teardown');

    expect(obj.baz).not.to.equal(originalBaz);
    expect(obj.baz).to.throw(BraintreeError, 'baz cannot be called after teardown');
  });
});
