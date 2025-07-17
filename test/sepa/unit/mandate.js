"use strict";

const { fake } = require("../../helpers");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const {
  handleApprovalForFullPageRedirect,
  createMandate,
  openPopup,
  handleApproval,
  POPUP_HEIGHT,
  POPUP_WIDTH,
} = require("../../../src/sepa/external/mandate");
const BraintreeError = require("../../../src/lib/braintree-error");
const sepaErrors = require("../../../src/sepa/shared/errors");
const frameService = require("../../../src/lib/frame-service/external");
const { version: VERSION } = require("../../../package.json");
const analytics = require("../../../src/lib/analytics");

jest.mock("../../../src/lib/frame-service/external");
jest.mock("../../../src/lib/analytics");

describe("mandate.js", () => {
  let testContext;
  const merchantId = "dcpspy2brwdjr3qn";
  const approvalUrl = "https://some-mandate-destination.com/authorizenstuff";
  const bankReferenceToken = "QkEtS1JWVzMyNjYzRkYyUQ";
  const merchantAccountId = "merchantAccountId";
  const mandateType = "ONE_OFF";
  const customerId = "customerId";
  const iban = "486513615351";
  const nonce = "some-nonce";
  const input = {
    accountHolderName: "accountHolderName",
    customerId,
    iban,
    mandateType,
    countryCode: "countryCode",
    merchantAccountId,
    cancelUrl: "https://our-bt-asset.com?cancel=1",
    returnUrl: "https://our-bt-asset.com?success=1",
  };
  const mockMandateResponse = {
    message: {
      body: {
        sepaDebitAccount: {
          paypalV2OrderId: "58X72037CW605394N",
          approvalUrl,
          last4: iban.slice(-4),
          merchantOrPartnerCustomerId: customerId,
          bankReferenceToken,
          mandateType: mandateType,
        },
      },
      "success?": true,
    },
  };
  const payload = {
    customerId: "customerId",
    last4: iban.slice(-4),
    mandateType,
    bankReferenceToken,
    merchantAccountId,
  };
  const mockSepaSuccessResponse = {
    nonce: nonce,
  };

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

  describe("createMandate()", () => {
    it("makes the http request", async () => {
      testContext.client.request = jest.fn();

      testContext.client.request.mockResolvedValue(mockMandateResponse);

      const expectedResult = {
        approvalUrl,
        last4: iban.slice(-4),
        bankReferenceToken,
      };

      const result = await createMandate(testContext.client, merchantId, input);

      expect(result).toEqual(expectedResult);
    });

    it("includes optional params in http request, locale & billing addr", async () => {
      input.locale = "fr-XC";
      input.billingAddress = {
        addressLine1: "333 w 35th ST",
        addressLine2: "Suit 223",
        adminArea1: "IL",
        adminArea2: "Chicago",
        postalCode: "60606",
      };
      testContext.client.request = jest.fn();
      jest.spyOn(testContext.client, "request");

      testContext.client.request.mockResolvedValue(mockMandateResponse);
      const expectedResult = {
        approvalUrl,
        last4: iban.slice(-4),
        bankReferenceToken,
      };

      const result = await createMandate(testContext.client, input);

      expect(testContext.client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          // Disabling eslint because api is expecting snake_case format for the keys

          api: "clientApi",
          data: {
            cancel_url: expect.anything(),
            locale: "fr-XC",
            sepa_debit: {
              mandate_type: "ONE_OFF",
              merchant_or_partner_customer_id: customerId,
              iban: iban,
              account_holder_name: "accountHolderName",
              billing_address: {
                address_line_1: "333 w 35th ST",
                address_line_2: "Suit 223",
                admin_area_1: "IL",
                admin_area_2: "Chicago",
                postal_code: "60606",
                country_code: input.countryCode,
              },
            },
            merchant_account_id: expect.anything(),
            return_url: expect.anything(),
          },
          endpoint: expect.anything(),
          method: expect.anything(),
        })
      );
      expect(result).toEqual(expectedResult);

      delete input.billingAddress;
      delete input.locale;
    });

    it("includes optional params in http request, locale", async () => {
      input.locale = "fr-XC";

      testContext.client.request = jest.fn();
      jest.spyOn(testContext.client, "request");

      testContext.client.request.mockResolvedValue(mockMandateResponse);
      const expectedResult = {
        approvalUrl,
        last4: iban.slice(-4),
        bankReferenceToken,
      };

      const result = await createMandate(testContext.client, input);

      expect(testContext.client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          // Disabling eslint because api is expecting snake_case format for the keys

          api: "clientApi",
          data: {
            cancel_url: expect.anything(),
            locale: "fr-XC",
            sepa_debit: {
              mandate_type: "ONE_OFF",
              merchant_or_partner_customer_id: customerId,
              iban: iban,
              account_holder_name: "accountHolderName",
              billing_address: {
                country_code: input.countryCode,
              },
            },
            merchant_account_id: expect.anything(),
            return_url: expect.anything(),
          },
          endpoint: expect.anything(),
          method: expect.anything(),
        })
      );
      expect(result).toEqual(expectedResult);

      delete input.locale;
    });

    it("Client API return empty object", async () => {
      testContext.client.request = jest.fn();

      testContext.client.request.mockResolvedValue({});

      try {
        await createMandate(testContext.client, merchantId, input);
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_CREATE_MANDATE_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_CREATE_MANDATE_FAILED.code);
        expect(err.message).toEqual(
          sepaErrors.SEPA_CREATE_MANDATE_FAILED.message
        );
        expect(err.details).toEqual(
          sepaErrors.SEPA_CREATE_MANDATE_FAILED.details
        );
      }
    });

    it("sends Client API error when Client API fails", async () => {
      testContext.client.request = jest.fn();

      const fakeErr = new Error("it failed");

      testContext.client.request.mockRejectedValue(fakeErr);

      try {
        await createMandate(testContext.client, merchantId, input);
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_CREATE_MANDATE_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_CREATE_MANDATE_FAILED.code);
        expect(err.message).toEqual(
          sepaErrors.SEPA_CREATE_MANDATE_FAILED.message
        );
        expect(err.details).toEqual(
          sepaErrors.SEPA_CREATE_MANDATE_FAILED.details
        );
      }
    });
  });

  describe("openPopup()", () => {
    let mockFrameService;
    const mockAssetUrl = `https://someassetserver.gateway.com/web/${VERSION}`;
    const inputOpts = {
      approvalUrl,
      assetsUrl: mockAssetUrl,
      debug: false,
    };
    const mockSuccessParams = {
      success: 1,
    };
    const mockCancelParams = {
      cancel: 1,
    };

    beforeEach(() => {
      mockFrameService = {
        open: jest.fn().mockImplementation((obj, callback) => {
          return Promise.resolve(callback(undefined, mockSuccessParams));
        }),
        redirect: jest.fn(),
        close: jest.fn(),
        focus: jest.fn(),
      };
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });
    });

    it("opens a popup via frameservice with the correct args", async () => {
      const mockWindowOuterHeight = 1000;
      const mockWindowScreenTop = 10;
      const expectedTop = 225;

      window.outerHeight = mockWindowOuterHeight;
      window.screenTop = mockWindowScreenTop;
      const mockWindowOuterWidth = 1000;
      const mockWindowScreenLeft = 10;
      const expectedLeft = 310;

      window.outerWidth = mockWindowOuterWidth;
      window.screenLeft = mockWindowScreenLeft;
      const expectedDispatchFrameUrl = `${mockAssetUrl}/html/dispatch-frame.min.html`;
      const expectedOpenFrameUrl = `${mockAssetUrl}/html/sepa-landing-frame.min.html`;
      const expectedCreateArgs = {
        name: "sepadirectdebit",
        dispatchFrameUrl: expectedDispatchFrameUrl,
        openFrameUrl: expectedOpenFrameUrl,
        top: expectedTop,
        left: expectedLeft,
        height: POPUP_HEIGHT,
        width: POPUP_WIDTH,
      };

      await openPopup(testContext.client, inputOpts);

      expect(frameService.create).toBeCalledWith(
        expectedCreateArgs,
        expect.any(Function)
      );
    });

    it("minifies the assets if not in debug mode", async () => {
      const expectedMinified = ".min.html";
      const expectedArgs = {
        dispatchFrameUrl: expect.stringContaining(expectedMinified),
        openFrameUrl: expect.stringContaining(expectedMinified),
      };

      await openPopup(testContext.client, inputOpts);
      expect(frameService.create).toHaveBeenCalledWith(
        expect.objectContaining(expectedArgs),
        expect.any(Function)
      );
    });

    it("doesn't minify the assets when in debug mode", async () => {
      const expected = "frame.html";
      const expectedArgs = {
        dispatchFrameUrl: expect.stringContaining(expected),
        openFrameUrl: expect.stringContaining(expected),
      };
      const debugInputs = {
        ...inputOpts,
        debug: true,
      };

      await openPopup(testContext.client, debugInputs);
      expect(frameService.create).toHaveBeenCalledWith(
        expect.objectContaining(expectedArgs),
        expect.any(Function)
      );
    });

    it("opens a popup once frameService is created and redirects it to the SEPA url", async () => {
      await openPopup(testContext.client, inputOpts);

      expect(mockFrameService.open).toBeCalledWith({}, expect.any(Function));
      expect(mockFrameService.redirect).toBeCalledWith(approvalUrl);
      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "sepa.popup.initialized"
      );
    });

    it("resolves with a successful redirect", async () => {
      await expect(
        openPopup(testContext.client, inputOpts)
      ).resolves.not.toThrow();
      expect(mockFrameService.close).toBeCalled();
      expect(mockFrameService.redirect).toBeCalledWith(approvalUrl);
    });

    it("rejects when cancel redirect is used and closes popup", async () => {
      expect.assertions(6);
      mockFrameService.open = jest.fn((obj, callback) => {
        callback(undefined, mockCancelParams);
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      return openPopup(testContext.client, inputOpts).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.code);
        expect(err.message).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.message);
        expect(err.details).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.details);
        expect(mockFrameService.close).toBeCalled();
      });
    });

    it("cancels when when popup closed", async () => {
      expect.assertions(6);
      const emptyParams = {};
      const mockFrameServiceErr = {
        code: "FRAME_SERVICE_FRAME_CLOSED",
      };

      mockFrameService.open = jest.fn((obj, callback) => {
        callback(mockFrameServiceErr, emptyParams);
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      return openPopup(testContext.client, inputOpts).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.code);
        expect(err.message).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.message);
        expect(err.details).toEqual(sepaErrors.SEPA_CUSTOMER_CANCELED.details);
        expect(mockFrameService.close).toBeCalled();
      });
    });

    it("rejects when it neither cancels nor succeeds", async () => {
      expect.assertions(6);
      const emptyParams = {};

      mockFrameService.open = jest.fn((obj, callback) => {
        callback(undefined, emptyParams);
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      return openPopup(testContext.client, inputOpts).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_TOKENIZATION_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_TOKENIZATION_FAILED.code);
        expect(err.message).toEqual(
          sepaErrors.SEPA_TOKENIZATION_FAILED.message
        );
        expect(err.details).toEqual(
          sepaErrors.SEPA_TOKENIZATION_FAILED.details
        );
        expect(mockFrameService.close).toBeCalled();
      });
    });

    it("rejects when frameservice returns an error", async () => {
      expect.assertions(6);
      mockFrameService.open = jest.fn((obj, callback) => {
        callback("some error");
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      return openPopup(testContext.client, inputOpts).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_TOKENIZATION_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_TOKENIZATION_FAILED.code);
        expect(err.message).toEqual(
          sepaErrors.SEPA_TOKENIZATION_FAILED.message
        );
        expect(err.details).toEqual(
          sepaErrors.SEPA_TOKENIZATION_FAILED.details
        );
        expect(mockFrameService.close).toBeCalled();
      });
    });
  });

  describe("handleApproval()", () => {
    it("makes the http request", async () => {
      testContext.client.request = jest.fn();

      testContext.client.request.mockResolvedValue(mockSepaSuccessResponse);

      const expectedResult = {
        nonce,
        ibanLastFour: payload.last4,
        customerId: payload.customerId,
        mandateType: payload.mandateType,
      };

      const result = await handleApproval(testContext.client, payload);

      expect(result).toEqual(expectedResult);
    });

    it("Client API return empty object", async () => {
      testContext.client.request = jest.fn();

      testContext.client.request.mockResolvedValue({});

      try {
        await handleApproval(testContext.client, payload);
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.code);
        expect(err.message).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.message);
        expect(err.details).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.details);
      }
    });

    it("sends Client API error when Client API fails", async () => {
      testContext.client.request = jest.fn();

      const fakeErr = new Error("it failed");

      testContext.client.request.mockRejectedValue(fakeErr);

      try {
        await handleApproval(testContext.client, payload);
      } catch (err) {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.type);
        expect(err.code).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.code);
        expect(err.message).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.message);
        expect(err.details).toEqual(sepaErrors.SEPA_TRANSACTION_FAILED.details);
      }
    });
  });

  describe("handleApprovalForFullPageRedirect()", () => {
    it("sends expected events when successful", async () => {
      testContext.client.request = jest.fn();
      testContext.client.request
        .mockResolvedValueOnce({
          sepaDebitMandateDetail: {
            last4: iban.slice(-4),
            merchantOrPartnerCustomerId: customerId,
            mandateType: mandateType,
            bankReferenceToken: bankReferenceToken,
          },
        })
        .mockResolvedValueOnce(mockSepaSuccessResponse);

      await handleApprovalForFullPageRedirect(testContext.client, payload);

      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "sepa.redirect.mandate.approved"
      );
      expect(analytics.sendEvent).toBeCalledWith(
        testContext.client,
        "sepa.redirect.tokenization.success"
      );
    });
  });
});
