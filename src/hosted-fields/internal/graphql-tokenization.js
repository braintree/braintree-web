// @ts-nocheck
import { assign } from "../../lib/assign";
import BraintreeError from "../../lib/braintree-error";

var CARD_BRAND_MAP = {
  AMERICAN_EXPRESS: "American Express",
  DINERS: "Discover",
  DISCOVER: "Discover",
  ELO: "Elo",
  HIPER: "Hiper",
  HIPERCARD: "Hipercard",
  INTERNATIONAL_MAESTRO: "Maestro",
  JCB: "JCB",
  MASTERCARD: "MasterCard",
  UK_MAESTRO: "Maestro",
  VISA: "Visa",
};

var BIN_DATA_MAP = {
  YES: "Yes",
  NO: "No",
  UNKNOWN: "Unknown",
};

var AUTHENTICATION_INSIGHT_MAP = {
  PSDTWO: "psd2",
};

var ADDRESS_FIELD_MAP = {
  first_name: "firstName", // eslint-disable-line camelcase
  last_name: "lastName", // eslint-disable-line camelcase
  company: "company",
  country_code_numeric: "countryCodeNumeric", // eslint-disable-line camelcase
  country_code_alpha2: "countryCodeAlpha2", // eslint-disable-line camelcase
  country_code_alpha3: "countryCodeAlpha3", // eslint-disable-line camelcase
  country_name: "countryName", // eslint-disable-line camelcase
  extended_address: "extendedAddress", // eslint-disable-line camelcase
  locality: "locality",
  region: "region",
  postal_code: "postalCode", // eslint-disable-line camelcase
  street_address: "streetAddress", // eslint-disable-line camelcase
};

var CREDIT_CARD_DETAILS_FIELDS =
  "bin " +
  "brandCode " +
  "last4 " +
  "cardholderName " +
  "expirationMonth " +
  "expirationYear " +
  "binData { " +
  "  prepaid " +
  "  healthcare " +
  "  debit " +
  "  durbinRegulated " +
  "  commercial " +
  "  payroll " +
  "  issuingBank " +
  "  countryOfIssuance " +
  "  productId " +
  "  business " +
  "  consumer " +
  "  purchase " +
  "  corporate " +
  "} ";

function isFastlaneTokenization(creditCardDetails) {
  return Boolean(creditCardDetails && creditCardDetails.fastlane);
}

function buildAddressVariables(address) {
  var formatted;

  if (!address) {
    return null;
  }

  formatted = {};

  Object.keys(ADDRESS_FIELD_MAP).forEach(function (snakeKey) {
    if (address[snakeKey] != null) {
      formatted[ADDRESS_FIELD_MAP[snakeKey]] = address[snakeKey];
    }
  });

  return formatted;
}

function buildCreditCardInput(creditCardDetails) {
  var input = {
    number: creditCardDetails.number,
    expirationMonth: creditCardDetails.expiration_month,
    expirationYear: creditCardDetails.expiration_year,
    cvv: creditCardDetails.cvv,
    cardholderName: creditCardDetails.cardholderName,
  };
  var billingAddress = buildAddressVariables(creditCardDetails.billing_address);

  if (billingAddress) {
    input.billingAddress = billingAddress;
  }

  return input;
}

function buildFastlaneFields(creditCardDetails) {
  var fastlane = creditCardDetails.fastlane || {};
  var shippingAddress = buildAddressVariables(
    creditCardDetails.shippingAddress
  );
  var fields = {
    email: creditCardDetails.email,
    optIn: fastlane.has_buyer_consent || false,
    phone: creditCardDetails.phone,
    authAssertion: fastlane.auth_assertion,
  };

  if ("terms_and_conditions_version" in fastlane) {
    fields.termsAndConditionsVersion = fastlane.terms_and_conditions_version;
  }

  if ("terms_and_conditions_country" in fastlane) {
    fields.termsAndConditionsCountry = fastlane.terms_and_conditions_country;
  }

  if (shippingAddress) {
    fields.shippingAddress = shippingAddress;
  }

  return fields;
}

function buildCreditCardMutation(hasAuthenticationInsight) {
  var mutation = "mutation TokenizeCreditCard($input: TokenizeCreditCardInput!";

  if (hasAuthenticationInsight) {
    mutation += ", $authenticationInsightInput: AuthenticationInsightInput!";
  }

  mutation +=
    ") { " +
    "  tokenizeCreditCard(input: $input) { " +
    "    token " +
    "    creditCard { " +
    CREDIT_CARD_DETAILS_FIELDS +
    "    } ";

  if (hasAuthenticationInsight) {
    mutation +=
      "    authenticationInsight(input: $authenticationInsightInput) { " +
      "      customerAuthenticationRegulationEnvironment " +
      "    }";
  }

  mutation += "  } }";

  return mutation;
}

function buildCreditCardForFastlaneMutation(hasAuthenticationInsight) {
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
    CREDIT_CARD_DETAILS_FIELDS +
    "        } " +
    "      } " +
    "    } ";

  if (hasAuthenticationInsight) {
    mutation +=
      "    authenticationInsight(input: $authenticationInsightInput) { " +
      "      customerAuthenticationRegulationEnvironment " +
      "    }";
  }

  mutation += "  } }";

  return mutation;
}

