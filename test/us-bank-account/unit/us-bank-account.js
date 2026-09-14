vi.mock("../../../src/lib/analytics");

import analytics from "../../../src/lib/analytics";
import { fake } from "../../helpers";
import USBankAccount from "../../../src/us-bank-account/us-bank-account";
import BraintreeError from "../../../src/lib/braintree-error";
import methods from "../../../src/lib/methods";

describe("USBankAccount", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();

    testContext.fakeClient = {
      getConfiguration: () => testContext.configuration,
      request: vi.fn().mockResolvedValue(null),
    };

    testContext.context = {
      _client: testContext.fakeClient,
      _tokenizeBankDetails: USBankAccount.prototype._tokenizeBankDetails,
    };
  });

  describe("Constructor", () => {
    it("sends an analytics event", () => {
      new USBankAccount({ client: testContext.fakeClient });

      expect(analytics.sendEvent).toHaveBeenCalledWith(
        testContext.fakeClient,
        "usbankaccount.initialized"
      );
      expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("tokenize", () => {
    describe("with bad arguments", () => {
      it("errors without tokenizing raw bank details", () => {
        const client = testContext.fakeClient;

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_OPTION_REQUIRED");
            expect(err.message).toBe(
              "tokenize must be called with bankDetails."
            );
            expect(client.request).not.toHaveBeenCalled();
          });
      });
    });

    describe("raw bank details", () => {
      beforeEach(() => {
        testContext.fakeUsBankAccountResponse = {
          data: {
            tokenizeUsBankAccount: {
              paymentMethod: {
                id: "fake-nonce-123",
                details: {
                  last4: "1234",
                },
              },
            },
          },
          meta: {
            braintree_request_id: "3a36188d-492a-4b3f-8379-de16f99c3c7b",
          },
        };
      });

      it("tokenizes a checking account", () => {
        testContext.fakeClient.request.mockResolvedValue(
          testContext.fakeUsBankAccountResponse
        );

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
              ownershipType: "personal",
              firstName: "First",
              lastName: "Last",
              billingAddress: {
                streetAddress: "123 Townsend St",
                extendedAddress: "FL 6",
                locality: "San Francisco",
                region: "CA",
                postalCode: "94107",
              },
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .then((tokenizedPayload) => {
            expect(testContext.fakeClient.request).toHaveBeenCalledTimes(1);
            expect(testContext.fakeClient.request).toHaveBeenCalledWith({
              api: "graphQLApi",
              data: {
                query: expect.any(String),
                variables: {
                  input: {
                    usBankAccount: {
                      achMandate:
                        "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
                      routingNumber: "1234567",
                      accountNumber: "0001234",
                      accountType: "CHECKING",
                      individualOwner: {
                        firstName: "First",
                        lastName: "Last",
                      },
                      billingAddress: {
                        streetAddress: "123 Townsend St",
                        extendedAddress: "FL 6",
                        city: "San Francisco",
                        state: "CA",
                        zipCode: "94107",
                      },
                    },
                  },
                },
              },
            });

            expect(tokenizedPayload.nonce).toBe("fake-nonce-123");
            expect(tokenizedPayload.description).toBe(
              "US bank account ending in - 1234"
            );
            expect(tokenizedPayload.type).toBe("us_bank_account");
          });
      });

      it('sends a "success" analytics event when tokenizing bank details successfully', () => {
        testContext.fakeClient.request.mockResolvedValue(
          testContext.fakeUsBankAccountResponse
        );

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
              firstName: "Frodo",
              lastName: "Baggins",
              billingAddress: {
                streetAddress: "123 Townsend St",
                extendedAddress: "FL 6",
                locality: "San Francisco",
                region: "CA",
                postalCode: "94107",
              },
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "usbankaccount.bankdetails.tokenization.succeeded"
            );
            expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          });
      });

      it('sends a "failed" analytics event when tokenizing bank details badly', () => {
        testContext.fakeClient.request.mockRejectedValue(
          new Error("Something bad happened")
        );

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
              firstName: "Frodo",
              lastName: "Baggins",
              billingAddress: {
                streetAddress: "123 Townsend St",
                extendedAddress: "FL 6",
                locality: "San Francisco",
                region: "CA",
                postalCode: "94107",
              },
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "usbankaccount.bankdetails.tokenization.failed"
            );
            expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
          });
      });

      it("errors without mandateText", () =>
        USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
            },
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_OPTION_REQUIRED");
            expect(err.message).toBe("mandateText property is required.");

            expect(testContext.fakeClient.request).not.toHaveBeenCalled();
          }));

      it("errors when tokenize fails with 4xx status code", () => {
        const originalError = new Error("Something bad happened");

        originalError.details = { httpStatus: 404 };

        testContext.fakeClient.request.mockRejectedValue(originalError);

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
              firstName: "Frodo",
              lastName: "Baggins",
              billingAddress: {
                streetAddress: "123 Townsend St",
                extendedAddress: "FL 6",
                locality: "San Francisco",
                region: "CA",
                postalCode: "94107",
              },
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("CUSTOMER");
            expect(err.code).toBe("US_BANK_ACCOUNT_FAILED_TOKENIZATION");
            expect(err.message).toBe("The supplied data failed tokenization.");
            expect(err.details.originalError).toBe(originalError);
          });
      });

      it("errors when tokenize fails with 5xx status code", () => {
        const originalError = new Error("Something bad happened");

        originalError.details = { httpStatus: 500 };

        testContext.fakeClient.request.mockRejectedValue(originalError);

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
              firstName: "Frodo",
              lastName: "Baggins",
              billingAddress: {
                streetAddress: "123 Townsend St",
                extendedAddress: "FL 6",
                locality: "San Francisco",
                region: "CA",
                postalCode: "94107",
              },
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("NETWORK");
            expect(err.code).toBe("US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR");
            expect(err.message).toBe("A tokenization network error occurred.");
            expect(err.details.originalError).toBe(originalError);
          });
      });

      it("errors with a network error when tokenize fails with no status code", () => {
        const originalError = new Error("Something bad happened");

        originalError.details = { httpStatus: undefined };

        testContext.fakeClient.request.mockRejectedValue(originalError);

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
              firstName: "Frodo",
              lastName: "Baggins",
              billingAddress: {
                streetAddress: "123 Townsend St",
                extendedAddress: "FL 6",
                locality: "San Francisco",
                region: "CA",
                postalCode: "94107",
              },
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("NETWORK");
            expect(err.code).toBe("US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR");
            expect(err.message).toBe("A tokenization network error occurred.");
            expect(err.details.originalError).toBe(originalError);
          });
      });
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", () =>
      new Promise((resolve) => {
        const instance = new USBankAccount({ client: testContext.fakeClient });

        return instance.teardown().then(() => {
          methods(USBankAccount.prototype).forEach((method) => {
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

          resolve();
        });
      }));
  });
});
