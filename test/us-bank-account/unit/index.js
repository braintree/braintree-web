"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create } = require("../../../src/us-bank-account");
const USBankAccount = require("../../../src/us-bank-account/us-bank-account");
const BraintreeError = require("../../../src/lib/braintree-error");
const { fake } = require("../../helpers");

describe("usBankAccount component", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.configuration.gatewayConfiguration.usBankAccount = {
      plaid: {
        publicKey: "abc123",
      },
    };

    testContext.fakeClient = fake.client({
      configuration: testContext.configuration,
    });
    testContext.fakeClient._request = jest.fn();
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.fakeClient);
  });

  describe("create", () => {
    it("verifies with basicComponentVerification", () => {
      const client = testContext.fakeClient;

      return create({
        client: client,
      }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith({
          name: "US Bank Account",
          client: client,
        });
      });
    });

    it("can create with an authorization instead of a client", () =>
      create({
        authorization: fake.clientToken,
        debug: true,
      }).then((instance) => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "US Bank Account",
        });

        expect(instance).toBeInstanceOf(USBankAccount);
      }));

    it("rejects with error when client does not have usBankAccount gateway configuration", () => {
      delete testContext.configuration.gatewayConfiguration.usBankAccount;

      return create({ client: testContext.fakeClient }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("US_BANK_ACCOUNT_NOT_ENABLED");
        expect(err.message).toBe("US bank account is not enabled.");
      });
    });

    it("creates a USBankAccount instance when called with a client", () =>
      create({ client: testContext.fakeClient }).then((usb) => {
        expect(usb).toBeInstanceOf(USBankAccount);
      }));
  });
});
