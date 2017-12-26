'use strict';

var errorResponseAdapter = require('./error');

function creditCardTokenizationResponseAdapter(responseBody) {
  var adaptedResponse;

  if (responseBody.data && !responseBody.errors) {
    if (responseBody.data.tokenizeCreditCard) {
      adaptedResponse = adaptTokenizeCreditCardResponseBody(responseBody);
    } else if (responseBody.data.tokenizeCvv) {
      adaptedResponse = adaptTokenizeCvvResponseBody(responseBody);
    }
  } else {
    adaptedResponse = errorResponseAdapter(responseBody);
  }

  return adaptedResponse;
}

function adaptTokenizeCreditCardResponseBody(body) {
  var data = body.data.tokenizeCreditCard;
  var creditCard = data.creditCard;
  var lastTwo = creditCard.last4.substr(2, 4);
  var response = {
    creditCards: [
      {
        binData: creditCard.binData,
        consumed: false,
        description: 'ending in ' + lastTwo,
        nonce: data.token,
        details: {
          cardType: creditCard.brand,
          lastFour: creditCard.last4,
          lastTwo: lastTwo
        },
        type: 'CreditCard',
        threeDSecureInfo: null
      }
    ]
  };

  return response;
}

function adaptTokenizeCvvResponseBody(body) {
  var data = body.data.tokenizeCvv;
  var response = {
    creditCards: [
      {
        consumed: false,
        description: '',
        nonce: data.token,
        details: {
          cardType: 'Unknown',
          lastFour: '',
          lastTwo: ''
        },
        type: 'CreditCard',
        threeDSecureInfo: null
      }
    ]
  };

  return response;
}

module.exports = creditCardTokenizationResponseAdapter;
