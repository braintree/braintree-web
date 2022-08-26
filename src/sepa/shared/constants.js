"use strict";

module.exports = {
  REQUIRED_OPTIONS: [
    "iban",
    "merchantAccountId",
    "mandateType",
    "customerId",
    "accountHolderName",
    "countryCode",
  ],
  MANDATE_TYPE_ENUM: ["ONE_OFF", "RECURRENT"],
};
