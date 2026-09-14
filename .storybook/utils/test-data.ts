const expDate = "12/" + (new Date().getFullYear() + 3);

// Test credit card numbers (these are standard test numbers that don't process real payments)
export const TEST_CARDS = {
  threedsWithoutVerification: {
    number: "4000000000001000",
    cvv: "123",
    expirationDate: expDate,
    postalCode: "12345",
  },
  threedsWithVerification: {
    number: "4000000000001091",
    cvv: "123",
    expirationDate: expDate,
    postalCode: "12345",
  },
  threedsVerificationFails: {
    number: "4000000000000002",
    cvv: "123",
    expirationDate: expDate,
    postalCode: "12345",
  },
  visa: {
    number: "4111111111111111",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "Visa",
  },
  visaDebit: {
    number: "4117101010101010",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "Visa",
  },
  mastercard: {
    number: "5555555555554444",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "MasterCard",
  },
  mastercardDebit: {
    number: "5200828282828210",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "MasterCard",
  },
  amex: {
    number: "378282246310005",
    expirationDate: expDate,
    cvv: "1234",
    postalCode: "12345",
    type: "American Express",
  },
  discover: {
    number: "6011111111111117",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "Discover",
  },
  jcb: {
    number: "3530111333300000",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "JCB",
  },
  maestro: {
    number: "6304000000000000",
    expirationDate: expDate,
    cvv: "123",
    postalCode: "12345",
    type: "Maestro",
  },
} as const;
