const _default = {
  REQUIRED_OPTIONS_FOR_START_PAYMENT: [
    "givenName",
    "surname",
    "currencyCode",
    "paymentType",
    "amount",
    "fallback",
  ],
  REQUIRED_OPTIONS_FOR_PAY_UPON_INVOICE_PAYMENT_TYPE: [
    "givenName",
    "surname",
    "currencyCode",
    "onPaymentStart",
    "paymentType",
    "amount",
    "address",
    "billingAddress",
    "birthDate",
    "email",
    "locale",
    "customerServiceInstructions",
    "phone",
    "phoneCountryCode",
    "lineItems",
  ],
  REQUIRED_OPTIONS_FOR_ADDRESS: [
    "streetAddress",
    "locality",
    "postalCode",
    "countryCode",
  ],
  REQUIRED_OPTIONS_FOR_LINE_ITEMS: [
    "category",
    "name",
    "quantity",
    "unitAmount",
    "unitTaxAmount",
  ],
  REQUIRED_OPTIONS_FOR_BLIK_SEAMLESS_PAYMENT_TYPE: [
    "givenName",
    "surname",
    "currencyCode",
    "paymentType",
    "amount",
  ],
  REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_LEVEL_0: ["authCode"],
  REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_FIRST: [
    "authCode",
    "consumerReference",
    "aliasLabel",
  ],
  REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_SUBSEQUENT: [
    "consumerReference",
    "aliasKey",
  ],
};

export const {
  REQUIRED_OPTIONS_FOR_START_PAYMENT,
  REQUIRED_OPTIONS_FOR_PAY_UPON_INVOICE_PAYMENT_TYPE,
  REQUIRED_OPTIONS_FOR_ADDRESS,
  REQUIRED_OPTIONS_FOR_LINE_ITEMS,
  REQUIRED_OPTIONS_FOR_BLIK_SEAMLESS_PAYMENT_TYPE,
  REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_LEVEL_0,
  REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_FIRST,
  REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_SUBSEQUENT,
} = _default;

export default _default;
