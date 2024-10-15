"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/sepa/external/mandate");

const SEPA = require("../../../src/sepa/external/sepa");
const { fake } = require("../../helpers");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const BraintreeError = require("../../../src/lib/braintree-error");
const sepaErrors = require("../../../src/sepa/shared/errors");
const mandates = require("../../../src/sepa/external/mandate");
const analytics = require("../../../src/lib/analytics");
const VERSION = process.env.npm_package_version;

describe("sepa.js", () => {
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

  describe("Constructor", () => {
    it("maps provided options to instance property", async () => {
      const sepaInst = new SEPA({
        client: testContext.client,
      });

      expect(sepaInst._client).toEqual(testContext.client);
    });

    it("sends initialization analytics event", async () => {
      new SEPA({ client: testContext.client });

      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "sepa.component.initialized"
      );
    });
  });

  describe("tokenize()", () => {
    let requiredInputs, sepaInputs;
    const merchantId = "some-merchant-id";
    const mockNonce = "8d8811e9-8cb0-04f5-74f0-32ddb5d9b5a5";

    beforeAll(() => {
      jest.clearAllMocks();
    });

    beforeEach(() => {
      requiredInputs = {
        accountHolderName: "cthulhu",
        customerId: "666",
        iban: "123456789",
        mandateType: "ONE_OFF", // OR "RECURRENT"
        countryCode: "DE",
        merchantAccountId: "merchantid1235",
      };
      jest.spyOn(mandates, "createMandate").mockImplementation(() =>
        Promise.resolve({
          approvalUrl: "https://some-mandate-destination.com/authorizenstuff",
          last4: "6608",
          bankReferenceToken: "QkEtS1JWVzMyNjYzRkYyUQ",
        })
      );
      jest.spyOn(mandates, "openPopup").mockImplementation(() => {
        return Promise.resolve();
      });
      jest.spyOn(mandates, "handleApproval").mockImplementation(() => {
        return Promise.resolve({
          nonce: mockNonce,
          ibanLastFour: requiredInputs.iban.slice(-4),
          customerId: requiredInputs.customerId,
          mandateType: requiredInputs.mandateType,
        });
      });
      jest
        .spyOn(mandates, "handleApprovalForFullPageRedirect")
        .mockImplementation(() => {
          return Promise.resolve({
            nonce: mockNonce,
            ibanLastFour: requiredInputs.iban.slice(-4),
            customerId: requiredInputs.customerId,
            mandateType: requiredInputs.mandateType,
          });
        });
      sepaInputs = {
        client: testContext.client,
        merchantId,
      };
    });

    it("uses callback when supplied", (done) => {
      const sepaInstance = new SEPA(sepaInputs);
      const expectedResponse = {
        nonce: mockNonce,
        ibanLastFour: requiredInputs.iban.slice(-4),
        customerId: requiredInputs.customerId,
        mandateType: requiredInputs.mandateType,
      };

      sepaInstance.tokenize(requiredInputs, function (err, payload) {
        expect(payload).toEqual(expectedResponse);
        done();
      });
    });

    const inputs = [
      ["accountHolderName"],
      ["customerId"],
      ["iban"],
      ["mandateType"],
      ["countryCode"],
      ["merchantAccountId"],
    ];

    it.each(inputs)(
      "fails if a required option is missing param %s",
      (param1) => {
        delete requiredInputs[param1];

        expect.assertions(5);
        const sepaInstance = new SEPA(sepaInputs);

        return sepaInstance.tokenize(requiredInputs).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toEqual(
            sepaErrors.SEPA_TOKENIZE_MISSING_REQUIRED_OPTION.type
          );
          expect(err.code).toEqual(
            sepaErrors.SEPA_TOKENIZE_MISSING_REQUIRED_OPTION.code
          );
          expect(err.message).toEqual(
            sepaErrors.SEPA_TOKENIZE_MISSING_REQUIRED_OPTION.message
          );
          expect(analytics.sendEvent).toBeCalledWith(
            sepaInputs.client,
            "sepa.input-validation.missing-options"
          );
        });
      }
    );

    it("fails if mandate_type is not ONE_OFF or RECURRENT", () => {
      expect.assertions(5);
      const sepaInstance = new SEPA(sepaInputs);

      requiredInputs.mandateType = "a-bogus-mandate";

      return sepaInstance.tokenize(requiredInputs).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_INVALID_MANDATE_TYPE.type);
        expect(err.code).toEqual(sepaErrors.SEPA_INVALID_MANDATE_TYPE.code);
        expect(err.message).toEqual(
          sepaErrors.SEPA_INVALID_MANDATE_TYPE.message
        );
        expect(analytics.sendEvent).toBeCalledWith(
          sepaInputs.client,
          "sepa.input-validation.invalid-mandate"
        );
      });
    });

    it("should create a mandate succesfully", async () => {
      const expectedArgs = {
        ...requiredInputs,
        returnUrl:
          testContext.configuration.gatewayConfiguration.assetsUrl +
          "/web/" +
          VERSION +
          "/html/redirect-frame.html?success=1",
        cancelUrl:
          testContext.configuration.gatewayConfiguration.assetsUrl +
          "/web/" +
          VERSION +
          "/html/redirect-frame.html?cancel=1",
      };

      const sepaInstance = new SEPA(sepaInputs);

      await sepaInstance.tokenize(requiredInputs);

      const client = testContext.client;

      expect(mandates.createMandate).toBeCalledWith(client, expectedArgs);
      expect(analytics.sendEvent).toBeCalledWith(
        sepaInputs.client,
        "sepa.create-mandate.success"
      );
    });

    it("should create a mandate with locale and billing address when included", async () => {
      const optionalInputs = {
        locale: "fr_XC",
        billingAddress: {
          addressLine1: "333 w 35th ST",
          addressLine2: "Suit 223",
          adminArea1: "IL",
          adminArea2: "Chicago",
          postalCode: "60606",
          countryCode: "US",
        },
      };
      const expectedArgs = {
        ...requiredInputs,
        ...optionalInputs,
        returnUrl:
          testContext.configuration.gatewayConfiguration.assetsUrl +
          "/web/" +
          VERSION +
          "/html/redirect-frame.html?success=1",
        cancelUrl:
          testContext.configuration.gatewayConfiguration.assetsUrl +
          "/web/" +
          VERSION +
          "/html/redirect-frame.html?cancel=1",
      };

      const sepaInstance = new SEPA(sepaInputs);

      await sepaInstance.tokenize({ ...requiredInputs, ...optionalInputs });

      const client = testContext.client;

      expect(mandates.createMandate).toBeCalledWith(client, expectedArgs);
      expect(analytics.sendEvent).toBeCalledWith(
        sepaInputs.client,
        "sepa.create-mandate.success"
      );
    });

    it("opens the mandate in popup", async () => {
      const sepaInstance = new SEPA(sepaInputs);

      await sepaInstance.tokenize(requiredInputs);

      const approvalUrl =
        "https://some-mandate-destination.com/authorizenstuff";
      const mockAssetUrl = "https://assets.braintreegateway.com/web/" + VERSION;
      const inputOpts = {
        approvalUrl,
        assetsUrl: mockAssetUrl,
      };

      expect(mandates.openPopup).toBeCalledWith(testContext.client, inputOpts);
    });

    it("handles failures in the popup portion", async () => {
      try {
        jest.spyOn(mandates, "openPopup").mockImplementation(() => {
          return Promise.reject(
            new BraintreeError(sepaErrors.SEPA_TOKENIZATION_FAILED)
          );
        });
        const sepaInstance = new SEPA(sepaInputs);

        await sepaInstance.tokenize(requiredInputs);
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_TOKENIZATION_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_TOKENIZATION_FAILED.code);
        expect(err.message).toEqual(
          sepaErrors.SEPA_TOKENIZATION_FAILED.message
        );
        expect(err.details).toEqual(
          sepaErrors.SEPA_TOKENIZATION_FAILED.details
        );
        expect(analytics.sendEvent).toBeCalledWith(
          sepaInputs.client,
          `sepa.${sepaErrors.SEPA_TOKENIZATION_FAILED.details}.failed`
        );
      }
    });

    it("should complete tokenize process sucessfuly", async () => {
      const expectedResponse = {
        nonce: mockNonce,
        ibanLastFour: requiredInputs.iban.slice(-4),
        customerId: requiredInputs.customerId,
        mandateType: requiredInputs.mandateType,
      };
      const sepaInstance = new SEPA(sepaInputs);

      // Called when you make a new SEPA
      expect(analytics.sendEvent).toBeCalledWith(
        sepaInputs.client,
        "sepa.component.initialized"
      );

      const data = await sepaInstance.tokenize(requiredInputs);

      expect(data).toEqual(expectedResponse);
      expect(analytics.sendEvent).toBeCalledWith(
        sepaInputs.client,
        "sepa.create-mandate.success"
      );
    });

    it("should failed tokenize process at handleApproval", async () => {
      try {
        jest.spyOn(mandates, "handleApproval").mockImplementation(() => {
          return Promise.reject(
            new BraintreeError(sepaErrors.SEPA_TRANSACTION_FAILED)
          );
        });

        const sepaInstance = new SEPA(sepaInputs);

        await sepaInstance.tokenize(requiredInputs);
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.code);
        expect(err.message).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.message);
        expect(err.details).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.details);
        expect(analytics.sendEvent).toBeCalledWith(
          sepaInputs.client,
          `sepa.${sepaErrors.SEPA_TRANSACTION_FAILED.details}.failed`
        );
      }
    });

    it("fails if create mandate errors", async () => {
      jest.spyOn(mandates, "createMandate").mockImplementation(() => {
        return Promise.reject(
          new BraintreeError(sepaErrors.SEPA_CREATE_MANDATE_FAILED)
        );
      });

      try {
        const sepaInstance = new SEPA(sepaInputs);

        await sepaInstance.tokenize(requiredInputs);
      } catch (err) {
        expect(err.message).toEqual(
          sepaErrors.SEPA_CREATE_MANDATE_FAILED.message
        );
        expect(analytics.sendEvent).toBeCalledWith(
          sepaInputs.client,
          `sepa.${sepaErrors.SEPA_CREATE_MANDATE_FAILED.details}.failed`
        );
      }
    });
  });
});
