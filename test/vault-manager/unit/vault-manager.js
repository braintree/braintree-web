"use strict";

jest.mock("../../../src/lib/analytics");

const analytics = require("../../../src/lib/analytics");
const VaultManager = require("../../../src/vault-manager/vault-manager");
const { fake, rejectIfResolves } = require("../../helpers");
const BraintreeError = require("../../../src/lib/braintree-error");
const methods = require("../../../src/lib/methods");

describe("VaultManager", () => {
  let client, fakePaymentMethod, vaultManager;

  beforeEach(function () {
    client = fake.client({
      configuration: {
        authorizationType: "CLIENT_TOKEN",
      },
    });
    jest.spyOn(client, "request").mockResolvedValue(null);
    fakePaymentMethod = {
      nonce: "nonce",
      default: false,
      hasSubscription: false,
      details: {},
      type: "type",
      garbage: "garbage",
    };
    vaultManager = new VaultManager({
      createPromise: Promise.resolve(client),
    });
  });

  describe("fetchPaymentMethods", () => {
    it("requests payment methods", function () {
      client.request.mockResolvedValue({
        paymentMethods: [fakePaymentMethod],
      });

      return vaultManager.fetchPaymentMethods().then(() => {
        expect(client.request).toBeCalledTimes(1);
        expect(client.request).toBeCalledWith({
          endpoint: "payment_methods",
          method: "get",
          data: {
            defaultFirst: 0,
          },
        });
      });
    });

    it("allows passing in a defaultFirst param", function () {
      client.request.mockResolvedValue({
        paymentMethods: [fakePaymentMethod],
      });

      return vaultManager
        .fetchPaymentMethods({
          defaultFirst: true,
        })
        .then(() => {
          expect(client.request).toBeCalledTimes(1);
          expect(client.request).toBeCalledWith({
            endpoint: "payment_methods",
            method: "get",
            data: {
              defaultFirst: 1,
            },
          });
        });
    });

    it("sends analytics event", function () {
      client.request.mockResolvedValue({
        paymentMethods: [fakePaymentMethod],
      });

      return vaultManager.fetchPaymentMethods().then(() => {
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "vault-manager.fetch-payment-methods.succeeded"
        );
      });
    });

    it("formats response from server", function () {
      client.request.mockResolvedValue({
        paymentMethods: [fakePaymentMethod],
      });

      return vaultManager.fetchPaymentMethods().then((paymentMethods) => {
        expect(paymentMethods).toEqual([
          {
            nonce: "nonce",
            default: false,
            details: {},
            hasSubscription: false,
            type: "type",
          },
        ]);
      });
    });

    it("includes description if payload includes a description", function () {
      fakePaymentMethod.type = "CreditCard";
      fakePaymentMethod.description = "A card ending in 11";
      client.request.mockResolvedValue({
        paymentMethods: [
          fakePaymentMethod,
          {
            nonce: "payment-method-without-a-description",
            default: true,
            details: {},
            hasSubscription: false,
            type: "Type",
          },
          {
            nonce: "payment-method-with-description",
            default: false,
            details: {},
            type: "Description",
            hasSubscription: true,
            description: "A description",
          },
        ],
      });

      return vaultManager.fetchPaymentMethods().then((paymentMethods) => {
        expect(paymentMethods).toEqual([
          {
            nonce: "nonce",
            default: false,
            details: {},
            type: "CreditCard",
            hasSubscription: false,
            description: "A card ending in 11",
          },
          {
            nonce: "payment-method-without-a-description",
            default: true,
            details: {},
            hasSubscription: false,
            type: "Type",
          },
          {
            nonce: "payment-method-with-description",
            default: false,
            details: {},
            type: "Description",
            hasSubscription: true,
            description: "A description",
          },
        ]);
      });
    });

    it("includes binData if payload includes a binData", function () {
      fakePaymentMethod.type = "CreditCard";
      fakePaymentMethod.binData = {
        some: "data",
      };
      client.request.mockResolvedValue({
        paymentMethods: [
          fakePaymentMethod,
          {
            nonce: "payment-method-without-bin-data",
            default: true,
            details: {},
            type: "Type",
          },
          {
            nonce: "payment-method-with-bin-data",
            default: false,
            details: {},
            type: "BinData",
            binData: { more: "data" },
          },
        ],
      });

      return vaultManager.fetchPaymentMethods().then((paymentMethods) => {
        expect(paymentMethods[0].binData).toEqual({ some: "data" });
        expect(paymentMethods[1].binData).toBeFalsy();
        expect(paymentMethods[2].binData).toEqual({ more: "data" });
      });
    });

    it("sends back error if request fails", function () {
      const fakeError = new Error("error");

      client.request.mockRejectedValue(fakeError);

      return vaultManager
        .fetchPaymentMethods()
        .then(rejectIfResolves)
        .catch((err) => {
          expect(err).toBe(fakeError);
        });
    });

    it("sends back error if createPromise rejects", () => {
      const fakeError = new Error("error");

      vaultManager = new VaultManager({
        createPromise: Promise.reject(fakeError),
      });

      return expect(vaultManager.fetchPaymentMethods()).rejects.toThrow(
        fakeError
      );
    });
  });

  describe("deletePaymentMethod", () => {
    it("calls graphql to delete payment method", function () {
      client.request.mockResolvedValue();

      return vaultManager.deletePaymentMethod("nonce-to-delete").then(() => {
        expect(client.request).toBeCalledTimes(1);
        expect(client.request).toBeCalledWith({
          api: "graphQLApi",
          data: expect.objectContaining({
            variables: {
              input: {
                singleUseTokenId: "nonce-to-delete",
              },
            },
          }),
        });
      });
    });

    it("sends analytics event on success", function () {
      client.request.mockResolvedValue();

      return vaultManager.deletePaymentMethod("nonce-to-delete").then(() => {
        expect(analytics.sendEvent).toBeCalledTimes(1);
        expect(analytics.sendEvent).toBeCalledWith(
          client,
          "vault-manager.delete-payment-method.succeeded"
        );
      });
    });

    it("errors if a client token is not used", function () {
      jest.spyOn(client, "getConfiguration").mockReturnValue({
        authorizationType: "TOKENIZATION_KEY",
      });

      return vaultManager
        .deletePaymentMethod("nonce-to-delete")
        .then(rejectIfResolves)
        .catch((err) => {
          expect(client.request).toBeCalledTimes(0);

          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe(
            "VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN"
          );
          expect(err.message).toBe(
            "A client token with a customer id must be used to delete a payment method nonce."
          );

          client.getConfiguration.mockReturnValue({
            authorizationType: "CLIENT_TOKEN",
          });

          return vaultManager.deletePaymentMethod("nonce-to-delete");
        })
        .then(() => {
          expect(client.request).toBeCalledTimes(1);
        });
    });

    it("provides a not found error when nonce does not exist", function () {
      const graphQLErrors = [
        {
          message: "Record not found",
          locations: [
            {
              line: 1,
              column: 104,
            },
          ],
          path: ["deletePaymentMethodFromSingleUseToken"],
          extensions: {
            errorType: "user_error",
            errorClass: "NOT_FOUND",
            inputPath: ["input", "singleUseTokenId"],
          },
        },
      ];
      const requestError = new BraintreeError({
        code: "CLIENT_GRAPHQL_REQUEST_ERROR",
        message: "There was a problem with your request.",
        name: "BraintreeError",
        type: "NETWORK",
        details: {
          originalError: graphQLErrors,
        },
      });

      client.request.mockRejectedValue(requestError);

      return vaultManager
        .deletePaymentMethod("fake-nonce")
        .then(rejectIfResolves)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND");
          expect(err.message).toBe(
            "A payment method for payment method nonce `fake-nonce` could not be found."
          );
          expect(err.details.originalError).toBe(graphQLErrors);
        });
    });

    it("provides a generic error for all other errors", function () {
      const graphQLErrors = [
        {
          message: "Record not found",
          locations: [
            {
              line: 1,
              column: 104,
            },
          ],
          path: ["deletePaymentMethodFromSingleUseToken"],
          extensions: {
            errorType: "user_error",
            errorClass: "UNKOWN",
            inputPath: ["input", "singleUseTokenId"],
          },
        },
      ];
      const requestError = new BraintreeError({
        code: "CLIENT_GRAPHQL_REQUEST_ERROR",
        message: "There was a problem with your request.",
        name: "BraintreeError",
        type: "NETWORK",
        details: {
          originalError: graphQLErrors,
        },
      });

      client.request.mockRejectedValue(requestError);

      return vaultManager
        .deletePaymentMethod("fake-nonce")
        .then(rejectIfResolves)
        .catch((err) => {
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe("UNKNOWN");
          expect(err.code).toBe(
            "VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR"
          );
          expect(err.message).toBe(
            "An unknown error occured when attempting to delete the payment method assocaited with the payment method nonce `fake-nonce`."
          );
          expect(err.details.originalError).toBe(graphQLErrors);
        });
    });

    it("sends an analytics event when error occurs", function () {
      const graphQLErrors = [
        {
          message: "Record not found",
          locations: [
            {
              line: 1,
              column: 104,
            },
          ],
          path: ["deletePaymentMethodFromSingleUseToken"],
          extensions: {
            errorType: "user_error",
            errorClass: "UNKOWN",
            inputPath: ["input", "singleUseTokenId"],
          },
        },
      ];
      const requestError = new BraintreeError({
        code: "CLIENT_GRAPHQL_REQUEST_ERROR",
        message: "There was a problem with your request.",
        name: "BraintreeError",
        type: "NETWORK",
        details: {
          originalError: graphQLErrors,
        },
      });

      client.request.mockRejectedValue(requestError);

      return vaultManager
        .deletePaymentMethod("fake-nonce")
        .then(rejectIfResolves)
        .catch(() => {
          expect(analytics.sendEvent).toBeCalledTimes(1);
          expect(analytics.sendEvent).toBeCalledWith(
            client,
            "vault-manager.delete-payment-method.failed"
          );
        });
    });

    it("sends back error if createPromise rejects", () => {
      const fakeError = new Error("error");

      vaultManager = new VaultManager({
        createPromise: Promise.reject(fakeError),
      });

      return expect(
        vaultManager.deletePaymentMethod("fake-nonce")
      ).rejects.toThrow(fakeError);
    });
  });

  describe("teardown", () => {
    it("replaces all methods so error is thrown when methods are invoked", function (done) {
      const instance = vaultManager;

      instance.teardown(() => {
        methods(VaultManager.prototype).forEach((method) => {
          let err;

          try {
            instance[method]();
          } catch (e) {
            err = e;
          }

          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.type).toBe(BraintreeError.types.MERCHANT);
          expect(err.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
          expect(err.message).toBe(
            method + " cannot be called after teardown."
          );
        });

        done();
      });
    });
  });
});
