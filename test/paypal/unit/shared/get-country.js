'use strict';

var getCountry = require('../../../../src/paypal/shared/get-country');

describe('get-country', function () {
  it('accepts a 2 character country code and returns an Hermes country code', function () {
    var country = getCountry('at');

    expect(country).to.equal('at');
  });

  it('accepts a 5 character locale code and returns an Hermes country code', function () {
    var country = getCountry('sv_se');

    expect(country).to.equal('se');
  });

  it('converts the UK country code to GB', function () {
    var country = getCountry('uk');

    expect(country).to.equal('gb');
  });
});
