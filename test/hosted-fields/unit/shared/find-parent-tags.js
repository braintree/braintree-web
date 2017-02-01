'use strict';

var findParentTags = require('../../../../src/hosted-fields/shared/find-parent-tags');

describe('findParentTags', function () {
  it('returns an empty array for an element that has no parents', function () {
    var el = document.createElement('div');
    var result = findParentTags(el, 'span');

    expect(result).to.deep.equal([]);
  });

  it('returns an empty array for the <html> element', function () {
    var result = findParentTags(document.documentElement, 'span');

    expect(result).to.deep.equal([]);
  });

  it('returns the <html> element for <body> when looking for "html" elements', function () {
    var result = findParentTags(document.body, 'html');

    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.equal(document.documentElement);
  });

  it('returns an empty array for <body> when looking for "span" elements', function () {
    var result = findParentTags(document.body, 'span');

    expect(result).to.deep.equal([]);
  });

  it('finds relevant parent elements', function () {
    var result;
    var topLevel = document.createElement('div');
    var grandparent = document.createElement('span');
    var greatAunt = document.createElement('span');
    var parent = document.createElement('span');
    var el = document.createElement('span');

    topLevel.appendChild(grandparent);
    topLevel.appendChild(greatAunt);
    grandparent.appendChild(parent);
    parent.appendChild(el);

    result = findParentTags(el, 'span');
    expect(result).to.have.lengthOf(2);
    expect(result[0]).to.equal(parent);
    expect(result[1]).to.equal(grandparent);

    result = findParentTags(el, 'div');
    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.equal(topLevel);
  });
});
