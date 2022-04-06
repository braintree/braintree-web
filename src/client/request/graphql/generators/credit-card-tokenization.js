"use strict";

var assign = require("../../../../lib/assign").assign;

function createMutation(config) {
  var hasAuthenticationInsight = config.hasAuthenticationInsight;
  var mutation = "mutation TokenizeCreditCard($input: TokenizeCreditCardInput!";

  if (hasAuthenticationInsight) {
    mutation += ", $authenticationInsightInput: AuthenticationInsightInput!";
  }

  mutation +=
    ") { " +
    "  tokenizeCreditCard(input: $input) { " +
    "    token " +
    "    creditCard { " +
    "      bin " +
    "      brandCode " +
    "      last4 " +
    "      cardholderName " +
    "      expirationMonth" +
    "      expirationYear" +
    "      binData { " +
    "        prepaid " +
    "        healthcare " +
    "        debit " +
    "        durbinRegulated " +
    "        commercial " +
    "        payroll " +
    "        issuingBank " +
    "        countryOfIssuance " +
    "        productId " +
    "      } " +
    "    } ";

  if (hasAuthenticationInsight) {
    mutation +=
      "    authenticationInsight(input: $authenticationInsightInput) {" +
      "      customerAuthenticationRegulationEnvironment" +
      "    }";
  }

  mutation += "  } }";

  return mutation;
}

function createCreditCardTokenizationBody(body, options) {
  var cc = body.creditCard;
  var billingAddress = cc && cc.billingAddress;
  var expDate = cc && cc.expirationDate;
  var expirationMonth =
    cc && (cc.expirationMonth || (expDate && expDate.split("/")[0].trim()));
  var expirationYear =
    cc && (cc.expirationYear || (expDate && expDate.split("/")[1].trim()));
  var variables = {
    input: {
      creditCard: {
        number: cc && cc.number,
        expirationMonth: expirationMonth,
        expirationYear: expirationYear,
        cvv: cc && cc.cvv,
        cardholderName: cc && cc.cardholderName,
      },
      options: {},
    },
  };

  if (options.hasAuthenticationInsight) {
    variables.authenticationInsightInput = {
      merchantAccountId: body.merchantAccountId,
    };
  }

  if (billingAddress) {
    variables.input.creditCard.billingAddress = billingAddress;
  }

  variables.input = addValidationRule(body, variables.input);

  return variables;
}

function addValidationRule(body, input) {
  var validate;

  if (
    body.creditCard &&
    body.creditCard.options &&
    typeof body.creditCard.options.validate === "boolean"
  ) {
    validate = body.creditCard.options.validate;
  } else if (
    (body.authorizationFingerprint && body.tokenizationKey) ||
    body.authorizationFingerprint
  ) {
    validate = true;
  } else if (body.tokenizationKey) {
    validate = false;
  }

  if (typeof validate === "boolean") {
    input.options = assign(
      {
        validate: validate,
      },
      input.options
    );
  }

  return input;
}

function creditCardTokenization(body) {
  var options = {
    hasAuthenticationInsight: Boolean(
      body.authenticationInsight && body.merchantAccountId
    ),
  };

  return {
    query: createMutation(options),
    variables: createCreditCardTokenizationBody(body, options),
    operationName: "TokenizeCreditCard",
  };
}

module.exports = creditCardTokenization;
