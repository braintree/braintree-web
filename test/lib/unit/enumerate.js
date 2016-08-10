'use strict';

var enumerate = require('../../../src/lib/enumerate');

describe('enumerate', function () {
  it('sets keys equal to their values', function () {
    expect(enumerate([
      'value1',
      'value2'
    ])).to.deep.equal({
      value1: 'value1',
      value2: 'value2'
    });
  });

  it('sets keys equal to their values with a prefix', function () {
    expect(enumerate([
      'value1',
      'value2'
    ], 'prefix:')).to.deep.equal({
      value1: 'prefix:value1',
      value2: 'prefix:value2'
    });
  });
});
