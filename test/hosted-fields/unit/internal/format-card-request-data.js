/* eslint-disable camelcase */

'use strict';

var formatCardRequestData = require('../../../../src/hosted-fields/internal/format-card-request-data');

describe('formatCardRequestData', function () {
  it('does not include absent values', function () {
    var result = formatCardRequestData({});

    expect(result).to.deep.equal({});
  });

  it('does not include non-whitelisted data', function () {
    var result = formatCardRequestData({foo: 'bar'});

    expect(result).to.deep.equal({});
  });

  it('includes card number', function () {
    var result = formatCardRequestData({number: '4111111111111111'});

    expect(result).to.deep.equal({number: '4111111111111111'});
  });

  it('includes expiration month', function () {
    var result = formatCardRequestData({expirationMonth: '04'});

    expect(result).to.deep.equal({expiration_month: '04'});
  });

  it('formats 2-digit expiration years as 4-digit', function () {
    var result = formatCardRequestData({expirationYear: '21'});

    expect(result).to.deep.equal({expiration_year: '2021'});
  });

  it('includes 4-digit expiration years', function () {
    var result = formatCardRequestData({expirationYear: '2019'});

    expect(result).to.deep.equal({expiration_year: '2019'});
  });

  it('includes cvv', function () {
    var result = formatCardRequestData({cvv: '123'});

    expect(result).to.deep.equal({cvv: '123'});
  });

  it('includes postal code', function () {
    var result = formatCardRequestData({postalCode: '12345'});

    expect(result).to.deep.equal({
      billing_address: {
        postal_code: '12345'
      }
    });
  });

  it('includes all data', function () {
    var result = formatCardRequestData({
      number: '4111111111111111',
      expirationMonth: '04',
      expirationYear: '21',
      cvv: '123',
      postalCode: '12345'
    });

    expect(result).to.deep.equal({
      number: '4111111111111111',
      expiration_month: '04',
      expiration_year: '2021',
      cvv: '123',
      billing_address: {
        postal_code: '12345'
      }
    });
  });
});
