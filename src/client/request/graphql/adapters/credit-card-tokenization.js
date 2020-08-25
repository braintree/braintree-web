'use strict';

var errorResponseAdapter = require('./error');

var CARD_BRAND_MAP = {
  /* eslint-disable camelcase */
  AMERICAN_EXPRESS: 'American Express',
  DINERS: 'Discover',
  DISCOVER: 'Discover',
  INTERNATIONAL_MAESTRO: 'Maestro',
  JCB: 'JCB',
  MASTERCARD: 'MasterCard',
  UK_MAESTRO: 'Maestro',
  UNION_PAY: 'Union Pay',
  VISA: 'Visa'
  /* eslint-enable camelcase */
};

var BIN_DATA_MAP = {
  YES: 'Yes',
  NO: 'No',
  UNKNOWN: 'Unknown'
};

var AUTHENTICATION_INSIGHT_MAP = {
  PSDTWO: 'psd2'
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
  var response, regulationEnvironment;

  if (binData) {
    ['commercial', 'debit', 'durbinRegulated', 'healthcare', 'payroll', 'prepaid'].forEach(function (key) {
      if (binData[key]) {
        binData[key] = BIN_DATA_MAP[binData[key]];
      } else {
        binData[key] = 'Unknown';
      }
    });

    ['issuingBank', 'countryOfIssuance', 'productId'].forEach(function (key) {
      if (!binData[key]) { binData[key] = 'Unknown'; }
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
          cardholderName: creditCard.cardholderName,
          expirationMonth: creditCard.expirationMonth,
          expirationYear: creditCard.expirationYear,
          bin: creditCard.bin || '',
          cardType: CARD_BRAND_MAP[creditCard.brandCode] || 'Unknown',
          lastFour: creditCard.last4 || '',
          lastTwo: lastTwo
        },
        type: 'CreditCard',
        threeDSecureInfo: null
      }
    ]
  };

  if (data.authenticationInsight) {
    regulationEnvironment = data.authenticationInsight.customerAuthenticationRegulationEnvironment;
    response.creditCards[0].authenticationInsight = {
      regulationEnvironment: AUTHENTICATION_INSIGHT_MAP[regulationEnvironment] || regulationEnvironment.toLowerCase()
    };
  }

  return response;
}

module.exports = creditCardTokenizationResponseAdapter;
