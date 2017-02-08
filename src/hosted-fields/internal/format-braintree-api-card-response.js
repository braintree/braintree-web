/* eslint-disable camelcase */

'use strict';

var BRAND_MAP = {
  visa: 'Visa',
  mastercard: 'MasterCard',
  american_express: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  maestro: 'Maestro'
};

module.exports = function (response) {
  var lastTwo = response.data.last_4.substr(-2);

  return {
    braintreeApiToken: response.data.id,
    details: {
      cardType: cardTypeFromBrand(response.data.brand),
      lastTwo: lastTwo
    },
    description: 'ending in ' + lastTwo,
    type: 'CreditCard'
  };
};

function cardTypeFromBrand(brand) {
  if (BRAND_MAP.hasOwnProperty(brand)) {
    return BRAND_MAP[brand];
  }

  return 'Unknown';
}
