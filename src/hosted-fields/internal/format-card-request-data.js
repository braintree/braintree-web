/* eslint-disable camelcase */

'use strict';

module.exports = function (data) {
  var result = {};

  if ('number' in data) {
    result.number = data.number;
  }

  if ('cvv' in data) {
    result.cvv = data.cvv;
  }

  if ('expirationMonth' in data) {
    result.expiration_month = data.expirationMonth;
  }

  if ('expirationYear' in data) {
    if (data.expirationYear.length === 2) {
      result.expiration_year = '20' + data.expirationYear;
    } else {
      result.expiration_year = data.expirationYear;
    }
  }

  if ('postalCode' in data) {
    result.billing_address = {
      postal_code: data.postalCode
    };
  }

  return result;
};
