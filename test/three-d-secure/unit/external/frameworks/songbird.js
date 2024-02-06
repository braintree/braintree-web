"use strict";

jest.mock("../../../../../src/lib/assets");
jest.mock("@braintree/asset-loader/load-script");

const Bus = require("framebus");
const BaseFramework = require("../../../../../src/three-d-secure/external/frameworks/base");
const SongbirdFramework = require("../../../../../src/three-d-secure/external/frameworks/songbird");
const {
  wait,
  fake: { clientToken },
  yieldsAsync,
  yieldsByEventAsync,
  yieldsByEvents,
  findFirstEventCallback,
} = require("../../../../helpers");
const BraintreeError = require("../../../../../src/lib/braintree-error");
const { version: VERSION } = require("../../../../../package.json");
const analytics = require("../../../../../src/lib/analytics");
const {
  BRAINTREE_LIBRARY_VERSION,
  PLATFORM,
} = require("../../../../../src/lib/constants");
const assets = require("../../../../../src/lib/assets");

describe("SongbirdFramework", () => {
  let testContext, createFramework;

  beforeEach(() => {
    testContext = {};

    jest
      .spyOn(SongbirdFramework.prototype, "setupSongbird")
      .mockImplementation(() => {
        window.Cardinal = testContext.fakeCardinal;

        return Promise.resolve();
      });
    jest.spyOn(assets, "loadScript").mockImplementation(() => {
      window.Cardinal = testContext.fakeCardinal;

      return Promise.resolve();
    });
    jest.spyOn(Bus.prototype, "on").mockImplementation();

    testContext.onEventBehavior = [
      { event: "payments.setupComplete", args: [{}] },
      {
        event: "payments.validated",
        args: [{ ActionCode: "SUCCESS" }, "validated-jwt"],
      },
    ];
    testContext.configuration = {
      authorization: clientToken,
      authorizationFingerprint: "encoded_auth_fingerprint",
      gatewayConfiguration: {
        environment: "sandbox",
        assetsUrl: "http://example.com/assets",
        threeDSecure: {
          cardinalAuthenticationJWT: "jwt",
        },
      },
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
      getConfiguration: () => testContext.configuration,
    };
    testContext.fakeCardinal = {
      configure: jest.fn(),
      setup: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      trigger: jest.fn().mockResolvedValue({ Status: false }),
      continue: jest.fn(),
    };

    testContext.applyActionCode = (actionCode = "SUCCESS", options = {}) => {
      testContext.fakeCardinal.continue.mockImplementation(() => {
        const handler = findFirstEventCallback(
          "payments.validated",
          testContext.fakeCardinal.on.mock.calls
        );
        const handlerOptions = {
          ActionCode: actionCode,
          ...options,
        };

        handler(handlerOptions, "jwt");
      });
    };

    createFramework = (options = {}) => {
      return new SongbirdFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
        ...options,
      });
    };
  });

  describe("Constructor", () => {
    it("adds sdkVersion to clientMetadata", () => {
      const framework = createFramework();

      expect(framework._clientMetadata.sdkVersion).toBe(
        `${PLATFORM}/${VERSION}`
      );
    });

    it('adds requestedThreeDSVersion to clientMetadata as "2"', () => {
      const framework = createFramework();

      expect(framework._clientMetadata.requestedThreeDSecureVersion).toBe("2");
    });

    it("sets up songbird when instance is created", () => {
      const framework = createFramework();

      expect(framework.setupSongbird).toHaveBeenCalledTimes(1);
    });
  });

  describe("setUpEventListeners", () => {
    it("sets up listener for on lookup complete event", (done) => {
      const framework = createFramework();

      jest
        .spyOn(framework, "on")
        .mockImplementationOnce(yieldsAsync("some data", "a fake function"));

      framework.setUpEventListeners((eventName, data, fakeFunction) => {
        expect(eventName).toBe("lookup-complete");
        expect(data).toBe("some data");
        expect(fakeFunction).toBe("a fake function");

        done();
      });
    });

    it.each([
      ["CUSTOMER_CANCELED", "customer-canceled"],
      ["UI.CLOSE", "authentication-modal-close"],
      ["UI.RENDER", "authentication-modal-render"],
      ["UI.RENDERHIDDEN", "authentication-modal-render-hidden"],
      ["UI.LOADING.CLOSE", "authentication-modal-loader-close"],
      ["UI.LOADING.RENDER", "authentication-modal-loader-render"],
    ])(
      "sets up %s event without payload",
      (eventName, publicEventName, done) => {
        const framework = createFramework();

        jest.spyOn(framework, "on").mockImplementation((event, cb) => {
          if (event === `songbird-framework:${eventName}`) {
            cb();
          }
        });

        framework.setUpEventListeners((event) => {
          expect(event).toBe(publicEventName);

          done();
        });
      }
    );
  });

  describe("verifyCard", () => {
    beforeEach(() => {
      testContext.lookupResponse = {
        paymentMethod: {
          nonce: "upgraded-nonce",
          type: "CreditCard",
          details: {
            bin: "123456",
            cardType: "Visa",
          },
        },
        lookup: {
          threeDSecureVersion: "2.1.0",
          transactionId: "txn-id",
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
      };
      testContext.client.request.mockResolvedValue(testContext.lookupResponse);
      testContext.tokenizedCard = {
        nonce: "abcdef",
        type: "CreditCard",
        details: {
          bin: "123456",
          cardType: "Visa",
        },
      };
      jest.spyOn(testContext.fakeCardinal, "on").mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {
          sessionId: "df",
        })
      );
      SongbirdFramework.prototype.setupSongbird.mockRestore();
    });

    afterEach(() => {
      delete window.Cardinal;
    });

    describe("required params", () => {
      it("requires an onLookupComplete function", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            amount: 100,
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("THREEDS_MISSING_VERIFY_CARD_OPTION");
            expect(err.message).toBe(
              "verifyCard options must include an onLookupComplete function."
            );
          });
      });

      it("it does not require an onLookupComplete function if override is passed into additional options", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");

        framework.on(SongbirdFramework.events.LOOKUP_COMPLETE, (data, next) => {
          next();
        });

        return framework
          .verifyCard(
            {
              nonce: testContext.tokenizedCard.nonce,
              bin: testContext.tokenizedCard.details.bin,
              amount: 100,
            },
            {
              ignoreOnLookupCompleteRequirement: true,
            }
          )
          .then((payload) => {
            expect(payload.nonce).toBeDefined();
          });
      });
    });

    describe("reloadThreeDSecure", () => {
      it("calls reload 3DS after verifyCard is done", () => {
        const framework = createFramework();

        jest.spyOn(framework, "_reloadThreeDSecure");

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(framework._reloadThreeDSecure).toHaveBeenCalledTimes(1);
            expect(window.Cardinal.setup).toHaveBeenCalledTimes(1);
          });
      });

      it("reloadThreeDSecure tears down and rebuilds cardinal SDK", () => {
        const framework = createFramework();

        jest.spyOn(framework, "teardown");
        jest.spyOn(framework, "_configureCardinalSdk");

        return framework._reloadThreeDSecure().then(() => {
          expect(framework.teardown).toHaveBeenCalledTimes(1);
          expect(framework._configureCardinalSdk).toHaveBeenCalledWith({
            setupOptions: {
              createPromise: Promise.resolve(testContext.client),
              client: testContext.client,
            },
            setupStartTime: expect.any(Number),
          });
        });
      });
    });

    describe("lookup request", () => {
      it("makes a request to the 3DS lookup endpoint with billing address data", () => {
        const framework = createFramework();

        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            amount: 100,
            onLookupComplete: yieldsAsync(),
            email: "test@example.com",
            mobilePhoneNumber: "8101234567",
            billingAddress: {
              phoneNumber: "1234567",
              givenName: "Jill",
              surname: "Gal",
              streetAddress: "555 Smith street",
              extendedAddress: "#5",
              line3: "More Address",
              locality: "Oakland",
              region: "CA",
              postalCode: "12345",
              countryCodeAlpha2: "US",
            },
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                amount: 100,
                additionalInfo: {
                  billingGivenName: "Jill",
                  billingSurname: "Gal",
                  billingLine1: "555 Smith street",
                  billingLine2: "#5",
                  billingLine3: "More Address",
                  billingCity: "Oakland",
                  billingState: "CA",
                  billingPostalCode: "12345",
                  billingCountryCode: "US",
                  billingPhoneNumber: "1234567",
                },
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with customer data", () => {
        const framework = createFramework();

        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            amount: 100,
            onLookupComplete: yieldsAsync(),
            email: "test@example.com",
            mobilePhoneNumber: "8101234567",
            billingAddress: {
              phoneNumber: "1234567",
              givenName: "Jill",
              surname: "Gal",
              streetAddress: "555 Smith street",
              extendedAddress: "#5",
              line3: "More Address",
              locality: "Oakland",
              region: "CA",
              postalCode: "12345",
              countryCodeAlpha2: "US",
            },
            additionalInformation: {
              shippingMethod: "01",
              shippingGivenName: "Bob",
              shippingSurname: "Guy",
              shippingAddress: {
                streetAddress: "123 XYZ Street",
                extendedAddress: "Apt 2",
                line3: "Even More Address",
                locality: "Hagerstown",
                region: "MD",
                postalCode: "21740",
                countryCodeAlpha2: "US",
              },
            },
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                amount: 100,
                additionalInfo: {
                  mobilePhoneNumber: "8101234567",
                  email: "test@example.com",
                  billingGivenName: "Jill",
                  billingSurname: "Gal",
                  billingLine1: "555 Smith street",
                  billingLine2: "#5",
                  billingLine3: "More Address",
                  billingCity: "Oakland",
                  billingState: "CA",
                  billingPostalCode: "12345",
                  billingCountryCode: "US",
                  billingPhoneNumber: "1234567",
                  shippingMethod: "01",
                  shippingGivenName: "Bob",
                  shippingSurname: "Guy",
                  shippingLine1: "123 XYZ Street",
                  shippingLine2: "Apt 2",
                  shippingLine3: "Even More Address",
                  shippingCity: "Hagerstown",
                  shippingState: "MD",
                  shippingPostalCode: "21740",
                  shippingCountryCode: "US",
                },
              },
            });
          });
      });

      it("prepares the lookup", () => {
        const framework = createFramework();

        jest.spyOn(framework, "prepareLookup");

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            onLookupComplete: yieldsAsync(),
            amount: 100,
          })
          .then(() => {
            expect(framework.prepareLookup).toHaveBeenCalledTimes(1);
            expect(framework.prepareLookup.mock.calls[0][0]).toMatchObject({
              amount: 100,
              bin: testContext.tokenizedCard.details.bin,
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint df reference id", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with cardAddChallengeRequested", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");

        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            cardAddChallengeRequested: false,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                cardAdd: false,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with cardAdd", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            cardAdd: false,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                cardAdd: false,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("prefers cardAddChallengeRequested over cardAdd", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");

        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            cardAddChallengeRequested: true,
            cardAdd: false,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                cardAdd: true,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with accountType", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            accountType: "credit",
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                accountType: "credit",
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with challengeRequested", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            challengeRequested: true,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                challengeRequested: true,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with merchantName", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            merchantName: "foo",
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                merchantName: "foo",
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with requestedExemptionType", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });
        expect.assertions(2);

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            requestedExemptionType: "low_value",
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                requestedExemptionType: "low_value",
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("returns validation error for invalid requestedExemptionType", () => {
        const framework = createFramework();

        jest.spyOn(framework, "_reloadThreeDSecure");
        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        expect.assertions(3);

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            requestedExemptionType: "foobar",
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .catch((err) => {
            expect(framework._reloadThreeDSecure).toHaveBeenCalledTimes(1);
            expect(err.code).toEqual(
              "THREEDS_REQUESTED_EXEMPTION_TYPE_INVALID"
            );
            expect(err.message).toEqual(
              "requestedExemptionType `foobar` is not a valid exemption. The accepted values are: `low_value`, `transaction_risk_analysis`"
            );
          });
      });

      it("doesnt send requestedExemptionType when blank", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        expect.assertions(1);

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            requestedExemptionType: "",
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with custom fields", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });
        expect.assertions(2);

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            customFields: { 1: "one", 2: "two" },
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                customFields: { 1: "one", 2: "two" },
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("doesn't send custom fields when null", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        expect.assertions(1);

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            customFields: null,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with dataOnlyRequested", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            dataOnlyRequested: true,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                dataOnlyRequested: true,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with exemptionRequested", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            exemptionRequested: true,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                exemptionRequested: true,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("makes a request to the 3DS lookup endpoint with requestVisaDAF", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            requestVisaDAF: true,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                requestVisaDAF: true,
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });
          });
      });

      it("does not send requestVisaDAF when false", () => {
        const framework = createFramework();

        jest.spyOn(framework, "getDfReferenceId").mockResolvedValue("df-id");
        testContext.client.request.mockResolvedValue({
          paymentMethod: {},
          threeDSecureInfo: {},
          lookup: {
            threeDSecureVersion: "2.1.0",
            transactionId: "txn-id",
          },
        });

        return framework
          .verifyCard({
            nonce: testContext.tokenizedCard.nonce,
            bin: testContext.tokenizedCard.details.bin,
            requestVisaDAF: false,
            amount: 100,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(1);
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              endpoint: "payment_methods/abcdef/three_d_secure/lookup",
              method: "post",
              data: {
                dfReferenceId: "df-id", // eslint-disable-line camelcase
                amount: 100,
              },
            });

            expect(
              testContext.client.request.mock.calls[0][0].data.requestVisaDAF
            ).toBeUndefined();
          });
      });

      it("calls initializeChallengeWithLookupResponse with lookup response and options", () => {
        const framework = createFramework();
        const lookupResponse = testContext.lookupResponse;

        jest.spyOn(framework, "initializeChallengeWithLookupResponse");

        return framework
          .verifyCard({
            nonce: "abcdef",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(
              framework.initializeChallengeWithLookupResponse
            ).toHaveBeenCalledTimes(1);
            expect(
              framework.initializeChallengeWithLookupResponse
            ).toHaveBeenCalledWith(lookupResponse, expect.any(Object));
            expect(
              framework.initializeChallengeWithLookupResponse.mock.calls[0][1]
            ).toMatchObject({
              onLookupComplete: expect.any(Function),
            });
          });
      });
    });

    describe("multiple calls", () => {
      it("can be called multiple times if authentication completes in between", () => {
        const framework = createFramework();
        const options = {
          nonce: "abc123",
          amount: 100,
          bin: 369,
          onLookupComplete: yieldsAsync(),
        };

        testContext.lookupResponse.lookup = {
          acsUrl: "http://example.com/acs",
          transactionId: "txn-id",
          pareq: "pareq",
          termUrl: "http://example.com/term",
          md: "md",
          threeDSecureVersion: "2.1.0",
        };

        testContext.client.request
          .mockResolvedValueOnce(testContext.lookupResponse)
          .mockResolvedValueOnce({
            paymentMethod: {
              nonce: "new-nonce",
              type: "CreditCard",
              description: "a card",
              binData: "bin data",
              details: {
                cardType: "Visa",
                bin: "123456",
              },
              threeDSecureInfo: {},
            },
            threeDSecureInfo: {
              liabilityShifted: true,
              liabilityShiftPossible: true,
            },
          })
          .mockResolvedValueOnce(testContext.lookupResponse)
          .mockResolvedValueOnce({
            paymentMethod: {
              nonce: "upgraded-nonce",
              description: "a card",
              type: "CreditCard",
              binData: "bin data",
              details: {
                cardType: "Visa",
                bin: "123456",
              },
              threeDSecureInfo: {},
            },
            threeDSecureInfo: {
              liabilityShifted: false,
              liabilityShiftPossible: true,
            },
          });

        testContext.fakeCardinal.continue.mockImplementation(() => {
          const cbFromPaymentsValidated = findFirstEventCallback(
            "payments.validated",
            testContext.fakeCardinal.on.mock.calls
          );

          cbFromPaymentsValidated(
            {
              ActionCode: "SUCCESS",
            },
            "validated-jwt"
          );
        });

        return framework
          .verifyCard(options)
          .then((data) => {
            expect(data.nonce).toBe("new-nonce");
            expect(data.liabilityShifted).toBe(true);
            expect(data.liabilityShiftPossible).toBe(true);

            return framework.verifyCard(options);
          })
          .then((data2) => {
            expect(data2.nonce).toBe("upgraded-nonce");
            expect(data2.liabilityShifted).toBe(false);
            expect(data2.liabilityShiftPossible).toBe(true);
          });
      });
    });

    describe("payload results", () => {
      beforeEach(() => {
        testContext.lookupResponse.lookup.acsUrl = "https://example.com/acs";
        testContext.payloadTestsResponse = {
          paymentMethod: {
            nonce: "new-nonce",
            description: "a card",
            type: "CreditCard",
            binData: "bin data",
            details: {
              cardType: "Visa",
              bin: "123456",
            },
            threeDSecureInfo: {},
          },
          threeDSecureInfo: {
            liabilityShifted: true,
            liabilityShiftPossible: true,
          },
          lookup: testContext.lookupResponse.lookup,
        };
        testContext.lookupResponse.lookup.acsUrl = "https://example.com/acs";
        testContext.client.request.mockResolvedValue(
          testContext.lookupResponse
        );
      });

      describe.each(["SUCCESS", "NOACTION", "FAILURE"])(
        "ActionCode cases: %s",
        (actionCode) => {
          it(`resolves with result from performJWTValidation on ${actionCode}`, () => {
            expect.assertions(5);

            testContext.client.request
              .mockResolvedValueOnce(testContext.lookupResponse)
              .mockResolvedValueOnce(testContext.payloadTestsResponse);

            const framework = createFramework();

            testContext.applyActionCode(actionCode);

            return framework
              .verifyCard({
                nonce: "nonce",
                amount: 100,
                bin: 369,
                onLookupComplete: yieldsAsync(),
              })
              .then((data) => {
                expect(data.nonce).toBe("new-nonce");
                expect(data.type).toBe("CreditCard");
                expect(data.details).toEqual({
                  cardType: "Visa",
                  bin: "123456",
                });
                expect(data.liabilityShiftPossible).toBe(true);
                expect(data.liabilityShifted).toBe(true);
              });
          });

          it("includes the raw response from Cardinal", () => {
            expect.assertions(1);

            const framework = createFramework();

            testContext.client.request
              .mockResolvedValueOnce(testContext.lookupResponse)
              .mockResolvedValueOnce(testContext.payloadTestsResponse);

            testContext.applyActionCode(actionCode, {
              foo: "bar",
            });

            return framework
              .verifyCard({
                nonce: "nonce",
                amount: 100,
                bin: 369,
                onLookupComplete: yieldsAsync(),
              })
              .then((data) => {
                expect(data.rawCardinalSDKVerificationData).toEqual({
                  ActionCode: actionCode,
                  foo: "bar",
                });
              });
          });

          it(`rejects with error from performJWTValidation even when Cardinal reports ${actionCode}`, async () => {
            const framework = createFramework();
            const error = new Error(
              `Error performing validation with ${actionCode}`
            );

            testContext.client.request
              .mockResolvedValueOnce(testContext.payloadTestsResponse)
              .mockRejectedValueOnce(error);

            testContext.applyActionCode(actionCode);

            await expect(
              framework.verifyCard({
                nonce: "nonce",
                amount: 100,
                bin: 369,
                onLookupComplete: yieldsAsync(),
              })
            ).rejects.toMatchObject({
              code: "THREEDS_JWT_AUTHENTICATION_FAILED",
              details: {
                originalError: error,
              },
            });
          });
        }
      );

      it("passes back a `requiresUserAuthentication=true` when an acs url is present", () => {
        const framework = createFramework();

        testContext.applyActionCode();

        return framework.verifyCard({
          nonce: "nonce",
          amount: 100,
          bin: 369,
          onLookupComplete(data, next) {
            expect(data.requiresUserAuthentication).toBe(true);
            next();
          },
        });
      });

      it("passes back a `requiresUserAuthentication=false` when an acs url is not present", () => {
        const framework = createFramework();

        delete testContext.lookupResponse.lookup.acsUrl;

        return framework.verifyCard({
          nonce: "nonce",
          amount: 100,
          bin: 369,
          onLookupComplete(data, next) {
            expect(data.requiresUserAuthentication).toBe(false);
            next();
          },
        });
      });

      it.each([
        [
          10001,
          "THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10001"],
        ],
        [
          10002,
          "THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10002"],
        ],
        [
          10003,
          "THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10003"],
        ],
        [
          10007,
          "THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10007"],
        ],
        [
          10009,
          "THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10009"],
        ],
        [
          10005,
          "THREEDS_CARDINAL_SDK_BAD_CONFIG",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10005"],
        ],
        [
          10006,
          "THREEDS_CARDINAL_SDK_BAD_CONFIG",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10006"],
        ],
        [
          10008,
          "THREEDS_CARDINAL_SDK_BAD_JWT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10008"],
        ],
        [
          10010,
          "THREEDS_CARDINAL_SDK_BAD_JWT",
          ["three-d-secure.verification-flow.cardinal-sdk-error.10010"],
        ],
        [
          10011,
          "THREEDS_CARDINAL_SDK_CANCELED",
          [
            "three-d-secure.verification-flow.canceled",
            "three-d-secure.verification-flow.cardinal-sdk-error.10011",
          ],
        ],
        [99999, "THREEDS_CARDINAL_SDK_ERROR", []],
      ])(
        "rejects when it receives %p with error code %p",
        (songbirdCode, braintreeCode, analytic) => {
          const framework = createFramework();

          testContext.applyActionCode("ERROR", {
            ErrorNumber: songbirdCode,
          });

          return expect(
            framework.verifyCard({
              nonce: "nonce",
              amount: 100,
              bin: 369,
              onLookupComplete: yieldsAsync(),
            })
          )
            .rejects.toMatchObject({
              code: braintreeCode,
            })
            .then(() => {
              analytic.forEach((a) => {
                expect(analytics.sendEvent).toHaveBeenCalledWith(
                  expect.anything(),
                  a
                );
              });
            });
        }
      );

      it("authenticate jwt", () => {
        const framework = createFramework();

        testContext.applyActionCode();

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(testContext.client.request).toHaveBeenCalledTimes(2);
            expect(testContext.client.request.mock.calls[1][0]).toMatchObject({
              method: "post",
              endpoint:
                "payment_methods/upgraded-nonce/three_d_secure/authenticate_from_jwt",
              data: {
                jwt: "jwt",
                paymentMethodNonce: "upgraded-nonce",
              },
            });
          });
      });

      it("sends analytics events for successful jwt validation", () => {
        expect.assertions(2);

        const framework = createFramework();

        testContext.applyActionCode();

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.upgrade-payment-method.started"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.upgrade-payment-method.succeeded"
            );
          });
      });

      it("sends analytics events for error in jwt validation request", () => {
        expect.assertions(3);

        const error = new Error(
          "sends analytics events for error in jwt validation request"
        );
        const framework = createFramework();

        jest.spyOn(framework, "_reloadThreeDSecure");

        testContext.applyActionCode();

        testContext.client.request
          .mockResolvedValueOnce(testContext.lookupResponse)
          .mockRejectedValueOnce(error);

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .catch(() => {
            expect(framework._reloadThreeDSecure).toHaveBeenCalledTimes(1);
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.upgrade-payment-method.started"
            );
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.upgrade-payment-method.errored"
            );
          });
      });

      it("emits cancel event when customer cancels", () => {
        expect.assertions(1);

        const framework = createFramework();

        testContext.applyActionCode("FAILURE", {
          Payment: {
            ExtendedData: {
              ChallengeCancel: "01", // customer canceled the modal
            },
          },
        });

        const spy = jest.fn();

        framework.on("songbird-framework:CUSTOMER_CANCELED", spy);

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(spy).toBeCalledTimes(1);
          });
      });

      it("does not emit cancel event when cancelation is not from a customer", () => {
        expect.assertions(1);

        const framework = createFramework();

        testContext.applyActionCode("FAILURE", {
          Payment: {
            ExtendedData: {
              ChallengeCancel: "03", // transaction timed out
            },
          },
        });

        const spy = jest.fn();

        framework.on("songbird-framework:CUSTOMER_CANCELED", spy);

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(spy).not.toBeCalled();
          });
      });

      it("sends analytics events for verification cancelation", () => {
        expect.assertions(1);

        const framework = createFramework();

        testContext.applyActionCode("FAILURE", {
          Payment: {
            ExtendedData: {
              ChallengeCancel: "02",
            },
          },
        });

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              expect.anything(),
              "three-d-secure.verification-flow.cardinal-sdk.cancel-code.02"
            );
          });
      });

      it("rejects with the client request error when jwt validation fails", () => {
        const error = new Error(
          "rejects with the client request error when jwt validation fails"
        );
        const framework = createFramework();

        jest.spyOn(framework, "_reloadThreeDSecure");

        testContext.applyActionCode();
        testContext.client.request
          .mockResolvedValueOnce(testContext.lookupResponse)
          .mockRejectedValueOnce(error);

        expect.assertions(5);

        return framework
          .verifyCard({
            nonce: "nonce",
            amount: 100,
            bin: 369,
            onLookupComplete: yieldsAsync(),
          })
          .catch((err) => {
            expect(framework._reloadThreeDSecure).toHaveBeenCalledTimes(1);
            expect(err.code).toBe("THREEDS_JWT_AUTHENTICATION_FAILED");
            expect(err.type).toBe("UNKNOWN");
            expect(err.message).toBe(
              "Something went wrong authenticating the JWT from Cardinal"
            );
            expect(err.details.originalError).toBe(error);
          });
      });
    });
  });

  describe("setupSongbird", () => {
    beforeEach(() => {
      jest
        .spyOn(testContext.fakeCardinal, "on")
        .mockImplementation(yieldsByEvents(testContext.onEventBehavior));

      SongbirdFramework.prototype.setupSongbird.mockRestore();

      return wait().then(() => {
        testContext.fakeCardinal.setup.mockClear();
        assets.loadScript.mockClear();
        analytics.sendEvent.mockClear();
      });
    });

    it("only lets songbird be setup once", async () => {
      const framework = createFramework();

      await wait();

      // setupSongbird is called as part of the constructor
      expect(assets.loadScript).toHaveBeenCalledTimes(1);

      Promise.all([
        framework.setupSongbird(),
        framework.setupSongbird(),
        framework.setupSongbird(),
      ]).then(() => {
        expect(assets.loadScript).toHaveBeenCalledTimes(1);
      });
    });

    it("loads cardinal production script onto page", () => {
      testContext.configuration.gatewayConfiguration.environment = "production";

      const framework = createFramework();
      const prodUrl =
        "https://songbird.cardinalcommerce.com/edge/v1/songbird.js";

      jest.spyOn(framework, "_getCardinalScriptSource");

      framework.setupSongbird().then(() => {
        expect(framework._getCardinalScriptSource).toHaveBeenCalledTimes(1);
        expect(framework._getCardinalScriptSource()).toEqual(prodUrl);
        expect(assets.loadScript).toHaveBeenCalledTimes(1);
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: prodUrl,
        });
      });
    });

    it("loads cardinal sandbox script onto page", () => {
      testContext.configuration.gatewayConfiguration.environment = "sandbox";

      const framework = createFramework();
      const sandboxUrl =
        "https://songbirdstag.cardinalcommerce.com/edge/v1/songbird.js";

      jest.spyOn(framework, "_getCardinalScriptSource");

      framework.setupSongbird().then(() => {
        expect(framework._getCardinalScriptSource).toHaveBeenCalledTimes(1);
        expect(framework._getCardinalScriptSource()).toEqual(sandboxUrl);
        expect(assets.loadScript).toHaveBeenCalledTimes(1);
        expect(assets.loadScript).toHaveBeenCalledWith({
          src: sandboxUrl,
        });
      });
    });

    it("configures Cardinal to use verbose logging with loggingEnabled", () =>
      createFramework({
        loggingEnabled: true,
      })
        .setupSongbird()
        .then(() => {
          expect(window.Cardinal.configure).toHaveBeenCalledWith({
            logging: {
              level: "verbose",
            },
            payment: expect.any(Object),
          });
        }));

    it("configures Cardinal to use logging object provided by merchant", () =>
      createFramework({
        cardinalSDKConfig: { logging: { level: "off" } },
      })
        .setupSongbird()
        .then(() => {
          expect(window.Cardinal.configure).toHaveBeenCalledWith({
            logging: {
              level: "off",
            },
            payment: expect.any(Object),
          });
        }));

    it("configures Cardinal to use logging object provided by merchant when loggingEnabled is also used", () => {
      const framework = createFramework({
        loggingEnabled: true,
        cardinalSDKConfig: {
          logging: {
            level: "off",
          },
        },
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          logging: {
            level: "off",
          },
          payment: expect.any(Object),
        });
      });
    });

    it("configures Cardinal to use timeout setting provided by the merchant", () => {
      const framework = createFramework({
        cardinalSDKConfig: {
          timeout: 1000,
        },
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          timeout: 1000,
          payment: expect.any(Object),
        });
      });
    });

    it("configures Cardinal to use maxRequestRetries setting provided by the merchant", () => {
      const framework = createFramework({
        cardinalSDKConfig: {
          maxRequestRetries: 3,
        },
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          maxRequestRetries: 3,
          payment: expect.any(Object),
        });
      });
    });

    it("configures Cardinal to use a subset of payment options provided by the merchant", () => {
      const framework = createFramework({
        cardinalSDKConfig: {
          payment: {
            view: "modal",
            framework: "inline",
            displayLoading: true,
            displayExitButton: true,
          },
        },
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          payment: {
            displayLoading: true,
            displayExitButton: true,
          },
        });
      });
    });

    it.each([
      "ui.close",
      "ui.render",
      "ui.renderHidden",
      "ui.loading.close",
      "ui.loading.render",
    ])("sets up %s listener", (eventName) => {
      expect.assertions(3);

      jest
        .spyOn(SongbirdFramework.prototype, "setCardinalListener")
        .mockImplementation((name, cb) => {
          if (name === eventName) {
            // ensure that this specific event was listened for
            expect(name).toBe(eventName);
            cb();
          }

          // ensure that the framework finishes setting up
          if (name === "payments.setupComplete") {
            cb();
          }
        });

      jest.spyOn(SongbirdFramework.prototype, "_emit");

      return createFramework()
        .setupSongbird()
        .then(() => {
          expect(
            SongbirdFramework.prototype.setCardinalListener
          ).toHaveBeenCalledWith(eventName, expect.any(Function));
          expect(SongbirdFramework.prototype._emit).toBeCalledWith(
            `songbird-framework:${eventName.toUpperCase()}`
          );
        });
    });

    it("sets up payments.setupComplete listener", () => {
      return createFramework()
        .setupSongbird()
        .then(() => {
          expect(window.Cardinal.on).toHaveBeenCalledWith(
            "payments.setupComplete",
            expect.any(Function)
          );
        });
    });

    it("sets dfReferenceId when setupComplete event fires", () => {
      jest.spyOn(testContext.fakeCardinal, "on").mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {
          sessionId: "df-reference",
        })
      );

      const framework = createFramework();

      return framework
        .setupSongbird()
        .then(() => framework.getDfReferenceId())
        .then((id) => {
          expect(id).toBe("df-reference");
        });
    });

    it("resolves any previous getDfReferenceId calls", (done) => {
      let setupSongbirdHasResolved = false;
      let promises;

      jest.spyOn(testContext.fakeCardinal, "on").mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {
          sessionId: "df-reference",
        })
      );

      const framework = createFramework();

      promises = [
        framework.getDfReferenceId(),
        framework.getDfReferenceId(),
        framework.getDfReferenceId(),
        framework.getDfReferenceId(),
      ];

      Promise.all(promises)
        .then((results) => {
          expect(setupSongbirdHasResolved).toBe(true);
          results.forEach((res) => {
            expect(res).toBe("df-reference");
          });

          done();
        })
        .catch(done);

      createFramework()
        .setupSongbird()
        .then(() => {
          setupSongbirdHasResolved = true;
        });
    });

    it("sets up Cardinal", () =>
      createFramework()
        .setupSongbird()
        .then(() => {
          expect(window.Cardinal.setup).toHaveBeenCalledTimes(1);
          expect(window.Cardinal.setup).toHaveBeenCalledWith("init", {
            jwt: "jwt",
          });
        }));

    it("adds cardinalDeviceDataCollectionTimeElapsed to clientMetadata", () => {
      let currentTime = 0;
      let instance;

      testContext.date = window.Date;
      window.Date.now = () => {
        currentTime += 10;

        return currentTime;
      };

      instance = createFramework();

      return instance.setupSongbird().then(() => {
        expect(
          instance._clientMetadata.cardinalDeviceDataCollectionTimeElapsed
        ).toBeDefined();
        expect(
          instance._clientMetadata.cardinalDeviceDataCollectionTimeElapsed
        ).toBeGreaterThan(0);
        window.Date = testContext.date;
      });
    });

    it("sends analytics event when setup is complete", () =>
      createFramework()
        .setupSongbird()
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "three-d-secure.cardinal-sdk.init.setup-completed"
          );
        }));

    it("uses v1 fallback if loadScript fails", () => {
      assets.loadScript.mockRejectedValue(
        new Error("uses v1 fallback if loadScript fails")
      );

      const framework = createFramework();

      jest.spyOn(framework, "handleSongbirdError");

      return framework.setupSongbird().then(() => {
        expect(framework.handleSongbirdError).toBeCalledTimes(1);
        expect(framework.handleSongbirdError).toBeCalledWith(
          "cardinal-sdk-setup-failed.songbird-js-failed-to-load"
        );
      });
    });

    it("uses v1 fallback if loadScript resolves but no Cardinal global is available", () => {
      delete window.Cardinal;
      jest
        .spyOn(assets, "loadScript")
        .mockResolvedValue(document.createElement("script"));

      const framework = createFramework();

      jest.spyOn(framework, "handleSongbirdError");

      return framework.setupSongbird().then(() => {
        expect(framework.handleSongbirdError).toBeCalledTimes(1);
        expect(framework.handleSongbirdError).toBeCalledWith(
          "cardinal-sdk-setup-failed.cardinal-global-unavailable"
        );
      });
    });

    it("uses v1 fallback if loadScript resolves but Cardinal configuration throws an error", () => {
      testContext.fakeCardinal.configure.mockImplementation(() => {
        throw new Error(
          "uses v1 fallback if loadScript resolves but Cardinal configuration throws an error"
        );
      });

      const framework = createFramework();

      jest.spyOn(framework, "handleSongbirdError");

      return framework
        .setupSongbird()
        .then(() => {
          return wait();
        })
        .then(() => {
          expect(framework.handleSongbirdError).toBeCalledTimes(1);
          expect(framework.handleSongbirdError).toBeCalledWith(
            "cardinal-sdk-setup-failed.cardinal-configuration-threw-error"
          );
        });
    });

    it("sets up Cardinal if mpiProvider information is available and it is cardinal", () => {
      testContext.configuration.gatewayConfiguration.threeDSecure.versionTwo =
        "cardinal";

      const framework = createFramework();

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.setup).toHaveBeenCalledTimes(1);
        expect(window.Cardinal.setup).toHaveBeenCalledWith("init", {
          jwt: "jwt",
        });
      });
    });

    it("sets getDfReferenceId to reject if Cardinal cannot be set up", () => {
      jest
        .spyOn(assets, "loadScript")
        .mockRejectedValue(
          new Error(
            "sets getDfReferenceId to reject if Cardinal cannot be set up"
          )
        );

      const framework = createFramework();

      return framework
        .setupSongbird()
        .then(() => createFramework().getDfReferenceId())
        .catch((err) => {
          expect(err.code).toBe("THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED");
          expect(err.message).toBe(
            "Cardinal's Songbird.js library could not be loaded."
          );
        });
    });

    it("uses v1 fallback if Cardinal method throws an error", () => {
      testContext.fakeCardinal.on.mockImplementation(() => {
        throw new Error("uses v1 fallback if Cardinal method throws an error");
      });
      const framework = createFramework();

      jest.spyOn(framework, "handleSongbirdError");

      return framework.setupSongbird().then(() => {
        expect(framework.handleSongbirdError).toBeCalledTimes(1);
        expect(framework.handleSongbirdError).toBeCalledWith(
          "cardinal-sdk-setup-failed.cardinal-configuration-threw-error"
        );
      });
    });

    it("sends analytics event when Cardinal fails to set up", () => {
      testContext.fakeCardinal.on.mockImplementation(() => {
        throw new Error("sends analytics event when Cardinal fails to set up");
      });
      const framework = createFramework();

      return framework.setupSongbird().then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          expect.anything(),
          "three-d-secure.cardinal-sdk.init.setup-failed"
        );
      });
    });

    it("sets getDfReferenceId to reject with a generic error if a specific Braintree error cannot be found", () => {
      expect.assertions(2);

      testContext.fakeCardinal.on.mockImplementation(() => {
        throw new Error("failure");
      });
      const framework = createFramework();

      return framework
        .setupSongbird()
        .then(() => framework.getDfReferenceId())
        .catch((err) => {
          expect(err.code).toBe("THREEDS_CARDINAL_SDK_SETUP_FAILED");
          expect(err.message).toBe(
            "Something went wrong setting up Cardinal's Songbird.js library."
          );
        });
    });

    it("does not send timeout event when `payments.setupComplete` callback is called", () =>
      createFramework()
        .setupSongbird()
        .then(() => {
          expect(analytics.sendEvent).not.toHaveBeenCalledWith(
            expect.anything(),
            "three-d-secure.cardinal-sdk.init.setup-timeout"
          );
        }));

    describe("when timing out", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        analytics.sendEvent.mockClear();
        assets.loadScript.mockImplementation(() => {
          jest.runAllTimers();

          return Promise.resolve();
        });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("uses v1 fallback if cardinal takes longer than 60 seconds to set up", () => {
        const framework = createFramework();

        jest.spyOn(framework, "handleSongbirdError");

        return framework.setupSongbird({ timeout: 60 }).then(() => {
          expect(framework.handleSongbirdError).toBeCalledTimes(1);
          expect(framework.handleSongbirdError).toBeCalledWith(
            "cardinal-sdk-setup-timeout"
          );
        });
      });

      it("sends analytics event when Cardinal times out during setup", () => {
        const framework = createFramework();

        return framework.setupSongbird({ timeout: 60 }).then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "three-d-secure.cardinal-sdk.init.setup-timeout"
          );
        });
      });
    });
  });

  describe("initializeChallengeWithLookupResponse", () => {
    beforeEach(() => {
      testContext.lookupResponse = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
        paymentMethod: {},
        lookup: {
          acsUrl: "https://example.com/acs",
          pareq: "pareq",
          transactionId: "transaction-id",
        },
      };
      testContext.fakeCardinal.on.mockImplementation(
        yieldsByEvents(testContext.onEventBehavior, true)
      );
      testContext.client.request.mockResolvedValue({
        paymentMethod: {},
        threeDSecureInfo: {},
      });
    });

    afterEach(() => {
      delete window.Cardinal;
    });

    it("calls setupSongbird before continuing with the call", () => {
      const instance = createFramework();

      jest
        .spyOn(BaseFramework.prototype, "initializeChallengeWithLookupResponse")
        .mockResolvedValue(null);

      instance.setupSongbird.mockClear();

      return instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {})
        .then(() => {
          expect(instance.setupSongbird).toHaveBeenCalledTimes(1);
          expect(
            BaseFramework.prototype.initializeChallengeWithLookupResponse
          ).toHaveBeenCalledTimes(1);
          expect(
            BaseFramework.prototype.initializeChallengeWithLookupResponse
          ).toHaveBeenCalledWith(testContext.lookupResponse, {});
        });
    });

    it("reports action code in analytics event", () => {
      jest.spyOn(testContext.fakeCardinal, "on").mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {
          sessionId: "df",
        })
      );

      SongbirdFramework.prototype.setupSongbird.mockRestore();

      const instance = createFramework();

      testContext.applyActionCode();

      return instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {})
        .then(() => {
          expect(analytics.sendEvent).toHaveBeenCalledWith(
            expect.anything(),
            "three-d-secure.verification-flow.cardinal-sdk.action-code.success"
          );
        });
    });
  });

  describe("transformBillingAddress", () => {
    it("transforms billing address", () => {
      let additionalInformation = {};
      const billingAddress = {
        phoneNumber: "5555555555",
        givenName: "First",
        surname: "Last",
        streetAddress: "555 Smith street",
        extendedAddress: "#5",
        line3: "More Address",
        locality: "Oakland",
        region: "CA",
        postalCode: "12345",
        countryCodeAlpha2: "US",
      };
      const framework = createFramework();

      additionalInformation = framework.transformBillingAddress(
        additionalInformation,
        billingAddress
      );

      expect(additionalInformation.billingPhoneNumber).toBe("5555555555");
      expect(additionalInformation.billingGivenName).toBe("First");
      expect(additionalInformation.billingSurname).toBe("Last");
      expect(additionalInformation.billingLine1).toBe("555 Smith street");
      expect(additionalInformation.billingLine2).toBe("#5");
      expect(additionalInformation.billingLine3).toBe("More Address");
      expect(additionalInformation.billingCity).toBe("Oakland");
      expect(additionalInformation.billingState).toBe("CA");
      expect(additionalInformation.billingPostalCode).toBe("12345");
      expect(additionalInformation.billingCountryCode).toBe("US");
    });

    it("ignores additionalInformation if no billingAddress param is provided", () => {
      const info = { foo: "bar" };
      const framework = createFramework();

      expect(framework.transformBillingAddress(info)).toBe(info);
    });
  });

  describe("transformShippingAddress", () => {
    it("transforms shipping address", () => {
      const framework = createFramework();
      let additionalInformation = {
        shippingAddress: {
          streetAddress: "555 Smith street",
          extendedAddress: "#5",
          line3: "More Address",
          locality: "Oakland",
          region: "CA",
          postalCode: "12345",
          countryCodeAlpha2: "US",
        },
      };

      additionalInformation = framework.transformShippingAddress(
        additionalInformation
      );
      expect(additionalInformation.shippingAddress).not.toBeDefined();
      expect(additionalInformation.shippingLine1).toBe("555 Smith street");
      expect(additionalInformation.shippingLine2).toBe("#5");
      expect(additionalInformation.shippingLine3).toBe("More Address");
      expect(additionalInformation.shippingCity).toBe("Oakland");
      expect(additionalInformation.shippingState).toBe("CA");
      expect(additionalInformation.shippingPostalCode).toBe("12345");
      expect(additionalInformation.shippingCountryCode).toBe("US");
    });

    it("ignores additionalInformation if no shippingAddress param is provided", () => {
      const info = { foo: "bar" };
      const framework = createFramework();

      expect(framework.transformShippingAddress(info)).toBe(info);
    });
  });

  describe("prepareLookup", () => {
    beforeEach(() => {
      window.Cardinal = testContext.fakeCardinal;

      jest
        .spyOn(SongbirdFramework.prototype, "getDfReferenceId")
        .mockResolvedValue("df-id");
      testContext.fakeCardinal.trigger.mockResolvedValue({
        Status: "status",
      });

      testContext.options = {
        nonce: "a-nonce",
        bin: "411111",
      };
    });

    it("maintains data passed in options", () => {
      const options = testContext.options;
      const framework = createFramework();

      return framework.prepareLookup(options).then((data) => {
        expect(data).not.toBe(options);
        expect(data.nonce).toBe(options.nonce);
        expect(data.bin).toBe(options.bin);
      });
    });

    it("retrieves authorizationFingerprint", () => {
      expect.assertions(1);

      const framework = createFramework();

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(data.authorizationFingerprint).toBe("encoded_auth_fingerprint");
      });
    });

    it("can pass arbitrary data into options", () => {
      testContext.options.foo = "bar";

      const framework = createFramework();

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(data.foo).toBe("bar");
      });
    });

    it("retrieves dfReferenceId", () => {
      expect.assertions(1);

      const framework = createFramework();

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(data.dfReferenceId).toBe("df-id");
      });
    });

    it("retrieves braintreeLibraryVersion", () => {
      expect.assertions(1);

      const framework = createFramework();

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(data.braintreeLibraryVersion).toBe(BRAINTREE_LIBRARY_VERSION);
      });
    });

    it("retrieves bin metadata", () => {
      expect.assertions(4);

      const framework = createFramework();

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(testContext.fakeCardinal.trigger).toHaveBeenCalledTimes(1);
        expect(testContext.fakeCardinal.trigger).toHaveBeenCalledWith(
          "bin.process",
          "411111"
        );
        expect(
          data.clientMetadata.issuerDeviceDataCollectionTimeElapsed
        ).toBeDefined();
        expect(data.clientMetadata.issuerDeviceDataCollectionResult).toBe(
          "status"
        );
      });
    });

    it("ignores errors df reference id lookup fails", () => {
      const framework = createFramework();
      const error = new Error("df reference id lookup fails");

      framework.getDfReferenceId.mockRejectedValue(error);

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(data.dfReferenceId).toBeFalsy();
        expect(data.clientMetadata).toMatchObject({
          sdkVersion: `web/${VERSION}`,
          requestedThreeDSecureVersion: "2",
        });
      });
    });

    it("ignores errors from Cardinal bin lookup", () => {
      const framework = createFramework();

      testContext.fakeCardinal.trigger.mockRejectedValue(
        new Error("bin process failed")
      );

      return framework.prepareLookup(testContext.options).then((data) => {
        expect(data.dfReferenceId).toBe("df-id");
        expect(data.clientMetadata).toMatchObject({
          sdkVersion: `web/${VERSION}`,
          requestedThreeDSecureVersion: "2",
        });
      });
    });
  });

  describe("cancelVerifyCard", () => {
    beforeEach(() => {
      testContext.lookupResponse = {
        paymentMethod: {
          nonce: "upgraded-nonce",
          details: {
            bin: "123456",
            cardType: "Visa",
          },
          threeDSecureInfo: {
            liabilityShiftPossible: true,
            liabilityShifted: true,
          },
        },
        lookup: {
          threeDSecureVersion: "2.1.0",
          transactionId: "txn-id",
        },
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
      };
      testContext.client.request.mockResolvedValue(testContext.lookupResponse);
      testContext.fakeCardinal.on.mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {
          sessionId: "df",
        })
      );

      SongbirdFramework.prototype.setupSongbird.mockRestore();
    });

    it("errors verifyCard with cancel error", () => {
      const framework = createFramework();

      jest.spyOn(framework, "_reloadThreeDSecure");

      return framework
        .verifyCard({
          amount: "100.00",
          nonce: "a-nonce",
          bin: "22",
          onLookupComplete() {
            framework.cancelVerifyCard();
          },
        })
        .catch((verifyCardError) => {
          expect(framework._reloadThreeDSecure).toHaveBeenCalledTimes(1);
          expect(verifyCardError.code).toBe(
            "THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT"
          );
        });
    });

    it("errors verifyCard with specific error if passed in", () => {
      const err = new Error("custom error");
      const framework = createFramework();

      jest.spyOn(framework, "_reloadThreeDSecure");

      return framework
        .verifyCard({
          amount: "100.00",
          nonce: "a-nonce",
          bin: "22",
          onLookupComplete() {
            framework.cancelVerifyCard(err);
          },
        })
        .catch((verifyCardError) => {
          expect(framework._reloadThreeDSecure).toHaveBeenCalledTimes(1);
          expect(verifyCardError).toBe(err);
        });
    });

    it("does not throw an error when there is no verifyCardPromisePlus", () => {
      const framework = createFramework();

      framework._lookupPaymentMethod = {
        nonce: "fake-nonce",
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: false,
          verificationDetails: {},
        },
      };

      return framework.cancelVerifyCard().then((response) => {
        expect(response.nonce).toBe("fake-nonce");
        expect(response.liabilityShiftPossible).toBe(true);
        expect(response.liabilityShifted).toBe(false);
        expect(response.verificationDetails).toEqual({});
      });
    });
  });

  describe("setCardinalListener", () => {
    it("sets up listener for Cardinal", async () => {
      const spy = jest.fn();
      const framework = createFramework();

      framework.setCardinalListener("foo", spy);

      expect(window.Cardinal.on).toHaveBeenCalledTimes(1);
      expect(window.Cardinal.on).toHaveBeenCalledWith("foo", spy);
    });
  });

  describe("handleSongbirdError", () => {
    it("initializeChallengeWithLookupResponse does not present the v1 challenge", () => {
      const lookupResponse = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
        paymentMethod: {},
        lookup: {
          acsUrl: "https://example.com/acs",
          pareq: "pareq",
          transactionId: "transaction-id",
        },
      };

      const framework = createFramework();

      framework.handleSongbirdError("foo");
      framework.initializeChallengeWithLookupResponse(lookupResponse, {});

      return wait().then(() => {
        expect(window.Cardinal.continue).not.toBeCalled();
        expect(
          document.querySelector(
            '[data-braintree-v1-fallback-iframe-container="true"] iframe'
          )
        ).toBeFalsy();
      });
    });

    it("doesn't stop the Cardinal payments.validated callback", async () => {
      SongbirdFramework.prototype.setupSongbird.mockRestore();

      const framework = createFramework();

      await wait(10);

      const paymentsValidatedHandler = window.Cardinal.on.mock.calls.find(
        (args) => {
          return args[0] === "payments.validated";
        }
      )[1];

      framework.handleSongbirdError("foo");

      paymentsValidatedHandler(
        {
          ActionCode: "Foo",
        },
        "jwt"
      );

      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        expect.stringMatching("three-d-secure.cardinal-sdk.songbird-error.foo")
      );
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        expect.stringMatching("action-code.foo")
      );
      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "three-d-secure.cardinal-sdk.songbird-error.cardinal-sdk-setup-error.number-undefined"
      );
    });

    it("removes all cardinal listeners", () => {
      const framework = createFramework();

      framework.setCardinalListener("foo", jest.fn());
      framework.setCardinalListener("bar", jest.fn());
      framework.setCardinalListener("baz", jest.fn());

      framework.handleSongbirdError("buzz");
      expect(window.Cardinal.off).toBeCalledTimes(3);
      expect(window.Cardinal.off).toBeCalledWith("foo");
      expect(window.Cardinal.off).toBeCalledWith("bar");
      expect(window.Cardinal.off).toBeCalledWith("baz");
    });

    it("sends an analytics event for the error type provided", () => {
      const framework = createFramework();

      framework.handleSongbirdError("foo");

      expect(analytics.sendEvent).toBeCalledWith(
        expect.anything(),
        "three-d-secure.cardinal-sdk.songbird-error.foo"
      );
    });

    it("resolves the pending songbird setup promise if applicable", async () => {
      SongbirdFramework.prototype.setupSongbird.mockRestore();

      const framework = createFramework();

      let isSetup = false;

      framework.setupSongbird().then(() => {
        isSetup = true;
      });

      await wait();

      expect(isSetup).toBe(false);

      framework.handleSongbirdError("foo");

      await wait();

      expect(isSetup).toBe(true);
    });
  });

  describe("teardown", () => {
    it("removes all configured Cardinal listeners", () => {
      const framework = createFramework();

      framework.setCardinalListener("foo", jest.fn());
      framework.setCardinalListener("bar", jest.fn());

      return framework.teardown().then(() => {
        expect(window.Cardinal.off).toHaveBeenCalledWith("foo");
        expect(window.Cardinal.off).toHaveBeenCalledWith("bar");
      });
    });
  });
});
