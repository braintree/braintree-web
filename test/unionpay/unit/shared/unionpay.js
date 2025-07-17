"use strict";

const analytics = require("../../../../src/lib/analytics");
const Bus = require("framebus");
const UnionPay = require("../../../../src/unionpay/shared/unionpay");
const BraintreeError = require("../../../../src/lib/braintree-error");
const { events } = require("../../../../src/unionpay/shared/constants");
const methods = require("../../../../src/lib/methods");
const { noop } = require("../../../helpers");

describe("UnionPay", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.client = {
      request: jest.fn().mockResolvedValue({}),
      getConfiguration: () => ({
        gatewayConfiguration: {
          unionPay: {
            enabled: true,
          },
        },
      }),
    };
  });

  describe("Constructor", () => {
    it("maps provided options to instance property", () => {
      const options = {
        foo: "bar",
        client: testContext.client,
      };
      const up = new UnionPay(options);

      expect(up._options).toEqual(options);
    });
  });

  describe("fetchCapabilities", () => {
    describe("when neither card number nor Hosted Fields are present", () => {
      it("rejects", () =>
        UnionPay.prototype.fetchCapabilities
          .call(
            {
              _options: { client: testContext.client },
            },
            ""
          )
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe(
              "UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED"
            );
            expect(err.message).toBe(
              "A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance."
            );
          }));
    });

    describe("when card number is present", () => {
      it("calls the credit card capabilities endpoint", () => {
        const client = {
          request: jest.fn().mockResolvedValue(null),
        };
        const errback = noop;
        const number = "621234567890123456";
        const options = {
          card: { number: number },
        };

        UnionPay.prototype.fetchCapabilities.call(
          {
            _options: { client: client },
          },
          options,
          errback
        );

        expect(client.request).toBeCalledWith(
          expect.objectContaining({
            method: "get",
            endpoint: "payment_methods/credit_cards/capabilities",
            data: expect.objectContaining({
              _meta: expect.any(Object),
              creditCard: {
                number: number,
              },
            }),
          })
        );
      });

      it("rejects with an error when the call to the endpoint fails", () => {
        const clientErr = {
          type: BraintreeError.types.NETWORK,
          message: "Your network request failed.",
        };
        const options = {
          card: { number: "12345" },
        };

        testContext.client.request.mockRejectedValue(clientErr);

        return UnionPay.prototype.fetchCapabilities
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("NETWORK");
            expect(err.code).toBe("UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR");
            expect(err.message).toBe("Could not fetch card capabilities.");
            expect(err.details.originalError).toBe(clientErr);
          });
      });

      it("rejects with an error when tokenization key is used", () => {
        const clientErr = {
          type: BraintreeError.types.NETWORK,
          message: "Your network request failed.",
          details: { httpStatus: 403 },
        };
        const options = {
          card: { number: "12345" },
        };

        testContext.client.request.mockRejectedValue(clientErr);

        return UnionPay.prototype.fetchCapabilities
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .catch((err) => {
            expect(err).toBe(clientErr);
          });
      });

      it("resolves with unionpay capabilities when the endpoint succeeds", () => {
        const unionPayCapabilities = {
          isUnionPay: true,
          isDebit: false,
          unionPay: {
            supportsTwoStepAuthAndCapture: true,
            isSupported: false,
          },
        };
        const client = {
          request: jest.fn().mockResolvedValue(unionPayCapabilities),
        };
        const options = {
          card: { number: "12345" },
        };

        return UnionPay.prototype.fetchCapabilities
          .call(
            {
              _options: { client: client },
            },
            options
          )
          .then((data) => {
            expect(data).toBe(unionPayCapabilities);
          });
      });

      it("calls analytics when unionpay capabilities succeeds", () => {
        const unionPayCapabilities = {
          isUnionPay: true,
          isDebit: false,
          unionPay: {
            supportsTwoStepAuthAndCapture: true,
            isSupported: false,
          },
        };
        const options = {
          card: { number: "12345" },
        };

        testContext.client.request.mockResolvedValue(unionPayCapabilities);

        return UnionPay.prototype.fetchCapabilities
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(analytics.sendEvent).toBeCalledWith(
              testContext.client,
              "unionpay.capabilities-received"
            );
          });
      });
    });

    describe("when Hosted Fields instance is present", () => {
      it("emits an event to fetch capabilities", (done) => {
        const errback = noop;
        const hostedFieldsInstance = {
          _bus: {},
        };
        const options = { hostedFields: hostedFieldsInstance };

        UnionPay.prototype.fetchCapabilities.call(
          {
            _options: { client: {} },
            _bus: {
              emit: (eventName, emitOptions, callback) => {
                expect(eventName).toBe(events.HOSTED_FIELDS_FETCH_CAPABILITIES);
                expect(emitOptions.hostedFields).toBe(hostedFieldsInstance);
                expect(callback).toBeInstanceOf(Function);

                done();
              },
            },
            _initializeHostedFields: jest.fn().mockResolvedValue(null),
          },
          options,
          errback
        );
      });

      it("returns a BraintreeError when given invalid Hosted Fields instance", () => {
        const badHostedFieldsInstance = "literal garbage";
        const options = { hostedFields: badHostedFieldsInstance };

        return UnionPay.prototype.fetchCapabilities
          .call({ _options: { client: {} } }, options)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID");
            expect(err.message).toBe(
              "Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance."
            );
          });
      });

      it("can run multiple fetchCapabilities calls at once", () => {
        const replySpy = jest.fn();
        let canEmit = false;
        const hostedFieldsInstance = {
          _bus: {},
        };
        const options = { hostedFields: hostedFieldsInstance };
        const up = new UnionPay({
          client: testContext.client,
        });

        jest.spyOn(document.body, "appendChild").mockReturnValue(null);
        Bus.prototype.emit.mockImplementation((_, __, cb) => {
          if (canEmit) {
            cb({
              payload: {},
            });
          }
        });
        Bus.prototype.on.mockImplementation((_, cb) => {
          setTimeout(() => {
            canEmit = true;

            cb(replySpy);
          }, 100);
        });

        return Promise.all([
          up.fetchCapabilities(options),
          up.fetchCapabilities(options),
          up.fetchCapabilities(options),
        ]).then((result) => {
          expect(result.length).toBe(3);

          expect(replySpy).toBeCalledTimes(1);
          expect(document.body.appendChild).toBeCalledTimes(1);
        });
      });
    });

    it("calls analytics when unionpay capabilities request fails", () => {
      const options = {
        card: { number: "12345" },
      };

      testContext.client.request.mockRejectedValue(new Error("error"));

      return UnionPay.prototype.fetchCapabilities
        .call(
          {
            _options: { client: testContext.client },
          },
          options
        )
        .catch(() => {
          expect(analytics.sendEvent).toBeCalledWith(
            testContext.client,
            "unionpay.capabilities-failed"
          );
        });
    });

    it("sends _meta source", () => {
      const number = "621234567890123456";
      const options = {
        card: { number: number },
      };

      return UnionPay.prototype.fetchCapabilities
        .call(
          {
            _options: { client: testContext.client },
          },
          options
        )
        .then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: { _meta: { source: "unionpay" } },
          });
        });
    });
  });

  describe("enroll", () => {
    beforeEach(() => {
      testContext.client.request.mockResolvedValue({
        unionPayEnrollmentId: "id",
        smsCodeRequired: true,
      });
    });

    describe("when a card is present", () => {
      it("calls the enrollment endpoint with the card", () => {
        const options = {
          card: {
            number: "6211111111111111",
            expirationMonth: "12",
            expirationYear: "2020",
          },
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "union_pay_enrollments",
                data: {
                  _meta: expect.any(Object),
                  unionPayEnrollment: {
                    number: "6211111111111111",
                    expirationMonth: "12",
                    expirationYear: "2020",
                    mobileCountryCode: "62",
                    mobileNumber: "867530911",
                  },
                },
              })
            );
          });
      });

      it("sends _meta source", () => {
        const options = {
          card: {
            number: "6211111111111111",
            expirationMonth: "12",
            expirationYear: "2020",
          },
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: { _meta: { source: "unionpay" } },
            });
          });
      });

      it("does not pass a CVV into the request payload", () => {
        const options = {
          card: {
            number: "6211111111111111",
            expirationMonth: "12",
            expirationYear: "2020",
            cvv: "123",
          },
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "union_pay_enrollments",
                data: {
                  _meta: expect.any(Object),
                  unionPayEnrollment: {
                    number: "6211111111111111",
                    expirationMonth: "12",
                    expirationYear: "2020",
                    mobileCountryCode: "62",
                    mobileNumber: "867530911",
                  },
                },
              })
            );
          });
      });

      it("accepts expirationDate if defined", () => {
        const options = {
          card: {
            number: "6211111111111111",
            expirationDate: "12/2020",
            cvv: "123",
          },
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "union_pay_enrollments",
                data: {
                  _meta: expect.any(Object),
                  unionPayEnrollment: {
                    number: "6211111111111111",
                    expirationDate: "12/2020",
                    mobileCountryCode: "62",
                    mobileNumber: "867530911",
                  },
                },
              })
            );
          });
      });

      it("accepts expirationDate over expirationMonth and expirationYear", () => {
        const options = {
          card: {
            number: "6211111111111111",
            expirationDate: "12/2020",
            expirationYear: "2021",
            expirationMonth: "11",
            cvv: "123",
          },
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "union_pay_enrollments",
                data: {
                  _meta: expect.any(Object),
                  unionPayEnrollment: {
                    number: "6211111111111111",
                    expirationDate: "12/2020",
                    mobileCountryCode: "62",
                    mobileNumber: "867530911",
                  },
                },
              })
            );
          });
      });

      it.each([
        ["undefined", undefined],
        ["empty string", ""],
      ])(
        "does not apply expirationMonth and expirationYear to payload if %s",
        (s, value) => {
          const options = {
            card: {
              number: "6211111111111111",
              expirationMonth: value,
              expirationYear: value,
            },
            mobile: {
              countryCode: "62",
              number: "867530911",
            },
          };

          return UnionPay.prototype.enroll
            .call(
              {
                _options: { client: testContext.client },
              },
              options
            )
            .then(() => {
              expect(
                testContext.client.request.mock.calls[0][0].data.unionPayEnrollment.hasOwnProperty(
                  "expirationMonth"
                )
              ).toBe(false);
              expect(
                testContext.client.request.mock.calls[0][0].data.unionPayEnrollment.hasOwnProperty(
                  "expirationYear"
                )
              ).toBe(false);
            });
        }
      );

      it.each([["expirationMonth"], ["expirationYear"]])(
        "returns a BraintreeError if date incomplete due to %s being undefined",
        (key) => {
          const options = {
            card: {
              number: "6211111111111111",
              expirationYear: "2019",
              expirationMonth: "12",
            },
            mobile: {
              countryCode: "62",
              number: "867530911",
            },
          };

          delete options[key];

          return UnionPay.prototype.enroll
            .call(
              {
                _options: { client: testContext.client },
              },
              options
            )
            .catch((err) => {
              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("MERCHANT");
              expect(err.code).toBe("UNIONPAY_EXPIRATION_DATE_INCOMPLETE");
              expect(err.message).toBe(
                "You must supply expiration month and year or neither."
              );
            });
        }
      );

      describe("when the enrollment fails", () => {
        it("calls analytics", () => {
          const options = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
            },
            mobile: {
              countryCode: "62",
              number: "867530911",
            },
          };
          const clientErr = {
            type: BraintreeError.types.NETWORK,
            message: "An error message",
          };

          testContext.client.request.mockRejectedValue(clientErr);

          return UnionPay.prototype.enroll
            .call(
              {
                _options: { client: testContext.client },
              },
              options
            )
            .catch(() => {
              expect(analytics.sendEvent).toBeCalledWith(
                testContext.client,
                "unionpay.enrollment-failed"
              );
            });
        });

        describe("with a 422", () => {
          it("rejects with a customer error", () => {
            const clientErr = {
              type: BraintreeError.types.CUSTOMER,
              message: "The customer input was not valid",
              details: { httpStatus: 422 },
            };

            testContext.client.request.mockRejectedValue(clientErr);

            return UnionPay.prototype.enroll
              .call(
                {
                  _options: { client: testContext.client },
                },
                {
                  card: {
                    number: "5",
                  },
                  mobile: {
                    number: "123",
                  },
                }
              )
              .catch((err) => {
                expect(err).toBeInstanceOf(BraintreeError);
                expect(err.type).toBe("CUSTOMER");
                expect(err.code).toBe(
                  "UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID"
                );
                expect(err.message).toBe(
                  "Enrollment failed due to user input error."
                );
                expect(err.details.originalError).toEqual(clientErr);
              });
          });
        });

        describe("with a 403", () => {
          it("rejects with a client's error", () => {
            const clientErr = {
              type: BraintreeError.types.MERCHANT,
              message: "error",
              details: { httpStatus: 403 },
            };

            testContext.client.request.mockRejectedValue(clientErr);

            return UnionPay.prototype.enroll
              .call(
                {
                  _options: { client: testContext.client },
                },
                {
                  card: {
                    number: "5",
                  },
                  mobile: {
                    number: "123",
                  },
                }
              )
              .catch((err) => {
                expect(err).toBe(clientErr);
              });
          });
        });

        describe("with a network error", () => {
          const options = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
            },
            mobile: {
              countryCode: "62",
              number: "867530911",
            },
          };

          it("rejects with a network error", () => {
            const clientErr = {
              type: BraintreeError.types.NETWORK,
              message: "Your network request failed",
              details: { httpStatus: 500 },
            };

            testContext.client.request.mockRejectedValue(clientErr);

            return UnionPay.prototype.enroll
              .call(
                {
                  _options: { client: testContext.client },
                },
                options
              )
              .catch((err) => {
                expect(err).toBeInstanceOf(BraintreeError);
                expect(err.type).toBe("NETWORK");
                expect(err.code).toBe("UNIONPAY_ENROLLMENT_NETWORK_ERROR");
                expect(err.message).toBe("Could not enroll UnionPay card.");
                expect(err.details.originalError).toBe(clientErr);
              });
          });
        });
      });

      describe("when the enrollment succeeds", () => {
        it("resolves with the enrollment ID", () => {
          const options = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
            },
            mobile: {
              countryCode: "62",
              number: "867530911",
            },
          };

          testContext.client.request.mockResolvedValue({
            unionPayEnrollmentId: "enrollment-id",
            smsCodeRequired: true,
          });

          return UnionPay.prototype.enroll
            .call(
              {
                _options: { client: testContext.client },
              },
              options
            )
            .then((data) => {
              expect(data).toEqual({
                enrollmentId: "enrollment-id",
                smsCodeRequired: true,
              });
            });
        });

        it("calls analytics", () => {
          const options = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
            },
            mobile: {
              countryCode: "62",
              number: "867530911",
            },
          };

          testContext.client.request.mockResolvedValue({
            unionPayEnrollmentId: "enrollment-id",
            smsCodeRequired: true,
          });

          return UnionPay.prototype.enroll
            .call(
              {
                _options: { client: testContext.client },
              },
              options
            )
            .then(() => {
              expect(analytics.sendEvent).toBeCalledWith(
                testContext.client,
                "unionpay.enrollment-succeeded"
              );
            });
        });
      });
    });

    describe("when a Hosted Fields instance is present", () => {
      it("emits an event to enroll", (done) => {
        const errback = noop;
        const hostedFieldsInstance = {
          _bus: {},
        };
        const options = {
          hostedFields: hostedFieldsInstance,
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        UnionPay.prototype.enroll.call(
          {
            _options: { client: {} },
            _bus: {
              emit: (eventName, emitOptions, callback) => {
                expect(eventName).toBe(events.HOSTED_FIELDS_ENROLL);
                expect(emitOptions.hostedFields).toBe(hostedFieldsInstance);
                expect(callback).toBeInstanceOf(Function);

                done();
              },
            },
            _initializeHostedFields: jest.fn().mockResolvedValue(null),
          },
          options,
          errback
        );
      });

      it("returns a BraintreeError when given invalid Hosted Fields instance", () => {
        const badHostedFieldsInstance = "literal garbage";
        const options = {
          hostedFields: badHostedFieldsInstance,
          mobile: {
            countryCode: "62",
            number: "867530911",
          },
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: {} },
            },
            options
          )
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID");
            expect(err.message).toBe(
              "Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance."
            );
          });
      });

      it("returns a BraintreeError when given a Hosted Fields instance without mobile data", () => {
        const hostedFieldsInstance = {
          _bus: {},
        };
        const options = { hostedFields: hostedFieldsInstance };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: {} },
            },
            options
          )
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_MISSING_MOBILE_PHONE_DATA");
            expect(err.message).toBe(
              "A `mobile` with `countryCode` and `number` is required."
            );
          });
      });

      it("returns a BraintreeError when given a Hosted Fields instance with a card property", () => {
        const hostedFieldsInstance = {
          _bus: {},
        };
        const options = {
          hostedFields: hostedFieldsInstance,
          card: {},
          mobile: {},
        };

        return UnionPay.prototype.enroll
          .call(
            {
              _options: { client: {} },
            },
            options
          )
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES");
            expect(err.message).toBe(
              "Please supply either a card or a Hosted Fields instance, not both."
            );
          });
      });
    });

    it("returns a BraintreeError if given neither a card nor a Hosted Fields instance", () =>
      UnionPay.prototype.enroll
        .call(
          {
            _options: { client: {} },
          },
          { mobile: {} }
        )
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED"
          );
          expect(err.message).toBe(
            "A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance."
          );
        }));
  });

  describe("tokenize", () => {
    beforeEach(() => {
      testContext.client.request.mockResolvedValue({
        creditCards: [{}],
      });
    });

    describe("with raw card data", () => {
      it("calls the tokenization endpoint with the card and enrollment", () => {
        const request = {
          card: {
            number: "6211111111111111",
            expirationMonth: "12",
            expirationYear: "2020",
            cvv: "123",
          },
          enrollmentId: "enrollment-id",
          smsCode: "123456",
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            request
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "payment_methods/credit_cards",
                data: {
                  _meta: expect.any(Object),
                  creditCard: {
                    number: request.card.number,
                    expirationMonth: request.card.expirationMonth,
                    expirationYear: request.card.expirationYear,
                    cvv: request.card.cvv,
                    options: {
                      unionPayEnrollment: {
                        id: "enrollment-id",
                        smsCode: "123456",
                      },
                    },
                  },
                },
              })
            );
          });
      });

      it("does not pass smsCode if !smsCodeRequired", () => {
        const request = {
          card: {
            number: "6211111111111111",
            expirationMonth: "12",
            expirationYear: "2020",
            cvv: "123",
          },
          enrollmentId: "enrollment-id",
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            request
          )
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.creditCard.options.unionPayEnrollment.hasOwnProperty(
                "smsCode"
              )
            ).toBe(false);
          });
      });

      it.each([
        ["accepts", { expirationDate: "12/2020" }],
        [
          "prefers",
          {
            expirationDate: "12/2020",
            expirationYear: "2021",
            expirationMonth: "11",
          },
        ],
      ])("%s expirationDate if defined", (s, expirationObject) => {
        const options = {
          card: {
            number: "6211111111111111",
            cvv: "123",
            ...expirationObject,
          },
          enrollmentId: "enrollment-id",
          smsCode: "12345",
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "payment_methods/credit_cards",
                data: {
                  _meta: expect.any(Object),
                  creditCard: {
                    number: "6211111111111111",
                    expirationDate: "12/2020",
                    cvv: "123",
                    options: {
                      unionPayEnrollment: {
                        id: "enrollment-id",
                        smsCode: "12345",
                      },
                    },
                  },
                },
              })
            );
          });
      });

      it("does not apply expirationMonth and expirationYear to payload if empty string", () => {
        const options = {
          card: {
            number: "6211111111111111",
            expirationMonth: "",
            expirationYear: "",
            cvv: "123",
          },
          enrollmentId: "enrollment-id",
          smsCode: "123456",
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            options
          )
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.creditCard.hasOwnProperty(
                "expirationMonth"
              )
            ).toBe(false);
            expect(
              testContext.client.request.mock.calls[0][0].data.creditCard.hasOwnProperty(
                "expirationYear"
              )
            ).toBe(false);
          });
      });

      it("accepts cvv if defined", () => {
        const request = {
          card: {
            number: "6211111111111111",
            cvv: "123",
          },
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            request
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                method: "post",
                endpoint: "payment_methods/credit_cards",
                data: {
                  _meta: expect.any(Object),
                  creditCard: {
                    options: expect.any(Object),
                    number: request.card.number,
                    cvv: request.card.cvv,
                  },
                },
              })
            );
          });
      });

      it("does not apply cvv if empty string", () => {
        const request = {
          card: {
            number: "6211111111111111",
            cvv: "",
          },
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            request
          )
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.creditCard.hasOwnProperty(
                "cvv"
              )
            ).toBe(false);
          });
      });

      it("does not apply cvv if not defined", () => {
        const request = {
          card: {
            number: "6211111111111111",
          },
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            request
          )
          .then(() => {
            expect(
              testContext.client.request.mock.calls[0][0].data.creditCard.hasOwnProperty(
                "cvv"
              )
            ).toBe(false);
          });
      });

      it("sends _meta source", () => {
        const request = {
          card: {
            number: "6211111111111111",
            expirationMonth: "12",
            expirationYear: "2020",
            cvv: "123",
          },
          enrollmentId: "enrollment-id",
          smsCode: "123456",
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: testContext.client },
            },
            request
          )
          .then(() => {
            expect(testContext.client.request).toBeCalledWith(
              expect.objectContaining({
                data: {
                  _meta: { source: "unionpay" },
                  creditCard: expect.any(Object),
                },
              })
            );
          });
      });

      describe("when tokenization is successful", () => {
        it("calls analytics", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
            enrollmentId: "enrollment-id",
            smsCode: "123456",
          };
          const expectedCardNonce = {
            consumed: false,
            description: "ending in 11",
            details: {
              cardType: "unionpay",
              lastTwo: "11",
            },
            nonce: "a-nonce",
            type: "CreditCard",
          };

          testContext.client.request.mockResolvedValue({
            creditCards: [expectedCardNonce],
          });

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .then(() => {
              expect(analytics.sendEvent).toBeCalledWith(
                testContext.client,
                "unionpay.nonce-received"
              );
            });
        });

        it("resolves with a nonce", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
            enrollmentId: "enrollment-id",
            smsCode: "123456",
          };
          const expectedCardNonce = {
            consumed: false,
            description: "ending in 11",
            details: {
              cardType: "unionpay",
              lastTwo: "11",
            },
            nonce: "a-nonce",
            type: "CreditCard",
          };

          testContext.client.request.mockResolvedValue({
            creditCards: [expectedCardNonce],
          });

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .then((data) => {
              expect(data).toBe(expectedCardNonce);
              expect(data).toHaveProperty("description");
              expect(data).toHaveProperty("details");
              expect(data).toHaveProperty("nonce");
              expect(data).toHaveProperty("type");
            });
        });

        it("removes some card properties before returning", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
          };
          const expectedCardNonce = {
            consumed: false,
            description: "ending in 11",
            details: {
              cardType: "unionpay",
              lastTwo: "11",
            },
            nonce: "a-nonce",
            type: "CreditCard",
            threeDSecureInfo: {
              some: "info",
            },
          };

          testContext.client.request.mockResolvedValue({
            creditCards: [expectedCardNonce],
          });

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .then((data) => {
              expect(data).not.toHaveProperty("threeDSecureInfo");
              expect(data).not.toHaveProperty("consumed");
            });
        });
      });

      describe("when tokenization fails", () => {
        it("rejects with an error", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
            enrollmentId: "enrollment-id",
            smsCode: "123456",
          };
          const stubError = {
            type: BraintreeError.types.NETWORK,
            message: "A client error occurred",
            details: { httpStatus: 500 },
          };

          testContext.client.request.mockRejectedValue(stubError);

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .catch((err) => {
              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("NETWORK");
              expect(err.code).toBe("UNIONPAY_TOKENIZATION_NETWORK_ERROR");
              expect(err.message).toBe(
                "A tokenization network error occurred."
              );
              expect(err.details.originalError).toBe(stubError);
            });
        });

        it("rejects with an authorization error", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
            enrollmentId: "enrollment-id",
            smsCode: "123456",
          };
          const stubError = {
            type: BraintreeError.types.MERCHANT,
            message: "A client error occurred",
            details: { httpStatus: 403 },
          };

          testContext.client.request.mockRejectedValue(stubError);

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .catch((err) => {
              expect(err).toBe(stubError);
            });
        });

        it("calls the errback with a CUSTOMER error", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
            enrollmentId: "enrollment-id",
            smsCode: "123456",
          };
          const stubError = {
            type: BraintreeError.types.NETWORK,
            message: "A client error occurred",
            details: { httpStatus: 422 },
          };

          testContext.client.request.mockRejectedValue(stubError);

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .catch((err) => {
              expect(err).toBeInstanceOf(BraintreeError);
              expect(err.type).toBe("CUSTOMER");
              expect(err.code).toBe("UNIONPAY_FAILED_TOKENIZATION");
              expect(err.message).toBe(
                "The supplied card data failed tokenization."
              );
              expect(err.details.originalError).toBe(stubError);
            });
        });

        it("calls analytics", () => {
          const request = {
            card: {
              number: "6211111111111111",
              expirationMonth: "12",
              expirationYear: "2020",
              cvv: "123",
            },
            enrollmentId: "enrollment-id",
            smsCode: "123456",
          };
          const stubError = {
            type: BraintreeError.types.NETWORK,
            message: "A client error occurred",
          };

          testContext.client.request.mockRejectedValue(stubError);

          return UnionPay.prototype.tokenize
            .call(
              {
                _options: { client: testContext.client },
              },
              request
            )
            .catch(() => {
              expect(analytics.sendEvent).toBeCalledWith(
                testContext.client,
                "unionpay.nonce-failed"
              );
            });
        });
      });
    });

    describe("with a Hosted Fields instance", () => {
      it("emits an event to tokenize", (done) => {
        const hostedFieldsInstance = {
          _bus: {},
        };
        const options = {
          hostedFields: hostedFieldsInstance,
          enrollmentId: "abc123",
          smsCode: "ayy",
        };

        UnionPay.prototype.tokenize.call(
          {
            _options: { client: {} },
            _bus: {
              emit: (eventName, emitOptions, callback) => {
                expect(eventName).toBe(events.HOSTED_FIELDS_TOKENIZE);
                expect(emitOptions.hostedFields).toBe(hostedFieldsInstance);
                expect(callback).toBeInstanceOf(Function);

                done();
              },
            },
            _initializeHostedFields: jest.fn().mockResolvedValue(null),
          },
          options,
          noop
        );
      });

      it("returns a BraintreeError when given invalid Hosted Fields instance", () => {
        const badHostedFieldsInstance = "literal garbage";
        const options = {
          hostedFields: badHostedFieldsInstance,
          enrollmentId: "abc123",
          smsCode: "ayy",
        };

        return UnionPay.prototype.tokenize
          .call(
            {
              _options: { client: {} },
            },
            options
          )
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID");
            expect(err.message).toBe(
              "Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance."
            );
          });
      });
    });

    it("returns a BraintreeError if given neither a card nor a Hosted Fields instance", () =>
      UnionPay.prototype.tokenize
        .call(
          {
            _options: { client: {} },
          },
          {}
        )
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED"
          );
          expect(err.message).toBe(
            "A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance."
          );
        }));
  });

  describe("teardown", () => {
    beforeEach(() => {
      testContext.fakeBus = { teardown: jest.fn() };
      testContext.fakeHostedFieldsFrame = {
        parentNode: {
          removeChild: jest.fn(),
        },
      };
    });

    it("calls the callback if there is no bus", (done) => {
      UnionPay.prototype.teardown.call({}, done);
    });

    it("tears down the bus if it exists", () => {
      UnionPay.prototype.teardown.call({
        _bus: testContext.fakeBus,
        _hostedFieldsFrame: testContext.fakeHostedFieldsFrame,
      });

      expect(testContext.fakeBus.teardown).toBeCalledTimes(1);
    });

    it("tears down the Hosted Fields frame if the bus exists", () => {
      UnionPay.prototype.teardown.call({
        _bus: testContext.fakeBus,
        _hostedFieldsFrame: testContext.fakeHostedFieldsFrame,
      });

      expect(
        testContext.fakeHostedFieldsFrame.parentNode.removeChild
      ).toBeCalledWith(testContext.fakeHostedFieldsFrame);
    });

    it("calls the callback if there is a bus", (done) => {
      UnionPay.prototype.teardown.call(
        {
          _bus: testContext.fakeBus,
          _hostedFieldsFrame: testContext.fakeHostedFieldsFrame,
        },
        done
      );
    });

    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      const up = new UnionPay({ client: testContext.client });

      up.teardown(() => {
        methods(UnionPay.prototype).forEach((method) => {
          try {
            up[method]();
          } catch (error) {
            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe("MERCHANT");
            expect(error.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
            expect(error.message).toBe(
              `${method} cannot be called after teardown.`
            );
          }
        });

        done();
      });
    });
  });
});
