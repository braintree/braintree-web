/* eslint-disable camelcase */

"use strict";

const formatCardRequestData = require("../../../../src/hosted-fields/internal/format-card-request-data");

describe("formatCardRequestData", () => {
  it("does not include absent values", () => {
    const result = formatCardRequestData({});

    expect(result).toEqual({});
  });

  it("does not include non-allowed data", () => {
    const result = formatCardRequestData({ foo: "bar" });

    expect(result).toEqual({});
  });

  it("includes card number", () => {
    const result = formatCardRequestData({ number: "4111111111111111" });

    expect(result).toEqual({ number: "4111111111111111" });
  });

  it("ignores spaces and dashes in card number", () => {
    const result = formatCardRequestData({
      number: "411-111 111---111    1111-",
    });

    expect(result).toEqual({ number: "4111111111111111" });
  });

  it("includes expiration month", () => {
    const result = formatCardRequestData({ expirationMonth: "04" });

    expect(result).toEqual({ expiration_month: "04" });
  });

  it("formats 2-digit expiration years as 4-digit", () => {
    const result = formatCardRequestData({ expirationYear: "21" });

    expect(result).toEqual({ expiration_year: "2021" });
  });

  it("includes 4-digit expiration years", () => {
    const result = formatCardRequestData({ expirationYear: "2019" });

    expect(result).toEqual({ expiration_year: "2019" });
  });

  it("includes cvv", () => {
    const result = formatCardRequestData({ cvv: "123" });

    expect(result).toEqual({ cvv: "123" });
  });

  it("includes postal code", () => {
    const result = formatCardRequestData({ postalCode: "12345" });

    expect(result).toEqual({
      billing_address: {
        postal_code: "12345",
      },
    });
  });

  it("includes cardholder name", () => {
    const result = formatCardRequestData({ cardholderName: "First Last" });

    expect(result).toEqual({
      cardholderName: "First Last",
    });
  });

  it("includes all data", () => {
    const result = formatCardRequestData({
      cardholderName: "First Last",
      number: "4111111111111111",
      expirationMonth: "04",
      expirationYear: "21",
      cvv: "123",
      postalCode: "12345",
    });

    expect(result).toEqual({
      cardholderName: "First Last",
      number: "4111111111111111",
      expiration_month: "04",
      expiration_year: "2021",
      cvv: "123",
      billing_address: {
        postal_code: "12345",
      },
    });
  });
});
