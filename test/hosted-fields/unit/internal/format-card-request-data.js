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

  it("includes postal code for billing address", () => {
    const result = formatCardRequestData({
      billingAddress: { postalCode: "12345" },
    });

    expect(result).toEqual({
      billing_address: {
        postal_code: "12345",
      },
    });
  });

  it("includes postal code for shipping address", () => {
    const result = formatCardRequestData({
      shippingAddress: { postalCode: "12345" },
    });

    expect(result).toEqual({
      shippingAddress: {
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

  it("includes phone number", () => {
    const result = formatCardRequestData({
      phone: { number: "3125551234" },
    });

    expect(result).toEqual({
      phone: {
        phoneNumber: "3125551234",
        countryPhoneCode: "",
        extensionNumber: "",
      },
    });
  });

  it("ignores spaces, slashes, and parens in phone numbers", () => {
    const result = formatCardRequestData({
      phone: { number: "(312) 555-1234" },
    });

    expect(result.phone.phoneNumber).toEqual("3125551234");
  });

  it("includes email", () => {
    const result = formatCardRequestData({ email: "test@test.com" });

    expect(result).toEqual({
      email: "test@test.com",
    });
  });

  it("includes connect checkout (Fastlane) metadata", () => {
    const result = formatCardRequestData({
      metadata: {
        connectCheckout: {
          termsAndConditionsVersion: "1",
          termsAndConditionsCountry: "UK",
          hasBuyerConsent: true,
          authAssertion: "test-auth-assertion",
        },
      },
    });

    expect(result).toEqual({
      fastlane: {
        terms_and_conditions_version: "1",
        terms_and_conditions_country: "UK",
        has_buyer_consent: true,
        auth_assertion: "test-auth-assertion",
      },
    });
  });

  it("excludes termsAndConditionsCountry from Connect (Fastlane) metadata if not sent", () => {
    const result = formatCardRequestData({
      metadata: {
        connectCheckout: {
          termsAndConditionsVersion: "1",
          hasBuyerConsent: true,
          authAssertion: "test-auth-assertion",
        },
      },
    });

    expect(result).toEqual({
      fastlane: {
        terms_and_conditions_version: "1",
        has_buyer_consent: true,
        auth_assertion: "test-auth-assertion",
      },
    });
  });

  it("includes all data", () => {
    const inputData = {
      cardholderName: "First Last",
      number: "4111111111111111",
      expirationMonth: "04",
      expirationYear: "21",
      cvv: "123",
      phone: {
        number: "312 555 1234",
        countryCode: "1",
        extension: "123",
      },
      billingAddress: {
        postalCode: "12345",
      },
      shippingAddress: {
        company: "Slugs R Us",
      },
      metadata: {
        connectCheckout: {
          termsAndConditionsCountry: "UK",
          termsAndConditionsVersion: "1",
          hasBuyerConsent: true,
          authAssertion: "test-auth-assertion",
        },
      },
    };
    const result = formatCardRequestData(inputData);

    expect(result).toEqual({
      cardholderName: "First Last",
      number: "4111111111111111",
      expiration_month: "04",
      expiration_year: "2021",
      cvv: "123",
      phone: {
        countryPhoneCode: "1",
        phoneNumber: "3125551234",
        extensionNumber: "123",
      },
      billing_address: {
        postal_code: "12345",
      },
      shippingAddress: {
        company: "Slugs R Us",
      },
      fastlane: {
        terms_and_conditions_country: "UK",
        terms_and_conditions_version: "1",
        has_buyer_consent: true,
        auth_assertion: "test-auth-assertion",
      },
    });
  });
});
