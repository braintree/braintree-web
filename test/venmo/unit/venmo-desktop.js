"use strict";

jest.mock("framebus");
jest.mock("@braintree/iframer");
jest.mock("@braintree/uuid");

var Framebus = require("framebus");
var iframer = require("@braintree/iframer");
var uuid = require("@braintree/uuid");
var VenmoDesktop = require("../../../src/venmo/external/venmo-desktop").default;

describe("VenmoDesktop", function () {
  var venmoOptions;

  beforeEach(function () {
    uuid.mockReturnValue("fake-uuid");
    iframer.mockImplementation(function (options) {
      var iframe = document.createElement("iframe");

      if (options && options.src) {
        iframe.src = options.src;
      }

      return iframe;
    });
    Framebus.mockImplementation(function () {
      return {
        on: jest.fn().mockImplementation(function (eventName, cb) {
          if (eventName === "VENMO_DESKTOP_IFRAME_READY") {
            cb();
          }

          return true;
        }),
        off: jest.fn(),
        emit: jest.fn(),
        teardown: jest.fn(),
        addTargetFrame: jest.fn(),
      };
    });

    venmoOptions = {
      Promise: Promise,
      url: "https://example.com",
      environment: "sandbox",
      paymentMethodUsage: "SINGLE_USE",
      verifyDomain: jest.fn().mockReturnValue(true),
      apiRequest: jest.fn(),
      sendEvent: jest.fn(),
    };
  });

  afterEach(function () {
    document.body.innerHTML = "";
  });

  function createInitializedInstance(options) {
    var instance = new VenmoDesktop(options || venmoOptions);

    return instance.initialize();
  }

  function useFakeTimers() {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
  }

  function flushPromises() {
    return new Promise(function (resolve) {
      process.nextTick(resolve);
    });
  }

  function advanceTime(time) {
    return flushPromises().then(function () {
      jest.advanceTimersByTime(time);

      return flushPromises();
    });
  }

  function mockFramebusWithEvent(eventName, payload) {
    Framebus.mockImplementation(function () {
      return {
        on: jest.fn().mockImplementation(function (name, cb) {
          if (name === eventName) {
            cb(payload);
          }

          return true;
        }),
        off: jest.fn(),
        emit: jest.fn(),
        teardown: jest.fn(),
        addTargetFrame: jest.fn(),
      };
    });
  }

  describe("constructor", function () {
    it("creates a secure bus", function () {
      var instance = new VenmoDesktop(venmoOptions);
      var busInstance = Framebus.mock.results[0].value;

      expect(Framebus).toHaveBeenCalledWith({
        channel: "fake-uuid",
        verifyDomain: expect.any(Function),
        targetFrames: [],
      });
      expect(busInstance.addTargetFrame).toHaveBeenCalledWith(
        expect.any(HTMLIFrameElement)
      );
    });
  });

  describe("initialize", function () {
    it("adds an alert box to the document.body", function () {
      return createInitializedInstance().then(function () {
        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox).toBeTruthy();
      });
    });

    it("adds an iframe to the document.body", function () {
      return createInitializedInstance().then(function () {
        var iframe = document.querySelector("iframe");

        expect(iframe).toBeTruthy();
        expect(iframe.src).toContain("https://example.com/#sandbox_");
      });
    });

    it("listens for the VENMO_DESKTOP_IFRAME_READY event", function () {
      return createInitializedInstance().then(function () {
        var busInstance = Framebus.mock.results[0].value;

        expect(busInstance.on).toHaveBeenCalledWith(
          "VENMO_DESKTOP_IFRAME_READY",
          expect.any(Function)
        );
      });
    });

    it("listens for the VENMO_DESKTOP_REQUEST_NEW_QR_CODE event", function () {
      return createInitializedInstance().then(function () {
        var busInstance = Framebus.mock.results[0].value;

        expect(busInstance.on).toHaveBeenCalledWith(
          "VENMO_DESKTOP_REQUEST_NEW_QR_CODE",
          expect.any(Function)
        );
      });
    });

    it("calls startPolling when VENMO_DESKTOP_REQUEST_NEW_QR_CODE fires", function () {
      mockFramebusWithEvent("VENMO_DESKTOP_REQUEST_NEW_QR_CODE");

      var instance = new VenmoDesktop(venmoOptions);

      jest.spyOn(instance, "startPolling").mockImplementation();

      instance.initialize();

      expect(instance.startPolling).toHaveBeenCalledTimes(1);
    });

    it("sends restarted-from-error-view analytics event when VENMO_DESKTOP_REQUEST_NEW_QR_CODE fires with error-view source", function () {
      mockFramebusWithEvent("VENMO_DESKTOP_REQUEST_NEW_QR_CODE", {
        source: "error-view",
      });

      var instance = new VenmoDesktop(venmoOptions);

      jest.spyOn(instance, "startPolling").mockImplementation();

      instance.initialize();

      expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
      expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
        "venmo.tokenize.desktop.restarted-from-error-view",
        { payment_method_usage: "SINGLE_USE" }
      );
    });

    it("sends restarted-from-rescan analytics event when VENMO_DESKTOP_REQUEST_NEW_QR_CODE fires with rescan source", function () {
      mockFramebusWithEvent("VENMO_DESKTOP_REQUEST_NEW_QR_CODE", {
        source: "rescan",
      });

      var instance = new VenmoDesktop(venmoOptions);

      jest.spyOn(instance, "startPolling").mockImplementation();

      instance.initialize();

      expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
      expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
        "venmo.tokenize.desktop.restarted-from-rescan",
        { payment_method_usage: "SINGLE_USE" }
      );
    });

    it("defaults to restarted-from-error-view analytics event when VENMO_DESKTOP_REQUEST_NEW_QR_CODE fires without a payload", function () {
      mockFramebusWithEvent("VENMO_DESKTOP_REQUEST_NEW_QR_CODE");

      var instance = new VenmoDesktop(venmoOptions);

      jest.spyOn(instance, "startPolling").mockImplementation();

      instance.initialize();

      expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
      expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
        "venmo.tokenize.desktop.restarted-from-error-view",
        { payment_method_usage: "SINGLE_USE" }
      );
    });

    it("listens for the VENMO_DESKTOP_ANALYTICS_EVENT event", function () {
      return createInitializedInstance().then(function () {
        var busInstance = Framebus.mock.results[0].value;

        expect(busInstance.on).toHaveBeenCalledWith(
          "VENMO_DESKTOP_ANALYTICS_EVENT",
          expect.any(Function)
        );
      });
    });

    it("forwards eventName and includes payment_method_usage when VENMO_DESKTOP_ANALYTICS_EVENT fires without metadata", function () {
      mockFramebusWithEvent("VENMO_DESKTOP_ANALYTICS_EVENT", {
        eventName: "some.analytics.event",
      });

      var instance = new VenmoDesktop(venmoOptions);

      instance.initialize();

      expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
      expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
        "some.analytics.event",
        { payment_method_usage: "SINGLE_USE" }
      );
    });

    it("merges payload metadata with payment_method_usage when VENMO_DESKTOP_ANALYTICS_EVENT fires", function () {
      mockFramebusWithEvent("VENMO_DESKTOP_ANALYTICS_EVENT", {
        eventName: "some.analytics.event",
        metadata: { context_id: "ctx-123" },
      });

      var instance = new VenmoDesktop(venmoOptions);

      instance.initialize();

      expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
      expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
        "some.analytics.event",
        { payment_method_usage: "SINGLE_USE", context_id: "ctx-123" }
      );
    });

    it("resolves with instance", function () {
      var instance = new VenmoDesktop(venmoOptions);

      return instance.initialize().then(function (resolvedInstance) {
        expect(instance).toBe(resolvedInstance);
      });
    });
  });

  describe("launchDesktopFlow", function () {
    beforeEach(function () {
      jest.spyOn(VenmoDesktop.prototype, "startPolling").mockImplementation();
      Framebus.mockImplementation(function () {
        return {
          on: jest.fn().mockImplementation(function (eventName, cb) {
            if (eventName === "VENMO_DESKTOP_IFRAME_READY") {
              setTimeout(function () {
                cb();
              }, 1);
            }

            return true;
          }),
          off: jest.fn(),
          emit: jest.fn(),
          teardown: jest.fn(),
          addTargetFrame: jest.fn(),
        };
      });
    });

    it("sets iframe display to block and focuses it", function () {
      return createInitializedInstance().then(function (instance) {
        var iframe = document.querySelector("iframe");

        jest.spyOn(iframe, "focus");

        instance.launchDesktopFlow();

        expect(iframe.style.display).toBe("block");
        expect(iframe.focus).toHaveBeenCalledTimes(1);
      });
    });

    it("listens for customer cancel", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.launchDesktopFlow();

        expect(busInstance.on).toHaveBeenCalledWith(
          "VENMO_DESKTOP_CUSTOMER_CANCELED",
          expect.any(Function)
        );
      });
    });

    it("listens for unknown errors", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.launchDesktopFlow();

        expect(busInstance.on).toHaveBeenCalledWith(
          "VENMO_DESKTOP_UNKNOWN_ERROR",
          expect.any(Function)
        );
      });
    });

    it("sets alert box message", function () {
      return createInitializedInstance().then(function (instance) {
        instance.launchDesktopFlow();

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.style.display).toBe("block");
        expect(alertBox.textContent).toBe(
          "Generating a QR code, get your Venmo app ready"
        );
      });
    });

    it("rejects when customer cancels", function () {
      expect.assertions(2);

      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        busInstance.on.mockImplementation(function (eventName, cb) {
          if (eventName === "VENMO_DESKTOP_CUSTOMER_CANCELED") {
            cb();
          }

          return true;
        });

        return instance.launchDesktopFlow().catch(function (err) {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.tokenize.desktop.status-change.canceled-from-modal",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(err).toEqual({
            allowUIToHandleError: false,
            reason: "CUSTOMER_CANCELED",
          });
        });
      });
    });

    it("calls update mutation with CANCELED when customer cancels", function () {
      expect.assertions(2);

      return createInitializedInstance().then(function (instance) {
        instance.venmoContextId = "fake-id";
        var busInstance = Framebus.mock.results[0].value;

        busInstance.on.mockImplementation(function (eventName, cb) {
          if (eventName === "VENMO_DESKTOP_CUSTOMER_CANCELED") {
            cb();
          }

          return true;
        });

        return instance.launchDesktopFlow().catch(function () {
          expect(venmoOptions.apiRequest).toHaveBeenCalledTimes(1);
          expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
            expect.stringContaining("mutation UpdateVenmoPaymentContextStatus"),
            {
              input: {
                id: "fake-id",
                status: "CANCELED",
              },
            }
          );
        });
      });
    });

    it("rejects when unknown error occurs", function () {
      expect.assertions(3);

      return createInitializedInstance().then(function (instance) {
        var error = new Error("something went wrong");
        var busInstance = Framebus.mock.results[0].value;

        busInstance.on.mockImplementation(function (eventName, cb) {
          if (eventName === "VENMO_DESKTOP_UNKNOWN_ERROR") {
            cb(error);
          }

          return true;
        });

        return instance.launchDesktopFlow().catch(function (err) {
          expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.tokenize.desktop.unknown-error",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(err).toEqual({
            allowUIToHandleError: false,
            reason: "UNKNOWN_ERROR",
            err: error,
          });
        });
      });
    });

    it("resolves with payload when authorization completes", function () {
      return createInitializedInstance().then(function (instance) {
        var resultPromise = instance.launchDesktopFlow();

        instance.triggerCompleted({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
          payerInfo: { firstName: "first", lastName: "last" },
          id: "some-id",
        });

        return resultPromise.then(function (result) {
          expect(result.paymentMethodNonce).toBe("fake-venmo-account-nonce");
          expect(result.username).toBe("username");
          expect(result.payerInfo).toEqual({
            firstName: "first",
            lastName: "last",
          });
        });
      });
    });

    it("starts polling", function () {
      return createInitializedInstance().then(function (instance) {
        var resultPromise = instance.launchDesktopFlow();

        instance.triggerCompleted({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
          payerInfo: { firstName: "first", lastName: "last" },
          id: "some-id",
        });

        return resultPromise.then(function () {
          expect(instance.startPolling).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe("startPolling", function () {
    var FAKE_CREATE_CONTEXT_RESPONSE = {
      createVenmoPaymentContext: {
        venmoPaymentContext: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          status: "CREATED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      },
    };

    beforeEach(function () {
      jest
        .spyOn(VenmoDesktop.prototype, "triggerCompleted")
        .mockImplementation();
      jest
        .spyOn(VenmoDesktop.prototype, "pollForStatusChange")
        .mockResolvedValue({
          paymentMethodId: "fake-venmo-account-nonce",
          userName: "username",
          payerInfo: { firstName: "first", lastName: "last" },
          createdAt: "foo",
          expiresAt: "foo",
          status: "APPROVED",
          id: "id",
          merchantId: "merchant-id",
        });
      jest.spyOn(VenmoDesktop.prototype, "displayQRCode").mockImplementation();
    });

    it("creates payment context with CreateVenmoPaymentContext mutation", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledTimes(1);
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paymentMethodUsage: "SINGLE_USE",
              intent: "PAY_FROM_APP",
              customerClient: "DESKTOP",
            }),
          }
        );
      });
    });

    it("includes profile id in create mutation", function () {
      venmoOptions.profileId = "profile-id";
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledTimes(1);
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paymentMethodUsage: "SINGLE_USE",
              intent: "PAY_FROM_APP",
              customerClient: "DESKTOP",
              merchantProfileId: "profile-id",
            }),
          }
        );
      });
    });

    it("includes display name in create mutation", function () {
      venmoOptions.displayName = "Display Name";
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledTimes(1);
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paymentMethodUsage: "SINGLE_USE",
              intent: "PAY_FROM_APP",
              customerClient: "DESKTOP",
              displayName: "Display Name",
            }),
          }
        );
      });
    });

    it("passes riskCorrelationId to CreateVenmoPaymentContext mutation as venmoRiskCorrelationId", function () {
      venmoOptions.riskCorrelationId = "risk-id-123";
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledTimes(1);
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paymentMethodUsage: "SINGLE_USE",
              intent: "PAY_FROM_APP",
              customerClient: "DESKTOP",
              venmoRiskCorrelationId: "risk-id-123",
            }),
          }
        );
      });
    });

    it("does not include paysheetDetails when neither address option is set", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.not.objectContaining({
              paysheetDetails: expect.anything(),
            }),
          }
        );
      });
    });

    it("includes paysheetDetails with both address options when both are set", function () {
      venmoOptions.collectCustomerBillingAddress = true;
      venmoOptions.collectCustomerShippingAddress = true;
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paysheetDetails: {
                collectCustomerBillingAddress: true,
                collectCustomerShippingAddress: true,
              },
            }),
          }
        );
      });
    });

    it("includes paysheetDetails with only collectCustomerBillingAddress when collectCustomerShippingAddress is not set", function () {
      venmoOptions.collectCustomerBillingAddress = true;
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paysheetDetails: {
                collectCustomerBillingAddress: true,
              },
            }),
          }
        );
      });
    });

    it("includes paysheetDetails with only collectCustomerShippingAddress when collectCustomerBillingAddress is not set", function () {
      venmoOptions.collectCustomerShippingAddress = true;
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(venmoOptions.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation CreateVenmoPaymentContext"),
          {
            input: expect.objectContaining({
              paysheetDetails: {
                collectCustomerShippingAddress: true,
              },
            }),
          }
        );
      });
    });

    it("displays QR code from created payment context", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(instance.displayQRCode).toHaveBeenCalledTimes(1);
        expect(instance.displayQRCode).toHaveBeenCalledWith(
          "fake-id",
          "fake-merchant-id"
        );
      });
    });

    it("displays QR code with custom profile id", function () {
      venmoOptions.profileId = "profile-id";
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(instance.displayQRCode).toHaveBeenCalledTimes(1);
        expect(instance.displayQRCode).toHaveBeenCalledWith(
          "fake-id",
          "profile-id"
        );
      });
    });

    it("polls for status change", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(instance.pollForStatusChange).toHaveBeenCalledTimes(1);
        expect(instance.pollForStatusChange).toHaveBeenCalledWith(
          "CREATED",
          expect.any(Number)
        );
      });
    });

    it("calls triggerCompleted after polling concludes", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      return instance.startPolling().then(function () {
        expect(instance.triggerCompleted).toHaveBeenCalledTimes(1);
        expect(instance.triggerCompleted).toHaveBeenCalledWith({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "@username",
          payerInfo: { firstName: "first", lastName: "last" },
          id: "fake-id",
        });
      });
    });

    it("does not call triggerCompleted when polling resolves without response", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      instance.pollForStatusChange.mockResolvedValue(undefined);

      return instance.startPolling().then(function () {
        expect(instance.triggerCompleted).not.toHaveBeenCalled();
      });
    });

    it("ignores errors that UI should handle", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);

      instance.pollForStatusChange.mockRejectedValue({
        allowUIToHandleError: true,
        reason: "SOME_ERROR",
      });

      return instance.startPolling().then(function () {
        expect(instance.triggerCompleted).not.toHaveBeenCalled();
      });
    });

    it("triggers rejection for unhandled errors", function () {
      venmoOptions.apiRequest = jest
        .fn()
        .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

      var instance = new VenmoDesktop(venmoOptions);
      var error = new Error("some-error");

      instance.pollForStatusChange.mockRejectedValue(error);

      jest.spyOn(instance, "triggerRejected").mockImplementation();

      return instance.startPolling().then(function () {
        expect(instance.triggerRejected).toHaveBeenCalledTimes(1);
        expect(instance.triggerRejected).toHaveBeenCalledWith(error);
      });
    });

    it("triggers rejection when createVenmoDesktopPaymentContext fails", function () {
      var error = new Error("network failure");

      venmoOptions.apiRequest = jest.fn().mockRejectedValue(error);

      var instance = new VenmoDesktop(venmoOptions);

      jest.spyOn(instance, "triggerRejected").mockImplementation();

      return instance.startPolling().then(function () {
        expect(instance.triggerCompleted).not.toHaveBeenCalled();
        expect(instance.triggerRejected).toHaveBeenCalledTimes(1);
        expect(instance.triggerRejected).toHaveBeenCalledWith(error);
      });
    });

    describe("create-payment-context events", function () {
      it("sends create-payment-context.started event", function () {
        venmoOptions.apiRequest = jest
          .fn()
          .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

        var instance = new VenmoDesktop(venmoOptions);

        return instance.startPolling().then(function () {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.create-payment-context.started",
            { payment_method_usage: "SINGLE_USE" }
          );
        });
      });

      it("sends create-payment-context.succeeded event with context_id", function () {
        venmoOptions.apiRequest = jest
          .fn()
          .mockResolvedValue(FAKE_CREATE_CONTEXT_RESPONSE);

        var instance = new VenmoDesktop(venmoOptions);

        return instance.startPolling().then(function () {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.create-payment-context.started",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.create-payment-context.succeeded",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
        });
      });

      it("sends create-payment-context.failed event when apiRequest rejects", function () {
        var error = new Error("network failure");

        venmoOptions.apiRequest = jest.fn().mockRejectedValue(error);

        var instance = new VenmoDesktop(venmoOptions);

        jest.spyOn(instance, "triggerRejected").mockImplementation();

        return instance.startPolling().then(function () {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.create-payment-context.started",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.create-payment-context.failed",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).not.toHaveBeenCalledWith(
            "venmo.desktop-qr.create-payment-context.succeeded",
            expect.anything()
          );
        });
      });
    });
  });

  describe("pollForStatusChange", function () {
    var apiRequest;

    beforeEach(function () {
      apiRequest = jest.fn().mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          paymentMethodId: "fake-venmo-account-nonce",
          userName: "username",
          status: "APPROVED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    it("resolves if no payment context id", function () {
      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      delete instance.venmoContextId;
      jest.spyOn(instance, "displayError").mockImplementation();

      return instance.pollForStatusChange("CREATED", 100).then(function () {
        expect(instance.displayError).not.toHaveBeenCalled();
        expect(apiRequest).not.toHaveBeenCalled();
      });
    });

    it("rejects with TIMEOUT when expired", function () {
      expect.assertions(7);

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      jest.spyOn(instance, "displayError").mockImplementation();
      instance.venmoContextId = "fake-id";

      return instance.pollForStatusChange("CREATED", 100).catch(function (err) {
        expect(apiRequest).toHaveBeenCalledTimes(1);
        expect(apiRequest).toHaveBeenCalledWith(
          expect.stringContaining("mutation UpdateVenmoPaymentContextStatus"),
          {
            input: {
              id: "fake-id",
              status: "EXPIRED",
            },
          }
        );
        expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
        expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
          "venmo.tokenize.desktop.status-change.sdk-timeout",
          { payment_method_usage: "SINGLE_USE" }
        );
        expect(err.allowUIToHandleError).toBe(true);
        expect(err.reason).toBe("TIMEOUT");
        expect(instance.displayError).toHaveBeenCalledWith(
          "Something went wrong"
        );
      });
    });

    it("looks up the payment context", function () {
      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .then(function () {
          expect(apiRequest).toHaveBeenCalledTimes(1);
          expect(apiRequest).toHaveBeenCalledWith(
            expect.stringContaining("query PaymentContext"),
            {
              id: "fake-id",
            }
          );
        });
    });

    it("resolves with nothing when id removed after lookup", function () {
      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      apiRequest.mockImplementation(function () {
        delete instance.venmoContextId;

        return Promise.resolve({
          node: {},
        });
      });

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .then(function (result) {
          expect(result).toBeFalsy();
        });
    });

    it("resolves with nothing when lookup response is blank", function () {
      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      apiRequest.mockResolvedValue({
        foo: "bar",
      });

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .then(function (result) {
          expect(result).toBeFalsy();
        });
    });

    it("continues to poll every second until terminal status", function () {
      apiRequest.mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          status: "CREATED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      useFakeTimers();
      jest.spyOn(instance, "pollForStatusChange");

      var promise = instance.pollForStatusChange("CREATED", Date.now() + 10000);

      expect(instance.pollForStatusChange).toHaveBeenCalledTimes(1);

      return advanceTime(999)
        .then(function () {
          expect(instance.pollForStatusChange).toHaveBeenCalledTimes(1);

          return advanceTime(1);
        })
        .then(function () {
          expect(instance.pollForStatusChange).toHaveBeenCalledTimes(2);

          apiRequest.mockResolvedValue({
            node: {
              id: "fake-id",
              merchantId: "fake-merchant-id",
              status: "SCANNED",
              createdAt: "2020-12-01T18:13:50.946000Z",
              expiresAt: "2020-12-01T18:18:50.946000Z",
            },
          });

          return advanceTime(1000);
        })
        .then(function () {
          expect(instance.pollForStatusChange).toHaveBeenCalledTimes(3);

          apiRequest.mockResolvedValue({
            node: {
              id: "fake-id",
              merchantId: "fake-merchant-id",
              paymentMethodId: "fake-venmo-account-nonce",
              userName: "username",
              status: "APPROVED",
              createdAt: "2020-12-01T18:13:50.946000Z",
              expiresAt: "2020-12-01T18:18:50.946000Z",
            },
          });

          return advanceTime(1000);
        })
        .then(function () {
          expect(instance.pollForStatusChange).toHaveBeenCalledTimes(4);

          return promise;
        })
        .then(function () {
          expect(instance.pollForStatusChange).toHaveBeenCalledTimes(4);
        });
    });

    it("rejects when status goes to EXPIRED", function () {
      expect.assertions(7);

      apiRequest.mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          paymentMethodId: "fake-venmo-account-nonce",
          userName: "username",
          status: "EXPIRED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      jest.spyOn(instance, "displayError").mockImplementation();

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .catch(function (err) {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.tokenize.desktop.status-change.expired",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.started",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.succeeded",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(err.allowUIToHandleError).toBe(true);
          expect(err.reason).toBe("EXPIRED");
          expect(instance.displayError).toHaveBeenCalledTimes(1);
          expect(instance.displayError).toHaveBeenCalledWith(
            "Something went wrong"
          );
        });
    });

    it("rejects when status goes to FAILED", function () {
      expect.assertions(7);

      apiRequest.mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          paymentMethodId: "fake-venmo-account-nonce",
          userName: "username",
          status: "FAILED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      jest.spyOn(instance, "displayError").mockImplementation();

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .catch(function (err) {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.tokenize.desktop.status-change.failed",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.started",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.succeeded",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(err.allowUIToHandleError).toBe(true);
          expect(err.reason).toBe("FAILED");
          expect(instance.displayError).toHaveBeenCalledTimes(1);
          expect(instance.displayError).toHaveBeenCalledWith(
            "Something went wrong"
          );
        });
    });

    it("rejects when CANCELED", function () {
      expect.assertions(7);

      apiRequest.mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          paymentMethodId: "fake-venmo-account-nonce",
          userName: "username",
          status: "CANCELED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      jest.spyOn(instance, "displayError").mockImplementation();

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .catch(function (err) {
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.tokenize.desktop.status-change.canceled",
            { payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.started",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.succeeded",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(err.allowUIToHandleError).toBe(true);
          expect(err.reason).toBe("CANCELED");
          expect(instance.displayError).toHaveBeenCalledTimes(1);
          expect(instance.displayError).toHaveBeenCalledWith(
            "The authorization was canceled"
          );
        });
    });

    it("sends query-payment-context.failed event when lookup apiRequest rejects", function () {
      expect.assertions(4);

      var networkError = new Error("network error");

      apiRequest.mockRejectedValue(networkError);

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .catch(function () {
          expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(2);
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.started",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.failed",
            { context_id: "fake-id", payment_method_usage: "SINGLE_USE" }
          );
          expect(venmoOptions.sendEvent).not.toHaveBeenCalledWith(
            "venmo.desktop-qr.query-payment-context.succeeded",
            expect.anything()
          );
        });
    });

    it("calls authorizing on SCANNED", function () {
      apiRequest.mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          status: "SCANNED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      useFakeTimers();
      jest.spyOn(instance, "authorizing").mockImplementation();

      var promise = instance.pollForStatusChange("CREATED", Date.now() + 10000);

      return advanceTime(1000)
        .then(function () {
          expect(instance.authorizing).toHaveBeenCalledTimes(1);

          apiRequest.mockResolvedValue({
            node: {
              id: "fake-id",
              merchantId: "fake-merchant-id",
              paymentMethodId: "fake-venmo-account-nonce",
              userName: "username",
              status: "APPROVED",
              createdAt: "2020-12-01T18:13:50.946000Z",
              expiresAt: "2020-12-01T18:18:50.946000Z",
            },
          });

          return advanceTime(1000);
        })
        .then(function () {
          return promise;
        });
    });

    it("calls authorize on APPROVED", function () {
      apiRequest.mockResolvedValue({
        node: {
          id: "fake-id",
          merchantId: "fake-merchant-id",
          paymentMethodId: "fake-venmo-account-nonce",
          userName: "username",
          status: "APPROVED",
          createdAt: "2020-12-01T18:13:50.946000Z",
          expiresAt: "2020-12-01T18:18:50.946000Z",
        },
      });

      venmoOptions.apiRequest = apiRequest;

      var instance = new VenmoDesktop(venmoOptions);

      instance.venmoContextId = "fake-id";

      useFakeTimers();
      jest.spyOn(instance, "authorize").mockImplementation();

      return instance
        .pollForStatusChange("CREATED", Date.now() + 100)
        .then(function () {
          expect(instance.authorize).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe("hideDesktopFlow", function () {
    it("sets isHidden to true", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.hideDesktopFlow();

        expect(instance.isHidden).toBe(true);
      });
    });

    it("sets iframe display to none", function () {
      return createInitializedInstance().then(function (instance) {
        var iframe = document.querySelector("iframe");

        instance.isHidden = false;
        iframe.style.display = "block";

        instance.hideDesktopFlow();

        expect(iframe.style.display).toBe("none");
      });
    });

    it("emits VENMO_DESKTOP_CLOSED_FROM_PARENT", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = false;

        instance.hideDesktopFlow();

        expect(busInstance.emit).toHaveBeenCalledWith(
          "VENMO_DESKTOP_CLOSED_FROM_PARENT"
        );
      });
    });

    it("sets alert box to blank", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.hideDesktopFlow();

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.style.display).toBe("none");
        expect(alertBox.textContent).toBe("");
      });
    });
  });

  describe("triggerCompleted", function () {
    beforeEach(function () {
      useFakeTimers();
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    it("noops when hidden", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = true;
        var spy = (instance.completedHandler = jest.fn());

        instance.triggerCompleted({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
          id: "id",
        });

        return advanceTime(3000).then(function () {
          expect(spy).not.toHaveBeenCalled();
        });
      });
    });

    it("noops when no completedHandler", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.triggerCompleted({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
          id: "id",
        });

        return advanceTime(3000);
      });
    });

    it("calls completedHandler after 2 seconds", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;
        var spy = (instance.completedHandler = jest.fn());

        instance.triggerCompleted({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
          id: "id",
        });

        expect(spy).not.toHaveBeenCalled();

        return advanceTime(2001).then(function () {
          expect(spy).toHaveBeenCalledWith({
            paymentMethodNonce: "fake-venmo-account-nonce",
            username: "username",
            id: "id",
          });
        });
      });
    });

    it("removes completedHandler after calling it", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;
        var spy = (instance.completedHandler = jest.fn());

        instance.triggerCompleted({
          paymentMethodNonce: "fake-venmo-account-nonce",
          username: "username",
          id: "id",
        });

        expect(spy).not.toHaveBeenCalled();

        return advanceTime(2001).then(function () {
          expect(spy).toHaveBeenCalledWith({
            paymentMethodNonce: "fake-venmo-account-nonce",
            username: "username",
            id: "id",
          });

          expect(instance.completedHandler).not.toBeDefined();
        });
      });
    });
  });

  describe("displayError", function () {
    it("noops when hidden", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = true;

        instance.displayError("message");

        expect(busInstance.emit).not.toHaveBeenCalledWith(
          "VENMO_DESKTOP_DISPLAY_ERROR",
          { message: "message" }
        );

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("");
      });
    });

    it("emits VENMO_DESKTOP_DISPLAY_ERROR", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = false;

        instance.displayError("message");

        expect(busInstance.emit).toHaveBeenCalledWith(
          "VENMO_DESKTOP_DISPLAY_ERROR",
          { message: "message" }
        );
      });
    });

    it("sets alert box message", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.displayError("error message");

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("error message");
      });
    });
  });

  describe("displayQRCode", function () {
    it("noops when hidden", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = true;

        instance.displayQRCode("id", "merchant-id");

        expect(busInstance.emit).not.toHaveBeenCalledWith(
          "VENMO_DESKTOP_DISPLAY_QR_CODE",
          { id: "id", merchantId: "merchant-id" }
        );

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("");
      });
    });

    it("emits VENMO_DESKTOP_DISPLAY_QR_CODE", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = false;

        instance.displayQRCode("id", "merchant-id");

        expect(busInstance.emit).toHaveBeenCalledWith(
          "VENMO_DESKTOP_DISPLAY_QR_CODE",
          { id: "id", merchantId: "merchant-id" }
        );
      });
    });

    it("sets alert box message", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.displayQRCode("id", "merchant-id");

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe(
          "To scan the QR code, open your Venmo app"
        );
      });
    });

    it("sends display-qr-code.status.presented event", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;
        instance.venmoContextId = "fake-context-id";

        instance.displayQRCode("id", "merchant-id");

        expect(venmoOptions.sendEvent).toHaveBeenCalledTimes(1);
        expect(venmoOptions.sendEvent).toHaveBeenCalledWith(
          "venmo.desktop-qr.display-qr-code.status.presented",
          {
            context_id: "fake-context-id",
            payment_method_usage: "SINGLE_USE",
          }
        );
      });
    });
  });

  describe("authorizing", function () {
    it("noops when hidden", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = true;

        instance.authorizing();

        expect(busInstance.emit).not.toHaveBeenCalledWith(
          "VENMO_DESKTOP_AUTHORIZING"
        );

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("");
      });
    });

    it("emits VENMO_DESKTOP_AUTHORIZING", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = false;

        instance.authorizing();

        expect(busInstance.emit).toHaveBeenCalledWith(
          "VENMO_DESKTOP_AUTHORIZING"
        );
      });
    });

    it("sets alert box message", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.authorizing();

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("Authorize on your Venmo app");
      });
    });
  });

  describe("authorize", function () {
    it("noops when hidden", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = true;

        instance.authorize();

        expect(busInstance.emit).not.toHaveBeenCalledWith(
          "VENMO_DESKTOP_AUTHORIZE"
        );

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("");
      });
    });

    it("emits VENMO_DESKTOP_AUTHORIZE", function () {
      return createInitializedInstance().then(function (instance) {
        var busInstance = Framebus.mock.results[0].value;

        instance.isHidden = false;

        instance.authorize();

        expect(busInstance.emit).toHaveBeenCalledWith(
          "VENMO_DESKTOP_AUTHORIZE"
        );
      });
    });

    it("sets alert box message", function () {
      return createInitializedInstance().then(function (instance) {
        instance.isHidden = false;

        instance.authorize();

        var alertBox = document.querySelector("[data-venmo-desktop-id]");

        expect(alertBox.textContent).toBe("Venmo account authorized");
      });
    });
  });

  describe("teardown", function () {
    it("tears down bus", function () {
      var instance = new VenmoDesktop(venmoOptions);
      var busInstance = Framebus.mock.results[0].value;

      instance.teardown();

      expect(busInstance.teardown).toHaveBeenCalledTimes(1);
    });

    it("removes iframe", function () {
      return createInitializedInstance().then(function (instance) {
        expect(document.querySelector("iframe")).toBeTruthy();

        instance.teardown();

        expect(document.querySelector("iframe")).toBeFalsy();
      });
    });

    it("removes alert box", function () {
      return createInitializedInstance().then(function (instance) {
        expect(document.querySelector("[data-venmo-desktop-id]")).toBeTruthy();

        instance.teardown();

        expect(document.querySelector("[data-venmo-desktop-id]")).toBeFalsy();
      });
    });
  });
});
