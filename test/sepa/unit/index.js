"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/sepa/external/sepa");
jest.mock("../../../src/sepa/external/mandate");

const { fake } = require("../../helpers");
const { create } = require("../../../src/sepa");
const SEPA = require("../../../src/sepa/external/sepa");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const analytics = require("../../../src/lib/analytics");
const assign = require("../../../src/lib/assign").assign;
const mandate = require("../../../src/sepa/external/mandate");

describe("SEPA static methods", () => {
  describe("sepa.create", () => {
    let testContext;

    beforeEach(() => {
      testContext = {};
      testContext.configuration = fake.configuration();
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.client);
    });

    it("works with a callback when provided", (done) => {
      const expectedSepaInputs = {
        client: testContext.client,
      };

      create(expectedSepaInputs, function () {
        expect(SEPA).toBeCalledWith(expectedSepaInputs);
        done();
      });
    });

    it("verifies with basicComponentVerification", () =>
      create({
        client: testContext.client,
      }).then(() => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(
          basicComponentVerification.verify.mock.calls[0][0]
        ).toMatchObject({
          name: "SEPA",
          client: testContext.client,
        });
      }));

    it("can create with an authorization instead of a client", async () => {
      await create({
        authorization: fake.clientToken,
        debug: true,
      });
      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(
        createDeferredClient.create.mock.calls[0][0].client
      ).toBeUndefined();
      expect(createDeferredClient.create.mock.calls[0][0]).toMatchObject({
        authorization: fake.clientToken,
        debug: true,
        assetsUrl: "https://example.com/assets",
        name: "SEPA",
      });
    });

    it("provides SEPA instance with correct inputs", async () => {
      const expectedSepaInputs = {
        client: testContext.client,
      };

      await create(expectedSepaInputs);

      expect(SEPA).toBeCalledWith(expectedSepaInputs);
    });

    it("sends the initialized analytics events", async () => {
      await create({ client: testContext.client });
      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "sepa.client.initialized"
      );
    });

    it("when success=true and cart_id provided, should call handleApprovalForFullPageRedirect", async () => {
      const cartId = "12345";
      const prevUrl = window.location.href;

      mandate.handleApprovalForFullPageRedirect.mockImplementation(() => {
        return Promise.resolve();
      });

      Object.defineProperty(window, "location", {
        configurable: true,
        get() {
          return {
            href: "https://www.example.com?success=true&cart_id=" + cartId,
          };
        },
      });
      const options = {
        client: testContext.client,
        accountHolderName: "Jane Doe",
        iban: "1234567890101112131415",
        countryCode: "US",
        customerId: "1234567890",
        mandateType: "ONE_OFF",
        merchantAccountId: "9876543210",
      };

      await create(options);

      expect(mandate.handleApprovalForFullPageRedirect).toBeCalledWith(
        options.client,
        assign(options, { success: true, cart_id: cartId })
      );
      Object.defineProperty(window, "location", {
        configurable: true,
        get() {
          return { href: prevUrl };
        },
      });
    });
  });
});
