'use strict';

var methods = require('../../../src/lib/methods');

describe('methods', function () {
  it('extracts all methods from an object', function () {
    var obj = {
      fnOne: function () {},
      fnTwo: function () {},
      property1: 'I am a property'
    };

    expect(methods(obj)).to.have.members(['fnOne', 'fnTwo']);
  });

  it('extracts all methods from an object with a superclass', function () {
    var obj;

    function Klass() {
      this.childFn = function () {};
      this.childProperty = 'I am a property';
    }
    Klass.prototype.parentFn = function () {};

    obj = new Klass();

    expect(methods(obj)).to.deep.equal(['childFn']);
  });

  it('returns [] with empty object', function () {
    var obj = {};

    expect(methods(obj)).to.deep.equal([]);
  });
});
