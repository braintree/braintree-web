import Framebus from "framebus";
import internal from "../../../../src/hosted-fields/internal/index";
import frameName from "../../../../src/hosted-fields/internal/get-frame-name";
import { events } from "../../../../src/hosted-fields/shared/constants";
import browserDetection from "../../../../src/hosted-fields/shared/browser-detection";
import { CreditCardForm } from "../../../../src/hosted-fields/internal/models/credit-card-form";
import analytics from "../../../../src/lib/analytics";
import _imp0 from "../../../helpers";

const {
  fake: { configuration },
  yieldsByEventAsync,
} = _imp0;

import { triggerEvent } from "../helpers";
import assembleIFrames from "../../../../src/hosted-fields/internal/assemble-iframes";
import BraintreeError from "../../../../src/lib/braintree-error";
import focusIntercept from "../../../../src/hosted-fields/shared/focus-intercept";

describe("internal", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    location.hash = "fake-channel";

    testContext.fakeConfig = {
      fields: {
        number: {},
        cvv: {},
      },
      orderedFields: ["number", "cvv"],
    };

    testContext.cardForm = new CreditCardForm(testContext.fakeConfig);
    vi.spyOn(frameName, "getFrameName").mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialize", () => {
    beforeEach(() => {
      frameName.getFrameName.mockReturnValue("cvv");
      vi.spyOn(internal, "initialize");
      internal.initialize(testContext.cardForm);
    });

    it("calls FieldComponent to generate the input", () => {
      expect(document.body).toMatchSnapshot();
    });

    it("calls initialize with a CreditCardForm", () => {
      expect(internal.initialize).toHaveBeenCalledWith(
        expect.any(CreditCardForm)
      );
    });

    describe("text inputs", () => {
      it("sets up autofill inputs for number input", () => {
        let cvv, expMonth, expYear, cardholderName;

        document.body.innerHTML = "";

        frameName.getFrameName.mockReturnValue("number");
        internal.initialize(testContext.cardForm);

        cardholderName = document.querySelector(
          "#cardholder-name-autofill-field"
        );
        cvv = document.querySelector("#cvv-autofill-field");
        expMonth = document.querySelector("#expiration-month-autofill-field");
        expYear = document.querySelector("#expiration-year-autofill-field");

        expect(cardholderName).toBeDefined();
        expect(cvv).toBeDefined();
        expect(expMonth).toBeDefined();
        expect(expYear).toBeDefined();
        expect(cardholderName.autocomplete).toBe("cc-name");
        expect(cvv.autocomplete).toBe("cc-csc");
        expect(expMonth.autocomplete).toBe("cc-exp-month");
        expect(expYear.autocomplete).toBe("cc-exp-year");
        expect(cardholderName.tabIndex).toBe(-1);
        expect(cvv.tabIndex).toBe(-1);
        expect(expMonth.tabIndex).toBe(-1);
        expect(expYear.tabIndex).toBe(-1);
        expect(cardholderName.getAttribute("aria-hidden")).toBe("true");
        expect(cvv.getAttribute("aria-hidden")).toBe("true");
        expect(expMonth.getAttribute("aria-hidden")).toBe("true");
        expect(expYear.getAttribute("aria-hidden")).toBe("true");
      });

      it("does not set up autofill mock input for the real field input", () => {
        document.body.innerHTML = "";

        frameName.getFrameName.mockReturnValue("cvv");
        internal.initialize(testContext.cardForm);

        expect(document.querySelector("#cvv-autofill-field")).toBeFalsy();
      });

      it("does not set up autofill mock inputs for expiration month or year when expiration date is used", () => {
        document.body.innerHTML = "";

        testContext.fakeConfig.fields.expirationDate = {};
        testContext.fakeConfig.orderedFields = [
          "number",
          "cvv",
          "expirationDate",
        ];
        testContext.cardForm = new CreditCardForm(testContext.fakeConfig);

        frameName.getFrameName.mockReturnValue("expirationDate");
        internal.initialize(testContext.cardForm);

        expect(
          document.querySelector("#expiration-month-autofill-field")
        ).toBeFalsy();
        expect(
          document.querySelector("#expiration-year-autofill-field")
        ).toBeFalsy();
      });

      it("periodically checks for changes to the values of the hidden inputs", () => {
        let cvv, expMonth, expYear, cardholderName;

        document.body.innerHTML = "";

        vi.useFakeTimers();
        vi.spyOn(CreditCardForm.prototype, "applyAutofillValues");
        frameName.getFrameName.mockReturnValue("number");
        internal.initialize(testContext.cardForm);

        cvv = document.querySelector("#cvv-autofill-field");
        expMonth = document.querySelector("#expiration-month-autofill-field");
        expYear = document.querySelector("#expiration-year-autofill-field");
        cardholderName = document.querySelector(
          "#cardholder-name-autofill-field"
        );

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).not.toBeCalled();

        cvv.value = "123";

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).toBeCalledTimes(1);
        expect(CreditCardForm.prototype.applyAutofillValues).toBeCalledWith({
          cardholderName: "",
          number: "",
          expirationMonth: "",
          expirationYear: "",
          cvv: "123",
        });

        CreditCardForm.prototype.applyAutofillValues.mockClear();

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).not.toBeCalled();

        expMonth.value = "02";
        expYear.value = "31";

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).toBeCalledTimes(1);
        expect(CreditCardForm.prototype.applyAutofillValues).toBeCalledWith({
          cardholderName: "",
          number: "",
          expirationMonth: "02",
          expirationYear: "2031",
          cvv: "123",
        });

        CreditCardForm.prototype.applyAutofillValues.mockClear();

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).not.toBeCalled();

        cardholderName.value = "Given Sur";

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).toBeCalledTimes(1);
        expect(CreditCardForm.prototype.applyAutofillValues).toBeCalledWith({
          cardholderName: "Given Sur",
          number: "",
          expirationMonth: "02",
          expirationYear: "2031",
          cvv: "123",
        });

        CreditCardForm.prototype.applyAutofillValues.mockClear();

        vi.advanceTimersByTime(1000);

        expect(CreditCardForm.prototype.applyAutofillValues).not.toBeCalled();
      });

      it("does not set tabindex for hidden autofill inputs on Chrome for iOS", () => {
        let cardholderName, cvv, expMonth, expYear;

        document.body.innerHTML = "";

        vi.spyOn(browserDetection, "isChromeIos").mockReturnValue(true);

        frameName.getFrameName.mockReturnValue("number");
        internal.initialize(testContext.cardForm);

        cardholderName = document.querySelector(
          "#cardholder-name-autofill-field"
        );
        cvv = document.querySelector("#cvv-autofill-field");
        expMonth = document.querySelector("#expiration-month-autofill-field");
        expYear = document.querySelector("#expiration-year-autofill-field");

        expect(cardholderName.autocomplete).toBe("cc-name");
        expect(cvv.autocomplete).toBe("cc-csc");
        expect(expMonth.autocomplete).toBe("cc-exp-month");
        expect(expYear.autocomplete).toBe("cc-exp-year");
        expect(cardholderName.tabIndex).toBeFalsy();
        expect(cvv.tabIndex).toBeFalsy();
        expect(expMonth.tabIndex).toBeFalsy();
        expect(expYear.tabIndex).toBeFalsy();
      });

      it("blurs hidden inputs automatically on Chrome for iOS", () => {
        let cardholderName, cvv, expMonth, expYear;

        document.body.innerHTML = "";

        vi.spyOn(browserDetection, "isChromeIos").mockReturnValue(true);

        frameName.getFrameName.mockReturnValue("number");
        internal.initialize(testContext.cardForm);

        cardholderName = document.querySelector(
          "#cardholder-name-autofill-field"
        );
        cvv = document.querySelector("#cvv-autofill-field");
        expMonth = document.querySelector("#expiration-month-autofill-field");
        expYear = document.querySelector("#expiration-year-autofill-field");

        vi.spyOn(cardholderName, "blur");
        vi.spyOn(cvv, "blur");
        vi.spyOn(expMonth, "blur");
        vi.spyOn(expYear, "blur");

        expect(cardholderName.blur).toBeCalledTimes(0);
        cardholderName.focus();
        expect(cardholderName.blur).toBeCalledTimes(1);

        expect(cvv.blur).toBeCalledTimes(0);
        cvv.focus();
        expect(cvv.blur).toBeCalledTimes(1);

        expect(expMonth.blur).toBeCalledTimes(0);
        expMonth.focus();
        expect(expMonth.blur).toBeCalledTimes(1);

        expect(expYear.blur).toBeCalledTimes(0);
        expYear.focus();
        expect(expYear.blur).toBeCalledTimes(1);
      });

      it("skips autofill input setup when configured", () => {
        document.body.innerHTML = "";

        testContext.fakeConfig.preventAutofill = true;
        frameName.getFrameName.mockReturnValue("number");
        internal.initialize(testContext.cardForm);

        expect(
          document.querySelector("#cardholder-name-autofill-field")
        ).toBeFalsy();
        expect(document.querySelector("#cvv-autofill-field")).toBeFalsy();
        expect(
          document.querySelector("#expiration-month-autofill-field")
        ).toBeFalsy();
        expect(
          document.querySelector("#expiration-year-autofill-field")
        ).toBeFalsy();
      });

      it("triggers events on the bus when events occur", () => {
        const input = document.getElementById("cvv");

        vi.spyOn(CreditCardForm.prototype, "emitEvent").mockReturnValue(null);

        triggerEvent("focus", input);
        triggerEvent("blur", input);
        triggerEvent("click", input); // not allowed
        triggerEvent("keyup", input); // not allowed

        expect(CreditCardForm.prototype.emitEvent).toHaveBeenCalledWith(
          "cvv",
          "focus"
        );
        expect(CreditCardForm.prototype.emitEvent).toHaveBeenCalledWith(
          "cvv",
          "blur"
        );
        expect(CreditCardForm.prototype.emitEvent).not.toHaveBeenCalledWith(
          "cvv",
          "click"
        );
        expect(CreditCardForm.prototype.emitEvent).not.toHaveBeenCalledWith(
          "cvv",
          "keyup"
        );
      });

      it("is ready to destroy focusIntercept inputs if `REMOVE_FOCUS_INTERCEPTS` fires", () => {
        expect(window.bus.on).toHaveBeenCalledWith(
          events.REMOVE_FOCUS_INTERCEPTS,
          expect.any(Function)
        );

        const handler = window.bus.on.mock.calls.find(
          (call) => call[0] === events.REMOVE_FOCUS_INTERCEPTS
        )[1];

        vi.spyOn(focusIntercept, "destroy");

        handler({ id: "id" });

        expect(focusIntercept.destroy).toBeCalledTimes(1);
        expect(focusIntercept.destroy).toBeCalledWith("id");
      });
    });
  });

  describe("create", () => {
    it("creates a global bus", () => {
      const originalLocationHash = location.hash;

      location.hash = "#test-uuid";
      internal.create();
      expect(Framebus).toBeCalledWith({
        channel: "test-uuid",
        targetFrames: [window.parent],
      });
      expect(window.bus).toBeInstanceOf(Framebus);

      location.hash = originalLocationHash;
    });

    it("emits that the frame is ready", () => {
      frameName.getFrameName.mockReturnValue("cvv");

      internal.create();

      expect(window.bus.emit).toHaveBeenCalledTimes(1);
      expect(window.bus.emit).toHaveBeenCalledWith(
        events.FRAME_READY,
        {
          field: "cvv",
        },
        expect.any(Function)
      );
    });
  });

  describe("orchestrate", () => {
    describe("supporting card types", () => {
      beforeEach(() => {
        vi.spyOn(CreditCardForm.prototype, "setSupportedCardTypes");
        vi.spyOn(assembleIFrames, "assembleIFrames").mockReturnValue([]);
        vi.spyOn(CreditCardForm.prototype, "validateField").mockReturnValue(
          null
        );
      });

      it("sets supported card types asynchronously when supportedCardBrands is set", () => {
        const config = {
          fields: {
            number: {
              selector: "#foo",
              supportedCardBrands: {
                visa: false,
                "diners-club": true,
              },
            },
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, configuration())
        );

        return internal.orchestrate(config).then(() => {
          expect(CreditCardForm.prototype.validateField).toHaveBeenCalledTimes(
            1
          );
          expect(CreditCardForm.prototype.validateField).toHaveBeenCalledWith(
            "number"
          );
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(2);
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith(expect.toBeUndefined); // on initialization
          // when client is ready
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith({
            americanexpress: true,
            discover: true,
            visa: false,
            dinersclub: true,
          });
        });
      });

      it("can set supported card brands even without supported cards in merchant gateway configuration", () => {
        const config = {
          fields: {
            number: {
              selector: "#foo",
              supportedCardBrands: {
                visa: false,
                "diners-club": true,
              },
            },
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };
        const gwConfig = configuration();

        delete gwConfig.gatewayConfiguration.creditCard;

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, gwConfig)
        );

        return internal.orchestrate(config).then(() => {
          expect(CreditCardForm.prototype.validateField).toHaveBeenCalledTimes(
            1
          );
          expect(CreditCardForm.prototype.validateField).toHaveBeenCalledWith(
            "number"
          );
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(2);
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith(expect.toBeUndefined); // on initialization
          // when client is ready
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith({
            visa: false,
            dinersclub: true,
          });
        });
      });

      it("prefers supportedCardBrands config if rejectedUnsupportedCards is also set", () => {
        const config = {
          fields: {
            number: {
              selector: "#foo",
              rejectedUnsupportedCards: true,
              supportedCardBrands: {
                visa: false,
                "diners-club": true,
              },
            },
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, configuration())
        );

        return internal.orchestrate(config).then(() => {
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(2);
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith(expect.toBeUndefined); // on initialization
          // when client is ready
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith({
            americanexpress: true,
            discover: true,
            visa: false,
            dinersclub: true,
          });
        });
      });

      it("calls set supported card types with gateway configuration", () => {
        const config = {
          fields: {
            number: { selector: "#foo" },
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, configuration())
        );

        return internal.orchestrate(config).then(() => {
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(2);

          // Verify the second call receives gateway configuration
          const secondCallArgs =
            CreditCardForm.prototype.setSupportedCardTypes.mock.calls[1][0];
          expect(secondCallArgs).toBeDefined();
          expect(typeof secondCallArgs).toBe("object");
        });
      });

      it("silently drops gateway card brands that are not in the display name map", () => {
        const config = {
          fields: {
            number: { selector: "#foo" },
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };
        const gwConfig = configuration();

        gwConfig.gatewayConfiguration.creditCard.supportedCardBrands = [
          "VISA",
          "SOME_UNKNOWN_BRAND",
        ];

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, gwConfig)
        );

        return internal.orchestrate(config).then(() => {
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(2);
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith({
            visa: true,
          });
        });
      });

      it("does not throw when gateway creditCard configuration has no supportedCardBrands", () => {
        const config = {
          fields: {
            number: { selector: "#foo" },
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };
        const gwConfig = configuration();

        delete gwConfig.gatewayConfiguration.creditCard.supportedCardBrands;

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, gwConfig)
        );

        return internal.orchestrate(config).then(() => {
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(2);
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledWith({});
        });
      });

      it("does not call set supported card types an additional time if number field is not provided", () => {
        const config = {
          fields: {
            cvv: { selector: "#boo" },
            postalCode: { selector: "#you" },
          },
        };

        vi.spyOn(window.bus, "emit").mockImplementation(
          yieldsByEventAsync(events.READY_FOR_CLIENT, configuration())
        );

        return internal.orchestrate(config).then(() => {
          expect(
            CreditCardForm.prototype.setSupportedCardTypes
          ).toHaveBeenCalledTimes(1);
        });
      });
    });

    it("posts an analytics event", () => {
      vi.spyOn(assembleIFrames, "assembleIFrames").mockReturnValue([]);

      internal.orchestrate({
        client: configuration(),
        fields: {
          number: { selector: "#foo" },
          cvv: { selector: "#boo" },
          postalCode: { selector: "#you" },
        },
      });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        expect.anything(),
        "custom.hosted-fields.load.succeeded"
      );
    });

    it("calls initialize on each frame that has an initialize function", () => {
      const frame1 = {
        braintree: {
          hostedFields: {
            initialize: vi.fn(),
          },
        },
      };
      const frame2 = {
        braintree: {
          hostedFields: {
            initialize: vi.fn(),
          },
        },
      };
      const frameWithoutInitialize = {
        braintree: {
          hostedFields: {},
        },
      };
      const frameWithoutBraintreeGlobal = {};

      vi.spyOn(assembleIFrames, "assembleIFrames").mockReturnValue([
        frame1,
        frameWithoutInitialize,
        frameWithoutBraintreeGlobal,
        frame2,
      ]);

      internal.orchestrate({
        client: configuration(),
        fields: {
          number: { selector: "#foo" },
          cvv: { selector: "#boo" },
          postalCode: { selector: "#you" },
        },
      });

      expect(frame1.braintree.hostedFields.initialize).toHaveBeenCalledTimes(1);
      expect(frame1.braintree.hostedFields.initialize).toHaveBeenCalledWith(
        expect.any(CreditCardForm)
      );
      expect(frame2.braintree.hostedFields.initialize).toHaveBeenCalledTimes(1);
      expect(frame2.braintree.hostedFields.initialize).toHaveBeenCalledWith(
        expect.any(CreditCardForm)
      );
    });

    it("sets up a tokenization handler", () => {
      vi.spyOn(assembleIFrames, "assembleIFrames").mockReturnValue([]);

      internal.orchestrate({
        client: configuration(),
        fields: {
          number: { selector: "#foo" },
          cvv: { selector: "#boo" },
          postalCode: { selector: "#you" },
        },
      });

      expect(window.bus.on).toHaveBeenCalledTimes(1);
      expect(window.bus.on).toHaveBeenCalledWith(
        events.TOKENIZATION_REQUEST,
        expect.any(Function)
      );
    });

    it("creates a client initialization promise", () => {
      vi.spyOn(window.bus, "emit").mockImplementation(
        yieldsByEventAsync(events.READY_FOR_CLIENT, configuration())
      );
      vi.spyOn(assembleIFrames, "assembleIFrames").mockReturnValue([]);

      internal.orchestrate({
        fields: {
          number: { selector: "#foo" },
          cvv: { selector: "#boo" },
          postalCode: { selector: "#you" },
        },
      });

      expect(
        window.bus.emit.mock.calls.filter(
          (value) => value[0] === events.READY_FOR_CLIENT
        ).length
      ).toEqual(1);
    });
  });

  describe("createTokenizationHandler", () => {
    const create = internal.createTokenizationHandler;

    beforeEach(() => {
      const requestStub = vi.fn();

      testContext.fakeNonce = "nonce homeboy";
      testContext.fakeCreditCard = {
        bin: "411111",
        brandCode: "VISA",
        last4: "1111",
        cardholderName: "Given Sur",
        expirationMonth: "12",
        expirationYear: "2025",
        binData: {
          commercial: "YES",
          debit: "NO",
          durbinRegulated: "UNKNOWN",
          healthcare: "NO",
          payroll: "NO",
          prepaid: "NO",
          issuingBank: "Fake Bank",
          countryOfIssuance: "USA",
          productId: "F",
          business: "No",
          consumer: "No",
          purchase: "No",
          corporate: "No",
        },
      };
      testContext.fakeResult = {
        nonce: testContext.fakeNonce,
        details: {
          cardholderName: "Given Sur",
          expirationMonth: "12",
          expirationYear: "2025",
          bin: "411111",
          cardType: "Visa",
          lastFour: "1111",
          lastTwo: "11",
        },
        description: "ending in 11",
        type: "CreditCard",
        binData: {
          commercial: "Yes",
          debit: "No",
          durbinRegulated: "Unknown",
          healthcare: "No",
          payroll: "No",
          prepaid: "No",
          issuingBank: "Fake Bank",
          countryOfIssuance: "USA",
          productId: "F",
          business: "No",
          consumer: "No",
          purchase: "No",
          corporate: "No",
        },
      };
      testContext.fakeOptions = { foo: "bar" };

      // Includes both the standard and Fastlane top-level mutation fields so
      // this same mock works whether the test exercises the standard
      // (tokenizeCreditCard) or Fastlane (tokenizeCreditCardForPayPalConnect)
      // path.
      requestStub.mockResolvedValue({
        data: {
          tokenizeCreditCard: {
            token: testContext.fakeNonce,
            creditCard: testContext.fakeCreditCard,
          },
          tokenizeCreditCardForPayPalConnect: {
            paymentMethod: {
              id: testContext.fakeNonce,
              details: testContext.fakeCreditCard,
            },
          },
        },
      });

      testContext.fakeError = new Error("you done goofed");

      testContext.fakeError.errors = [];
      testContext.fakeError.details = {
        httpStatus: 500,
      };

      testContext.details = {
        isValid: true,
        isEmpty: false,
        someOtherStuff: null,
      };

      testContext.configuration = configuration();

      testContext.goodClient = {
        getConfiguration() {
          return testContext.configuration;
        },
        request: requestStub,
      };

      testContext.badClient = {
        getConfiguration() {
          return testContext.configuration;
        },
        request: vi.fn().mockRejectedValue(testContext.fakeError),
      };

      testContext.emptyCardForm = testContext.cardForm;
      testContext.emptyCardForm.isEmpty = () => true;

      testContext.validCardForm = new CreditCardForm(testContext.fakeConfig);
      testContext.validCardForm.isEmpty = () => false;
      testContext.validCardForm.invalidFieldKeys = () => [];

      testContext.invalidCardForm = new CreditCardForm(testContext.fakeConfig);
      testContext.invalidCardForm.isEmpty = () => false;
      testContext.invalidCardForm.invalidFieldKeys = () => ["cvv"];
    });

    describe("paypal tokenization", () => {
      beforeEach(() => {
        testContext.fakeOptions = {
          email: "this@here.me",
          phone: {
            countryPhoneCode: "1",
            phoneNumber: "1234567890",
            extensionNumber: "",
          },
          metadata: {
            connectCheckout: {
              hasBuyerConsent: true,
            },
          },
        };
      });

      it("returns a function", () => {
        expect(
          create(testContext.goodClient, testContext.cardForm)
        ).toBeInstanceOf(Function);
      });

      it("replies with client's error if tokenization fails due to authorization", () =>
        new Promise((resolve) => {
          testContext.fakeError.details.httpStatus = 403;
          testContext.badClient.request.mockRejectedValue(
            testContext.fakeError
          );

          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBe(testContext.fakeError);

              resolve();
            }
          );
        }));

      it("replies with an error if tokenization fails due to network", () =>
        new Promise((resolve) => {
          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("NETWORK");
              expect(err.code).toBe("HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR");
              expect(err.message).toBe(
                "A tokenization network error occurred."
              );
              expect(err.details.originalError.message).toBe("you done goofed");
              expect(err.details.originalError.errors).toBe(
                testContext.fakeError.errors
              );

              resolve();
            }
          );
        }));

      it("sends an analytics event if tokenization fails", () =>
        new Promise((resolve) => {
          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(analytics.sendEvent).toHaveBeenCalledWith(
                testContext.badClient,
                "custom.hosted-fields.tokenization.failed"
              );

              resolve();
            }
          );
        }));

      it("replies with data if Client API tokenization succeeds", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (arg) => {
              expect(arg).toEqual([null, testContext.fakeResult]);

              resolve();
            }
          );
        }));

      it("sends an analytics event if tokenization succeeds", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(analytics.sendEvent).toHaveBeenCalledWith(
                testContext.goodClient,
                "custom.hosted-fields.tokenization.succeeded"
              );

              resolve();
            }
          );
        }));

      it("makes a graphQLApi request using the Fastlane mutation", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(testContext.goodClient.request).toHaveBeenCalledWith(
                expect.objectContaining({
                  api: "graphQLApi",
                  data: expect.objectContaining({
                    query: expect.stringContaining(
                      "TokenizeCreditCardForPayPalConnect"
                    ),
                    variables: expect.objectContaining({
                      input: expect.objectContaining({
                        optIn: true,
                        email: "this@here.me",
                      }),
                    }),
                  }),
                })
              );

              resolve();
            }
          );
        }));

      it("replies with an error if all fields are empty", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.emptyCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("HOSTED_FIELDS_FIELDS_EMPTY");
              expect(err.message).toBe(
                "All fields are empty. Cannot tokenize empty card fields."
              );
              expect(err.details).not.toBeDefined();

              resolve();
            }
          );
        }));

      it("replies with an error when some fields are invalid", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.invalidCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("HOSTED_FIELDS_FIELDS_INVALID");
              expect(err.message).toBe(
                "Some payment input fields are invalid. Cannot tokenize invalid card fields."
              );
              expect(err.details).toEqual({
                invalidFieldKeys: ["cvv"],
              });

              resolve();
            }
          );
        }));

      it("passes in fieldsToTokenize option to card form", () =>
        new Promise((resolve) => {
          const fields = ["number", "cvv"];
          const invalidFieldKeys = vi.spyOn(
            testContext.validCardForm,
            "invalidFieldKeys"
          );
          const getCardData = vi.spyOn(
            testContext.validCardForm,
            "getCardData"
          );
          const isEmpty = vi.spyOn(testContext.validCardForm, "isEmpty");

          testContext.fakeOptions.fieldsToTokenize = fields;

          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(invalidFieldKeys).toHaveBeenCalledTimes(1);
              expect(invalidFieldKeys).toHaveBeenCalledWith(fields);
              expect(getCardData).toHaveBeenCalledTimes(1);
              expect(getCardData).toHaveBeenCalledWith(fields);
              expect(isEmpty).toHaveBeenCalledTimes(1);
              expect(isEmpty).toHaveBeenCalledWith(fields);

              resolve();
            }
          );
        }));
    });

    describe("braintree tokenization", () => {
      it("returns a function", () => {
        expect(
          create(testContext.goodClient, testContext.cardForm)
        ).toBeInstanceOf(Function);
      });

      it("replies with an error if tokenization fails due to network", () =>
        new Promise((resolve) => {
          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("NETWORK");
              expect(err.code).toBe("HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR");
              expect(err.message).toBe(
                "A tokenization network error occurred."
              );
              expect(err.details.originalError.message).toBe("you done goofed");
              expect(err.details.originalError.errors).toBe(
                testContext.fakeError.errors
              );

              resolve();
            }
          );
        }));

      it("replies with client's error if tokenization fails due to authorization", () =>
        new Promise((resolve) => {
          testContext.fakeError.details.httpStatus = 403;
          testContext.badClient.request.mockRejectedValue(
            testContext.fakeError
          );

          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBe(testContext.fakeError);

              resolve();
            }
          );
        }));

      it("replies with an error if tokenization fails due to card data", () =>
        new Promise((resolve) => {
          testContext.fakeError.details.httpStatus = 422;
          testContext.badClient.request.mockRejectedValue(
            testContext.fakeError
          );

          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("HOSTED_FIELDS_FAILED_TOKENIZATION");
              expect(err.message).toBe(
                "The supplied card data failed tokenization."
              );
              expect(err.details.originalError.message).toBe("you done goofed");
              expect(err.details.originalError.errors).toBe(
                testContext.fakeError.errors
              );

              resolve();
            }
          );
        }));

      it("replies with an error if tokenization fails due to a GraphQL validation error with no known legacy code", () =>
        new Promise((resolve) => {
          const originalError = [
            {
              message: "Credit card is invalid",
              extensions: {
                errorClass: "VALIDATION",
                legacyCode: "81703",
                inputPath: ["input", "creditCard", "number"],
              },
            },
          ];
          const fakeErr = new BraintreeError({
            code: "CLIENT_GRAPHQL_REQUEST_ERROR",
            type: BraintreeError.types.NETWORK,
            message: "An error",
            details: {
              originalError,
            },
          });

          testContext.badClient.request.mockRejectedValue(fakeErr);

          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("HOSTED_FIELDS_FAILED_TOKENIZATION");
              expect(err.details.originalError).toBe(fakeErr);

              resolve();
            }
          );
        }));

      it("sends an analytics event if tokenization fails", () =>
        new Promise((resolve) => {
          create(testContext.badClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(analytics.sendEvent).toHaveBeenCalledWith(
                testContext.badClient,
                "custom.hosted-fields.tokenization.failed"
              );

              resolve();
            }
          );
        }));

      it("replies with data if Client API tokenization succeeds", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (arg) => {
              expect(arg).toEqual([null, testContext.fakeResult]);

              resolve();
            }
          );
        }));

      it("sends an analytics event if tokenization succeeds", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(analytics.sendEvent).toHaveBeenCalledWith(
                testContext.goodClient,
                "custom.hosted-fields.tokenization.succeeded"
              );

              resolve();
            }
          );
        }));

      it("makes a graphQLApi request using the standard mutation", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(testContext.goodClient.request).toHaveBeenCalledWith(
                expect.objectContaining({
                  api: "graphQLApi",
                  data: expect.objectContaining({
                    query: expect.stringContaining("TokenizeCreditCard("),
                    variables: expect.any(Object),
                  }),
                })
              );

              resolve();
            }
          );
        }));

      it("replies with an error if all fields are empty", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.emptyCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("HOSTED_FIELDS_FIELDS_EMPTY");
              expect(err.message).toBe(
                "All fields are empty. Cannot tokenize empty card fields."
              );
              expect(err.details).not.toBeDefined();

              resolve();
            }
          );
        }));

      it("replies with an error when some fields are invalid", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.invalidCardForm)(
            testContext.fakeOptions,
            (response) => {
              const err = response[0];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("HOSTED_FIELDS_FIELDS_INVALID");
              expect(err.message).toBe(
                "Some payment input fields are invalid. Cannot tokenize invalid card fields."
              );
              expect(err.details).toEqual({
                invalidFieldKeys: ["cvv"],
              });

              resolve();
            }
          );
        }));

      it("passes in fieldsToTokenize option to card form", () =>
        new Promise((resolve) => {
          const fields = ["number", "cvv"];
          const invalidFieldKeys = vi.spyOn(
            testContext.validCardForm,
            "invalidFieldKeys"
          );
          const getCardData = vi.spyOn(
            testContext.validCardForm,
            "getCardData"
          );
          const isEmpty = vi.spyOn(testContext.validCardForm, "isEmpty");

          testContext.fakeOptions.fieldsToTokenize = fields;

          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(invalidFieldKeys).toHaveBeenCalledTimes(1);
              expect(invalidFieldKeys).toHaveBeenCalledWith(fields);
              expect(getCardData).toHaveBeenCalledTimes(1);
              expect(getCardData).toHaveBeenCalledWith(fields);
              expect(isEmpty).toHaveBeenCalledTimes(1);
              expect(isEmpty).toHaveBeenCalledWith(fields);

              resolve();
            }
          );
        }));

      it("makes a client request with validate false if the vault option is not provided", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            () => {
              expect(testContext.goodClient.request).toHaveBeenCalledWith(
                expect.any(Object)
              );
              expect(
                testContext.goodClient.request.mock.calls[0][0]
              ).toMatchObject({
                data: {
                  variables: {
                    input: {
                      options: {
                        validate: false,
                      },
                    },
                  },
                },
              });
              resolve();
            }
          );
        }));

      it("makes a client request with validate true if the vault option is provided", () =>
        new Promise((resolve) => {
          create(testContext.goodClient, testContext.validCardForm)(
            { vault: true },
            () => {
              expect(testContext.goodClient.request).toHaveBeenCalledWith(
                expect.any(Object)
              );
              expect(
                testContext.goodClient.request.mock.calls[0][0]
              ).toMatchObject({
                data: {
                  variables: {
                    input: {
                      options: {
                        validate: true,
                      },
                    },
                  },
                },
              });
              resolve();
            }
          );
        }));

      describe("when supplying additional data", () => {
        beforeEach(() => {
          let fakeConfigWithPostalCode;

          fakeConfigWithPostalCode = {
            fields: {
              number: {},
              postalCode: {},
            },
          };

          testContext.cardFormWithPostalCode = new CreditCardForm(
            fakeConfigWithPostalCode
          );
          testContext.cardFormWithPostalCode.isEmpty = () => false;
          testContext.cardFormWithPostalCode.invalidFieldKeys = () => [];

          testContext.fakeOptions = {};
        });

        it("tokenizes with additional cardholder name", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.cardholderName = "First Last";

            create(testContext.goodClient, testContext.validCardForm)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          cardholderName: "First Last",
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes with Fastlane metadata", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.metadata = {
              connectCheckout: {
                termsAndConditionsVersion: "1",
                termsAndConditionsCountry: "UK",
                hasBuyerConsent: true,
              },
            };

            create(testContext.goodClient, testContext.validCardForm)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    query: expect.stringContaining(
                      "TokenizeCreditCardForPayPalConnect"
                    ),
                    variables: {
                      input: {
                        optIn: true,
                        termsAndConditionsVersion: "1",
                        termsAndConditionsCountry: "UK",
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes street address for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              streetAddress: "606 Elm St",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            streetAddress: "606 Elm St",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes extended address for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              extendedAddress: "Unit 1",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            extendedAddress: "Unit 1",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes locality for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              locality: "Chicago",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            locality: "Chicago",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes region for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              region: "IL",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            region: "IL",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes first name for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              firstName: "First",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            firstName: "First",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes last name for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              lastName: "Last",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            lastName: "Last",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes company for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              company: "Company",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            company: "Company",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes country name for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              countryName: "United States",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            countryName: "United States",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes country code alpha 2 for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              countryCodeAlpha2: "US",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            countryCodeAlpha2: "US",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes country code alpha 3 for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              countryCodeAlpha3: "USA",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            countryCodeAlpha3: "USA",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes numeric country code for billing address", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              countryCodeNumeric: "840",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            countryCodeNumeric: "840",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes with additional postal code data when Hosted Fields has no postal code field", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              postalCode: "33333",
            };

            create(testContext.goodClient, testContext.validCardForm)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            postalCode: "33333",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("tokenizes with Hosted Fields postal code", () =>
          new Promise((resolve) => {
            testContext.cardFormWithPostalCode.set("postalCode.value", "11111");

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            postalCode: "11111",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("prioritizes Hosted Fields postal code even when the field is empty", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.billingAddress = {
              postalCode: "33333",
            };

            testContext.cardFormWithPostalCode.set("postalCode.value", "");

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          billingAddress: {
                            postalCode: "",
                          },
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("does not override other parts of the form with options", () =>
          new Promise((resolve) => {
            testContext.fakeOptions.number = "3333 3333 3333 3333";

            testContext.cardFormWithPostalCode.set(
              "number.value",
              "1111111111111111"
            );

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.any(Object)
                );
                expect(
                  testContext.goodClient.request.mock.calls[0][0]
                ).toMatchObject({
                  api: "graphQLApi",
                  data: {
                    variables: {
                      input: {
                        creditCard: {
                          number: "1111111111111111",
                        },
                      },
                    },
                  },
                });

                resolve();
              }
            );
          }));

        it("does not attempt to tokenize non-allowed billing address options", () =>
          new Promise((resolve) => {
            testContext.cardFormWithPostalCode.set(
              "number.value",
              "1111 1111 1111 1111"
            );
            testContext.fakeOptions.billingAddress = {
              foo: "bar",
              baz: "qup",
            };

            create(testContext.goodClient, testContext.cardFormWithPostalCode)(
              testContext.fakeOptions,
              () => {
                const clientApiRequestArgs =
                  testContext.goodClient.request.mock.calls[0][0];

                expect(testContext.goodClient.request).toHaveBeenCalledWith(
                  expect.not.objectContaining({
                    data: {
                      variables: {
                        input: {
                          creditCard: {
                            billingAddress: {
                              foo: "bar",
                              baz: "qup",
                            },
                          },
                        },
                      },
                    },
                  })
                );
                expect(
                  clientApiRequestArgs.data.variables.input.creditCard
                    .billingAddress.foo
                ).toBeFalsy();
                expect(
                  clientApiRequestArgs.data.variables.input.creditCard
                    .billingAddress.baz
                ).toBeFalsy();

                resolve();
              }
            );
          }));
      });

      it("sends Client API error when Client API fails", () =>
        new Promise((resolve) => {
          const fakeErr = new Error("it failed");

          fakeErr.details = { httpStatus: 500 };

          testContext.goodClient.request.mockRejectedValue(fakeErr);

          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (args) => {
              const err = args[0];
              const result = args[1];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("NETWORK");
              expect(err.code).toBe("HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR");
              expect(err.message).toBe(
                "A tokenization network error occurred."
              );
              expect(err.details.originalError).toBe(fakeErr);

              expect(result).not.toBeDefined();

              resolve();
            }
          );
        }));

      it("sends a wrapped fail on duplicate payment method error", () =>
        new Promise((resolve) => {
          const originalError = [
            {
              message: "Already in vault",
              extensions: {
                errorClass: "VALIDATION",
                legacyCode: "81724",
                inputPath: ["input", "creditCard"],
              },
            },
          ];
          const fakeErr = new BraintreeError({
            code: "CLIENT_GRAPHQL_REQUEST_ERROR",
            type: BraintreeError.types.NETWORK,
            message: "An error",
            details: {
              originalError,
            },
          });

          testContext.goodClient.request = vi.fn().mockRejectedValue(fakeErr);

          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (args) => {
              const err = args[0];
              const result = args[1];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe(
                "HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE"
              );
              expect(err.message).toBe(
                "This credit card already exists in the merchant's vault."
              );
              expect(err.details.originalError).toBe(originalError);

              expect(result).not.toBeDefined();

              resolve();
            }
          );
        }));

      it("sends a wrapped cvv verification error", () =>
        new Promise((resolve) => {
          const originalError = [
            {
              message: "cvv verification failed",
              extensions: {
                errorClass: "VALIDATION",
                legacyCode: "81736",
                inputPath: ["input", "creditCard", "cvv"],
              },
            },
          ];
          const fakeErr = new BraintreeError({
            code: "CLIENT_GRAPHQL_REQUEST_ERROR",
            type: BraintreeError.types.NETWORK,
            message: "An error",
            details: {
              originalError,
            },
          });

          testContext.goodClient.request = vi.fn().mockRejectedValue(fakeErr);

          create(testContext.goodClient, testContext.validCardForm)(
            testContext.fakeOptions,
            (args) => {
              const err = args[0];
              const result = args[1];

              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe(
                "HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED"
              );
              expect(err.message).toBe(
                "CVV verification failed during tokenization."
              );
              expect(err.details.originalError).toBe(originalError);

              expect(result).not.toBeDefined();

              resolve();
            }
          );
        }));

      it("can take a client initialization promise to defer the request until the client is ready", () =>
        new Promise((resolve) => {
          let clientPromise, client;

          vi.useFakeTimers();

          client = testContext.goodClient;
          clientPromise = new Promise((innerResolve) => {
            setTimeout(() => {
              innerResolve(client);
            }, 1000);
          });

          create(clientPromise, testContext.validCardForm)(
            testContext.fakeOptions,
            (arg) => {
              expect(client.request).toHaveBeenCalledTimes(1);
              expect(arg).toEqual([null, testContext.fakeResult]);

              resolve();
            }
          );

          vi.advanceTimersByTime(950);

          expect(client.request).not.toHaveBeenCalled();

          vi.advanceTimersByTime(100);
          vi.useRealTimers();
        }));
    });
  });
});
