"use strict";

var creditCardType = require("credit-card-type");

module.exports = function (number) {
  var results = creditCardType(number);

  results.forEach(function (card) {
    // NEXT_MAJOR_VERSION credit-card-type fixed the mastercard enum
    // but we still pass master-card in the braintree API
    // in a major version bump, we can remove this and
    // this will be mastercard instead of master-card
    if (card.type === "mastercard") {
      card.type = "master-card";
    }
  });

  return results;
};
