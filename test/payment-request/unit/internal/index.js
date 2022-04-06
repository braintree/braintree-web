"use strict";

jest.mock("framebus");
jest.mock("../../../../src/client/client");

const Bus = require("framebus");
const BraintreeError = require("../../../../src/lib/braintree-error");
const paymentRequestFrame = require("../../../../src/payment-request/internal/");
const { events } = require("../../../../src/payment-request/shared/constants");
const {
  fake,
  findFirstEventCallback,
  yieldsByEvent,
} = require("../../../helpers");
const Client = require("../../../../src/client/client");

describe("Payment Request Frame", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.completeStub = jest.fn();
    testContext.showStub = jest.fn();
    testContext.replyStub = jest.fn();
    testContext.addEventListenerStub = jest.fn();
    testContext.canMakePaymentStub = jest.fn();

    testContext.fakeClient = fake.client();
    testContext.fakeClient.gatewayConfiguration = {};

    jest.spyOn(Bus.prototype, "emit");
    jest.spyOn(Bus.prototype, "on");

    class PaymentRequest {
      constructor() {
        this.abort = jest.fn();
        this.addEventListener = testContext.addEventListenerStub;
        this.canMakePayment = testContext.canMakePaymentStub;
        this.id = "A0D44D4F-0B72-4F7F-85C3-1952C04DB253";
        this.shippingAddress = "foo";
        this.shippingType = "bar";
        this.show = testContext.showStub;
      }
    }

    window.PaymentRequest = PaymentRequest;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("create", () => {
    it("gets channel id from window hash", () => {
      window.location.hash = "123";

      paymentRequestFrame.create();

      expect(Bus).toBeCalledWith({
        channel: "123",
      });
      expect(window.bus).toBeInstanceOf(Bus);
    });

    it("emits a FRAME_READY event", () => {
      paymentRequestFrame.create();

      expect(Bus.prototype.emit).toHaveBeenCalledWith(
        events.FRAME_READY,
        expect.any(Function)
      );
    });

    it("emits a FRAME_CAN_MAKE_REQUESTS event", (done) => {
      let frameReadyHandler;

      paymentRequestFrame.create();

      frameReadyHandler = findFirstEventCallback(
        events.FRAME_READY,
        Bus.prototype.emit.mock.calls
      );
      frameReadyHandler(testContext.fakeClient);

      process.nextTick(() => {
        expect(Bus.prototype.emit).toHaveBeenNthCalledWith(
          2,
          events.FRAME_CAN_MAKE_REQUESTS
        );
        done();
      });
    });

    it("adds client to the global object", (done) => {
      let frameReadyHandler;

      paymentRequestFrame.create();

      frameReadyHandler = Bus.prototype.emit.mock.calls[0][1];

      frameReadyHandler(testContext.fakeClient);

      process.nextTick(() => {
        expect(window.client).toBeInstanceOf(Client);

        delete window.client;
        done();
      });
    });

    it("listens for initialize payment request event", () => {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).toHaveBeenCalledWith(
        events.PAYMENT_REQUEST_INITIALIZED,
        expect.any(Function)
      );
    });

    it("listens for can make payment event", () => {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).toHaveBeenCalledWith(
        events.CAN_MAKE_PAYMENT,
        expect.any(Function)
      );
    });

    it("listens for shipping address change event", () => {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).toHaveBeenCalledWith(
        events.UPDATE_SHIPPING_ADDRESS,
        expect.any(Function)
      );
    });

    it("calls update with on shipping address change event", () => {
      const data = {};

      window.shippingAddressChangeResolveFunction = jest.fn();
      Bus.prototype.on.mockImplementation(
        yieldsByEvent(events.UPDATE_SHIPPING_ADDRESS, data)
      );
      paymentRequestFrame.create();

      expect(window.shippingAddressChangeResolveFunction).toHaveBeenCalledTimes(
        1
      );
      expect(window.shippingAddressChangeResolveFunction).toHaveBeenCalledWith(
        data
      );
    });

    it("listens for shipping option change event", () => {
      paymentRequestFrame.create();

      expect(Bus.prototype.on).toHaveBeenCalledWith(
        events.UPDATE_SHIPPING_OPTION,
        expect.any(Function)
      );
    });

    it("calls update with on shipping option change event", () => {
      const data = {};

      window.shippingOptionChangeResolveFunction = jest.fn();
      Bus.prototype.on.mockImplementation(
        yieldsByEvent(events.UPDATE_SHIPPING_OPTION, data)
      );
      paymentRequestFrame.create();

      expect(window.shippingOptionChangeResolveFunction).toHaveBeenCalledTimes(
        1
      );
      expect(window.shippingOptionChangeResolveFunction).toHaveBeenCalledWith(
        data
      );
    });
  });

  describe("initializePaymentRequest", () => {
    beforeEach(() => {
      testContext.fakeDetails = {
        supportedPaymentMethods: ["basic-card"],
        details: {},
        options: {},
      };
      paymentRequestFrame.create();
      window.client = {
        request: jest.fn().mockResolvedValue({
          creditCards: [
            {
              nonce: "a-nonce",
              details: {},
            },
          ],
        }),
      };
    });

    afterEach(() => {
      delete window.bus;
      delete window.PaymentRequest;
      delete window.client;
    });

    it("initializes a payment request", () => {
      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "basic-card",
        details: {},
      });

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.showStub).toHaveBeenCalledTimes(1);
        });
    });

    it("creates listeners for shipping events when request shipping is passed", () => {
      testContext.showStub.mockResolvedValue({
        complete: jest.fn(),
        methodName: "basic-card",
        details: {},
      });
      testContext.fakeDetails.options.requestShipping = true;

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.addEventListenerStub).toHaveBeenCalledTimes(2);
          expect(testContext.addEventListenerStub).toHaveBeenNthCalledWith(
            1,
            "shippingaddresschange",
            expect.any(Function)
          );
          expect(testContext.addEventListenerStub).toHaveBeenNthCalledWith(
            2,
            "shippingoptionchange",
            expect.any(Function)
          );
        });
    });

    it("does not create listeners for shipping events when request shipping is not passed", () => {
      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "basic-card",
        details: {},
      });
      testContext.fakeDetails.options.requestShipping = false;

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.addEventListenerStub).not.toHaveBeenCalled();
        });
    });

    it("emits shipping address when shippingaddresschange event occurs", () => {
      const event = {
        target: {
          shippingAddress: {},
        },
        updateWith: jest.fn(),
      };

      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "basic-card",
        details: {},
      });
      testContext.fakeDetails.options.requestShipping = true;
      testContext.addEventListenerStub = jest.fn(
        yieldsByEvent("shippingaddresschange", event)
      );

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(Bus.prototype.emit).toHaveBeenCalledWith(
            events.SHIPPING_ADDRESS_CHANGE,
            event.target.shippingAddress
          );
          expect(event.updateWith).toHaveBeenCalledTimes(1);
          expect(window.shippingAddressChangeResolveFunction).toBeUndefined();
        });
    });

    it("emits selected shipping option when shippingoptionchange event occurs", () => {
      const event = {
        target: {
          shippingOption: "option",
        },
        updateWith: jest.fn(),
      };

      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "basic-card",
        details: {},
      });
      testContext.fakeDetails.options.requestShipping = true;
      testContext.addEventListenerStub = jest.fn(
        yieldsByEvent("shippingoptionchange", event)
      );

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(window.bus.emit).toHaveBeenCalledWith(
            events.SHIPPING_OPTION_CHANGE,
            event.target.shippingOption
          );
          expect(event.updateWith).toHaveBeenCalledTimes(1);
          expect(window.shippingOptionChangeResolveFunction).toBeUndefined();
        });
    });

    it("replies with TypeError when payment request is misconfigured", () => {
      const paymentRequestError = new Error("TypeError");

      window.PaymentRequest = () => {
        throw paymentRequestError;
      };

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([
            expect.objectContaining({
              name: "PAYMENT_REQUEST_INITIALIZATION_FAILED",
            }),
          ]);
        });
    });

    it("emits raw error when paymentRequest.show fails", () => {
      const showError = new Error();

      showError.name = "AbortError";
      testContext.showStub.mockRejectedValue(showError);

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([
            expect.objectContaining({
              name: "AbortError",
            }),
          ]);
        });
    });

    it("completes payment request when it succeeds", () => {
      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "basic-card",
        details: {},
      });

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.completeStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([
            null,
            {
              nonce: "a-nonce",
              details: {
                rawPaymentResponse: {
                  details: {},
                  methodName: "basic-card",
                },
              },
            },
          ]);
        });
    });

    it("completes payment request when it fails", () => {
      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "basic-card",
        details: {},
      });
      window.client.request.mockRejectedValue(new Error("some error"));

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.completeStub).toHaveBeenCalledTimes(1);
        });
    });

    it("emits an error when methodName in paymentResponse is unknown", () => {
      testContext.showStub.mockResolvedValue({
        complete: testContext.completeStub,
        methodName: "unknown",
        details: {},
      });

      return paymentRequestFrame
        .initializePaymentRequest(
          testContext.fakeDetails,
          testContext.replyStub
        )
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([
            expect.objectContaining({
              name: "UNSUPPORTED_METHOD_NAME",
            }),
          ]);
        });
    });

    describe("basic-card", () => {
      beforeEach(() => {
        testContext.showStub.mockResolvedValue({
          complete: testContext.completeStub,
          methodName: "basic-card",
          details: {
            cardNumber: "4111111111111111",
            expiryMonth: "12",
            expiryYear: "2034",
            cardSecurityCode: "123",
          },
        });
      });

      it("tokenizes result of payment request", () =>
        paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(window.client.request).toHaveBeenCalledTimes(1);
            expect(window.client.request).toHaveBeenCalledWith({
              endpoint: "payment_methods/credit_cards",
              method: "post",
              data: {
                creditCard: expect.objectContaining({
                  number: "4111111111111111",
                  expirationMonth: "12",
                  expirationYear: "2034",
                  cvv: "123",
                }),
              },
            });
          }));

      it("tokenizes billing address if included in payment request", () => {
        const billingAddress = {
          addressLine: ["First line", "Second line"],
          city: "Chicago",
          country: "US",
          dependentLocality: "",
          languageCode: "",
          organization: "Scruff McGruff Payments",
          phone: "+123456789",
          postalCode: "60188",
          recipient: "Scruff McGruff",
          region: "IL",
          sortingCode: "",
        };

        testContext.showStub.mockResolvedValue({
          complete: jest.fn(),
          methodName: "basic-card",
          details: {
            billingAddress: billingAddress,
            cardNumber: "4111111111111111",
            expiryMonth: "12",
            expiryYear: "2034",
            cardSecurityCode: "123",
          },
        });

        return paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(window.client.request).toHaveBeenCalledTimes(1);
            expect(window.client.request).toHaveBeenCalledWith({
              endpoint: "payment_methods/credit_cards",
              method: "post",
              data: {
                creditCard: expect.objectContaining({
                  billingAddress: {
                    company: "Scruff McGruff Payments",
                    locality: "Chicago",
                    region: "IL",
                    postalCode: "60188",
                    streetAddress: "First line",
                    extendedAddress: "Second line",
                    countryCodeAlpha2: "US",
                  },
                }),
              },
            });
          });
      });

      it("includes cardholder name if provided", () => {
        testContext.showStub.mockResolvedValue({
          complete: jest.fn(),
          methodName: "basic-card",
          details: {
            cardNumber: "4111111111111111",
            cardholderName: "First Last",
            expiryMonth: "12",
            expiryYear: "2034",
            cardSecurityCode: "123",
          },
        });

        return paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(window.client.request).toHaveBeenCalledTimes(1);
            expect(window.client.request).toHaveBeenCalledWith({
              endpoint: "payment_methods/credit_cards",
              method: "post",
              data: {
                creditCard: expect.objectContaining({
                  cardholderName: "First Last",
                }),
              },
            });
          });
      });

      it("emits tokenized payload with a payment request successful event", () => {
        testContext.showStub.mockResolvedValue({
          complete: jest.fn(),
          methodName: "basic-card",
          payerEmail: "asdf@example.com",
          payerName: "First Last",
          payerPhone: "+123457890",
          requestId: "68a2ac68-3f7e-42e4-82f9-a690d9166a16",
          shippingAddress: {},
          shippingOption: null,
          details: {
            billingAddress: {
              addressLine: ["foo", "bar"],
            },
            cardNumber: "4111111111111111",
            cardholderName: "First Last",
            expiryMonth: "12",
            expiryYear: "2034",
            cardSecurityCode: "123",
          },
        });

        return paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(testContext.replyStub).toHaveBeenCalledTimes(1);
            expect(testContext.replyStub.mock.calls[0][0][1]).toMatchObject({
              nonce: "a-nonce",
              details: {
                rawPaymentResponse: {
                  details: {
                    billingAddress: {
                      addressLine: ["foo", "bar"],
                    },
                    cardholderName: "First Last",
                  },
                  methodName: "basic-card",
                  payerEmail: "asdf@example.com",
                  payerName: "First Last",
                  payerPhone: "+123457890",
                  requestId: "68a2ac68-3f7e-42e4-82f9-a690d9166a16",
                  shippingAddress: {},
                  shippingOption: null,
                },
              },
            });
          });
      });

      it("emits tokenization error with a payment request failed event", () => {
        const error = new BraintreeError({
          type: "MERCHANT",
          code: "SOME_CODE",
          message: "a message",
        });

        window.client.request.mockRejectedValue(error);

        return paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(testContext.replyStub).toHaveBeenCalledTimes(1);
            expect(testContext.replyStub.mock.calls[0][0][0]).toMatchObject({
              code: "SOME_CODE",
              message: "a message",
              name: "BraintreeError",
            });
          });
      });
    });

    describe("pay with google", () => {
      beforeEach(() => {
        testContext.showStub.mockResolvedValue({
          complete: testContext.completeStub,
          methodName: "https://google.com/pay",
          requestId: "68a2ac68-3f7e-42e4-82f9-a690d9166a16",
          details: {
            paymentMethodToken: {
              token: JSON.stringify({
                androidPayCards: [
                  {
                    type: "AndroidPay",
                    nonce: "a-nonce",
                    details: {},
                  },
                ],
              }),
            },
          },
        });
      });

      it("emits tokenized payload with a payment request successful event", () =>
        paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(testContext.replyStub).toHaveBeenCalledTimes(1);
            expect(testContext.replyStub.mock.calls[0][0][1]).toMatchObject({
              nonce: "a-nonce",
              type: "AndroidPay",
              details: {
                rawPaymentResponse: {
                  details: {},
                  methodName: "https://google.com/pay",
                  requestId: "68a2ac68-3f7e-42e4-82f9-a690d9166a16",
                },
              },
            });
          }));

      it("emits an error when gateway returns an error", () => {
        testContext.showStub.mockResolvedValue({
          complete: testContext.completeStub,
          methodName: "https://google.com/pay",
          requestId: "68a2ac68-3f7e-42e4-82f9-a690d9166a16",
          details: {
            paymentMethodToken: {
              token: JSON.stringify({
                error: "some-error",
              }),
            },
          },
        });

        return paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(testContext.replyStub).toHaveBeenCalledTimes(1);
            expect(testContext.replyStub).toHaveBeenCalledWith([
              expect.objectContaining({
                name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR",
              }),
            ]);
          });
      });

      it("emits an error when Gateway response is not parsable", () => {
        testContext.showStub.mockResolvedValue({
          complete: testContext.completeStub,
          methodName: "https://google.com/pay",
          requestId: "68a2ac68-3f7e-42e4-82f9-a690d9166a16",
          details: {
            paymentMethodToken: {
              token: '{foo:"bar',
            },
          },
        });

        return paymentRequestFrame
          .initializePaymentRequest(
            testContext.fakeDetails,
            testContext.replyStub
          )
          .then(() => {
            expect(testContext.replyStub).toHaveBeenCalledTimes(1);
            expect(testContext.replyStub).toHaveBeenCalledWith([
              expect.objectContaining({
                name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR",
              }),
            ]);
          });
      });
    });
  });

  describe("makePaymentRequest", () => {
    beforeEach(() => {
      testContext.fakeDetails = {
        supportedPaymentMethods: ["basic-card"],
        details: {},
        options: {},
      };
    });

    it("initializes a payment request", () => {
      testContext.canMakePaymentStub.mockResolvedValue(true);

      return paymentRequestFrame
        .canMakePayment(testContext.fakeDetails, testContext.replyStub)
        .then(() => {
          expect(testContext.canMakePaymentStub).toHaveBeenCalledTimes(1);
        });
    });

    it("replies with true when canMakePayment resolves with true", () => {
      testContext.canMakePaymentStub.mockResolvedValue(true);

      return paymentRequestFrame
        .canMakePayment(testContext.fakeDetails, testContext.replyStub)
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([null, true]);
        });
    });

    it("replies with false when canMakePayment resolves with false", () => {
      testContext.canMakePaymentStub.mockResolvedValue(false);

      return paymentRequestFrame
        .canMakePayment(testContext.fakeDetails, testContext.replyStub)
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([null, false]);
        });
    });

    it("replies with error when payment request initialization fails", () => {
      const paymentRequestError = new Error("TypeError");

      window.PaymentRequest = () => {
        throw paymentRequestError;
      };

      return paymentRequestFrame
        .canMakePayment(testContext.fakeDetails, testContext.replyStub)
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([
            expect.objectContaining({
              name: "PAYMENT_REQUEST_INITIALIZATION_FAILED",
            }),
          ]);
        });
    });

    it("replies with error when canMakePayment fails", () => {
      const paymentRequestError = new Error("canMakePaymentError");

      paymentRequestError.name = "CanMakePaymentError";
      testContext.canMakePaymentStub.mockRejectedValue(paymentRequestError);

      return paymentRequestFrame
        .canMakePayment(testContext.fakeDetails, testContext.replyStub)
        .then(() => {
          expect(testContext.replyStub).toHaveBeenCalledTimes(1);
          expect(testContext.replyStub).toHaveBeenCalledWith([
            expect.objectContaining({
              name: "CanMakePaymentError",
            }),
          ]);
        });
    });
  });
});
