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
  BILLING_ADDRESS_OPTIONS: [
    "address_line_1",
    "address_line_2",
    "admin_area_1",
    "admin_area_2",
    "postal_code",
  ],
  MANDATE_TYPE_ENUM: ["ONE_OFF", "RECURRENT"],
};
