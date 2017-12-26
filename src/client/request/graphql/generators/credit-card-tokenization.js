'use strict';

var assign = require('../../../../lib/assign').assign;

var CREDIT_CARD_TOKENIZATION_MUTATION = 'mutation TokenizeCreditCard($input: TokenizeCreditCardInput!) { ' +
'  tokenizeCreditCard(input: $input) { ' +
'    token ' +
'    creditCard { ' +
'      brand ' +
'      last4 ' +
'      binData { ' +
'        prepaid ' +
'        healthcare ' +
'        debit ' +
'        durbinRegulated ' +
'        commercial ' +
'        payroll ' +
'        issuingBank ' +
'        countryOfIssuance ' +
'        productId ' +
'      } ' +
'    } ' +
'  } ' +
'}';

var CVV_ONLY_TOKENIZATION_MUTATION = 'mutation TokenizeCvv($input: TokenizeCvvInput!) { ' +
'  tokenizeCvv(input: $input) { ' +
'    token' +
'  } ' +
'}';

function createCreditCardTokenizationBody(body) {
  var cc = body.creditCard;
  var billingAddress = cc && cc.billingAddress;
  var expDate = cc && cc.expirationDate;
  var expirationMonth = cc && (cc.expirationMonth || (expDate && expDate.split('/')[0].trim()));
  var expirationYear = cc && (cc.expirationYear || (expDate && expDate.split('/')[1].trim()));
  var variables = {
    input: {
      creditCard: {
        number: cc && cc.number,
        expirationMonth: expirationMonth,
        expirationYear: expirationYear,
        cvv: cc && cc.cvv,
        cardholderName: cc && cc.cardholderName
      },
      options: {}
    }
  };

  if (billingAddress) {
    variables.input.creditCard.billingAddress = billingAddress;
  }

  variables.input = addValidationRule(body, variables.input);

  return variables;
}

function addValidationRule(body, input) {
  var validate;

  if (body.creditCard && body.creditCard.options && typeof body.creditCard.options.validate === 'boolean') {
    validate = body.creditCard.options.validate;
  } else if ((body.authorizationFingerprint && body.tokenizationKey) || body.authorizationFingerprint) {
    validate = true;
  } else if (body.tokenizationKey) {
    validate = false;
  }

  if (typeof validate === 'boolean') {
    input.options = assign({
      validate: validate
    }, input.options);
  }

  return input;
}

function createCvvTokenizationBody(body) {
  var variables = {
    input: {
      cvv: body.creditCard && body.creditCard.cvv
    }
  };

  return variables;
}

function creditCardTokenization(body) {
  var query, variables, operationName;

  if (body.creditCard && !body.creditCard.number && body.creditCard.cvv) {
    query = CVV_ONLY_TOKENIZATION_MUTATION;
    variables = createCvvTokenizationBody(body);
    operationName = 'TokenizeCvv';
  } else {
    query = CREDIT_CARD_TOKENIZATION_MUTATION;
    variables = createCreditCardTokenizationBody(body);
    operationName = 'TokenizeCreditCard';
  }

  return JSON.stringify({
    query: query,
    variables: variables,
    operationName: operationName
  });
}

module.exports = creditCardTokenization;
