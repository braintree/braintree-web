"use strict";

const internal = require("../../../../src/unionpay/internal");
const Bus = require("framebus");
const BraintreeError = require("../../../../src/lib/braintree-error");
const {
  fake: { configuration },
} = require("../../../helpers");
const getHostedFieldsCardForm = require("../../../../src/unionpay/internal/get-hosted-fields-cardform");
const UnionPay = require("../../../../src/unionpay/shared/unionpay");
const { events } = require("../../../../src/unionpay/shared/constants");

describe("internal", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext._oldGlobalName = window.name;
    window.name = "frame-name_123";
  });

  afterEach(() => {
    window.name = testContext._oldGlobalName;
  });

  describe("create", () => {
    it("creates a global bus", () => {
      internal.create();

      expect(Bus).toBeCalledWith({
        channel: "123",
      });
      expect(window.bus).toBeInstanceOf(Bus);
    });

    it("emits a BUS_CONFIGURATION_REQUEST event", () => {
      internal.create();

      expect(Bus.prototype.emit).toBeCalledWith(
        "BUS_CONFIGURATION_REQUEST",
        expect.any(Function)
      );
    });
  });

  describe("initialize", () => {
    beforeEach(() => {
      internal.create();

      testContext.initialize =
        Bus.prototype.emit.mock.calls[
          Bus.prototype.emit.mock.calls.length - 1
        ][1];
      testContext.configuration = configuration();
      testContext.configuration.gatewayConfiguration.unionPay = {
        enabled: true,
      };
    });

    describe("fetchCapabilities", () => {
      it("sets up bus for HOSTED_FIELDS_FETCH_CAPABILITIES", () => {
        testContext.initialize(testContext.configuration);

        expect(Bus.prototype.on).toBeCalledWith(
          events.HOSTED_FIELDS_FETCH_CAPABILITIES,
          expect.any(Function)
        );
      });

      it("fetches capabilities when a card form exists", (done) => {
        let fetchHandler;
        const fakeError = new Error("you goofed!");
        const fakePayload = { isUnionPay: false };

        testContext.initialize(testContext.configuration);

        fetchHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_FETCH_CAPABILITIES
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue({
          get: (property) => {
            expect(property).toBe("number.value");

            return "4111111111111111";
          },
        });

        jest
          .spyOn(UnionPay.prototype, "fetchCapabilities")
          .mockImplementation((options, callback) => {
            expect(options.card.number).toBe("4111111111111111");
            callback(fakeError, fakePayload);
          });

        fetchHandler({ hostedFields: {} }, ({ err, payload }) => {
          expect(err).toBe(fakeError);
          expect(payload).toBe(fakePayload);

          done();
        });
      });

      it("calls the callback with an error if the card form does not exist", (done) => {
        let fetchHandler;
        const fakeHostedFields = {
          _bus: { channel: "12345" },
        };

        testContext.initialize(testContext.configuration);

        fetchHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_FETCH_CAPABILITIES
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue(null);

        jest
          .spyOn(UnionPay.prototype, "fetchCapabilities")
          .mockReturnValue(null);

        fetchHandler({ hostedFields: fakeHostedFields }, ({ err, payload }) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED");
          expect(err.message).toBe(
            "Could not find the Hosted Fields instance."
          );

          expect(payload).toBeFalsy();

          expect(UnionPay.prototype.fetchCapabilities).not.toHaveBeenCalled();

          done();
        });
      });
    });

    describe("enroll", () => {
      it("sets up bus for HOSTED_FIELDS_ENROLL", () => {
        testContext.initialize(testContext.configuration);

        expect(Bus.prototype.on).toBeCalledWith(
          events.HOSTED_FIELDS_ENROLL,
          expect.any(Function)
        );
      });

      it("enrolls when a card form exists", (done) => {
        let enrollHandler;
        const fakeError = new Error("you goofed!");
        const fakePayload = { unionPayEnrollmentId: "123abc" };

        testContext.initialize(testContext.configuration);

        enrollHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_ENROLL
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue({
          getCardData: () => ({
            number: "4111111111111111",
            expirationMonth: "10",
            expirationYear: "2020",
          }),
        });

        jest
          .spyOn(UnionPay.prototype, "enroll")
          .mockImplementation((options, callback) => {
            expect(options).toEqual({
              card: {
                number: "4111111111111111",
                expirationMonth: "10",
                expirationYear: "2020",
              },
              mobile: {
                countryCode: "62",
                number: "11111111",
              },
            });
            callback(fakeError, fakePayload);
          });

        enrollHandler(
          {
            hostedFields: {},
            mobile: {
              countryCode: "62",
              number: "11111111",
            },
          },
          ({ err, payload }) => {
            expect(err).toBe(fakeError);
            expect(payload).toBe(fakePayload);

            done();
          }
        );
      });

      it("calls the callback with an error if the card form does not exist", (done) => {
        let enrollHandler;
        const fakeHostedFields = {
          _bus: { channel: "12345" },
        };

        testContext.initialize(testContext.configuration);

        enrollHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_ENROLL
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue(null);

        jest.spyOn(UnionPay.prototype, "enroll").mockReturnValue(null);

        enrollHandler(
          {
            hostedFields: fakeHostedFields,
            mobile: {
              countryCode: "62",
              number: "11111111111",
            },
          },
          ({ err, payload }) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED");
            expect(err.message).toBe(
              "Could not find the Hosted Fields instance."
            );

            expect(payload).toBeFalsy();

            expect(UnionPay.prototype.enroll).not.toHaveBeenCalled();

            done();
          }
        );
      });
    });

    describe("tokenize", () => {
      it("sets up bus for HOSTED_FIELDS_TOKENIZE", () => {
        testContext.initialize(testContext.configuration);

        expect(Bus.prototype.on).toBeCalledWith(
          events.HOSTED_FIELDS_TOKENIZE,
          expect.any(Function)
        );
      });

      it("tokenizes when a card form exists", (done) => {
        let tokenizeHandler;
        const fakeError = new Error("you goofed!");
        const fakePayload = { nonce: "abc123" };

        testContext.initialize(testContext.configuration);

        tokenizeHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_TOKENIZE
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue({
          getCardData: () => ({
            number: "4111111111111111",
            expirationMonth: "10",
            expirationYear: "2020",
            cvv: "123",
          }),
        });

        jest
          .spyOn(UnionPay.prototype, "tokenize")
          .mockImplementation((options, callback) => {
            expect(options).toEqual({
              enrollmentId: "enrollmentId62",
              smsCode: "1234",
              card: {
                number: "4111111111111111",
                expirationMonth: "10",
                expirationYear: "2020",
                cvv: "123",
              },
              vault: false,
            });

            callback(fakeError, fakePayload);
          });

        tokenizeHandler(
          {
            hostedFields: {},
            enrollmentId: "enrollmentId62",
            smsCode: "1234",
          },
          ({ err, payload }) => {
            expect(err).toBe(fakeError);
            expect(payload).toBe(fakePayload);

            done();
          }
        );
      });

      it("can vault tokenized unionpay card", (done) => {
        let tokenizeHandler;
        const fakeError = new Error("you goofed!");
        const fakePayload = { nonce: "abc123" };

        testContext.initialize(testContext.configuration);

        tokenizeHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_TOKENIZE
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue({
          getCardData: () => ({
            number: "4111111111111111",
            expirationMonth: "10",
            expirationYear: "2020",
            cvv: "123",
          }),
        });

        jest
          .spyOn(UnionPay.prototype, "tokenize")
          .mockImplementation((options, callback) => {
            expect(options).toEqual({
              enrollmentId: "enrollmentId62",
              smsCode: "1234",
              card: {
                number: "4111111111111111",
                expirationMonth: "10",
                expirationYear: "2020",
                cvv: "123",
              },
              vault: true,
            });

            callback(fakeError, fakePayload);
          });

        tokenizeHandler(
          {
            hostedFields: {},
            enrollmentId: "enrollmentId62",
            smsCode: "1234",
            vault: true,
          },
          ({ err, payload }) => {
            expect(err).toBe(fakeError);
            expect(payload).toBe(fakePayload);

            done();
          }
        );
      });

      it("calls the callback with an error if the card form does not exist", (done) => {
        let tokenizeHandler;
        const fakeHostedFields = {
          _bus: { channel: "12345" },
        };

        testContext.initialize(testContext.configuration);

        tokenizeHandler = Bus.prototype.on.mock.calls.find(
          (call) => call[0] === events.HOSTED_FIELDS_TOKENIZE
        )[1];
        jest.spyOn(getHostedFieldsCardForm, "get").mockReturnValue(null);

        jest.spyOn(UnionPay.prototype, "tokenize").mockReturnValue(null);

        tokenizeHandler(
          {
            hostedFields: fakeHostedFields,
            options: {
              id: "enrollmentId62",
              smsCode: "1234",
            },
          },
          ({ err, payload }) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED");
            expect(err.message).toBe(
              "Could not find the Hosted Fields instance."
            );

            expect(payload).toBeFalsy();

            expect(UnionPay.prototype.tokenize).not.toHaveBeenCalled();

            done();
          }
        );
      });
    });
  });
});
