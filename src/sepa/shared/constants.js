const _default = {
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

export const { REQUIRED_OPTIONS, BILLING_ADDRESS_OPTIONS, MANDATE_TYPE_ENUM } =
  _default;

export default _default;
