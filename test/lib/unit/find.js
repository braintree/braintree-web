'use strict';

var find = require('../../../src/lib/find');

describe('find', function () {
  it('returns null for empty array inputs', function () {
    expect(find([], 'type', 'foo')).to.be.null;
  });

  it('returns null when unable to find key value pair', function () {
    var arr = [{
      key: 'value 1'
    }, {
      key: 'value 2'
    }];

    expect(find(arr, 'type', 'foo')).to.be.null;
  });

  it('returns the only matching element from the provided array', function () {
    var arr = [{
      type: 'bar',
      key2: 'bar 2'
    }, {
      type: 'foo',
      key2: 'foo 2'
    }, {
      type: 'baz',
      key2: 'baz 2'
    }];

    expect(find(arr, 'type', 'foo')).to.deep.equal({
      type: 'foo',
      key2: 'foo 2'
    });
  });

  it('returns the first matching element from the provided array if multiple matches exist', function () {
    var arr = [{
      type: 'foo',
      key2: 'foo 2',
      index: 0
    }, {
      type: 'foo',
      key2: 'foo 2',
      index: 1
    }, {
      type: 'baz',
      key2: 'baz 2',
      index: 2
    }];

    expect(find(arr, 'type', 'foo')).to.deep.equal({
      type: 'foo',
      key2: 'foo 2',
      index: 0
    });
  });
});
