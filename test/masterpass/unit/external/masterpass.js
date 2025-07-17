"use strict";

jest.mock("../../../../src/lib/analytics");
jest.mock("../../../../src/lib/frame-service/external");

const Masterpass = require("../../../../src/masterpass/external/masterpass");
const { version: VERSION } = require("../../../../package.json");
const BraintreeError = require("../../../../src/lib/braintree-error");
const analytics = require("../../../../src/lib/analytics");
const frameService = require("../../../../src/lib/frame-service/external");
const methods = require("../../../../src/lib/methods");
const { fake, noop, yields, yieldsAsync } = require("../../../helpers");

describe("Masterpass", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.configuration.isDebug = true;
    testContext.configuration.gatewayConfiguration.masterpass = {
      merchantCheckoutId: "MERCHANT_ID",
      supportedNetworks: ["visa", "master"],
    };
    testContext.fakeClient = {
      getConfiguration: () => testContext.configuration,
      request: jest.fn().mockResolvedValue({}),
    };
    testContext.fakeFrameService = {
      close: jest.fn(),
      open: jest.fn(),
      focus: jest.fn(),
      redirect: jest.fn(),
      state: {},
      _bus: {
        on: jest.fn(),
      },
    };
    testContext.masterpass = new Masterpass({
      client: testContext.fakeClient,
    });
    testContext.masterpass._frameService = testContext.fakeFrameService;
  });

  describe("_initialize", () => {
    it("uses unminified assets in debug mode", () => {
      let masterpass;

      testContext.configuration.isDebug = true;
      masterpass = new Masterpass({
        client: testContext.fakeClient,
      });
      masterpass._frameService = testContext.fakeFrameService;

      jest.spyOn(frameService, "create").mockImplementation(yields());
      testContext.fakeClient.request.mockResolvedValue({ data: {} });

      return masterpass._initialize().then(() => {
        expect(frameService.create).toHaveBeenCalledTimes(1);
        expect(frameService.create.mock.calls[0][0]).toMatchObject({
          dispatchFrameUrl: `https://assets.braintreegateway.com/web/${VERSION}/html/dispatch-frame.html`,
          name: "braintreemasterpasslanding",
          openFrameUrl: `https://assets.braintreegateway.com/web/${VERSION}/html/masterpass-landing-frame.html`,
        });
      });
    });

    it("attaches a frame service to the instance", () => {
      const fakeService = { fakeService: true };

      delete testContext.masterpass._frameService;

      jest
        .spyOn(frameService, "create")
        .mockImplementation(yields(fakeService));
      testContext.fakeClient.request.mockResolvedValue({
        data: { bankData: "data" },
      });

      return testContext.masterpass._initialize().then(() => {
        expect(testContext.masterpass._frameService).toBe(fakeService);
      });
    });

    it("resolves the Masterpass instance", () => {
      const fakeService = { fakeService: true };

      jest
        .spyOn(frameService, "create")
        .mockImplementation(yields(fakeService));
      testContext.fakeClient.request.mockResolvedValue({
        data: { bankData: "data" },
      });

      return testContext.masterpass._initialize().then((instance) => {
        expect(instance).toBeInstanceOf(Masterpass);
      });
    });
  });

  describe("PopupBridge exists", () => {
    beforeEach(() => {
      window.popupBridge = {
        getReturnUrlPrefix: () => "testscheme://",
      };
    });

    afterEach(() => {
      delete window.popupBridge;
    });

    it("returns popupbridge callbackUrl", () => {
      const masterpass = new Masterpass({
        client: testContext.fakeClient,
      });

      expect(masterpass._callbackUrl).toBe("testscheme://return");
    });
  });

  describe("tokenize", () => {
    it("sets auth in progress to true", () => {
      testContext.masterpass.tokenize(
        {
          subtotal: "10.00",
          currencyCode: "USD",
        },
        noop
      );

      expect(testContext.masterpass._authInProgress).toBe(true);
    });

    describe("with popupbridge", () => {
      beforeEach(() => {
        window.popupBridge = {};
      });

      afterEach(() => {
        delete window.popupBridge;
      });

      it("resolves with nonce when tokenize is called", () => {
        const expectedPayload = {
          masterpassCards: [
            {
              nonce: "a-nonce",
              type: "MasterpassCard",
              description: "Ending in 22",
              details: {
                cardType: "MasterCard",
                lastTwo: "22",
              },
              billingAddress: {
                countryCodeAlpha2: "US",
                extendedAddress: " ",
                locality: "San Francisco",
                postalCode: "94107",
                region: "US-SF",
                streetAddress: "123 Townsend St",
              },
              consumed: false,
              threeDSecureInfo: null,
              shippingAddress: {
                countryCodeAlpha2: "US",
                extendedAddress: " ",
                locality: "San Francisco",
                postalCode: "94107",
                region: "US-SF",
                streetAddress: "123 Townsend St",
              },
            },
          ],
        };

        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(null, {
            queryItems: {
              mpstatus: "success",
              oauth_token: "token",
              oauth_verifier: "verifier",
              checkout_resource_url: "checkout-resource-url",
            },
          })
        );

        testContext.fakeClient.request.mockResolvedValue(expectedPayload);

        return testContext.masterpass
          .tokenize({
            subtotal: "10.00",
            currencyCode: "USD",
          })
          .then((payload) => {
            expect(payload).toEqual(expectedPayload.masterpassCards[0]);
          });
      });

      it("closes the popup after tokenization", () => {
        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(null, {
            queryItems: {
              mpstatus: "success",
              oauth_token: "token",
              oauth_verifier: "verifier",
              checkout_resource_url: "checkout-resource-url",
            },
          })
        );
        testContext.fakeClient.request.mockResolvedValue({
          masterpassCards: [
            {
              nonce: "a-nonce",
              type: "MasterpassCard",
              description: "Ending in 22",
            },
          ],
        });

        return testContext.masterpass
          .tokenize({
            subtotal: "10.00",
            currencyCode: "USD",
          })
          .then(() => {
            expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
          });
      });

      it("sends an analytics event when tokenize call resolves with nonce", () => {
        const expectedPayload = {
          masterpassCards: [],
        };

        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(null, {
            queryItems: {
              mpstatus: "success",
              oauth_token: "token",
              oauth_verifier: "verifier",
              checkout_resource_url: "checkout-resource-url",
            },
          })
        );

        testContext.fakeClient.request.mockResolvedValue(expectedPayload);

        return testContext.masterpass
          .tokenize({
            subtotal: "10.00",
            currencyCode: "USD",
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "masterpass.tokenization.success-popupbridge"
            );
          });
      });

      it("sends an analytics event when popup returns without required query parameters", () => {
        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(null, {})
        );

        return testContext.masterpass
          .tokenize({
            subtotal: "10.00",
            currencyCode: "USD",
          })
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "masterpass.tokenization.failed-popupbridge"
            );
          });
      });

      it("returns a BraintreeError when popupBridge returns a generic error", () => {
        const originalErr = new Error("foo");

        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(originalErr)
        );

        return testContext.masterpass
          .tokenize({
            subtotal: "10.00",
            currencyCode: "USD",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.details.originalError).toBe(originalErr);
          });
      });

      it("sends an analytics event when popup is closed by user", () => {
        const expectedError = new BraintreeError({
          type: "INTERNAL",
          code: "FRAME_SERVICE_FRAME_CLOSED",
          message: "Frame closed",
        });

        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(expectedError)
        );

        return testContext.masterpass
          .tokenize({
            subtotal: "10.00",
            currencyCode: "USD",
          })
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "masterpass.tokenization.closed-popupbridge.by-user"
            );
          });
      });
    });

    it("resolves with nonce when tokenize is called", () => {
      const expectedPayload = {
        masterpassCards: [
          {
            nonce: "a-nonce",
            type: "MasterpassCard",
            description: "Ending in 22",
            details: {
              cardType: "MasterCard",
              lastTwo: "22",
            },
            billingAddress: {
              countryCodeAlpha2: "US",
              extendedAddress: " ",
              locality: "San Francisco",
              postalCode: "94107",
              region: "US-SF",
              streetAddress: "123 Townsend St",
            },
            consumed: false,
            threeDSecureInfo: null,
            shippingAddress: {
              countryCodeAlpha2: "US",
              extendedAddress: " ",
              locality: "San Francisco",
              postalCode: "94107",
              region: "US-SF",
              streetAddress: "123 Townsend St",
            },
          },
        ],
      };

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      testContext.fakeClient.request.mockResolvedValue(expectedPayload);

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .then((payload) => {
          expect(payload).toEqual(expectedPayload.masterpassCards[0]);
        });
    });

    it("closes the popup after tokenization", () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );
      testContext.fakeClient.request.mockResolvedValue({
        masterpassCards: [
          {
            nonce: "a-nonce",
            type: "MasterpassCard",
            description: "Ending in 22",
          },
        ],
      });

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .then(() => {
          expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
        });
    });

    it.each([
      ['requires "subtotal"', "subtotal"],
      ['requires "currencyCode"', "currencyCode"],
      ["rejects if missing required options", false],
    ])("%s when calling tokenize", (s, option) => {
      let options = {
        subtotal: "10.00",
        currencyCode: "USD",
      };

      if (option) {
        delete options[option];
      } else {
        options = undefined;
      }

      return testContext.masterpass.tokenize(options).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION");
        expect(err.message).toBe("Missing required option for tokenize.");

        expect(testContext.fakeClient.request).not.toHaveBeenCalled();
      });
    });

    it("rejects with error if masterpass payment is already in progress", () => {
      testContext.masterpass._authInProgress = true;

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBeDefined();
          expect(err.message).toBe(
            "Masterpass tokenization is already in progress."
          );
        });
    });

    it("rejects with error if tokenize call fails with generic error", () => {
      const expectedError = new Error("foo");

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      testContext.fakeClient.request.mockRejectedValue(expectedError);

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBeDefined();
          expect(err.details.originalError).toBe(expectedError);
        });
    });

    it("rejects with error if tokenize call fails with BraintreeError", () => {
      const expectedError = new BraintreeError({
        type: "INTERNAL",
        code: "FOO",
        message: "foo",
      });

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      testContext.fakeClient.request.mockRejectedValue(expectedError);

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBe(expectedError);
        });
    });

    it("rejects with error if masterpass payment `mpstatus` is not `success`", () => {
      testContext.fakeClient.request.mockResolvedValue({});
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "failed",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(({ code }) => {
          expect(code).toBe("MASTERPASS_POPUP_CLOSED");
        });
    });

    it.each([
      [
        "oauth_verifier is missing",
        {
          oauth_token: "token",
          checkout_resource_url: "checkout-resource-url",
        },
      ],
      [
        'oauth_verifier is "null"',
        {
          oauth_token: "token",
          oauth_verifier: null,
          checkout_resource_url: "checkout-resource-url",
        },
      ],
      [
        'oauth_verifier is the string "null"',
        {
          oauth_token: "token",
          oauth_verifier: "null",
          checkout_resource_url: "checkout-resource-url",
        },
      ],
      [
        'oauth_token is "null"',
        {
          oauth_token: null,
          oauth_verifier: "oauth-verifier",
          checkout_resource_url: "checkout-resource-url",
        },
      ],
      [
        'checkout_resource is "null"',
        {
          oauth_token: "token",
          oauth_verifier: "oauth-verifier",
          checkout_resource_url: null,
        },
      ],
    ])("rejects with error if %s irrespective of mpstatus", (s, qualifier) => {
      testContext.fakeClient.request.mockResolvedValue({});
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          ...qualifier,
        })
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(({ code }) => {
          expect(code).toBe("MASTERPASS_POPUP_MISSING_REQUIRED_PARAMETERS");
        });
    });

    it("closes the popup when masterpass payment `mpstatus` is not `success`", () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "failed",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
        });
    });

    it("closes the popup when masterpass payment `mpstatus` is `success` but some params are missing", () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
        });
    });

    it("rejects with error if popup is closed before completion", () => {
      const expectedError = new BraintreeError({
        type: "INTERNAL",
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed",
      });

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(expectedError)
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("MASTERPASS_POPUP_CLOSED");
          expect(err.type).toBe("CUSTOMER");
          expect(err.message).toBe(
            "Customer closed Masterpass popup before authorizing."
          );
        });
    });

    it.each([
      [
        "",
        new BraintreeError({
          type: "INTERNAL",
          code: "FRAME_SERVICE_FRAME_OPEN_FAILED",
          message: "Frame closed",
        }),
      ],
      [
        "because of IE bug",
        new BraintreeError({
          type: "INTERNAL",
          code: "FRAME_SERVICE_FRAME_OPEN_FAILED_IE_BUG",
          message: "Frame closed",
        }),
      ],
    ])("rejects with error if popup fails to open %s", (s, expectedError) => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(expectedError)
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("MASTERPASS_POPUP_OPEN_FAILED");
          expect(err.type).toBe("MERCHANT");
          expect(err.message).toBe(
            "Masterpass popup failed to open. Make sure to tokenize in response to a user action, such as a click."
          );
          expect(err.details.originalError).toBe(expectedError);
        });
    });

    it("rejects with Braintree error if popup fails with generic error", () => {
      const genericError = new Error("Foo");

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(genericError)
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("MASTERPASS_FLOW_FAILED");
          expect(err.type).toBe("NETWORK");
          expect(err.message).toBe("Could not initialize Masterpass flow.");
          expect(err.details.originalError).toBe(genericError);
        });
    });

    it("rejects with wrapped BraintreeError when thrown generic errors", () => {
      const requestError = new Error("Foo");

      testContext.fakeClient.request.mockRejectedValue(requestError);

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.details.originalError).toBe(requestError);
        });
    });

    it("sends an analytics event if any masterpass payment params are missing", () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "success",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "masterpass.tokenization.closed.missing-payload"
          );
        });
    });

    it("sends an analytics event if masterpass payment `mpstatus` is not `success`", () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(null, {
          mpstatus: "failed",
          oauth_token: "token",
          oauth_verifier: "verifier",
          checkout_resource_url: "checkout-resource-url",
        })
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "masterpass.tokenization.closed.by-user"
          );
        });
    });

    it("sends an analytics event if customer closes window before completion", () => {
      const expectedError = new BraintreeError({
        type: "INTERNAL",
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed",
      });

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(expectedError)
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "masterpass.tokenization.closed.by-user"
          );
        });
    });

    it("sends an analytics event if popup fails to open", () => {
      const expectedError = new BraintreeError({
        type: "INTERNAL",
        code: "FRAME_SERVICE_FRAME_OPEN_FAILED",
        message: "Frame closed",
      });

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(expectedError)
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "masterpass.tokenization.failed.to-open"
          );
        });
    });

    it("sends an analytics event if popup fails with generic error", () => {
      const genericError = new Error("Foo");

      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync(genericError)
      );

      return testContext.masterpass
        .tokenize({
          subtotal: "10.00",
          currencyCode: "USD",
        })
        .catch(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.fakeClient,
            "masterpass.tokenization.failed"
          );
        });
    });

    describe("when loading page in popup", () => {
      beforeEach(() => {
        testContext.fakeClient.request.mockResolvedValue({
          masterpassCards: [{}],
        });
        testContext.fakeFrameService.open.mockImplementation(
          yieldsAsync(null, {
            mpstatus: "success",
            oauth_token: "token",
            oauth_verifier: "verifier",
            checkout_resource_url: "checkout-resource-url",
          })
        );
        testContext.options = {
          subtotal: "10.00",
          currencyCode: "USD",
        };
      });

      it("makes an api request for masterpass request token", () =>
        testContext.masterpass.tokenize(testContext.options).then(() => {
          expect(testContext.fakeClient.request).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: "masterpass/request_token",
              method: "post",
              data: {
                requestToken: {
                  originUrl: `${window.location.protocol}//${window.location.hostname}`,
                  subtotal: testContext.options.subtotal,
                  currencyCode: testContext.options.currencyCode,
                  callbackUrl: expect.stringMatching(
                    /^https:\/\/assets.braintreegateway.com\/web\/.*redirect-frame.html$/
                  ),
                },
              },
            })
          );
        }));

      it("reports expected error when network request for Masterpass request token fails with a generic error", () => {
        const expectedError = new Error("foo");

        testContext.fakeClient.request.mockRejectedValue(expectedError);

        return testContext.masterpass
          .tokenize(testContext.options)
          .catch(({ code, details }) => {
            expect(code).toBe("MASTERPASS_FLOW_FAILED");
            expect(details.originalError).toBe(expectedError);
          });
      });

      it("reports expected error when network request for Masterpass token fails with BraintreeError", () => {
        const expectedError = new BraintreeError({
          type: "INTERNAL",
          code: "FOO",
          message: "foo",
        });

        testContext.fakeClient.request.mockRejectedValue(expectedError);

        return testContext.masterpass
          .tokenize(testContext.options)
          .catch((err) => {
            expect(err).toBe(expectedError);
          });
      });

      it("reports expected error when network request for Masterpass request token fails with 422 status", () => {
        const expectedError = new Error("foo");

        expectedError.details = {
          httpStatus: 422,
        };

        testContext.fakeClient.request.mockRejectedValue(expectedError);

        return testContext.masterpass
          .tokenize(testContext.options)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.details.originalError).toBe(expectedError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("MASTERPASS_INVALID_PAYMENT_OPTION");
            expect(err.message).toBe("Masterpass payment options are invalid.");
          });
      });

      it("closes frame when network request for Masterpass request token fails", () => {
        testContext.fakeClient.request.mockRejectedValue(new Error("foo"));
        testContext.masterpass._createFrameOpenHandler = (resolve) => {
          resolve({});
        };

        return testContext.masterpass
          .tokenize(testContext.options)
          .catch(() => {
            expect(testContext.fakeFrameService.close).toHaveBeenCalledTimes(1);
          });
      });

      it("redirects frameService", () => {
        testContext.fakeClient.request.mockResolvedValue({
          requestToken: "token",
        });
        testContext.masterpass._createFrameOpenHandler = (resolve) => {
          resolve({});
        };

        return testContext.masterpass.tokenize(testContext.options).then(() => {
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledTimes(
            1
          );
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledWith(
            expect.stringMatching(
              /^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=sandbox&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/redirect-frame.html&merchantCheckoutId=MERCHANT_ID&allowedCardTypes=visa,master&version=v6$/
            )
          );
        });
      });

      it("redirects frameService with config", () => {
        const options = {
          currencyCode: "USD",
          subtotal: "1.00",
          config: {
            paramKey: "paramValue",
            allowedCardTypes: "visa",
            merchantCheckoutId: "OTHER_MERCHANT_ID",
          },
        };

        testContext.fakeClient.request.mockResolvedValue({
          requestToken: "token",
        });
        testContext.masterpass._createFrameOpenHandler = (resolve) => {
          resolve({});
        };

        return testContext.masterpass.tokenize(options).then(() => {
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledTimes(
            1
          );
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledWith(
            expect.stringMatching(
              /^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=sandbox&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/redirect-frame.html&merchantCheckoutId=OTHER_MERCHANT_ID&allowedCardTypes=visa&version=v6&paramKey=paramValue$/
            )
          );
        });
      });

      it("redirectUrl replaces default value with config", () => {
        const options = {
          currencyCode: "USD",
          subtotal: "1.00",
          config: {
            paramKey: "paramValue",
            version: "v7",
          },
        };

        testContext.fakeClient.request.mockResolvedValue({
          requestToken: "token",
        });
        testContext.masterpass._createFrameOpenHandler = (resolve) => {
          resolve({});
        };

        return testContext.masterpass.tokenize(options).then(() => {
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledTimes(
            1
          );
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledWith(
            expect.stringMatching(
              /^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=sandbox&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/redirect-frame.html&merchantCheckoutId=MERCHANT_ID&allowedCardTypes=visa,master&version=v7&paramKey=paramValue$/
            )
          );
        });
      });

      it("redirectUrl ignores config with function values", () => {
        const options = {
          currencyCode: "USD",
          subtotal: "1.00",
          config: {
            paramKey: "paramValue",
            badFunction: () => {},
          },
        };

        testContext.fakeClient.request.mockResolvedValue({
          requestToken: "token",
        });
        testContext.masterpass._createFrameOpenHandler = (resolve) => {
          resolve({});
        };

        return testContext.masterpass.tokenize(options).then(() => {
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledTimes(
            1
          );
          expect(testContext.fakeFrameService.redirect).toHaveBeenCalledWith(
            expect.stringMatching(
              /^https:\/\/assets.braintreegateway.com\/web\/.*\/masterpass-loading-frame.html\?environment=sandbox&requestToken=token&callbackUrl=https:\/\/assets.braintreegateway.com\/web\/.*\/redirect-frame.html&merchantCheckoutId=MERCHANT_ID&allowedCardTypes=visa,master&version=v6&paramKey=paramValue$/
            )
          );
        });
      });
    });
  });

  describe("closeWindow", () => {
    it("calls the frame service close function", () => {
      testContext.masterpass._closeWindow();

      expect(testContext.masterpass._frameService.close).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe("teardown", () => {
    beforeEach(() => {
      testContext.frameServiceInstance = { teardown: jest.fn() };
      testContext.fakeClient.request.mockResolvedValue({});

      jest
        .spyOn(frameService, "create")
        .mockImplementation(yields(testContext.frameServiceInstance));
    });

    it("tears down the frame service", () => {
      const frameServiceInstance = testContext.frameServiceInstance;
      const masterpass = testContext.masterpass;

      return masterpass._initialize().then(() => {
        masterpass.teardown().then(() => {
          expect(frameServiceInstance.teardown).toHaveBeenCalled();
        });
      });
    });

    it("calls teardown analytic", () => {
      const masterpass = testContext.masterpass;

      return masterpass._initialize().then(() => {
        masterpass.teardown().then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            masterpass._client,
            "masterpass.teardown-completed"
          );
        });
      });
    });

    it("returns a promise", () => {
      const masterpass = testContext.masterpass;

      return masterpass
        ._initialize()
        .then()
        .then(() => {
          const teardown = masterpass.teardown();

          expect(teardown).resolves.toBeUndefined();
        });
    });

    it("does not require a callback", (done) => {
      const masterpass = testContext.masterpass;

      masterpass._initialize().then(() => {
        expect(() => {
          masterpass.teardown();
        }).not.toThrowError();
        done();
      });
    });

    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      const masterpass = testContext.masterpass;

      masterpass._initialize().then(() => {
        masterpass.teardown(() => {
          methods(Masterpass.prototype).forEach((method) => {
            let error;

            try {
              masterpass[method]();
            } catch (err) {
              error = err;
            }

            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe(BraintreeError.types.MERCHANT);
            expect(error.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(error.message).toBe(
              `${method} cannot be called after teardown.`
            );
          });

          done();
        });
      });
    });
  });
});
