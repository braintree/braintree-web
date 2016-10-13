'use strict';

var sanitize = require('../../../src/lib/sanitize-html');

describe('sanitizeHtml', function () {
  it('leaves safe strings untouched', function () {
    expect(sanitize('')).to.equal('');
    expect(sanitize('cups with the ice')).to.equal('cups with the ice');
  });

  it('filters HTML tags', function () {
    expect(sanitize('check<br>the<br />price')).to.equal('check&lt;br&gt;the&lt;br /&gt;price');
    expect(sanitize('<P>no type</P>')).to.equal('&lt;P&gt;no type&lt;/P&gt;');
  });

  it('filters ampersands', function () {
    expect(sanitize('& we do this')).to.equal('&amp; we do this');
    expect(sanitize('&lt;')).to.equal('&amp;lt;');
  });

  it('returns the empty string for non-strings', function () {
    expect(sanitize()).to.equal('');
    expect(sanitize(null)).to.equal('');
    expect(sanitize(false)).to.equal('');
    expect(sanitize(true)).to.equal('');
    expect(sanitize(0)).to.equal('');
    expect(sanitize(function () {})).to.equal('');
    expect(sanitize(new String('nope'))).to.equal(''); // eslint-disable-line no-new-wrappers
  });
});
