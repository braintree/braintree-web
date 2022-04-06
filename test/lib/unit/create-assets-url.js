"use strict";

const { create } = require("../../../src/lib/create-assets-url");
const { fake } = require("../../helpers");

describe("createAssetsUrl", () => {
  it("defaults to production asset url if no authorization is passed", () => {
    expect(create()).toBe("https://assets.braintreegateway.com");
  });

  it("creates an assets url from a sandbox client token", () => {
    let clientToken;
    const decodedClientToken = JSON.parse(atob(fake.clientToken));

    decodedClientToken.environment = "sandbox";
    clientToken = btoa(JSON.stringify(decodedClientToken));

    expect(create(clientToken)).toBe("https://assets.braintreegateway.com");
  });

  it("creates an assets url from a production client token", () => {
    let clientToken;
    const decodedClientToken = JSON.parse(atob(fake.clientToken));

    decodedClientToken.environment = "production";
    clientToken = btoa(JSON.stringify(decodedClientToken));

    expect(create(clientToken)).toBe("https://assets.braintreegateway.com");
  });

  it("creates an assets url for production when client token does not include environment", () => {
    expect(create(fake.clientTokenWithoutEnvironment)).toBe(
      "https://assets.braintreegateway.com"
    );
  });

  it("creates an assets url from a sandbox tokenization key", () => {
    expect(create("sandbox_testing_merchant")).toBe(
      "https://assets.braintreegateway.com"
    );
  });

  it("creates an assets url from a production tokenization key", () => {
    expect(create("production_testing_merchant")).toBe(
      "https://assets.braintreegateway.com"
    );
  });
});
