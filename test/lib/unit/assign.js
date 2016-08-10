'use strict';

var assignModule = require('../../../src/lib/assign');

describe('assign', function () {
  describe('exported function', function () {
    test(assignModule.assign);
  });

  describe('polyfill', function () {
    test(assignModule._assign);
  });
});

function test(assign) {
  it('does nothing to one object', function () {
    var obj = {foo: 'bar'};

    expect(assign(obj)).to.equal(obj);
  });

  it('merges two objects', function () {
    var a = {foo: 'yas', bar: 'ugh'};
    var b = {foo: 'nope', baz: 'wow'};

    expect(assign(a, b)).to.deep.equal({
      foo: 'nope',
      bar: 'ugh',
      baz: 'wow'
    });
  });

  it('merges three objects', function () {
    var a = {foo: 'yas', bar: 'ugh'};
    var b = {foo: 'nope'};
    var c = {foo: 'wow', baz: 'cool'};

    expect(assign(a, b, c)).to.deep.equal({
      foo: 'wow',
      bar: 'ugh',
      baz: 'cool'
    });
  });

  it('returns the first object passed', function () {
    var a = {foo: 'yas', bar: 'ugh'};
    var b = {foo: 'nope', baz: 'wow'};

    expect(assign(a, b)).to.equal(a);
  });

  it("doesn't take inherited properties", function () {
    var a, b;

    function Klass() {
      this.foo = 'yas';
    }

    Klass.prototype.bar = 'ugh';

    a = {foo: 'nope', baz: 'wow'};
    b = new Klass();

    expect(assign(a, b)).to.deep.equal({
      foo: 'yas',
      baz: 'wow'
    });
  });
}
