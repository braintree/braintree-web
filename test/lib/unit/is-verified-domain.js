"use strict";

const isVerifiedDomain = require("../../../src/lib/is-verified-domain");

describe("isVerifiedDomain", () => {
  it("returns false if a non-braintree non-paypal domain is used", () => {
    expect(isVerifiedDomain("https://google.com")).toBe(false);
  });

  it("returns true if a localhost is used", () => {
    expect(isVerifiedDomain("https://localhost")).toBe(true);
    expect(isVerifiedDomain("https://localhost:3099")).toBe(true);
  });

  it("returns false if a relative path is used", () => {
    expect(isVerifiedDomain("foobar/paypal/v1/payments/payment")).toBe(false);
    expect(isVerifiedDomain("foobar/braintreepayments.com")).toBe(false);
  });

  it("returns false if a invalid localhost domain is used", () => {
    expect(isVerifiedDomain("https://myfake.localhost.com:3099")).toBe(false);
    expect(
      isVerifiedDomain("https://braintreepayments.com.localhost.com:3099")
    ).toBe(false);
  });

  it("returns true if a braintree or paypal domain with capital letters is used", () => {
    expect(isVerifiedDomain("https://www.BraintreePayments.com")).toBe(true);
    expect(isVerifiedDomain("https://www.BraintreeGateway.com")).toBe(true);
    expect(isVerifiedDomain("https://www.Braintree-Api.com")).toBe(true);
  });

  it("returns true if a braintree domain is used", () => {
    expect(isVerifiedDomain("https://braintreepayments.com")).toBe(true);
    expect(isVerifiedDomain("https://www.braintreepayments.com")).toBe(true);
    expect(isVerifiedDomain("https://braintreegateway.com")).toBe(true);
    expect(isVerifiedDomain("https://www.braintreegateway.com")).toBe(true);
    expect(isVerifiedDomain("https://braintree-api.com")).toBe(true);
    expect(isVerifiedDomain("https://www.braintree-api.com")).toBe(true);
  });

  it("returns true if a paypal is used", () => {
    expect(isVerifiedDomain("https://paypal.com")).toBe(true);
    expect(isVerifiedDomain("https://www.paypal.com")).toBe(true);
  });

  it("returns true if a braintree domain with a port is used", () => {
    expect(isVerifiedDomain("https://www.braintreepayments.com:3000")).toBe(
      true
    );
    expect(isVerifiedDomain("https://www.braintreegateway.com:3000")).toBe(
      true
    );
    expect(isVerifiedDomain("https://www.braintree-api.com:3000")).toBe(true);
  });

  it("returns true if a braintree domain with multiple subdomains is used", () => {
    expect(isVerifiedDomain("https://foo.bar.baz.braintreepayments.com")).toBe(
      true
    );
    expect(isVerifiedDomain("https://foo.bar.baz.braintreegateway.com")).toBe(
      true
    );
    expect(isVerifiedDomain("https://foo.bar.baz.braintree-api.com")).toBe(
      true
    );
  });

  it("returns false if a braintree domain over http is used", () => {
    expect(isVerifiedDomain("http://www.braintreepayments.com:3000")).toBe(
      false
    );
    expect(isVerifiedDomain("http://www.braintreegateway.com:3000")).toBe(
      false
    );
    expect(isVerifiedDomain("http://www.braintree-api.com:3000")).toBe(false);
  });

  it("returns false if a non-braintree non-paypal domain is used with braintree in the path", () => {
    expect(isVerifiedDomain("https://braintreepayments.com.example.com")).toBe(
      false
    );
    expect(
      isVerifiedDomain("https://google.com/www.braintreepayments.com")
    ).toBe(false);
  });
});
