"use strict";

const { verify } = require("../../../src/lib/basic-component-verification");
const BraintreeError = require("../../../src/lib/braintree-error");
const sharedErrors = require("../../../src/lib/errors");

describe("basicComponentVerification", () => {
  it("resolves when client checks pass", () =>
    verify({
      name: "Component",
      client: {
        getVersion: jest.fn().mockReturnValue(process.env.npm_package_version),
      },
    }).catch(({ message }) => {
      expect(message).toBeFalsy();
    }));

  it("resolves when authorization checks pass", () =>
    verify({
      name: "Component",
      authorization: "auth",
    }).catch(({ message }) => {
      expect(message).toBeFalsy();
    }));

  it("rejects with an internal error if options are not provided", () =>
    verify().catch((err) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("INTERNAL");
      expect(err.code).toBe("INVALID_USE_OF_INTERNAL_FUNCTION");
      expect(err.message).toBe(
        "Options must be passed to basicComponentVerification function."
      );
    }));

  it("rejects with a braintree error if client or authorization are not provided", () =>
    verify({
      name: "Component",
    }).catch((err) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe(sharedErrors.INSTANTIATION_OPTION_REQUIRED.type);
      expect(err.code).toBe(sharedErrors.INSTANTIATION_OPTION_REQUIRED.code);
      expect(err.message).toBe(
        "options.client is required when instantiating Component."
      );
    }));

  it("rejects with a braintree error if no authorization is provided and client version does not match provided version", () =>
    verify({
      name: "Component",
      client: { getVersion: jest.fn().mockReturnValue("3.1.0") },
    }).catch((err) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe("MERCHANT");
      expect(err.code).toBe("INCOMPATIBLE_VERSIONS");
      expect(err.message).toBe(
        `Client (version 3.1.0) and Component (version ${process.env.npm_package_version}) components must be from the same SDK version.`
      );
    }));
});
