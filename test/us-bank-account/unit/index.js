vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/lib/create-deferred-client");

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import _e5 from "../../../src/us-bank-account";

const { create } = _e5;

import USBankAccount from "../../../src/us-bank-account/us-bank-account";
import BraintreeError from "../../../src/lib/braintree-error";
import { fake } from "../../helpers";

describe("usBankAccount component", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.configuration.gatewayConfiguration.usBankAccount = {
      routeId: "route_id",
    };

    testContext.fakeClient = fake.client({
      configuration: testContext.configuration,
    });
    testContext.fakeClient._request = vi.fn();
    vi.spyOn(createDeferredClient, "create").mockResolvedValue(
      testContext.fakeClient
    );
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
