"use strict";

var assign = require("../../../../lib/assign").assign;

function createMutation(config) {
  var hasAuthenticationInsight = config.hasAuthenticationInsight;
  var mutation =
    "mutation TokenizeCreditCardForPayPalConnect($input: TokenizeCreditCardForPayPalConnectInput!";

  if (hasAuthenticationInsight) {
    mutation += ", $authenticationInsightInput: AuthenticationInsightInput!";
  }

  mutation +=
    ") { " +
    "  tokenizeCreditCardForPayPalConnect(input: $input) { " +
    "    clientMutationId " +
    "    paymentMethod { " +
    "      id " +
    "      details { " +
    "        ... on CreditCardDetails { " +
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
    "        } " +
    "      } " +
    "    }";

  if (hasAuthenticationInsight) {
    mutation +=
      "    authenticationInsight(input: $authenticationInsightInput) {" +
      "      customerAuthenticationRegulationEnvironment" +
      "    }";
  }

  mutation += "  } }";

  return mutation;
}

function createCreditCardForFastlaneTokenizationBody(body, options) {
  var creditCard = body.creditCard;
  var fastlane = creditCard.fastlane || {};
  var termsAndConditionsVersion =
    "fastlane" in creditCard &&
    "termsAndConditionsVersion" in creditCard.fastlane &&
    creditCard.fastlane.termsAndConditionsVersion;
  var email = creditCard.email;
  var optIn = "hasBuyerConsent" in fastlane && fastlane.hasBuyerConsent;
  var shippingAddress = creditCard.shippingAddress;
  var variables = createCreditCardTokenizationBody(body, options);

  var ccpcVariables = assign({}, variables.input, {
    email: email,
    optIn: optIn,
    phone: creditCard.phone,
    termsAndConditionsVersion: termsAndConditionsVersion,
  });

  if ("authAssertion" in fastlane) {
    ccpcVariables.authAssertion = fastlane.authAssertion;
  }

  if (shippingAddress) {
    ccpcVariables.shippingAddress = shippingAddress;
  }

  return { input: ccpcVariables };
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

function creditCardForFastlaneTokenization(body) {
  var options = {
    hasAuthenticationInsight: Boolean(
      body.authenticationInsight && body.merchantAccountId
    ),
  };

  return {
    query: createMutation(options),
    variables: createCreditCardForFastlaneTokenizationBody(body, options),
    operationName: "TokenizeCreditCardForPayPalConnect",
  };
}

module.exports = creditCardForFastlaneTokenization;
