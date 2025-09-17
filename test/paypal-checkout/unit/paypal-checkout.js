"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const analytics = require("../../../src/lib/analytics");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const PayPalCheckout = require("../../../src/paypal-checkout/paypal-checkout");
const BraintreeError = require("../../../src/lib/braintree-error");
const frameService = require("../../../src/lib/frame-service/external");
const { fake, yieldsAsync } = require("../../helpers");
const methods = require("../../../src/lib/methods");
const errors = require("../../../src/paypal-checkout/errors");
const constants = require("../../../src/paypal/shared/constants");

describe("PayPalCheckout", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();

    testContext.configuration.authorizationFingerprint = "auth-fingerprint";
    testContext.configuration.gatewayConfiguration.paypalEnabled = true;
    testContext.configuration.gatewayConfiguration.paypal.environmentNoNetwork = false;
    testContext.configuration.gatewayConfiguration.paypal.clientId =
      "client-id";
    testContext.client = {
      request: jest.fn().mockResolvedValue({
        paymentResource: {
          paymentToken: "token",
          redirectUrl: "https://example.com?foo=bar&EC-token&foo2=bar2",
        },
        agreementSetup: { tokenId: "id" },
      }),
      getConfiguration: jest.fn().mockReturnValue(testContext.configuration),
    };
    testContext.fakeFrameService = {
      close: jest.fn(),
      focus: jest.fn(),
      open: jest.fn().mockImplementation(
        yieldsAsync(null, {
          token: "token",
          PayerID: "payer-id",
          paymentId: "payment-id",
        })
      ),
      teardown: jest.fn().mockResolvedValue(),
      redirect: jest.fn(),
      _serviceId: "service-id",
    };

    jest
      .spyOn(frameService, "create")
      .mockImplementation(yieldsAsync(testContext.fakeFrameService));
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.client);

    testContext.paypalCheckout = new PayPalCheckout({});

    return testContext.paypalCheckout._initialize({
      client: testContext.client,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("_initialize", () => {
    beforeEach(() => {
      testContext.options = {
        client: testContext.client,
      };

      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.client);
    });

    it("sends an analytics event on component creation", () => {
      const instance = new PayPalCheckout({});

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            testContext.client,
            "paypal-checkout.initialized"
          );
        });
    });

    it("errors out if paypal is not enabled for the merchant", () => {
      const instance = new PayPalCheckout({});

      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return instance
        ._initialize({
          client: testContext.client,
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYPAL_NOT_ENABLED");
          expect(err.message).toBe("PayPal is not enabled for this merchant.");
        });
    });

    it("ignores PayPal enabled check if merchantAccountId is passed in", () => {
      const instance = new PayPalCheckout({
        merchantAccountId: "id",
      });

      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then((pp) => {
          expect(pp).toBeInstanceOf(PayPalCheckout);
        });
    });

    it("errors out if paypal account is not linked in sandbox", () => {
      const instance = new PayPalCheckout({});

      testContext.configuration.gatewayConfiguration.paypal.environmentNoNetwork = true;

      return instance
        ._initialize({
          client: testContext.client,
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED");
          expect(err.message).toBe(
            "A linked PayPal Sandbox account is required to use PayPal Checkout in Sandbox. See https://developer.paypal.com/braintree/docs/guides/paypal/testing-go-live#linked-paypal-testing for details on linking your PayPal sandbox with Braintree."
          );
        });
    });

    it("ignores linked sandbox check if merchantAccountId is passed in", () => {
      const instance = new PayPalCheckout({
        merchantAccountId: "id",
      });

      testContext.configuration.gatewayConfiguration.paypal.environmentNoNetwork = true;

      return instance
        ._initialize({
          client: testContext.client,
        })
        .then((pp) => {
          expect(pp).toBeInstanceOf(PayPalCheckout);
        });
    });

    it("sets up the frame service", async () => {
      const instance = new PayPalCheckout({});

      // reset state from before each
      frameService.create.mockReset();

      await instance._initialize({ client: testContext.client });

      expect(frameService.create).toBeCalledTimes(1);
      expect(frameService.create).toBeCalledWith(
        {
          name: "braintreepaypallanding",
          dispatchFrameUrl: expect.stringMatching(
            "/html/dispatch-frame.min.html"
          ),
          openFrameUrl: expect.stringMatching(
            "/html/paypal-landing-frame.min.html"
          ),
        },
        expect.any(Function)
      );
    });

    it("resolves with paypalCheckoutInstance", () => {
      const instance = new PayPalCheckout({});

      return instance._initialize({ client: testContext.client }).then((pp) => {
        expect(pp).toBeInstanceOf(PayPalCheckout);
      });
    });
  });

  describe("createPayment", () => {
    it.each([
      ["missing", null],
      ["incomplete", {}],
      ["invalid", { flow: "bar" }],
    ])("rejects with error if options are %s", (s, options) =>
      testContext.paypalCheckout.createPayment(options).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("PAYPAL_FLOW_OPTION_REQUIRED");
        expect(err.message).toBe("PayPal flow property is invalid or missing.");
      })
    );

    it("rejects with a network BraintreeError on gateway 422 errors", () => {
      const gateway422Error = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: "CLIENT_REQUEST_ERROR",
        message: "There was a problem with your request.",
        details: { httpStatus: 422 },
      });

      testContext.client.request.mockRejectedValue(gateway422Error);

      return testContext.paypalCheckout
        .createPayment({ flow: "vault" })
        .catch(({ code, details, message, type }) => {
          expect(type).toBe(BraintreeError.types.MERCHANT);
          expect(code).toBe("PAYPAL_INVALID_PAYMENT_OPTION");
          expect(message).toBe("PayPal payment options are invalid.");
          expect(details).toEqual({
            originalError: gateway422Error,
          });
        });
    });

    it("rejects with a network BraintreeError on other gateway errors", () => {
      const gatewayError = new Error("There was a problem with your request.");

      gatewayError.details = { httpStatus: 400 };

      testContext.client.request.mockRejectedValue(gatewayError);

      return testContext.paypalCheckout
        .createPayment({ flow: "vault" })
        .catch(({ code, details, message, type }) => {
          expect(type).toBe(BraintreeError.types.NETWORK);
          expect(code).toBe("PAYPAL_FLOW_FAILED");
          expect(message).toBe("Could not initialize PayPal flow.");
          expect(details).toEqual({
            originalError: gatewayError,
          });
        });
    });

    it("rejects with the Braintree error when client request returns a Braintree error", () => {
      const gatewayError = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: "CLIENT_REQUEST_ERROR",
        message: "There was a problem with your request.",
        details: { httpStatus: 400 },
      });

      testContext.client.request.mockRejectedValue(gatewayError);

      return testContext.paypalCheckout
        .createPayment({ flow: "vault" })
        .catch(({ code, message, type }) => {
          expect(type).toBe(BraintreeError.types.NETWORK);
          expect(code).toBe("CLIENT_REQUEST_ERROR");
          expect(message).toBe("There was a problem with your request.");
        });
    });

    it("saves intent when passed", () => {
      testContext.client.request.mockResolvedValue({
        agreementSetup: {
          tokenId: "stub",
        },
        paymentResource: {
          paymentToken: "stub",
          redirectUrl: "https://example.com?foo=bar&EC-token&foo2=bar2",
        },
      });

      return testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          intent: "saved intent",
        })
        .then(() => {
          expect(testContext.paypalCheckout.intentFromCreatePayment).toBe(
            "saved intent"
          );
        });
    });

    it("removes intent on additonal createPayment calls", () => {
      testContext.client.request.mockResolvedValue({
        agreementSetup: {
          tokenId: "stub",
        },
        paymentResource: {
          paymentToken: "stub",
          redirectUrl: "https://example.com?foo=bar&EC-token&foo2=bar2",
        },
      });

      return testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          intent: "saved intent",
        })
        .then(() => {
          expect(testContext.paypalCheckout.intentFromCreatePayment).toBe(
            "saved intent"
          );

          return testContext.paypalCheckout.createPayment({ flow: "vault" });
        })
        .then(() => {
          expect(
            testContext.paypalCheckout.intentFromCreatePayment
          ).toBeFalsy();
        });
    });

    describe("Hermes payment resource", () => {
      beforeEach(() => {
        testContext.options = {
          flow: "vault",
        };
        testContext.client.request.mockResolvedValue({
          agreementSetup: {
            tokenId: "stub",
          },
          paymentResource: {
            paymentToken: "stub",
            redirectUrl: "https://example.com?foo=bar&EC-token&foo2=bar2",
          },
        });
      });

      it("contains the PayPal experience profile", () => {
        testContext.options.displayName = "My Merchant";
        testContext.options.locale = "th_TH";
        testContext.options.enableShippingAddress = true;
        testContext.options.shippingAddressEditable = false;

        return testContext.paypalCheckout
          .createPayment(testContext.options)
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                experienceProfile: {
                  brandName: "My Merchant",
                  localeCode: "th_TH",
                  noShipping: "false",
                  addressOverride: true,
                },
              },
            });
          });
      });

      it("contains the merchant account ID if set", () => {
        testContext.paypalCheckoutWithMerchantAccountId = new PayPalCheckout({
          merchantAccountId: "alt-merchant-account-id",
        });

        return testContext.paypalCheckoutWithMerchantAccountId
          ._initialize({
            client: testContext.client,
          })
          .then((pp) => pp.createPayment(testContext.options))
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                merchantAccountId: "alt-merchant-account-id",
              },
            });
          });
      });

      it("uses configuration's display name for PayPal brand name by default", () =>
        testContext.paypalCheckout
          .createPayment(testContext.options)
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                experienceProfile: {
                  brandName: "Name",
                },
              },
            });
          }));

      it("contains landing page type when specified", () => {
        testContext.options.landingPageType = "foobar";

        return testContext.paypalCheckout
          .createPayment(testContext.options)
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                experienceProfile: {
                  landingPageType: "foobar",
                },
              },
            });
          });
      });

      it("contains riskCorrelationId when specified", () => {
        testContext.options.riskCorrelationId = "foobar";

        return testContext.paypalCheckout
          .createPayment(testContext.options)
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                correlationId: "foobar",
              },
            });
          });
      });

      it("does not contain landing page type when unspecified", () =>
        testContext.paypalCheckout
          .createPayment(testContext.options)
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                experienceProfile: expect.not.objectContaining({
                  landingPageType: expect.anything(),
                }),
              },
            });
          }));

      describe("when using checkout flow", () => {
        beforeEach(() => {
          testContext.options.flow = "checkout";
          testContext.options.amount = 1;
          testContext.options.currency = "USD";
        });

        it("uses the correct endpoint", () =>
          testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request).toHaveBeenCalledWith(
                expect.objectContaining({
                  endpoint: "paypal_hermes/create_payment_resource",
                  method: "post",
                })
              );
            }));

        it("contains payment amount and currency", () =>
          testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    amount: 1,
                    currencyIsoCode: "USD",
                  },
                }
              );
            }));

        it("contains riskCorrelationId when specified", () => {
          testContext.options.riskCorrelationId = "foobar";

          return testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    correlationId: "foobar",
                  },
                }
              );
            });
        });

        it("contains shippingOptions when specified", () => {
          testContext.options.shippingOptions = [
            {
              id: "aus-domain",
              label: "Austin Domain Store",
              amount: {
                currency: "USD",
                value: "1.00",
              },
              type: "PICKUP",
              selected: true,
            },
            {
              id: "aus-arboretum",
              label: "austin Arboretum Store",
              amount: {
                currency: "USD",
                value: "5.00",
              },
              type: "PICKUP",
              selected: false,
            },
          ];

          return testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    amount: 1,
                    currencyIsoCode: "USD",
                    shippingOptions: [
                      {
                        id: "aus-domain",
                        label: "Austin Domain Store",
                        amount: {
                          currency: "USD",
                          value: "1.00",
                        },
                        type: "PICKUP",
                        selected: true,
                      },
                      {
                        id: "aus-arboretum",
                        label: "austin Arboretum Store",
                        amount: {
                          currency: "USD",
                          value: "5.00",
                        },
                        type: "PICKUP",
                        selected: false,
                      },
                    ],
                  },
                }
              );
            });
        });

        it("contains vaultInitiatedCheckoutPaymentMethodToken when specified", () => {
          testContext.options.vaultInitiatedCheckoutPaymentMethodToken =
            "VICPMT-XXXXXXXXXX";

          return testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    vaultInitiatedCheckoutPaymentMethodToken:
                      "VICPMT-XXXXXXXXXX",
                    amount: 1,
                    currencyIsoCode: "USD",
                  },
                }
              );
            });
        });

        it("contains other options when specified", () => {
          testContext.options.intent = "sale";
          testContext.options.contactPreference = "RETAIN_CONTACT_INFO";
          testContext.options.planType = "SUBSCRIPTION";
          testContext.options.planMetadata = {
            billingCycles: [
              {
                billingFrequency: "1",
                billingFrequencyUnit: "MONTH",
                numberOfExecutions: "1",
                sequence: "1",
                trial: false,
                pricingScheme: {
                  pricingModel: "FIXED",
                  price: "5.00",
                },
              },
            ],
            currencyIsoCode: "USD",
            name: "Verizon Billing Plan",
            productDescription: "Billing plan for subscriptions",
            productQuantity: "1",
            oneTimeFeeAmount: "10",
            totalAmount: "15.00",
          };
          testContext.options.amountBreakdown = {
            itemTotal: "215.00",
            taxTotal: "20.00",
            shipping: "10.00",
            handling: "0",
            insurance: "0",
            shippingDiscount: "0",
            discount: "0",
          };
          testContext.options.shippingAddressOverride = {
            line1: "123 Townsend St",
            line2: "Fl 6",
            city: "San Francisco",
            state: "CA",
            postalCode: "94107",
            countryCode: "USA",
            phone: "111-1111",
            recipientName: "Joe Bloggs",
            recipientEmail: "received@here.net",
            internationalPhone: {
              countryCode: "1",
              nationalNumber: "4125555555",
            },
          };
          testContext.options.lineItems = [
            {
              quantity: "1",
              unitAmount: "1",
              unitTaxAmount: "1",
              name: "Shirt",
              description: "cotton",
              kind: "debit",
              productCode: "123xyz",
              url: "example.com",
            },
          ];
          testContext.options.requestBillingAgreement = true;
          testContext.options.billingAgreementDetails = {
            description: "A vaulted payment",
          };

          return testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    intent: "sale",
                    line1: "123 Townsend St",
                    line2: "Fl 6",
                    city: "San Francisco",
                    state: "CA",
                    postalCode: "94107",
                    countryCode: "USA",
                    phone: "111-1111",
                    contactPreference: "RETAIN_CONTACT_INFO",
                    recipientName: "Joe Bloggs",
                    recipientEmail: "received@here.net",
                    internationalPhone: {
                      countryCode: "1",
                      nationalNumber: "4125555555",
                    },
                    lineItems: [
                      {
                        quantity: "1",
                        unitAmount: "1",
                        unitTaxAmount: "1",
                        name: "Shirt",
                        description: "cotton",
                        kind: "debit",
                        productCode: "123xyz",
                        url: "example.com",
                      },
                    ],
                    requestBillingAgreement: true,
                    billingAgreementDetails: {
                      description: "A vaulted payment",
                    },
                    amountBreakdown: {
                      itemTotal: "215.00",
                      taxTotal: "20.00",
                      shipping: "10.00",
                      handling: "0",
                      insurance: "0",
                      shippingDiscount: "0",
                      discount: "0",
                    },
                    planType: "SUBSCRIPTION",
                    planMetadata: {
                      billingCycles: [
                        {
                          billingFrequency: "1",
                          billingFrequencyUnit: "MONTH",
                          numberOfExecutions: "1",
                          sequence: "1",
                          trial: false,
                          pricingScheme: {
                            pricingModel: "FIXED",
                            price: "5.00",
                          },
                        },
                      ],
                      currencyIsoCode: "USD",
                      name: "Verizon Billing Plan",
                      productDescription: "Billing plan for subscriptions",
                      productQuantity: "1",
                      oneTimeFeeAmount: "10",
                      totalAmount: "15.00",
                    },
                  },
                }
              );
            });
        });
      });

      describe("when using vault flow", () => {
        beforeEach(() => {
          testContext.options.flow = "vault";
        });

        it("uses the correct endpoint", () =>
          testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request).toHaveBeenCalledWith(
                expect.objectContaining({
                  endpoint: "paypal_hermes/setup_billing_agreement",
                  method: "post",
                })
              );
            }));

        it("contains other options when specified", () => {
          testContext.options.billingAgreementDescription = "Foo Bar";
          testContext.options.shippingAddressOverride = {
            line1: "123 Townsend St",
            line2: "Fl 6",
            city: "San Francisco",
            state: "CA",
            postalCode: "94107",
            countryCode: "USA",
            phone: "111-1111",
            recipientName: "Joe Bloggs",
          };

          return testContext.paypalCheckout
            .createPayment(testContext.options)
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    description: "Foo Bar",
                    shippingAddress:
                      testContext.options.shippingAddressOverride,
                  },
                }
              );
            });
        });
      });
    });

    it("sends analytics event when createPayment is called", () => {
      analytics.sendEvent.mockClear();

      testContext.paypalCheckout.createPayment({ flow: "vault" });

      expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.paypalCheckout._clientPromise,
        "paypal-checkout.createPayment"
      );
    });

    describe.each([["EC-token"], ["orderId"]])(
      "for token %s in redirectUrl",
      (token) => {
        it("resolves appropriately", () => {
          let redirectUrl, requestPayload;

          redirectUrl = "https://example.com?foo=bar&token=" + token;
          requestPayload = {
            paymentResource: {
              paymentToken: "PAY-XXXXXXXXXX",
              redirectUrl: redirectUrl,
            },
          };

          jest
            .spyOn(testContext.client, "request")
            .mockResolvedValue(requestPayload);

          return testContext.paypalCheckout
            .createPayment({ flow: "checkout" })
            .then((payload) => {
              expect(payload).toBe(token);
            });
        });
      }
    );

    describe.each([["vault"], ["checkout"]])("using %s flow", (flow) => {
      it(`resolves with a ${
        flow === "vault" ? "billingToken" : "paymentID"
      } for ${flow} flow`, () => {
        let requestPayload, expected;

        if (flow === "vault") {
          requestPayload = {
            agreementSetup: {
              tokenId: "BA-XXXXXXXXXX",
            },
          };
          expected = "BA-XXXXXXXXXX";
        } else {
          requestPayload = {
            paymentResource: {
              paymentToken: "PAY-XXXXXXXXXX",
              redirectUrl:
                "https://example.com?foo=bar&token=EC-token&foo2=bar2",
            },
          };
          expected = "EC-token";
        }

        jest
          .spyOn(testContext.client, "request")
          .mockResolvedValue(requestPayload);

        return testContext.paypalCheckout
          .createPayment({ flow })
          .then((payload) => {
            expect(payload).toBe(expected);
          });
      });

      it("requests appropriate url for flow", () => {
        const url =
          flow === "vault"
            ? "setup_billing_agreement"
            : "create_payment_resource";

        return testContext.paypalCheckout.createPayment({ flow }).then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            method: "post",
            endpoint: `paypal_hermes/${url}`,
          });
        });
      });

      it(`sends analytics event when offerCredit is true and using ${flow} flow`, () => {
        testContext.paypalCheckout.createPayment({ flow, offerCredit: true });

        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.paypalCheckout._clientPromise,
          "paypal-checkout.credit.offered"
        );
      });

      it(`does not send analytics event when offerCredit is false and using ${flow} flow`, () => {
        testContext.paypalCheckout.createPayment({ flow });

        expect(analytics.sendEvent).not.toHaveBeenCalledWith(
          testContext.client,
          "paypal-checkout.credit.offered"
        );
      });

      it(`sets offerPaypalCredit to false if offerCredit is unspecified with ${flow} flow`, () =>
        testContext.paypalCheckout.createPayment({ flow }).then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(
            testContext.client.request.mock.calls[0][0].data.offerPaypalCredit
          ).toBe(false);
        }));

      it(`sets offerPaypalCredit to true if offerCredit is true with ${flow} flow`, () =>
        testContext.paypalCheckout
          .createPayment({ flow, offerCredit: true })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(
              testContext.client.request.mock.calls[0][0].data.offerPaypalCredit
            ).toBe(true);
          }));

      it("sets offerPaypalCredit to false if offerCredit is not a boolean true", () =>
        testContext.paypalCheckout
          .createPayment({ flow, offerCredit: "true" })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(
              testContext.client.request.mock.calls[0][0].data.offerPaypalCredit
            ).toBe(false);
          }));

      it(`assigns shipping address for ${flow} flow`, () => {
        const shippingAddressOverride = {
          line1: "line1",
          line2: "line2",
          city: "city",
          state: "state",
          countryCode: "countryCode",
          postalCode: "postal",
        };

        return testContext.paypalCheckout
          .createPayment({ flow, shippingAddressOverride })
          .then(() => {
            let expected;

            if (flow === "vault") {
              expected = { shippingAddress: shippingAddressOverride };
            } else {
              expected = shippingAddressOverride;
            }

            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: { ...expected },
            });
          });
      });
    });

    describe("createPayment:vaulted with plan", () => {
      it('does not send both "planType" and "planMetadata" if they do not exist', () => {
        testContext.paypalCheckout
          .createPayment({
            flow: "vault",
          })
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.planType
            ).toBeUndefined();
            expect(
              testContext.client.request.mock.calls[0][0].data.planMetadata
            ).toBeUndefined();
          });
      });

      it('does not send "plan_metadata" if it does not exist', () => {
        const planType = "RECURRING";

        testContext.paypalCheckout
          .createPayment({
            flow: "vault",
            planType: planType,
          })
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.planType
            ).toBe(planType);
            expect(
              testContext.client.request.mock.calls[0][0].data.planMetadata
            ).toBeUndefined();
          });
      });

      it('sends both "planType" and "planMetadata" when they exist', () => {
        const planType = "RECURRING";
        const planMetadata = {
          billingCycles: [
            {
              billingFrequency: "1",
              billingFrequencyUnit: "MONTH",
              numberOfExecutions: "1",
              sequence: "1",
              startDate: "2024-04-06T00:00:00Z",
              trial: true,
              pricingScheme: {
                pricingModel: "FIXED",
              },
            },
          ],
          currencyIsoCode: "USD",
          name: "Netflix with Ads",
          productDescription: "iPhone 13",
          productQuantity: "1.0",
          oneTimeFeeAmount: "10",
          shippingAmount: "3.0",
          productPrice: "200",
          taxAmount: "20",
          totalAmount: "233.0",
        };

        const expectedPlanMetadata = {
          billingCycles: [
            {
              billingFrequency: "1",
              billingFrequencyUnit: "MONTH",
              numberOfExecutions: "1",
              sequence: "1",
              startDate: "2024-04-06T00:00:00Z",
              trial: true,
              pricingScheme: {
                pricingModel: "FIXED",
              },
            },
          ],
          currencyIsoCode: planMetadata.currencyIsoCode,
          name: planMetadata.name,
          oneTimeFeeAmount: planMetadata.oneTimeFeeAmount,
          productDescription: planMetadata.productDescription,
          productPrice: planMetadata.productPrice,
          productQuantity: planMetadata.productQuantity,
          shippingAmount: planMetadata.shippingAmount,
          taxAmount: planMetadata.taxAmount,
          totalAmount: planMetadata.totalAmount,
        };

        testContext.paypalCheckout
          .createPayment({
            flow: "vault",
            planType: planType,
            planMetadata: planMetadata,
          })
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.planType
            ).toBe(planType);
            expect(
              testContext.client.request.mock.calls[0][0].data.planMetadata
            ).toMatchObject(expectedPlanMetadata);
          });
      });
    });

    it('sends both "plan_type" and "plan_metadata" when they exist. Added new field `totalAmount` to `planMetadata`', () => {
      const planType = "RECURRING";
      const planMetadata = {
        billingCycles: [
          {
            billingFrequency: "1",
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: "1",
            sequence: "1",
            startDate: "2024-04-06T00:00:00Z",
            trial: true,
            pricingScheme: {
              pricingModel: "FIXED",
            },
          },
        ],
        currencyIsoCode: "USD",
        name: "Netflix with Ads",
        productDescription: "iPhone 13",
        productQuantity: "1.0",
        oneTimeFeeAmount: "10",
        shippingAmount: "3.0",
        productPrice: "200",
        taxAmount: "20",
        totalAmount: "233.0",
      };

      const expectedPlanMetadata = {
        billingCycles: [
          {
            billingFrequency: "1",
            billingFrequencyUnit: "MONTH",
            numberOfExecutions: "1",
            sequence: "1",
            startDate: "2024-04-06T00:00:00Z",
            trial: true,
            pricingScheme: {
              pricingModel: "FIXED",
            },
          },
        ],
        currencyIsoCode: planMetadata.currencyIsoCode,
        name: planMetadata.name,
        oneTimeFeeAmount: planMetadata.oneTimeFeeAmount,
        productDescription: planMetadata.productDescription,
        productPrice: planMetadata.productPrice,
        productQuantity: planMetadata.productQuantity,
        shippingAmount: planMetadata.shippingAmount,
        taxAmount: planMetadata.taxAmount,
        totalAmount: planMetadata.totalAmount,
      };

      testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          planType: planType,
          planMetadata: planMetadata,
        })
        .then(() => {
          expect(
            testContext.client.request.mock.calls[0][0].data.planType
          ).toBe(planType);
          expect(
            testContext.client.request.mock.calls[0][0].data.planMetadata
          ).toMatchObject(expectedPlanMetadata);
        });
    });

    it("formats request", () =>
      testContext.paypalCheckout
        .createPayment({
          flow: "checkout",
          locale: "FOO",
          amount: "10.00",
          enableShippingAddress: true,
          shippingAddressEditable: false,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              amount: "10.00",
              returnUrl: "https://www.paypal.com/checkoutnow/error",
              cancelUrl: "https://www.paypal.com/checkoutnow/error",
              experienceProfile: {
                brandName: "Name",
                localeCode: "FOO",
                noShipping: "false",
                addressOverride: true,
              },
            },
          });
        }));

    describe("_formatPlanMetadata", () => {
      it("formats a complete plan with billing cycles", () => {
        const inputPlan = {
          currencyIsoCode: "USD",
          name: "Monthly Subscription",
          oneTimeFeeAmount: "10.00",
          productDescription: "Pro Plan",
          totalAmount: "29.99",
          billingCycles: [
            {
              billingFrequency: "7",
              billingFrequencyUnit: "DAY",
              numberOfExecutions: "1",
              sequence: "1",
              startDate: "2024-04-06T00:00:00Z",
              trial: true,
              pricingScheme: {
                pricingModel: "FIXED",
                price: "0.00",
              },
              extraProperty: "should be filtered out",
            },
            {
              billingFrequency: "1",
              billingFrequencyUnit: "MONTH",
              sequence: "2",
              numberOfExecutions: null,
              startDate: null,
              trial: false,
              pricingScheme: {
                pricingModel: "FIXED",
                price: "29.99",
              },
            },
          ],
          unrelatedProperty: "should not be included",
        };

        const result =
          testContext.paypalCheckout._formatPlanMetadata(inputPlan);

        expect(result.currencyIsoCode).toBe("USD");
        expect(result.name).toBe("Monthly Subscription");
        expect(result.oneTimeFeeAmount).toBe("10.00");
        expect(result.productDescription).toBe("Pro Plan");
        expect(result.totalAmount).toBe("29.99");
        expect(result.unrelatedProperty).toBeUndefined();

        expect(result.billingCycles.length).toBe(2);

        // First billing cycle (trial period)
        expect(result.billingCycles[0].billingFrequency).toBe("7");
        expect(result.billingCycles[0].billingFrequencyUnit).toBe("DAY");
        expect(result.billingCycles[0].numberOfExecutions).toBe("1");
        expect(result.billingCycles[0].sequence).toBe("1");
        expect(result.billingCycles[0].startDate).toBe("2024-04-06T00:00:00Z");
        expect(result.billingCycles[0].trial).toBe(true);
        expect(result.billingCycles[0].pricingScheme).toEqual({
          pricingModel: "FIXED",
          price: "0.00",
        });
        expect(result.billingCycles[0].extraProperty).toBeUndefined();

        // Second billing cycle (regular subscription)
        expect(result.billingCycles[1].billingFrequency).toBe("1");
        expect(result.billingCycles[1].billingFrequencyUnit).toBe("MONTH");
        expect(result.billingCycles[1].sequence).toBe("2");
        expect(result.billingCycles[1].numberOfExecutions).toBeNull();
        expect(result.billingCycles[1].trial).toBe(false);
      });

      it("handles a plan with no billing cycles", () => {
        const inputPlan = {
          currencyIsoCode: "USD",
          name: "Basic Plan",
          totalAmount: "19.99",
        };

        const result =
          testContext.paypalCheckout._formatPlanMetadata(inputPlan);

        expect(result.currencyIsoCode).toBe("USD");
        expect(result.name).toBe("Basic Plan");
        expect(result.totalAmount).toBe("19.99");
        expect(result.billingCycles.length).toBe(0);
      });

      it("only includes specified plan properties", () => {
        const inputPlan = {
          currencyIsoCode: "EUR",
          name: "Premium Plan",
          unrelatedProperty: "should not be included",
          anotherProperty: "also not included",
        };

        const result =
          testContext.paypalCheckout._formatPlanMetadata(inputPlan);

        expect(result.currencyIsoCode).toBe("EUR");
        expect(result.name).toBe("Premium Plan");
        expect(result.unrelatedProperty).toBeUndefined();
        expect(result.anotherProperty).toBeUndefined();
      });
    });

    describe("user action", () => {
      it.each(["COMMIT", "CONTINUE"])(
        "sets user action=%p for checkout flow if specified",
        (userActionParam) =>
          testContext.paypalCheckout
            .createPayment({
              flow: "checkout",
              locale: "FOO",
              amount: "10.00",
              enableShippingAddress: true,
              shippingAddressEditable: false,
              userAction: userActionParam,
            })
            .then(() => {
              expect(testContext.client.request).toHaveBeenCalledTimes(1);
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    amount: "10.00",
                    returnUrl: "https://www.paypal.com/checkoutnow/error",
                    cancelUrl: "https://www.paypal.com/checkoutnow/error",
                    experienceProfile: {
                      brandName: "Name",
                      localeCode: "FOO",
                      noShipping: "false",
                      addressOverride: true,
                      userAction: userActionParam,
                    },
                  },
                }
              );
            })
      );

      it.each(["SETUP_NOW", "CONTINUE"])(
        "sets user action=%p for vault flow if specified",
        (actionParam) =>
          testContext.paypalCheckout
            .createPayment({
              flow: "vault",
              userAction: actionParam,
              shippingAddressOverride: {
                line1: "line1",
                line2: "line2",
                city: "city",
                state: "state",
                countryCode: "countryCode",
                postalCode: "postal",
              },
              shippingAddressEditable: false,
            })
            .then(() => {
              expect(testContext.client.request.mock.calls[0][0]).toMatchObject(
                {
                  data: {
                    experienceProfile: {
                      userAction: actionParam,
                      addressOverride: true,
                    },
                  },
                }
              );
            })
      );

      it("ignores invalid user action value", () =>
        testContext.paypalCheckout
          .createPayment({
            flow: "vault",
            userAction: "INVALID",
            shippingAddressOverride: {
              line1: "line1",
              line2: "line2",
              city: "city",
              state: "state",
              countryCode: "countryCode",
              postalCode: "postal",
            },
            shippingAddressEditable: false,
          })
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0]
            ).not.toHaveProperty("userAction");
          }));
    });

    it("allows override of displayName", () =>
      testContext.paypalCheckout
        .createPayment({
          flow: "checkout",
          displayName: "OVERRIDE NAME",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: {
                brandName: "OVERRIDE NAME",
              },
            },
          });
        }));

    it.each(["authorize", "order", "sale"])(
      "assigns intent %p for one-time checkout",
      (intent) =>
        testContext.paypalCheckout
          .createPayment({
            flow: "checkout",
            intent: intent,
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                intent: intent,
              },
            });
          })
    );

    it("assigns capture intent to sale when making request", () =>
      testContext.paypalCheckout
        .createPayment({
          flow: "checkout",
          intent: "capture",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              intent: "sale",
            },
          });
        }));

    it("does not assign intent for one-time checkout if not provided", () =>
      testContext.paypalCheckout
        .createPayment({ flow: "checkout" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(
            testContext.client.request.mock.calls[0][0].data
          ).not.toHaveProperty("intent");
        }));

    it("sets addressOverride to true if shippingAddressEditable is false", () =>
      testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          shippingAddressOverride: {
            line1: "line1",
            line2: "line2",
            city: "city",
            state: "state",
            countryCode: "countryCode",
            postalCode: "postal",
          },
          shippingAddressEditable: false,
        })
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: {
                addressOverride: true,
              },
            },
          });
        }));

    it("sets addressOverride to false if shippingAddressEditable is true", () =>
      testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          shippingAddressOverride: {
            line1: "line1",
            line2: "line2",
            city: "city",
            state: "state",
            countryCode: "countryCode",
            postalCode: "postal",
          },
          shippingAddressEditable: true,
        })
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: {
                addressOverride: false,
              },
            },
          });
        }));

    it("assigns billing agreement description for billing agreements", () =>
      testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          billingAgreementDescription: "Fancy Schmancy Description",
        })
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              description: "Fancy Schmancy Description",
            },
          });
        }));

    it("does not assign billing agreement description for one-time checkout", () => {
      let arg;

      return testContext.paypalCheckout
        .createPayment({
          flow: "checkout",
          billingAgreementDescription: "Fancy Schmancy Description",
        })
        .then(() => {
          arg = testContext.client.request.mock.calls[0][0];

          expect(arg.data).not.toHaveProperty("description");
        });
    });

    it("handles paymentReadySessionId option correctly when passed", () => {
      testContext.client.request.mockResolvedValue({
        agreementSetup: {
          tokenId: "id",
        },
        paymentResource: {
          paymentToken: "PAY-XXXXXXXXXX",
          redirectUrl: "https://example.com?foo=bar&EC-token&foo2=bar2",
        },
      });

      return testContext.paypalCheckout
        .createPayment({
          flow: "vault",
          paymentReadySessionId: "XYZ1-ABC2-9876DEF5-4321-123456789ABC",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                paymentReadySessionId: "XYZ1-ABC2-9876DEF5-4321-123456789ABC",
              }),
            })
          );
        });
    });
  });

  describe("updatePayment", () => {
    beforeEach(() => {
      testContext.options = {
        amount: 1,
        currency: "USD",
        paymentId: "pay-token-123-abc",
      };
      analytics.sendEventPlus = jest.fn();
      testContext.paypalCheckout._flow = "checkout";
      testContext.paypalCheckout._contextId = "pay-token-123-abc";
    });

    it("sends analytics event when udpatePayment is called", async () => {
      analytics.sendEventPlus.mockClear();

      await testContext.paypalCheckout.updatePayment(testContext.options);
      expect(analytics.sendEventPlus).toHaveBeenCalledTimes(1);
      expect(analytics.sendEventPlus).toHaveBeenCalledWith(
        testContext.paypalCheckout._clientPromise,
        "paypal-checkout.updatePayment",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.options.paymentId,
        }
      );
    });

    it("handles gateway error (HTTP status 422)", () => {
      const unprocessableError = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: "CLIENT_REQUEST_ERROR",
        message: "There was a problem with your request.",
        details: { httpStatus: 422 },
      });

      analytics.sendEventPlus.mockClear();

      testContext.client.request.mockRejectedValue(unprocessableError);

      return testContext.paypalCheckout
        .updatePayment(testContext.options)
        .catch(({ code, details, message, type }) => {
          expect(type).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.type);
          expect(code).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.code);
          expect(message).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.message);
          expect(details).toEqual({
            originalError: unprocessableError,
          });
          expect(analytics.sendEventPlus).toHaveBeenCalledTimes(2);
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            testContext.paypalCheckout._clientPromise,
            "paypal-checkout.updatePayment.invalid",
            {
              flow: testContext.paypalCheckout._flow,
              context_id: testContext.paypalCheckout._contextId,
            }
          );
        });
    });

    it("handles network error (HTTP status 404)", () => {
      analytics.sendEventPlus.mockClear();

      const originalError = new Error("Something bad happened");

      originalError.details = { httpStatus: 404 };

      testContext.client.request.mockRejectedValue(originalError);

      return testContext.paypalCheckout
        .updatePayment(testContext.options)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe(errors.PAYPAL_FLOW_FAILED.type);
          expect(err.code).toBe(errors.PAYPAL_FLOW_FAILED.code);
          expect(err.message).toBe(errors.PAYPAL_FLOW_FAILED.message);
          expect(err.details).toHaveProperty("originalError");
          expect(err.details.originalError).toBe(originalError);
        });
    });

    it("uses the correct endpoint", () => {
      testContext.paypalCheckout.updatePayment(testContext.options).then(() => {
        expect(testContext.client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint: "paypal_hermes/patch_payment_resource",
            method: "post",
          })
        );
      });
    });

    it("resolves with 'success' response", () => {
      const expected = {
        agreementSetup: {
          tokenId: "id",
        },
        paymentResource: {
          paymentToken: "token",
          redirectUrl: "https://example.com?foo=bar&EC-token&foo2=bar2",
        },
      };

      return testContext.paypalCheckout
        .updatePayment(testContext.options)
        .then((payload) => {
          expect(payload).toEqual(expected);
        });
    });

    it("fails if `amount` and `lineItems` are missing", async () => {
      testContext.paypalCheckout._merchantAccountId = "abcdefg123456";

      const pp = await testContext.paypalCheckout._initialize({
        client: testContext.client,
      });

      return pp.updatePayment(testContext.options).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe(errors.PAYPAL_MISSING_REQUIRED_OPTION.type);
        expect(err.message).toBe(errors.PAYPAL_MISSING_REQUIRED_OPTION.message);
        expect(err.code).toBe(errors.PAYPAL_MISSING_REQUIRED_OPTION.code);
      });
    });

    it("fails if `currency` and single `shippingOption` currency are not the same", async () => {
      const pp = await testContext.paypalCheckout._initialize({
        client: testContext.client,
      });
      const expectedOriginalErr = new Error(
        "One or more shipping option currencies differ from checkout currency."
      );

      expect.assertions(5);

      return pp
        .updatePayment({
          merchantAccountId: "abcdefg123456",
          paymentId: "pay-token-123-abc",
          currency: "USD",
          lineItems: [
            {
              quantity: "1",
              unitAmount: "16",
              unitTaxAmount: "1.5",
              name: "tutu",
              description: "nylon",
              kind: "debit",
              productCode: "4m5n6o",
              url: "example.com",
            },
          ],
          shippingOptions: [
            {
              id: "shipping-eventually",
              type: "SHIPPING",
              label: "Eventual Shipping",
              selected: true,
              amount: {
                value: "7.00",
                currency: "XYZ",
              },
            },
          ],
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.type);
          expect(err.message).toBe(
            errors.PAYPAL_INVALID_PAYMENT_OPTION.message
          );
          expect(err.code).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.code);
          expect(err.details.originalError.message).toBe(
            expectedOriginalErr.message
          );
        });
    });

    it("fails if `currency` and any `shippingOption` currency are not the same", async () => {
      const pp = await testContext.paypalCheckout._initialize({
        client: testContext.client,
      });
      const expectedOriginalErr = new Error(
        "One or more shipping option currencies differ from checkout currency."
      );

      expect.assertions(5);

      return pp
        .updatePayment({
          merchantAccountId: "abcdefg123456",
          paymentId: "pay-token-123-abc",
          currency: "USD",
          lineItems: [
            {
              quantity: "1",
              unitAmount: "16",
              unitTaxAmount: "1.5",
              name: "tutu",
              description: "nylon",
              kind: "debit",
              productCode: "4m5n6o",
              url: "example.com",
            },
          ],
          shippingOptions: [
            {
              id: "shipping-speed-fast",
              type: "SHIPPING",
              label: "Fast Shipping",
              selected: false,
              amount: {
                value: "11.00",
                currency: "USD",
              },
            },
            {
              id: "shipping-eventually",
              type: "SHIPPING",
              label: "Eventual Shipping",
              selected: true,
              amount: {
                value: "7.00",
                currency: "XYZ",
              },
            },
          ],
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.type);
          expect(err.message).toBe(
            errors.PAYPAL_INVALID_PAYMENT_OPTION.message
          );
          expect(err.code).toBe(errors.PAYPAL_INVALID_PAYMENT_OPTION.code);
          expect(err.details.originalError.message).toBe(
            expectedOriginalErr.message
          );
        });
    });

    const inputs = [["paymentId"], ["currency"]];

    it.each(inputs)(
      "fails if a required option is missing param %s",
      async (param1) => {
        delete testContext.options[param1];

        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";

        const pp = await testContext.paypalCheckout._initialize({
          client: testContext.client,
        });

        return pp.updatePayment(testContext.options).catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe(BraintreeError.types.MERCHANT);
          expect(err.message).toBe("Missing required option.");
          expect(err.code).toBe("PAYPAL_MISSING_REQUIRED_OPTION");
        });
      }
    );

    describe("_formatUpdatePaymentData - when formatting payload", () => {
      beforeEach(() => {
        testContext.options = {
          currency: "USD",
          paymentId: "pay-token-123-abc",
        };
      });

      it("includes `orderId` when present", () => {
        testContext.options.paymentId = "";
        testContext.options.orderId = "order-id";
        testContext.options.amount = "10";
        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";
        const expectedRequestBody = {
          amount: testContext.options.amount,
          currencyIsoCode: testContext.options.currency,
          merchantAccountId: "abcdefg123456",
          paymentId: testContext.options.orderId,
        };

        const formattedData =
          testContext.paypalCheckout._formatUpdatePaymentData(
            testContext.options
          );

        expect(formattedData).toMatchObject(expectedRequestBody);
      });

      it("does not calculate `amount` when present", () => {
        testContext.options.lineItems = [
          {
            quantity: "1",
            unitAmount: "16",
            unitTaxAmount: "1.5",
            name: "tutu",
            description: "nylon",
            kind: "debit",
            productCode: "4m5n6o",
            url: "example.com",
          },
        ];
        testContext.options.amount = "10";

        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";

        const expectedRequestBody = {
          amount: testContext.options.amount,
          currencyIsoCode: testContext.options.currency,
          lineItems: testContext.options.lineItems,
          merchantAccountId: "abcdefg123456",
          paymentId: testContext.options.paymentId,
        };

        const formattedData =
          testContext.paypalCheckout._formatUpdatePaymentData(
            testContext.options
          );

        expect(formattedData).toMatchObject(expectedRequestBody);
      });

      it("includes `line2` of `shippingAddress` when present", () => {
        testContext.options.amount = 1;
        testContext.options.shippingAddress = {
          line1: "line1",
          line2: "line2",
          city: "city",
          state: "state",
          countryCode: "countryCode",
          postalCode: "postal",
        };

        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";
        testContext.paypalCheckout._clientPromise = jest.fn();
        testContext.paypalCheckout._clientPromise.mockResolvedValue({});
        testContext.paypalCheckout._formatPaymentResourceCheckoutData =
          jest.fn();
        testContext.paypalCheckout._formatPaymentResourceCheckoutData.mockReturnValue(
          {}
        );

        const expectedRequestBody = {
          amount: testContext.options.amount,
          currencyIsoCode: testContext.options.currency,
          merchantAccountId: "abcdefg123456",
          paymentId: testContext.options.paymentId,
          line1: testContext.options.shippingAddress.line1,
          line2: testContext.options.shippingAddress.line2,
          city: testContext.options.shippingAddress.city,
          state: testContext.options.shippingAddress.state,
          countryCode: testContext.options.shippingAddress.countryCode,
          postalCode: testContext.options.shippingAddress.postalCode,
        };

        const formattedData =
          testContext.paypalCheckout._formatUpdatePaymentData(
            testContext.options
          );

        expect(formattedData).toMatchObject(expectedRequestBody);
        expect(formattedData).not.toHaveProperty("lineItems");
        expect(formattedData).not.toHaveProperty("phone");
        expect(formattedData).not.toHaveProperty("recipientName");
        expect(formattedData).not.toHaveProperty("shippingOptions");
      });

      it("includes `recipientName` and `phone` when provided", () => {
        testContext.options.amount = 1;
        testContext.options.shippingAddress = {
          line1: "line1",
          city: "city",
          state: "state",
          countryCode: "countryCode",
          postalCode: "postal",
          phone: "1239870000",
          recipientName: "jane h. private",
        };

        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";
        testContext.paypalCheckout._clientPromise = jest.fn();
        testContext.paypalCheckout._clientPromise.mockResolvedValue({});

        const expectedRequestBody = {
          amount: testContext.options.amount,
          currencyIsoCode: testContext.options.currency,
          merchantAccountId: "abcdefg123456",
          paymentId: testContext.options.paymentId,
          line1: testContext.options.shippingAddress.line1,
          city: testContext.options.shippingAddress.city,
          state: testContext.options.shippingAddress.state,
          countryCode: testContext.options.shippingAddress.countryCode,
          postalCode: testContext.options.shippingAddress.postalCode,
          phone: testContext.options.shippingAddress.phone,
          recipientName: testContext.options.shippingAddress.recipientName,
        };

        const formattedData =
          testContext.paypalCheckout._formatUpdatePaymentData(
            testContext.options
          );

        expect(formattedData).toMatchObject(expectedRequestBody);
        expect(formattedData).not.toHaveProperty("line2");
      });

      it("includes shipping options when provided", () => {
        testContext.options.amount = 1;
        testContext.options.shippingOptions = [
          {
            id: "shipping-speed-fast",
            type: "SHIPPING",
            label: "Fast Shipping",
            selected: false,
            amount: {
              value: "5.00",
              currency: "USD",
            },
          },
          {
            id: "shipping-speed-slow",
            type: "SHIPPING",
            label: "Slow Shipping",
            selected: false,
            amount: {
              value: "1.00",
              currency: "USD",
            },
          },
        ];

        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";

        const expectedRequestBody = {
          amount: testContext.options.amount,
          currencyIsoCode: testContext.options.currency,
          merchantAccountId: "abcdefg123456",
          paymentId: testContext.options.paymentId,
          shippingOptions: testContext.options.shippingOptions,
        };

        const formattedData =
          testContext.paypalCheckout._formatUpdatePaymentData(
            testContext.options
          );

        expect(formattedData).toMatchObject(expectedRequestBody);
        expect(formattedData).not.toHaveProperty("lineItems");
        expect(formattedData).not.toHaveProperty("city");
        expect(formattedData).not.toHaveProperty("countryCode");
        expect(formattedData).not.toHaveProperty("line1");
        expect(formattedData).not.toHaveProperty("line2");
        expect(formattedData).not.toHaveProperty("postalCode");
        expect(formattedData).not.toHaveProperty("state");
        expect(formattedData).not.toHaveProperty("phone");
        expect(formattedData).not.toHaveProperty("recipientName");
      });

      it("sends analytics event when includes shipping address", () => {
        analytics.sendEventPlus.mockClear();

        testContext.options.amount = 1;
        testContext.options.shippingAddress = {
          line1: "line1",
          city: "city",
          state: "state",
          countryCode: "countryCode",
          postalCode: "postal",
          phone: "1239870000",
          recipientName: "jane h. private",
        };

        testContext.paypalCheckout._clientPromise = jest.fn();
        testContext.paypalCheckout._clientPromise.mockResolvedValue({});

        testContext.paypalCheckout._formatUpdatePaymentData(
          testContext.options
        );

        expect(analytics.sendEventPlus).toHaveBeenCalledTimes(1);
        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          testContext.paypalCheckout._clientPromise,
          "paypal-checkout.updatePayment.shippingAddress.provided.by-the-merchant",
          {
            flow: testContext.paypalCheckout._flow,
            context_id: testContext.paypalCheckout._contextId,
          }
        );
      });

      it("includes order line items when provided", () => {
        testContext.options.amount = 1;
        testContext.options.lineItems = [
          {
            quantity: "1",
            unitAmount: "9",
            unitTaxAmount: "1.5",
            name: "sports jersey",
            description: "polyester",
            kind: "debit",
            productCode: "123xyz",
            url: "example.com",
          },
        ];

        testContext.paypalCheckout._merchantAccountId = "abcdefg123456";

        const expectedRequestBody = {
          amount: testContext.options.amount,
          currencyIsoCode: testContext.options.currency,
          lineItems: testContext.options.lineItems,
          merchantAccountId: "abcdefg123456",
          paymentId: testContext.options.paymentId,
        };

        const formattedData =
          testContext.paypalCheckout._formatUpdatePaymentData(
            testContext.options
          );

        expect(formattedData).toMatchObject(expectedRequestBody);
        expect(formattedData).not.toHaveProperty("shippingOptions");
        expect(formattedData).not.toHaveProperty("city");
        expect(formattedData).not.toHaveProperty("countryCode");
        expect(formattedData).not.toHaveProperty("line1");
        expect(formattedData).not.toHaveProperty("line2");
        expect(formattedData).not.toHaveProperty("postalCode");
        expect(formattedData).not.toHaveProperty("state");
        expect(formattedData).not.toHaveProperty("phone");
        expect(formattedData).not.toHaveProperty("recipientName");
      });
    });

    it("propagates amountBreakdown when passed", () => {
      const amountBreakdown = {
        itemTotal: "12.34",
        shipping: "2.99",
        handling: "0",
        taxTotal: "1.99",
        insurance: "0",
        shippingDiscount: "0",
        discount: "0",
      };
      const options = {
        paymentId: "abc123",
        currency: "USD",
        amountBreakdown: amountBreakdown,
      };
      const actual = PayPalCheckout.prototype._formatUpdatePaymentData(options);

      expect(actual).toStrictEqual({
        paymentId: "abc123",

        merchantAccountId: undefined,
        currencyIsoCode: "USD",
        amountBreakdown: amountBreakdown,
      });
    });
  });

  describe("startVaultInitiatedCheckout", () => {
    beforeEach(() => {
      testContext.options = {
        amount: "100.00",
        currency: "USD",
        vaultInitiatedCheckoutPaymentMethodToken: "fake-nonce",
      };
      testContext.client.request.mockResolvedValue({
        paymentResource: {
          redirectUrl: "https://example.com/redirect",
        },
      });
      testContext.paypalCheckout._contextId = "context-id";
      testContext.paypalCheckout._flow = "checkout";

      jest
        .spyOn(testContext.paypalCheckout, "tokenizePayment")
        .mockResolvedValue({
          nonce: "new-fake-nonce",
          type: "PayPalAccount",
        });

      analytics.sendEventPlus = jest.fn();
    });

    it("rejects if auth is already in progress", async () => {
      const firstAttempt =
        testContext.paypalCheckout.startVaultInitiatedCheckout(
          testContext.options
        );

      await expect(
        testContext.paypalCheckout.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toMatchObject({
        code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS",
        message: "Vault initiated checkout already in progress.",
      });

      expect(analytics.sendEventPlus).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.error.already-in-progress",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );

      await firstAttempt;

      // can run again when auth is completed
      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );
    });

    it.each(["amount", "currency", "vaultInitiatedCheckoutPaymentMethodToken"])(
      "rejects with an error if %param is not present",
      async (param) => {
        delete testContext.options[param];

        await expect(
          testContext.paypalCheckout.startVaultInitiatedCheckout(
            testContext.options
          )
        ).rejects.toMatchObject({
          code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED",
          message: `Required param ${param} is missing.`,
        });
      }
    );

    it("rejects if there is a client setup error", async () => {
      const paypalCheckout = new PayPalCheckout({});

      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      await paypalCheckout._initialize({
        authorization: "sandbox_fake_tokenization_key",
      });

      await expect(
        paypalCheckout.startVaultInitiatedCheckout(testContext.options)
      ).rejects.toMatchObject({
        code: "PAYPAL_NOT_ENABLED",
      });
    });

    it("rejects if there is a frame service setup error", async () => {
      const paypalCheckout = new PayPalCheckout({});

      frameService.create.mockImplementation(function () {
        // never set up
      });
      jest.useFakeTimers();

      await paypalCheckout._initialize({
        authorization: "sandbox_fake_tokenization_key",
      });

      const promise = paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      jest.runOnlyPendingTimers();

      await expect(promise).rejects.toMatchObject({
        code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_SETUP_FAILED",
      });
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.frame-service.timed-out"
      );
    });

    it("requests a payment resource", async () => {
      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(testContext.client.request).toBeCalledTimes(1);
      expect(testContext.client.request).toBeCalledWith({
        endpoint: "paypal_hermes/create_payment_resource",
        method: "post",
        data: expect.objectContaining({
          amount: "100.00",
          currencyIsoCode: "USD",
          vaultInitiatedCheckoutPaymentMethodToken: "fake-nonce",
          returnUrl: expect.stringContaining(
            "/redirect-frame.min.html?channel=service-id"
          ),
          cancelUrl: expect.stringContaining(
            "/cancel-frame.min.html?channel=service-id"
          ),
        }),
      });
    });

    it("opens frame service and redirects", async () => {
      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(testContext.fakeFrameService.open).toBeCalledTimes(1);
      expect(testContext.fakeFrameService.open).toBeCalledWith(
        {},
        expect.any(Function)
      );
      expect(testContext.fakeFrameService.redirect).toBeCalledTimes(2);
      expect(testContext.fakeFrameService.redirect).toBeCalledWith(
        "https://example.com/redirect"
      );
      expect(testContext.fakeFrameService.redirect).toBeCalledWith(
        expect.stringContaining("/paypal-landing-frame.min.html")
      );
    });

    it("tokenizes data from frameservice", async () => {
      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(testContext.paypalCheckout.tokenizePayment).toBeCalledTimes(1);
      expect(testContext.paypalCheckout.tokenizePayment).toBeCalledWith({
        paymentToken: "token",
        payerID: "payer-id",
        paymentID: "payment-id",
      });
    });

    it("closes frame service and resolves data from tokenization", async () => {
      const data = await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(testContext.fakeFrameService.close).toBeCalledTimes(1);
      expect(data.nonce).toBe("new-fake-nonce");
      expect(data.type).toBe("PayPalAccount");
    });

    it("sends analytic events for success", async () => {
      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );
      expect(analytics.sendEventPlus).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.succeeded",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );
      expect(analytics.sendEventPlus).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.started",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );
    });

    it("opens a modal backdrop in the background", async () => {
      const promise = testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeTruthy();

      await promise;

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("closes modal when user cancels", async () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync({
          code: "FRAME_SERVICE_FRAME_CLOSED",
        })
      );

      const promise = testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeTruthy();

      await expect(promise).rejects.toMatchObject({
        code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED",
        message: "Customer closed PayPal popup before authorizing.",
      });

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("closes modal when startVaultInitiatedCheckout fails", async () => {
      testContext.paypalCheckout.tokenizePayment.mockRejectedValue(
        new Error("foo")
      );

      const promise = testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeTruthy();

      await expect(promise).rejects.toThrow("foo");

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("can opt out of the modal", async () => {
      testContext.options.optOutOfModalBackdrop = true;
      const promise = testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();

      await promise;

      expect(
        document.querySelector(
          "[data-braintree-paypal-vault-initiated-checkout-modal]"
        )
      ).toBeFalsy();
    });

    it("clicking on the modal focuses the PayPal window", async () => {
      jest
        .spyOn(testContext.paypalCheckout, "focusVaultInitiatedCheckoutWindow")
        .mockImplementation();
      const promise = testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      const modal = document.querySelector(
        "[data-braintree-paypal-vault-initiated-checkout-modal]"
      );

      modal.click();

      expect(
        testContext.paypalCheckout.focusVaultInitiatedCheckoutWindow
      ).toBeCalledTimes(1);

      await promise;
    });

    it("only creates the modal once", async () => {
      jest.spyOn(document, "createElement");

      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(document.createElement).toBeCalledTimes(1);

      await testContext.paypalCheckout.startVaultInitiatedCheckout(
        testContext.options
      );

      expect(document.createElement).toBeCalledTimes(1);
    });

    it("rejects when user cancels", async () => {
      testContext.fakeFrameService.open.mockImplementation(
        yieldsAsync({
          code: "FRAME_SERVICE_FRAME_CLOSED",
        })
      );

      await expect(
        testContext.paypalCheckout.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toMatchObject({
        code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED",
        message: "Customer closed PayPal popup before authorizing.",
      });

      expect(analytics.sendEventPlus).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.canceled.by-customer",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );
      expect(testContext.fakeFrameService.close).toBeCalledTimes(0);
    });

    it("rejects when frame service errors with a popup failed error", async () => {
      const err = new Error("Something went wrong");

      err.code = "FRAME_SERVICE_FRAME_OPEN_FAILED";

      testContext.fakeFrameService.open.mockImplementation(yieldsAsync(err));

      await expect(
        testContext.paypalCheckout.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toMatchObject({
        code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED",
        message:
          "PayPal popup failed to open, make sure to initiate the vault checkout in response to a user action.",
        details: {
          originalError: err,
        },
      });

      expect(analytics.sendEventPlus).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.failed.popup-not-opened",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );
      expect(testContext.fakeFrameService.close).toBeCalledTimes(1);
    });

    it("rejects when frame service errors with a generic error", async () => {
      const err = new Error("Something went wrong");

      testContext.fakeFrameService.open.mockImplementation(yieldsAsync(err));

      await expect(
        testContext.paypalCheckout.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toThrow(err);

      expect(testContext.fakeFrameService.close).toBeCalledTimes(1);
    });

    it("rejects when tokenizing fails", async () => {
      testContext.paypalCheckout.tokenizePayment.mockRejectedValue(
        new Error("foo")
      );

      await expect(
        testContext.paypalCheckout.startVaultInitiatedCheckout(
          testContext.options
        )
      ).rejects.toThrow("foo");
    });
  });

  describe("focusVaultInitiatedCheckoutWindow", () => {
    it("calls focus on the frame service", async () => {
      await testContext.paypalCheckout.focusVaultInitiatedCheckoutWindow();

      expect(testContext.fakeFrameService.focus).toBeCalledTimes(1);
    });
  });

  describe("closeVaultInitiatedCheckoutWindow", () => {
    beforeEach(() => {
      testContext.paypalCheckout._contextId = "context-id";
      testContext.paypalCheckout._flow = "checkout";

      analytics.sendEventPlus = jest.fn();
    });

    it("calls close on the frame service", async () => {
      await testContext.paypalCheckout.closeVaultInitiatedCheckoutWindow();

      expect(testContext.fakeFrameService.close).toBeCalledTimes(1);
    });

    it("sends an analytics event when vault initiated checkout is in progress", async () => {
      await testContext.paypalCheckout.closeVaultInitiatedCheckoutWindow();
      expect(analytics.sendEventPlus).not.toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.canceled.by-merchant",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );

      const promise = testContext.paypalCheckout.startVaultInitiatedCheckout({
        amount: "10.00",
        currency: "USD",
        vaultInitiatedCheckoutPaymentMethodToken: "fake-nonce",
      });

      await testContext.paypalCheckout.closeVaultInitiatedCheckoutWindow();

      expect(analytics.sendEventPlus).toBeCalledWith(
        expect.anything(),
        "paypal-checkout.startVaultInitiatedCheckout.canceled.by-merchant",
        {
          flow: testContext.paypalCheckout._flow,
          context_id: testContext.paypalCheckout._contextId,
        }
      );

      await promise;
    });
  });

  describe("tokenizePayment", () => {
    beforeEach(() => {
      testContext.paypalCheckout._contextId = "context-id";
      testContext.paypalCheckout._flow = "checkout";

      analytics.sendEventPlus = jest.fn();
    });

    it("rejects with a BraintreeError if a non-Braintree error comes back from the client", () => {
      const error = new Error("Error");

      testContext.client.request.mockRejectedValue(error);

      return testContext.paypalCheckout.tokenizePayment({}).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("PAYPAL_ACCOUNT_TOKENIZATION_FAILED");
        expect(err.message).toBe("Could not tokenize user's PayPal account.");
        expect(err.details.originalError).toBe(error);
      });
    });

    it("rejects with the error if the client error is a BraintreeError", () => {
      const btError = new BraintreeError({
        type: "MERCHANT",
        code: "BT_CODE",
        message: "message.",
      });

      testContext.client.request.mockRejectedValue(btError);

      return testContext.paypalCheckout.tokenizePayment({}).catch((err) => {
        expect(err).toBe(btError);
      });
    });

    it("includes intent from createPayment", () => {
      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{ nonce: "nonce", type: "PayPal" }],
      });

      testContext.paypalCheckout.intentFromCreatePayment = "saved intent";

      return testContext.paypalCheckout.tokenizePayment({}).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              intent: "saved intent",
            },
          },
        });
      });
    });

    it("resolves with blank account details in response if unavailable", () => {
      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{ nonce: "nonce", type: "PayPal" }],
      });

      return testContext.paypalCheckout
        .tokenizePayment({})
        .then(({ details, nonce, type }) => {
          expect(nonce).toBe("nonce");
          expect(type).toBe("PayPal");
          expect(details).toEqual({});
        });
    });

    it("resolves with account details if available", () => {
      const accountDetails = {
        payerInfo: { name: "foo" },
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: accountDetails,
          },
        ],
      });

      return testContext.paypalCheckout
        .tokenizePayment({})
        .then(({ details }) => {
          expect(details).toBe(accountDetails.payerInfo);
        });
    });

    it("resolves with creditFinancingOffered if available", () => {
      const accountDetails = {
        creditFinancingOffered: { foo: "bar" },
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: accountDetails,
          },
        ],
      });

      return testContext.paypalCheckout
        .tokenizePayment({})
        .then(({ creditFinancingOffered }) => {
          expect(creditFinancingOffered).toBe(
            accountDetails.creditFinancingOffered
          );
        });
    });

    it("resolves with cobrandedCardLabel if available", () => {
      const accountDetails = {
        cobrandedCardLabel: "foo",
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: accountDetails,
          },
        ],
      });

      return testContext.paypalCheckout
        .tokenizePayment({})
        .then(({ cobrandedCardLabel }) => {
          expect(cobrandedCardLabel).toBe(accountDetails.cobrandedCardLabel);
        });
    });

    it("passes along intent property", () => {
      const accountDetails = {
        creditFinancingOffered: { foo: "bar" },
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: accountDetails,
          },
        ],
      });

      return testContext.paypalCheckout
        .tokenizePayment({
          intent: "sale",
        })
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                intent: "sale",
              },
            },
          });
        });
    });

    it("passes along merchantAccountId without billing token", () => {
      const accountDetails = {
        creditFinancingOffered: { foo: "bar" },
      };

      testContext.paypalCheckoutWithMerchantAccountId = new PayPalCheckout({
        merchantAccountId: "alt-merchant-account-id",
      });

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: accountDetails,
          },
        ],
      });

      return testContext.paypalCheckoutWithMerchantAccountId
        ._initialize({
          client: testContext.client,
        })
        .then((pp) => pp.tokenizePayment({}))
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              merchantAccountId: "alt-merchant-account-id",
            },
          });
        });
    });

    it("passes along merchantAccountId with billing token", () => {
      const accountDetails = {
        creditFinancingOffered: { foo: "bar" },
      };

      testContext.paypalCheckoutWithMerchantAccountId = new PayPalCheckout({
        merchantAccountId: "alt-merchant-account-id",
      });

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: accountDetails,
          },
        ],
      });

      return testContext.paypalCheckoutWithMerchantAccountId
        ._initialize({
          client: testContext.client,
        })
        .then((pp) =>
          pp.tokenizePayment({
            billingToken: "token",
          })
        )
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              merchantAccountId: "alt-merchant-account-id",
            },
          });
        });
    });

    it("does not resolve with creditFinancingOffered when not available", () => {
      testContext.client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: {},
          },
        ],
      });

      return testContext.paypalCheckout
        .tokenizePayment({})
        .then(({ creditFinancingOffered }) => {
          expect(creditFinancingOffered).toBeFalsy();
        });
    });

    it("sends a tokenization event when tokenization starts", () =>
      testContext.paypalCheckout
        .tokenizePayment({ billingToken: "token" })
        .then(() => {
          expect(analytics.sendEventPlus).toHaveBeenCalledWith(
            testContext.paypalCheckout._clientPromise,
            "paypal-checkout.tokenization.started",
            {
              flow: testContext.paypalCheckout._flow,
              context_id: testContext.paypalCheckout._contextId,
            }
          );
        }));

    it("sends a request to payment_methods/paypal_accounts", () =>
      testContext.paypalCheckout
        .tokenizePayment({ billingToken: "token" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            endpoint: "payment_methods/paypal_accounts",
            method: "post",
          });
        }));

    it("calls analytics event when tokenization succeeds", () => {
      const client = testContext.client;

      client.request.mockResolvedValue({});

      return testContext.paypalCheckout.tokenizePayment({}).then(() => {
        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          testContext.paypalCheckout._clientPromise,
          "paypal-checkout.tokenization.success",
          {
            flow: testContext.paypalCheckout._flow,
            context_id: testContext.paypalCheckout._contextId,
          }
        );
      });
    });

    it("calls analytics event when credit offer is accepted", () => {
      const client = testContext.client;

      client.request.mockResolvedValue({
        paypalAccounts: [
          {
            nonce: "nonce",
            type: "PayPal",
            details: {
              creditFinancingOffered: {},
            },
          },
        ],
      });

      return testContext.paypalCheckout.tokenizePayment({}).then(() => {
        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          testContext.paypalCheckout._clientPromise,
          "paypal-checkout.credit.accepted",
          {
            flow: testContext.paypalCheckout._flow,
            context_id: testContext.paypalCheckout._contextId,
          }
        );
      });
    });

    it("passes the saved risk correlation id as the correlationId when present", () => {
      testContext.paypalCheckout._riskCorrelationId = "risk-id";

      testContext.paypalCheckout.tokenizePayment({}).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              correlationId: "risk-id",
            },
          },
        });
      });
    });

    it("passes the BA token as the correlationId when present", () =>
      testContext.paypalCheckout
        .tokenizePayment({ billingToken: "BA-1234" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                correlationId: "BA-1234",
              },
            },
          });
        }));

    it("passes the EC token as the correlationId when present", () =>
      testContext.paypalCheckout
        .tokenizePayment({ paymentToken: "EC-1234" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                correlationId: "EC-1234",
              },
            },
          });
        }));

    it("prefers the risk correlation id over the billing token", () => {
      testContext.paypalCheckout._riskCorrelationId = "risk-id";

      testContext.paypalCheckout
        .tokenizePayment({
          billingToken: "BA-123",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                correlationId: "risk-id",
              },
            },
          });
        });
    });

    it("prefers the billing token over ec token", () => {
      testContext.paypalCheckout
        .tokenizePayment({
          billingToken: "BA-123",
          ecToken: "EC-1234",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                correlationId: "BA-123",
              },
            },
          });
        });
    });

    it("validates if flow is vault and auth is not tokenization key", () => {
      testContext.configuration.authorizationType = "CLIENT_TOKEN";
      testContext.paypalCheckout._flow = "vault";

      return testContext.paypalCheckout
        .tokenizePayment({ billingToken: "token" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                options: {
                  validate: true,
                },
              },
            },
          });
        });
    });

    it("does not validate if merchant opts out even when flow is vault and auth is not tokenization key", () => {
      testContext.configuration.authorizationType = "CLIENT_TOKEN";
      testContext.paypalCheckout._flow = "vault";

      return testContext.paypalCheckout
        .tokenizePayment({
          billingToken: "token",
          vault: false,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                options: {
                  validate: false,
                },
              },
            },
          });
        });
    });

    it("does not validate if merchant is using the pay later flow", () => {
      testContext.configuration.authorizationType = "CLIENT_TOKEN";
      testContext.paypalCheckout._flow = "checkout";

      return testContext.paypalCheckout
        .tokenizePayment({
          billingToken: "token",
          paymentID: "payment-id",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                options: {
                  validate: false,
                },
              },
            },
          });
        });
    });

    it("does not validate if flow is vault and auth is tokenization key", () => {
      testContext.configuration.authorizationType = "TOKENIZATION_KEY";
      testContext.paypalCheckout._flow = "vault";

      return testContext.paypalCheckout
        .tokenizePayment({ billingToken: "token" })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                options: {
                  validate: false,
                },
              },
            },
          });
        });
    });

    it("sends along checkout params", () =>
      testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          paymentID: "payment id",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                paymentToken: "payment id",
                payerId: "payer id",
              },
            },
          });
        }));

    it("passes along paymentID as paymentToken when paymentID and billingToken are present and flow is checkout", () => {
      testContext.paypalCheckout._flow = "checkout";
      testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          paymentID: "payment id",
          billingToken: "ba token",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                paymentToken: "payment id",
                payerId: "payer id",
              },
            },
          });
        });
    });

    it("passes along orderId as payemntToken when orderId and billingToken are present and flow is checkout", () => {
      testContext.paypalCheckout._flow = "checkout";
      testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          orderID: "order id",
          billingToken: "ba token",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                paymentToken: "order id",
                payerId: "payer id",
              },
            },
          });
        });
    });

    it("passes along billingAgreementToken when orderId and billingToken are present and flow is vault", () => {
      testContext.paypalCheckout._flow = "vault";
      testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          orderID: "order id",
          billingToken: "ba token",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                billingAgreementToken: "ba token",
              },
            },
          });
        });
    });

    it("passes along orderId as payemntToken when orderId is present and paymentID is not present", () =>
      testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          orderID: "order id",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                paymentToken: "order id",
                payerId: "payer id",
              },
            },
          });
        }));

    it("passes along unvettedMerchant param as true", () => {
      testContext.configuration.gatewayConfiguration.paypal.unvettedMerchant = true;

      return testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          paymentID: "payment id",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                unilateral: true,
              },
            },
          });
        });
    });

    it("passes along unvettedMerchant param as false", () => {
      testContext.configuration.gatewayConfiguration.paypal.unvettedMerchant = false;

      return testContext.paypalCheckout
        .tokenizePayment({
          payerID: "payer id",
          paymentID: "payment id",
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                unilateral: false,
              },
            },
          });
        });
    });

    it("does not send along billing token if no token is provided", () =>
      testContext.paypalCheckout.tokenizePayment({}).then(() => {
        const arg = testContext.client.request.mock.calls[0][0];

        expect(arg.data.paypalAccount).not.toHaveProperty(
          "billingAgreementToken"
        );
      }));

    it("does not send along billing token if both a token and a payment ID are provided", () =>
      testContext.paypalCheckout
        .tokenizePayment({
          billingToken: "billing token",
          paymentID: "payment id",
        })
        .then(() => {
          const arg = testContext.client.request.mock.calls[0][0];

          expect(arg.data.paypalAccount).not.toHaveProperty(
            "billingAgreementToken"
          );
        }));

    it("sends a tokenization failure event when request fails", () => {
      const client = testContext.client;

      client.request.mockRejectedValue(new Error("Error"));

      return testContext.paypalCheckout.tokenizePayment({}).catch(() => {
        expect(analytics.sendEventPlus).toHaveBeenCalledWith(
          testContext.paypalCheckout._clientPromise,
          "paypal-checkout.tokenization.failed",
          {
            flow: testContext.paypalCheckout._flow,
            context_id: testContext.paypalCheckout._contextId,
          }
        );
      });
    });

    it("passes the billingToken as the billingAgreementToken when both flow and paymentId are null", () => {
      testContext.paypalCheckout._flow = null;
      testContext.paypalCheckout
        .tokenizePayment({
          billingToken: "BA-token123",
          paymentId: null,
        })
        .then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              paypalAccount: {
                billingAgreementToken: "BA-token123",
              },
            },
          });
        });
    });
  });

  describe("getClientId", () => {
    it("resolves with the client id from the GW configuration", () => {
      return testContext.paypalCheckout.getClientId().then((id) => {
        expect(id).toBe("client-id");
      });
    });
  });

  describe("loadPayPalSDK", () => {
    let fakeScript, firstHeadElement;

    beforeEach(() => {
      fakeScript = document.createElement("script");
      firstHeadElement = document.createElement("meta");
      document.head.appendChild(firstHeadElement);
      jest.spyOn(document.head, "insertBefore").mockImplementation();
      jest.spyOn(document, "createElement").mockReturnValueOnce(fakeScript);
      jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation();
      jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation();
    });

    afterEach(() => {
      if (fakeScript.parentNode) {
        fakeScript.parentNode.removeChild(fakeScript);
      }
    });

    it("loads the PayPal script onto the top of the head", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(document.head.insertBefore).toBeCalledTimes(1);
        expect(document.head.insertBefore).toBeCalledWith(
          fakeScript,
          firstHeadElement
        );
        expect(fakeScript.src).toMatch("https://www.paypal.com/sdk/js?");
      });
    });

    it("loads the staging PayPal script when specified", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({ env: "stage" });

      fakeScript.onload();

      return promise.then(() => {
        expect(document.head.insertBefore).toBeCalledTimes(1);
        expect(document.head.insertBefore).toBeCalledWith(
          fakeScript,
          firstHeadElement
        );
        expect(fakeScript.src).toMatch(
          "https://www.msmaster.qa.paypal.com/sdk/js?"
        );
      });
    });

    it("loads the teBraintree PayPal script when specified", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({ env: "teBraintree" });

      fakeScript.onload();

      return promise.then(() => {
        expect(document.head.insertBefore).toBeCalledTimes(1);
        expect(document.head.insertBefore).toBeCalledWith(
          fakeScript,
          firstHeadElement
        );
        expect(fakeScript.src).toMatch(
          "https://www.braintree.stage.paypal.com/sdk/js?"
        );
      });
    });

    it("resolves with the PayPal Checkout instance", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then((ppInstance) => {
        expect(ppInstance).toBe(instance);
      });
    });

    it("uses the client id from getClientId by default", () => {
      const instance = testContext.paypalCheckout;

      jest.spyOn(instance, "getClientId").mockResolvedValue("fake-id");

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(instance.getClientId).toBeCalledTimes(1);
        expect(fakeScript.src).toMatch("client-id=fake-id");
      });
    });

    it("can use a custom client id", () => {
      const instance = testContext.paypalCheckout;

      jest.spyOn(instance, "getClientId").mockResolvedValue("wrong-id");

      const promise = instance.loadPayPalSDK({
        "client-id": "custom-id",
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(instance.getClientId).toBeCalledTimes(0);
        expect(fakeScript.src).toMatch("client-id=custom-id");
      });
    });

    it("uses components=buttons by default", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("components=buttons");
      });
    });

    it("can pass a custom components property", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        components: "messages,buttons,mark",
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("components=messages%2Cbuttons%2Cmark");
      });
    });

    it("uses intent=authorize by default for checkout flow", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("intent=authorize");
      });
    });

    it("passes a default intent when using the vault flow", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        vault: true,
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("intent=tokenize");
      });
    });

    it("can pass a custom intent property", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        intent: "capture",
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("intent=capture");
      });
    });

    it("uses currency=USD by default", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("currency=USD");
      });
    });

    it("does not pass a default currency when using the vault flow", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        vault: true,
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).not.toMatch("currency=");
      });
    });

    it("can pass a custom currency property", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        currency: "XYZ",
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("currency=XYZ");
      });
    });

    it("can pass arbitrary params", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        foo: "foo",
        bar: "bar",
        baz: "baz",
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.src).toMatch("foo=foo");
        expect(fakeScript.src).toMatch("bar=bar");
        expect(fakeScript.src).toMatch("baz=baz");
      });
    });

    it("always uses analytics session ID as the client-metadata-id data attribute when client-metadata-id not passed", () => {
      const instance = testContext.paypalCheckout;
      const promise = instance.loadPayPalSDK();
      const expectedId = testContext.configuration.analyticsMetadata.sessionId;

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-client-metadata-id")).toEqual(
          expectedId
        );
      });
    });

    it("always uses client-metadata-id data attribute when passed", () => {
      const instance = testContext.paypalCheckout;
      const someCmid = "some-cmid";
      const inputOptions = {
        dataAttributes: {
          "client-metadata-id": someCmid,
        },
      };
      const promise = instance.loadPayPalSDK(inputOptions);

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-client-metadata-id")).toEqual(
          someCmid
        );
      });
    });

    it("can pass data attributes", () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        dataAttributes: {
          foo: "bar",
          "client-token": "value",
          amount: "100.00",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-foo")).toBe("bar");
        expect(fakeScript.getAttribute("data-client-token")).toBe("value");
        expect(fakeScript.getAttribute("data-amount")).toBe("100.00");
        expect(fakeScript.src).not.toMatch("dataAttributes");
        expect(fakeScript.src).not.toMatch("foo");
        expect(fakeScript.src).not.toMatch("client-token");
        expect(fakeScript.src).not.toMatch("foo");
      });
    });

    it('omits "data-" prefix if included', () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        dataAttributes: {
          "data-foo": "bar",
          "data-client-token": "value",
          "data-amount": "100.00",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-foo")).toBe("bar");
        expect(fakeScript.getAttribute("data-client-token")).toBe("value");
        expect(fakeScript.getAttribute("data-amount")).toBe("100.00");
        expect(fakeScript.getAttribute("data-data-foo")).toBeFalsy();
        expect(fakeScript.getAttribute("data-data-client-token")).toBeFalsy();
        expect(fakeScript.getAttribute("data-data-amount")).toBeFalsy();
      });
    });

    it('does not omit "data-" when used elsewhere in the properites', () => {
      const instance = testContext.paypalCheckout;

      const promise = instance.loadPayPalSDK({
        dataAttributes: {
          "foo-data-bar": "baz",
          "dataclient-token": "value",
          "amountdata-": "100.00",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-foo-data-bar")).toBe("baz");
        expect(fakeScript.getAttribute("data-dataclient-token")).toBe("value");
        expect(fakeScript.getAttribute("data-amountdata-")).toBe("100.00");
      });
    });

    it("always sets data-sdk-integration-source data attribute", (done) => {
      const instance = testContext.paypalCheckout;
      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      promise.then(() => {
        expect(fakeScript.getAttribute("data-sdk-integration-source")).toBe(
          "BRAINTREE_WEB_SDK"
        );

        done();
      });
    });

    it("passes authorization fingerprint as data-user-id-token when a client token is used and is enabled for setting it", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBe(
          "auth-fingerprint"
        );

        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining(
            "https://www.sandbox.paypal.com/smart/buttons/preload?"
          )
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("user-id-token=auth-fingerprint")
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("client-id=client-id")
        );
      });
    });

    it("uses production domain for preload pixel when environemnt is production", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;
      instance._authorizationInformation.environment = "production";

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining(
            "https://www.paypal.com/smart/buttons/preload?"
          )
        );
      });
    });

    it("can pass amount, currency and merchant id along to preload pixel", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;

      const promise = instance.loadPayPalSDK({
        currency: "USD",
        "merchant-id": "merchantid",
        dataAttributes: {
          amount: "123.45",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("currency=USD")
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("merchant-id=merchantid")
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("amount=123.45")
        );
      });
    });

    it("passes authorization fingerprint as data-user-id-token without the customer query param", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;
      instance._authorizationInformation.fingerprint =
        "auth-fingerprint?customer=";

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBe(
          "auth-fingerprint"
        );

        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("user-id-token=auth-fingerprint")
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("client-id=client-id")
        );
      });
    });

    it("does not create data-user-id-token attribute for tokenization keys", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;
      delete instance._authorizationInformation.fingerprint;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBeFalsy();
        expect(
          document.querySelector('[data-preload-id="paypal-preload-pixel-img"]')
        ).toBeFalsy();
      });
    });

    it("does not pass authorization fingerprint as data-user-id-token when not enabled for it", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = false;

      const promise = instance.loadPayPalSDK();

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBeFalsy();
        expect(
          document.querySelector('[data-preload-id="paypal-preload-pixel-img"]')
        ).toBeFalsy();
      });
    });

    it("uses passed in user-id-token when authorization fingerprint also exists", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;
      instance._authorizationInformation.fingerprint =
        "unused-auth-fingerprint";

      const promise = instance.loadPayPalSDK({
        dataAttributes: {
          "user-id-token": "custom-auth-fingerprint",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBe(
          "custom-auth-fingerprint"
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("user-id-token=custom-auth-fingerprint")
        );
      });
    });

    it("uses passed in data-user-id-token when authorization fingerprint also exists", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;
      instance._authorizationInformation.fingerprint =
        "unused-auth-fingerprint";

      const promise = instance.loadPayPalSDK({
        dataAttributes: {
          "data-user-id-token": "custom-auth-fingerprint",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBe(
          "custom-auth-fingerprint"
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("user-id-token=custom-auth-fingerprint")
        );
      });
    });

    it("uses passed in user-id-token over data-user-id-token when both data attributes are passed", () => {
      const instance = testContext.paypalCheckout;

      instance._autoSetDataUserIdToken = true;
      instance._authorizationInformation.fingerprint =
        "unused-auth-fingerprint";

      const promise = instance.loadPayPalSDK({
        dataAttributes: {
          "user-id-token": "custom-auth-fingerprint",
          "data-user-id-token": "custom-auth-fingerprint-with-data-prefix",
        },
      });

      fakeScript.onload();

      return promise.then(() => {
        expect(fakeScript.getAttribute("data-user-id-token")).toBe(
          "custom-auth-fingerprint"
        );
        expect(XMLHttpRequest.prototype.open).toBeCalledWith(
          "GET",
          expect.stringContaining("user-id-token=custom-auth-fingerprint")
        );
      });
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", () => {
      const instance = testContext.paypalCheckout;

      return instance.teardown().then(() => {
        methods(PayPalCheckout.prototype).forEach((method) => {
          try {
            instance[method]();
          } catch (err) {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe(BraintreeError.types.MERCHANT);
            expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(err.message).toBe(
              `${method} cannot be called after teardown.`
            );
          }
        });
      });
    });

    it("removes PayPal script from the page if it exists", () => {
      const instance = testContext.paypalCheckout;

      instance._paypalScript = document.createElement("script");

      jest.spyOn(document.body, "removeChild");
      document.body.appendChild(instance._paypalScript);

      return instance.teardown().then(() => {
        expect(document.body.removeChild).toBeCalledTimes(1);
        expect(document.body.removeChild).toBeCalledWith(
          instance._paypalScript
        );
      });
    });

    it("does not remove paypal script if it is not on the DOM", () => {
      const instance = testContext.paypalCheckout;

      instance._paypalScript = document.createElement("script");

      jest.spyOn(document.body, "removeChild");

      return instance.teardown().then(() => {
        expect(document.body.removeChild).toBeCalledTimes(0);
      });
    });

    it("tears down frameservice", () => {
      const instance = testContext.paypalCheckout;

      return instance.teardown().then(() => {
        expect(testContext.fakeFrameService.teardown).toBeCalledTimes(1);
      });
    });

    it("ignores frame service if frame service errored in creation", async () => {
      // fake having the frame service time out during set up
      frameService.create.mockImplementation();
      jest.useFakeTimers();

      const ppInstanceWithoutFrameservice = new PayPalCheckout({});

      await ppInstanceWithoutFrameservice._initialize({
        client: testContext.client,
      });

      jest.runOnlyPendingTimers();

      await ppInstanceWithoutFrameservice.teardown();

      expect(testContext.fakeFrameService.teardown).toBeCalledTimes(0);
    });
  });

  describe("_formatPaymentResourceData", () => {
    beforeEach(() => {
      testContext.configuration = {
        authorization: "development_testing_altpay_merchant",
        gatewayConfiguration: {
          paypal: {
            assetsUrl: "https://paypal.assets.url",
            displayName: "my brand",
          },
        },
      };
      testContext.config = {};
    });

    it("passes along payer_email if flow is vault and userAuthenticationEmail is passed", () => {
      const options = {
        flow: "vault",
        userAuthenticationEmail: "user@example.com",
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.payer_email).toBe("user@example.com");
    });

    it("passes along payer_email if flow is checkout and userAuthenticationEmail is passed", () => {
      const options = {
        flow: "checkout",
        userAuthenticationEmail: "user@example.com",
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.payer_email).toBe("user@example.com");
    });

    it("doesn't pass along payer_email if userAuthenticationEmail isn't passed", () => {
      const options = {
        flow: "vault",
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.payer_email).toBe(undefined);
    });

    it("passes along returnUrl when passed", () => {
      const options = {
        returnUrl: "www.example.com/return",
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.returnUrl).toBe("www.example.com/return");
    });

    it("passes along cancelUrl when passed", () => {
      const options = {
        cancelUrl: "www.example.com/cancel",
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.cancelUrl).toBe("www.example.com/cancel");
    });

    it("passes along appSwitchPreference when passed", () => {
      const options = {
        appSwitchPreference: {
          launchPaypalApp: true,
        },
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.appSwitchPreference.launchPaypalApp).toBe(true);
    });

    it("passes along shipping callback url if shippingCallbackUrl is passed", () => {
      const options = {
        shippingCallbackUrl: "www.example.com",
      };

      const actual = PayPalCheckout.prototype._formatPaymentResourceData.call(
        {
          _configuration: testContext.configuration,
          _formatPaymentResourceCheckoutData: jest.fn(),
          _formatPaymentResourceVaultData: jest.fn(),
        },
        options,
        testContext.config
      );

      expect(actual.shippingCallbackUrl).toBe("www.example.com");
    });
  });
});
