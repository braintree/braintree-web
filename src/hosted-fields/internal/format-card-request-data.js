/* eslint-disable camelcase */

"use strict";

function constructAddress(data) {
  var address = {
    company: data.company,
    country_code_numeric: data.countryCodeNumeric,
    country_code_alpha2: data.countryCodeAlpha2,
    country_code_alpha3: data.countryCodeAlpha3,
    country_name: data.countryName,
    extended_address: data.extendedAddress,
    locality: data.locality,
    region: data.region,
    first_name: data.firstName,
    last_name: data.lastName,
    postal_code: data.postalCode,
    street_address: data.streetAddress,
  };

  Object.keys(address).forEach(function (key) {
    if (address[key] == null) {
      delete address[key];
    }
  });

  return address;
}

module.exports = function (data) {
  var result = {};

  // connectCheckout are the tokenize options from the Fastlane SDK
  if ("metadata" in data && "connectCheckout" in data.metadata) {
    result.fastlane = {
      terms_and_conditions_version:
        "termsAndConditionsVersion" in data.metadata.connectCheckout
          ? data.metadata.connectCheckout.termsAndConditionsVersion
          : "",
      terms_and_conditions_country:
        "termsAndConditionsCountry" in data.metadata.connectCheckout
          ? data.metadata.connectCheckout.termsAndConditionsCountry
          : "",
      has_buyer_consent:
        "hasBuyerConsent" in data.metadata.connectCheckout
          ? data.metadata.connectCheckout.hasBuyerConsent
          : false,
      auth_assertion: data.metadata.connectCheckout.authAssertion,
    };
  }

  if ("billingAddress" in data) {
    result.billing_address = constructAddress(data.billingAddress);
  }

  if ("shippingAddress" in data) {
    result.shippingAddress = constructAddress(data.shippingAddress);
  }

  if ("phone" in data) {
    result.phone = {
      phoneNumber:
        "number" in data.phone && data.phone.number
          ? data.phone.number.replace(/(?:[\(]|[\)]|[-]|[\s])/g, "")
          : "",
      countryPhoneCode:
        "countryCode" in data.phone && data.phone.countryCode
          ? data.phone.countryCode
          : "",
      extensionNumber:
        "extension" in data.phone && data.phone.extension
          ? data.phone.extension
          : "",
    };
  }

  if ("email" in data) {
    result.email = data.email;
  }

  if ("number" in data) {
    result.number = data.number.replace(/[-\s]/g, "");
  }

  if ("cvv" in data) {
    result.cvv = data.cvv;
  }

  if ("expirationMonth" in data) {
    result.expiration_month = data.expirationMonth;
  }

  if ("expirationYear" in data) {
    if (data.expirationYear.length === 2) {
      result.expiration_year = "20" + data.expirationYear;
    } else {
      result.expiration_year = data.expirationYear;
    }
  }

  if ("cardholderName" in data) {
    result.cardholderName = data.cardholderName;
  }

  return result;
};
