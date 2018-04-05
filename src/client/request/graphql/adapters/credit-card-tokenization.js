'use strict';

var errorResponseAdapter = require('./error');

var CARD_BRAND_MAP = {
  /* eslint-disable camelcase */
  american_express: 'American Express',
  diners: 'Discover',
  discover: 'Discover',
  international_maestro: 'Maestro',
  jcb: 'JCB',
  mastercard: 'MasterCard',
  uk_maestro: 'Maestro',
  union_pay: 'Union Pay',
  visa: 'Visa'
  /* eslint-enable camelcase */
};

function creditCardTokenizationResponseAdapter(responseBody) {
  var adaptedResponse;

  if (responseBody.data && !responseBody.errors) {
    adaptedResponse = adaptTokenizeCreditCardResponseBody(responseBody);
  } else {
    adaptedResponse = errorResponseAdapter(responseBody);
  }

  return adaptedResponse;
}

function adaptTokenizeCreditCardResponseBody(body) {
  var data = body.data.tokenizeCreditCard;
  var creditCard = data.creditCard;
  var lastTwo = creditCard.last4 ? creditCard.last4.substr(2, 4) : '';
  var binData = creditCard.binData;
  var response;

  if (binData) {
    ['issuingBank', 'countryOfIssuance', 'productId'].forEach(function (key) {
      if (binData[key] === null) { binData[key] = 'Unknown'; }
    });
  }

  response = {
    creditCards: [
      {
        binData: binData,
        consumed: false,
        description: lastTwo ? 'ending in ' + lastTwo : '',
        nonce: data.token,
        details: {
          cardType: CARD_BRAND_MAP[creditCard.brandCode] || 'Unknown',
          lastFour: creditCard.last4 || '',
          lastTwo: lastTwo
        },
        type: 'CreditCard',
        threeDSecureInfo: null
      }
    ]
  };

  return response;
}

module.exports = creditCardTokenizationResponseAdapter;
