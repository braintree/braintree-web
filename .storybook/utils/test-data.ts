// Test credit card numbers (these are standard test numbers that don't process real payments)
export const TEST_CARDS = {
  visa: {
    number: "4111111111111111",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "Visa",
  },
  visaDebit: {
    number: "4117101010101010",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "Visa",
  },
  mastercard: {
    number: "5555555555554444",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "MasterCard",
  },
  mastercardDebit: {
    number: "5200828282828210",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "MasterCard",
  },
  amex: {
    number: "378282246310005",
    expirationDate: "12/27",
    cvv: "1234",
    postalCode: "12345",
    type: "American Express",
  },
  discover: {
    number: "6011111111111117",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "Discover",
  },
  jcb: {
    number: "3530111333300000",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "JCB",
  },
  maestro: {
    number: "6304000000000000",
    expirationDate: "12/27",
    cvv: "123",
    postalCode: "12345",
    type: "Maestro",
  },
} as const;
