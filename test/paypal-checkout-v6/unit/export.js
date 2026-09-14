import paypalCheckoutV6 from "../../../src/paypal-checkout-v6";
var VERSION = paypalCheckoutV6.VERSION;
var create = paypalCheckoutV6.create;
import { version as packageVersion } from "../../../package.json";

describe("export", function () {
  it("contains create", function () {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", function () {
    expect(VERSION).toBe(packageVersion);
  });
});
