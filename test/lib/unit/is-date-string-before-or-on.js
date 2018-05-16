'use strict';

var isDateStringBeforeOrOn = require('../../../src/lib/is-date-string-before-or-on');

describe('isDateStringBeforeOrOn', function () {
  it('is true if the first argument is a date chronologically before the second', function () {
    var firstDate = '2018-05-05';
    var secondDate = '2018-05-10';

    expect(isDateStringBeforeOrOn(firstDate, secondDate)).to.equal(true);
    expect(isDateStringBeforeOrOn(secondDate, firstDate)).to.equal(false);
  });

  it('is true if the first argument is the same as the second', function () {
    var firstDate = '2018-05-05';
    var secondDate = '2018-05-05';

    expect(isDateStringBeforeOrOn(firstDate, secondDate)).to.equal(true);
  });
});
