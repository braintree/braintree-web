"use strict";

jest.mock("../../../src/lib/analytics");

const analytics = require("../../../src/lib/analytics");
const { fake, noop } = require("../../helpers");
const USBankAccount = require("../../../src/us-bank-account/us-bank-account");
const BraintreeError = require("../../../src/lib/braintree-error");
const methods = require("../../../src/lib/methods");

describe("USBankAccount", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();

    testContext.configuration.gatewayConfiguration.usBankAccount = {
      plaid: {
        publicKey: "abc123",
      },
    };

    testContext.fakeClient = {
      getConfiguration: () => testContext.configuration,
      request: jest.fn().mockResolvedValue(null),
    };
    testContext.fakePlaid = {};

    testContext.context = {
      _client: testContext.fakeClient,
      _tokenizeBankDetails: USBankAccount.prototype._tokenizeBankDetails,
      _tokenizeBankLogin: USBankAccount.prototype._tokenizeBankLogin,
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
    beforeEach(() => {
      testContext.standardCallback = (callback) => {
        const fakePlaid = {
          create: (options) => ({
            open: () => {
              process.nextTick(() => {
                const publicToken = "abc123";
                const metadata = {
                  account_id: "xyz456",
                  account: {
                    subtype: "checking",
                  },
                };

                options.onSuccess(publicToken, metadata);
              });
            },
          }),
        };

        process.nextTick(() => {
          callback(null, fakePlaid);
        });
      };
    });

    describe("with bad arguments", () => {
      it("errors without tokenizing raw bank details or the auth flow", () => {
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
              "tokenize must be called with bankDetails or bankLogin."
            );
            expect(client.request).not.toHaveBeenCalled();
          });
      });

      it("errors when tokenizing raw bank details AND the auth flow", () => {
        const client = testContext.fakeClient;

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankDetails: {
              routingNumber: "1234567",
              accountNumber: "0001234",
              accountType: "checking",
            },
            bankLogin: {
              displayName: "Pizzas Galore",
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS");
            expect(err.message).toBe(
              "tokenize must be called with bankDetails or bankLogin, not both."
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
    });

    describe("bank login", () => {
      beforeEach(() => {
        testContext.fakeGatewayResponse = {
          data: {
            tokenizeUsBankLogin: {
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

      it("errors when Plaid fails to load", () => {
        const loadError = new Error("Failed to load");

        testContext.context._loadPlaid = (callback) => {
          process.nextTick(() => {
            callback(loadError);
          });
        };

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBe(loadError);
            expect(testContext.fakeClient.request).not.toHaveBeenCalled();
          });
      });

      it("errors when the Plaid onExit callback is called", () => {
        testContext.context._loadPlaid = (callback) => {
          const fakePlaid = {
            create: (options) => ({
              open: () => {
                process.nextTick(options.onExit);
              },
            }),
          };

          process.nextTick(() => {
            callback(null, fakePlaid);
          });
        };

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("CUSTOMER");
            expect(err.code).toBe("US_BANK_ACCOUNT_LOGIN_CLOSED");
            expect(err.message).toBe(
              "Customer closed bank login flow before authorizing."
            );

            expect(testContext.fakeClient.request).not.toHaveBeenCalled();
          });
      });

      it("errors when calling multiple times", () => {
        const tokenizeOptions = {
          bankLogin: {
            displayName: "Test Merchant",
          },
          mandateText: "I authorize Braintree to charge my bank account.",
        };

        testContext.context._loadPlaid = (callback) => {
          const fakePlaid = {
            create: () => ({
              open: noop,
            }),
          };

          process.nextTick(() => {
            callback(null, fakePlaid);
          });
        };

        USBankAccount.prototype.tokenize.call(
          testContext.context,
          tokenizeOptions,
          noop
        );

        return USBankAccount.prototype.tokenize
          .call(testContext.context, tokenizeOptions)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE");
            expect(err.message).toBe(
              "Another bank login tokenization request is active."
            );
          });
      });

      it("errors when plaid is missing in usBankAccount configuration", () => {
        const tokenizeOptions = {
          bankLogin: {
            displayName: "Test Merchant",
          },
          mandateText: "I authorize Braintree to charge my bank account.",
        };

        delete testContext.configuration.gatewayConfiguration.usBankAccount
          .plaid;

        return USBankAccount.prototype.tokenize
          .call(testContext.context, tokenizeOptions)
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED");
            expect(err.message).toBe("Bank login is not enabled.");
          });
      });

      it.each([
        [
          "business",
          { ownershipType: "business", businessName: "Acme Inc" },
          { businessOwner: { businessName: "Acme Inc" } },
        ],
        [
          "personal",
          { ownershipType: "personal", firstName: "First", lastName: "Last" },
          { individualOwner: { firstName: "First", lastName: "Last" } },
        ],
      ])(
        "tokenizes bank login for %s accounts",
        (s, accountInfo, ownerInfo) => {
          testContext.fakeClient.request.mockResolvedValue(
            testContext.fakeGatewayResponse
          );
          testContext.context._loadPlaid = (callback) => {
            const fakePlaid = {
              create: (options) => {
                expect(options.env).toBe("sandbox");
                expect(options.clientName).toBe("Test Merchant");
                expect(options.key).toBe("abc123");
                expect(options.product).toBe("auth");
                expect(options.selectAccount).toBe(true);
                expect(options.onExit).toBeInstanceOf(Function);
                expect(options.onSuccess).toBeInstanceOf(Function);

                return {
                  open: () => {
                    process.nextTick(() => {
                      const publicToken = "abc123";
                      const metadata = {
                        account_id: "xyz456",
                        account: {
                          subtype: "checking",
                        },
                      };

                      options.onSuccess(publicToken, metadata);
                    });
                  },
                };
              },
            };

            process.nextTick(() => {
              callback(null, fakePlaid);
            });
          };

          return USBankAccount.prototype.tokenize
            .call(testContext.context, {
              bankLogin: {
                displayName: "Test Merchant",
                ...accountInfo,
                billingAddress: {
                  streetAddress: "123 Townsend St",
                  extendedAddress: "FL 6",
                  locality: "San Francisco",
                  region: "CA",
                  postalCode: "94107",
                },
              },
              mandateText: "I authorize Braintree to charge my bank account.",
            })
            .then((tokenizedPayload) => {
              expect(testContext.fakeClient.request).toHaveBeenCalledTimes(1);
              expect(testContext.fakeClient.request).toHaveBeenCalledWith({
                api: "graphQLApi",
                data: {
                  query: expect.stringContaining("mutation"),
                  variables: {
                    input: {
                      usBankLogin: {
                        publicToken: "abc123",
                        accountId: "plaid_account_id",
                        accountType: "CHECKING",
                        achMandate:
                          "I authorize Braintree to charge my bank account.",
                        ...ownerInfo,
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

              expect(tokenizedPayload).toEqual({
                nonce: "fake-nonce-123",
                details: {},
                description: "US bank account ending in - 1234",
                type: "us_bank_account",
              });
            });
        }
      );

      describe.each([
        ["production", "xyz456"],
        ["sandbox", "plaid_account_id"],
      ])("In environment %p", (currentEnv, accountID) => {
        it(`uses ${accountID} for accountId when in ${currentEnv}`, () => {
          testContext.configuration.gatewayConfiguration.environment =
            currentEnv;

          testContext.fakeClient.request.mockResolvedValue(
            testContext.fakeGatewayResponse
          );

          testContext.context._loadPlaid = (callback) => {
            const fakePlaid = {
              create: (options) => ({
                open: () => {
                  process.nextTick(() => {
                    const publicToken = "abc123";
                    const metadata = {
                      account_id: accountID,
                      account: {
                        subtype: "checking",
                      },
                    };

                    options.onSuccess(publicToken, metadata);
                  });
                },
              }),
            };

            process.nextTick(() => {
              callback(null, fakePlaid);
            });
          };

          return USBankAccount.prototype.tokenize
            .call(testContext.context, {
              bankLogin: {
                displayName: "Test Merchant",
                ownershipType: "business",
                businessName: "Acme Inc",
                billingAddress: {
                  streetAddress: "123 Townsend St",
                  extendedAddress: "FL 6",
                  locality: "San Francisco",
                  region: "CA",
                  postalCode: "94107",
                },
              },
              mandateText: "I authorize Braintree to charge my bank account.",
            })
            .then(() => {
              expect(testContext.fakeClient.request).toHaveBeenCalledTimes(1);
              expect(
                testContext.fakeClient.request.mock.calls[0][0].data.variables
                  .input.usBankLogin.accountId
              ).toBe(accountID);
            });
        });

        it(`sets Plaid environment to "${currentEnv}" in Braintree ${currentEnv}`, (done) => {
          testContext.configuration.gatewayConfiguration.environment =
            currentEnv;

          testContext.context._loadPlaid = (callback) => {
            const fakePlaid = {
              create: (options) => {
                expect(options.env).toBe(currentEnv);

                return { open: done };
              },
            };

            process.nextTick(() => {
              callback(null, fakePlaid);
            });
          };

          return USBankAccount.prototype.tokenize.call(
            testContext.context,
            {
              bankLogin: {
                displayName: "Test Merchant",
              },
              mandateText: "I authorize Braintree to charge my bank account.",
            },
            noop
          );
        });
      });

      it("sets Plaid API key to the Plaid public key in the configuration", (done) => {
        testContext.configuration.gatewayConfiguration.environment =
          "production";
        testContext.configuration.gatewayConfiguration.usBankAccount.plaid.publicKey =
          "foo_boo";
        testContext.context._loadPlaid = (callback) => {
          const fakePlaid = {
            create: (options) => {
              expect(options.key).toBe("foo_boo");

              return { open: done };
            },
          };

          process.nextTick(() => {
            callback(null, fakePlaid);
          });
        };

        USBankAccount.prototype.tokenize.call(
          testContext.context,
          {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText: "I authorize Braintree to charge my bank account.",
          },
          noop
        );
      });

      it("errors without displayName", () =>
        USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {},
            mandateText:
              "I authorize Braintree to charge my bank account on behalf of Test Merchant.",
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_OPTION_REQUIRED");
            expect(err.message).toBe(
              "displayName property is required when using bankLogin."
            );

            expect(testContext.fakeClient.request).not.toHaveBeenCalled();
          }));

      it("errors without mandateText", () =>
        USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {
              displayName: "My Merchant",
            },
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("US_BANK_ACCOUNT_OPTION_REQUIRED");
            expect(err.message).toBe("mandateText property is required.");

            expect(testContext.fakeClient.request).not.toHaveBeenCalled();
          }));

      it('sends a "started" analytics event when starting Plaid', (done) => {
        const fakeClient = testContext.fakeClient;

        testContext.context._loadPlaid = (callback) => {
          const fakePlaid = {
            create: () => ({
              open: () => {
                process.nextTick(() => {
                  expect(analytics.sendEvent).toHaveBeenCalledWith(
                    fakeClient,
                    "usbankaccount.banklogin.tokenization.started"
                  );
                  expect(analytics.sendEvent).toHaveBeenCalledTimes(1);

                  done();
                });
              },
            }),
          };

          process.nextTick(() => {
            callback(null, fakePlaid);
          });
        };

        USBankAccount.prototype.tokenize.call(
          testContext.context,
          {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText: "I authorize Braintree to charge my bank account.",
          },
          noop
        );
      });

      it('sends a "succeeded" analytics events when Plaid tokenization completes', () => {
        testContext.fakeClient.request.mockResolvedValue(
          testContext.fakeGatewayResponse
        );

        testContext.context._loadPlaid = testContext.standardCallback;

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText: "I authorize Braintree to charge my bank account.",
          })
          .then(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "usbankaccount.banklogin.tokenization.succeeded"
            );
          });
      });

      it('sends a "closed.by-user" analytics events when user closes Plaid flow', () => {
        testContext.context._loadPlaid = (callback) => {
          const fakePlaid = {
            create: (options) => ({
              open: () => {
                process.nextTick(() => {
                  options.onExit();
                });
              },
            }),
          };

          process.nextTick(() => {
            callback(null, fakePlaid);
          });
        };

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText: "I authorize Braintree to charge my bank account.",
          })
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "usbankaccount.banklogin.tokenization.closed.by-user"
            );
          });
      });

      it('sends a "failed" analytics events when Plaid tokenization fails', () => {
        testContext.fakeClient.request.mockRejectedValue(
          new Error("Something bad happened")
        );

        testContext.context._loadPlaid = testContext.standardCallback;

        return USBankAccount.prototype.tokenize
          .call(testContext.context, {
            bankLogin: {
              displayName: "Test Merchant",
            },
            mandateText: "I authorize Braintree to charge my bank account.",
          })
          .catch(() => {
            expect(analytics.sendEvent).toHaveBeenCalledWith(
              testContext.fakeClient,
              "usbankaccount.banklogin.tokenization.failed"
            );
          });
      });
    });

    it("errors when tokenize fails with 4xx status code", () => {
      const originalError = new Error("Something bad happnened");

      originalError.details = { httpStatus: 404 };
      testContext.fakeClient.request.mockRejectedValue(originalError);

      testContext.context._loadPlaid = testContext.standardCallback;

      return USBankAccount.prototype.tokenize
        .call(testContext.context, {
          bankLogin: {
            displayName: "Test Merchant",
          },
          mandateText: "I authorize Braintree to charge my bank account.",
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
      testContext.context._loadPlaid = testContext.standardCallback;

      return USBankAccount.prototype.tokenize
        .call(testContext.context, {
          bankLogin: {
            displayName: "Test Merchant",
          },
          mandateText: "I authorize Braintree to charge my bank account.",
        })
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("NETWORK");
          expect(err.code).toBe("US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR");
          expect(err.message).toBe("A tokenization network error occurred.");
        });
    });
  });

  describe("_loadPlaid", () => {
    beforeEach(() => {
      jest.spyOn(document.body, "appendChild").mockImplementation();
    });

    afterEach(() => {
      delete window.Plaid;
    });

    it("returns the Plaid instance if it already existed on the global", (done) => {
      const fakePlaid = { open: noop };

      window.Plaid = fakePlaid;

      USBankAccount.prototype._loadPlaid.call(
        testContext.context,
        (err, plaid) => {
          expect(plaid).toBe(fakePlaid);
          expect(document.body.appendChild).not.toHaveBeenCalled();

          done();
        }
      );
    });

    it("adds a Plaid Link script tag to the <body> if one was not already there", () => {
      let script;

      USBankAccount.prototype._loadPlaid.call(testContext.context, noop);

      expect(document.body.appendChild).toHaveBeenCalledTimes(1);

      script = document.body.appendChild.mock.calls[0][0];
      expect(script.src).toBe(
        "https://cdn.plaid.com/link/v2/stable/link-initialize.js"
      );
    });

    it("does not add a new Plaid Link script tag if one was already there and sets up listeners", () => {
      const fakeScript = document.createElement("script");

      jest.spyOn(fakeScript, "addEventListener");
      jest.spyOn(document, "querySelector").mockReturnValue(fakeScript);

      USBankAccount.prototype._loadPlaid.call(testContext.context, noop);

      expect(document.body.appendChild).not.toHaveBeenCalled();
      expect(fakeScript.addEventListener).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(fakeScript.addEventListener).toHaveBeenCalledWith(
        "load",
        expect.any(Function)
      );
      expect(fakeScript.addEventListener).toHaveBeenCalledWith(
        "readystatechange",
        expect.any(Function)
      );

      document.querySelector.mockRestore();
    });

    it("calls callback with error when script load errors", (done) => {
      let script;
      const fakeBody = document.createElement("div");

      USBankAccount.prototype._loadPlaid.call(testContext.context, (err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("NETWORK");
        expect(err.code).toBe("US_BANK_ACCOUNT_LOGIN_LOAD_FAILED");
        expect(err.message).toBe("Bank login flow failed to load.");

        done();
      });

      script = document.body.appendChild.mock.calls[0][0];

      fakeBody.appendChild(script);

      script.dispatchEvent(new Event("error"));
    });

    it("calls callback on script load", (done) => {
      let script;
      const fakePlaid = testContext.fakePlaid;

      USBankAccount.prototype._loadPlaid.call(
        testContext.context,
        (err, plaid) => {
          expect(plaid).toBe(fakePlaid);

          done();
        }
      );

      script = document.body.appendChild.mock.calls[0][0];

      window.Plaid = fakePlaid;
      script.dispatchEvent(new Event("load"));
    });

    it('calls callback on script readystatechange if readyState is "loaded"', (done) => {
      let script;
      const fakePlaid = testContext.fakePlaid;

      USBankAccount.prototype._loadPlaid.call(
        testContext.context,
        (err, plaid) => {
          expect(plaid).toBe(fakePlaid);

          done();
        }
      );

      script = document.body.appendChild.mock.calls[0][0];
      script.readyState = "loaded";

      window.Plaid = fakePlaid;
      script.dispatchEvent(new Event("readystatechange"));
    });

    it('calls callback on script readystatechange if readyState is "complete"', (done) => {
      let script;
      const fakePlaid = testContext.fakePlaid;

      USBankAccount.prototype._loadPlaid.call(
        testContext.context,
        (err, plaid) => {
          expect(plaid).toBe(fakePlaid);

          done();
        }
      );

      script = document.body.appendChild.mock.calls[0][0];
      script.readyState = "complete";

      window.Plaid = fakePlaid;
      script.dispatchEvent(new Event("readystatechange"));
    });

    it('does not call callback on script readystatechange if readyState is not "complete" or "loaded"', () => {
      let script;
      const fakePlaid = testContext.fakePlaid;
      const callbackSpy = jest.fn();

      USBankAccount.prototype._loadPlaid.call(testContext.context, callbackSpy);

      script = document.body.appendChild.mock.calls[0][0];
      script.readyState = "loading";

      window.Plaid = fakePlaid;
      script.dispatchEvent(new Event("readystatechange"));

      expect(callbackSpy).not.toHaveBeenCalled();
    });

    it("does not call callback more than once", () => {
      let script;
      const fakePlaid = testContext.fakePlaid;
      const callbackSpy = jest.fn();

      USBankAccount.prototype._loadPlaid.call(testContext.context, callbackSpy);

      script = document.body.appendChild.mock.calls[0][0];

      window.Plaid = fakePlaid;

      script.dispatchEvent(new Event("load"));
      script.dispatchEvent(new Event("error"));

      expect(callbackSpy).toHaveBeenCalledTimes(1);
    });

    it("removes load callbacks on load", () => {
      let script;

      USBankAccount.prototype._loadPlaid.call(testContext.context, noop);

      script = document.body.appendChild.mock.calls[0][0];

      jest.spyOn(script, "removeEventListener").mockReturnValue(null);

      script.dispatchEvent(new Event("load"));

      expect(script.removeEventListener).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(script.removeEventListener).toHaveBeenCalledWith(
        "load",
        expect.any(Function)
      );
      expect(script.removeEventListener).toHaveBeenCalledWith(
        "readystatechange",
        expect.any(Function)
      );
    });

    it("removes the script tag from the DOM when it errors", (done) => {
      let script;
      const fakeBody = document.createElement("div");

      USBankAccount.prototype._loadPlaid.call(testContext.context, () => {
        let i;
        const children = [];

        for (i = 0; i < fakeBody.children.length; i++) {
          children.push(fakeBody.children[i]);
        }

        expect(children).not.toBe(expect.arrayContaining([script]));

        done();
      });

      script = document.body.appendChild.mock.calls[0][0];
      fakeBody.appendChild(script);

      script.dispatchEvent(new Event("error"));
    });

    it("removes load callbacks on readystatechange completion", () => {
      let script;

      USBankAccount.prototype._loadPlaid.call(testContext.context, noop);

      script = document.body.appendChild.mock.calls[0][0];

      jest.spyOn(script, "removeEventListener").mockReturnValue(null);

      script.readyState = "complete";
      script.dispatchEvent(new Event("readystatechange"));

      expect(script.removeEventListener).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(script.removeEventListener).toHaveBeenCalledWith(
        "load",
        expect.any(Function)
      );
      expect(script.removeEventListener).toHaveBeenCalledWith(
        "readystatechange",
        expect.any(Function)
      );
    });

    it('does not remove load callbacks if readystatechange is not "complete" or "loaded"', () => {
      let script;

      USBankAccount.prototype._loadPlaid.call(testContext.context, noop);

      script = document.body.appendChild.mock.calls[0][0];

      jest.spyOn(script, "removeEventListener").mockReturnValue(null);

      script.readyState = "loading";
      script.dispatchEvent(new Event("readystatechange"));

      expect(script.removeEventListener).not.toHaveBeenCalled();
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      const instance = new USBankAccount({ client: testContext.fakeClient });

      instance.teardown(() => {
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

        done();
      });
    });
  });
});
