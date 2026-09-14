export type HostedFieldsBillingAddress = {
  company?: string;
  countryCodeAlpha2?: string;
  countryCodeAlpha3?: string;
  countryCodeNumeric?: string;
  countryName?: string;
  extendedAddress?: string;
  firstName?: string;
  lastName?: string;
  locality?: string;
  postalCode?: string;
  region?: string;
  streetAddress?: string;
};

export type HostedFieldsTokenizePayloadDetails = {
  bin?: string;
  cardType?: string;
  cardholderName?: string;
  expirationMonth?: string;
  expirationYear?: string;
  lastFour?: string;
  lastTwo?: string;
};

export type HostedFieldsTokenizePayload = {
  nonce: string;
  type: "CreditCard";
  description?: string;
  details: HostedFieldsTokenizePayloadDetails;
  authenticationInsight?: unknown;
  binData?: unknown;
};

export type HostedFieldsField =
  | "cardholderName"
  | "cvv"
  | "expirationDate"
  | "expirationMonth"
  | "expirationYear"
  | "number"
  | "postalCode";
