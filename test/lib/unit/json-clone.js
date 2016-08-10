'use strict';

var jsonClone = require('../../../src/lib/json-clone');

describe('jsonClone', function () {
  it('properly clones an empty object', function () {
    var obj = {};

    expect(jsonClone(obj)).to.deep.equal(obj);
    expect(jsonClone(obj)).not.to.equal(obj);
  });

  it('properly clones an object with properties', function () {
    var obj = {
      foo: 'boo',
      bar: ['car'],
      baz: {
        caz: 'daz'
      }
    };

    expect(jsonClone(obj)).to.deep.equal(obj);
    expect(jsonClone(obj)).not.to.equal(obj);
  });

  it('does a deep clone', function () {
    var obj = {
      foo: 'boo',
      bar: ['car'],
      baz: {
        caz: 'daz'
      }
    };

    expect(jsonClone(obj).bar).not.to.equal(obj.bar);
    expect(jsonClone(obj).baz).not.to.equal(obj.baz);
  });
});
