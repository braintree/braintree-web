"use strict";

const paymentRequest = require("../../../src/payment-request");
const { version: packageVersion } = require("../../../package.json");

describe("export", () => {
  it("contains create", () => {
    expect(paymentRequest.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(paymentRequest.VERSION).toBe(packageVersion);
  });
});
