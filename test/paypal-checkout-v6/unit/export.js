"use strict";

var paypalCheckoutV6 = require("../../../src/paypal-checkout-v6");
var VERSION = paypalCheckoutV6.VERSION;
var create = paypalCheckoutV6.create;
var packageVersion = require("../../../package.json").version;

describe("export", function () {
  it("contains create", function () {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", function () {
    expect(VERSION).toBe(packageVersion);
  });
});