/**
 * Builds the GraphQL query + variables for a Hosted Fields tokenize() call.
 * @ignore
 * @param {object} data The internal tokenization payload assembled by createTokenizationHandler.
 * @param {object} data.creditCard The formatted credit card details from format-card-request-data.js.
 * @param {boolean} [data.authenticationInsight] Whether authentication insight was requested.
 * @param {string} [data.merchantAccountId] The merchant account id to use for authentication insight.
 * @returns {object} `{ isFastlane, query, variables }`, ready to pass to `client.request({api: "graphQLApi", data: {query, variables}})`.
 */
function buildTokenizeCreditCardRequest(data) {
  var creditCardDetails = data.creditCard || {};
  var isFastlane = isFastlaneTokenization(creditCardDetails);
  var hasAuthenticationInsight = Boolean(
    data.authenticationInsight && data.merchantAccountId
  );
  var input = { creditCard: buildCreditCardInput(creditCardDetails) };
  var variables, query;

  if (
    creditCardDetails.options &&
    typeof creditCardDetails.options.validate === "boolean"
  ) {
    input.options = { validate: creditCardDetails.options.validate };
  }

  if (isFastlane) {
    query = buildCreditCardForFastlaneMutation(hasAuthenticationInsight);
    input = assign(input, buildFastlaneFields(creditCardDetails));
  } else {
    query = buildCreditCardMutation(hasAuthenticationInsight);
  }

  variables = { input: input };

  if (hasAuthenticationInsight) {
    variables.authenticationInsightInput = {
      merchantAccountId: data.merchantAccountId,
    };
  }

  return {
    isFastlane: isFastlane,
    query: query,
    variables: variables,
  };
}

function shapeBinData(binData) {
  var shaped;

  if (!binData) {
    return binData;
  }

  shaped = {};

  [
    "commercial",
    "debit",
    "durbinRegulated",
    "healthcare",
    "payroll",
    "prepaid",
  ].forEach(function (key) {
    shaped[key] = binData[key] ? BIN_DATA_MAP[binData[key]] : "Unknown";
  });

  [
    "issuingBank",
    "countryOfIssuance",
    "productId",
    "business",
    "consumer",
    "purchase",
    "corporate",
  ].forEach(function (key) {
    shaped[key] = binData[key] || "Unknown";
  });

  return shaped;
}

function shapeAuthenticationInsight(authenticationInsight) {
  var regulationEnvironment;

  if (!authenticationInsight) {
    return null;
  }

  regulationEnvironment =
    authenticationInsight.customerAuthenticationRegulationEnvironment;

  return {
    regulationEnvironment:
      AUTHENTICATION_INSIGHT_MAP[regulationEnvironment] ||
      regulationEnvironment.toLowerCase(),
  };
}

/**
 * Shapes a raw GraphQL tokenizeCreditCard(ForPayPalConnect) response into the
 * result object Hosted Fields returns from tokenize().
 * @ignore
 * @param {object} body The raw, parsed GraphQL response body.
 * @param {boolean} isFastlane Whether the Fastlane mutation was used.
 * @returns {object} `{ nonce, details, description, type, binData, authenticationInsight? }`.
 */
function shapeTokenizeResponse(body, isFastlane) {
  var data, creditCard, nonce, lastTwo, result, shapedInsight;

  if (isFastlane) {
    data = body.data.tokenizeCreditCardForPayPalConnect;
    creditCard = data.paymentMethod.details;
    nonce = data.paymentMethod.id;
  } else {
    data = body.data.tokenizeCreditCard;
    creditCard = data.creditCard;
    nonce = data.token;
  }

  lastTwo = creditCard.last4 ? creditCard.last4.substr(2, 4) : "";

  result = {
    nonce: nonce,
    details: {
      cardholderName: creditCard.cardholderName,
      expirationMonth: creditCard.expirationMonth,
      expirationYear: creditCard.expirationYear,
      bin: creditCard.bin || "",
      cardType: CARD_BRAND_MAP[creditCard.brandCode] || "Unknown",
      lastFour: creditCard.last4 || "",
      lastTwo: lastTwo,
    },
    description: lastTwo ? "ending in " + lastTwo : "",
    type: "CreditCard",
    binData: shapeBinData(creditCard.binData),
  };

  shapedInsight = shapeAuthenticationInsight(data.authenticationInsight);

  if (shapedInsight) {
    result.authenticationInsight = shapedInsight;
  }

  return result;
}

/**
 * Extracts the legacy numeric Braintree error code from a rejected
 * client.request({api: "graphQLApi"}) error, if one is present.
 * @ignore
 * @param {BraintreeError} err The error rejected by client.request.
 * @returns {(string|undefined)} The legacy error code (e.g. "81724"), or undefined if not present.
 */
function extractLegacyErrorCode(err) {
  var rootError;

  try {
    rootError = BraintreeError.findRootError(err);

    return rootError[0].extensions.legacyCode;
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return undefined;
  }
}

export {
  buildTokenizeCreditCardRequest,
  shapeTokenizeResponse,
  extractLegacyErrorCode,
};

export default {
  buildTokenizeCreditCardRequest,
  shapeTokenizeResponse,
  extractLegacyErrorCode,
};
