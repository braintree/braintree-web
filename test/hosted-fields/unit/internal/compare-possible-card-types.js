'use strict';

var comparePossibleCardTypes = require('../../../../src/hosted-fields/internal/compare-possible-card-types');

describe('comparePossibleCardTypes', function () {
  it('returns true for 2 equal lists', function () {
    var a = [{type: 'a'}];
    var b = [{type: 'a'}];

    expect(comparePossibleCardTypes(a, b)).to.equal(true);
    expect(comparePossibleCardTypes(b, a)).to.equal(true);
  });

  it('returns false for 2 unequal lists', function () {
    var a = [{type: 'a'}];
    var b = [{type: 'b'}];

    expect(comparePossibleCardTypes(a, b)).to.equal(false);
    expect(comparePossibleCardTypes(b, a)).to.equal(false);
  });

  it('returns true for 2 empty lists', function () {
    var a = [];
    var b = [];

    expect(comparePossibleCardTypes(a, b)).to.equal(true);
    expect(comparePossibleCardTypes(b, a)).to.equal(true);
  });

  it('returns false for 1 empty list and 1 non-empty list', function () {
    var a = [];
    var b = [{type: 'a'}];

    expect(comparePossibleCardTypes(a, b)).to.equal(false);
    expect(comparePossibleCardTypes(b, a)).to.equal(false);
  });

  it('returns false if one list is a subset of another', function () {
    var a = [{type: 'a'}, {type: 'b'}];
    var b = [{type: 'a'}];

    expect(comparePossibleCardTypes(a, b)).to.equal(false);
    expect(comparePossibleCardTypes(b, a)).to.equal(false);
  });
});
