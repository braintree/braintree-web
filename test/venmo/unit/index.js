vi.mock("../../../src/lib/analytics");
vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-deferred-client");
vi.mock("../../../src/venmo/shared/supports-venmo");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/venmo/shared/browser-detection");

import analytics from "../../../src/lib/analytics";
import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import _e10 from "../../../src/venmo";

const { create, isBrowserSupported } = _e10;

import { fake } from "../../helpers";
import BraintreeError from "../../../src/lib/braintree-error";
import supportsVenmo from "../../../src/venmo/shared/supports-venmo";
import Venmo from "../../../src/venmo/venmo";
import browserDetection from "../../../src/venmo/shared/browser-detection";

describe("venmo static methods", () => {
  describe("venmo.create", () => {
    let testContext;

    beforeEach(() => {
      testContext = {};
      testContext.configuration = fake.configuration();
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });
      testContext.client.request = vi.fn().mockResolvedValue({
        data: {
          createVenmoPaymentContext: {
            venmoPaymentContext: {
              id: "fake-context-id",
              createdAt: "2026-01-01T00:00:00Z",
              expiresAt: "2026-01-01T01:00:00Z",
            },
          },
        },
      });
      vi.spyOn(createDeferredClient, "create").mockResolvedValue(
        testContext.client
      );
    });

    it("verifies with basicComponentVerification", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
      }).then(() => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(
          basicComponentVerification.verify.mock.calls[0][0]
        ).toMatchObject({
          name: "Venmo",
          client: testContext.client,
        });
      }));

    it("can create with an authorization instead of a client", () =>
      create({
        authorization: fake.clientToken,
        debug: true,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
      }).then((instance) => {
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).toBeUndefined();
        expect(createDeferredClient.create.mock.calls[0][0]).toMatchObject({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "Venmo",
        });

        expect(instance).toBeInstanceOf(Venmo);
      }));

    it("resolves with a Venmo instance", () => {
      return expect(
        create({
          client: testContext.client,
          paymentMethodUsage: "single_use",
          totalAmount: "10.00",
        })
      ).resolves.toBeInstanceOf(Venmo);
    });

    it("errors out if Venmo is not enabled for the merchant when using client", () => {
      delete testContext.configuration.gatewayConfiguration.venmo;

      return expect(
        create({
          client: testContext.client,
          paymentMethodUsage: "single_use",
          totalAmount: "10.00",
        })
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "VENMO_NOT_ENABLED",
        message: "Venmo is not enabled for this merchant.",
      });
    });

    it("errors out if options.paymentMethodUsage is not provided", () =>
      create({
        client: testContext.client,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_PAYMENT_METHOD_USAGE_REQUIRED");
        expect(err.message).toBe("Payment method usage is required.");
      }));

    it("errors out if options.paymentMethodUsage is not a valid value", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "invalid_value",
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_INVALID_PAYMENT_METHOD_USAGE");
        expect(err.message).toBe("Payment method usage is invalid.");
      }));

    it("errors out if options.totalAmount is missing when paymentMethodUsage is single_use", () =>
      expect(
        create({
          client: testContext.client,
          paymentMethodUsage: "single_use",
        })
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "VENMO_TOTAL_AMOUNT_REQUIRED",
        message:
          "Total amount required when payment method usage is single use.",
      }));

    it("errors out if options.totalAmount is not a string when paymentMethodUsage is single_use", () =>
      expect(
        create({
          client: testContext.client,
          paymentMethodUsage: "single_use",
          totalAmount: 10,
        })
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "VENMO_TOTAL_AMOUNT_REQUIRED",
        message:
          "Total amount required when payment method usage is single use.",
      }));

    it("errors out if options.totalAmount is an empty string when paymentMethodUsage is single_use", () =>
      expect(
        create({
          client: testContext.client,
          paymentMethodUsage: "single_use",
          totalAmount: "",
        })
      ).rejects.toMatchObject({
        type: "MERCHANT",
        code: "VENMO_TOTAL_AMOUNT_REQUIRED",
        message:
          "Total amount required when payment method usage is single use.",
      }));

    it("accepts single_use as paymentMethodUsage", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
      }).then((instance) => {
        expect(instance).toBeInstanceOf(Venmo);
      }));

    it("accepts multi_use as paymentMethodUsage", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "multi_use",
      }).then((instance) => {
        expect(instance).toBeInstanceOf(Venmo);
      }));

    it("errors out if options.profileId is present but not a string", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
        profileId: 1234,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_INVALID_PROFILE_ID");
        expect(err.message).toBe("Venmo profile ID is invalid.");
      }));

    it("errors out if options.deepLinkReturnUrl is present but not a string", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
        deepLinkReturnUrl: 1234,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_INVALID_DEEP_LINK_RETURN_URL");
        expect(err.message).toBe("Venmo deep link return URL is invalid.");
      }));

    it("errors out if options.riskCorrelationId is present but not a string", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
        riskCorrelationId: 1234,
      }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("VENMO_INVALID_RISK_CORRELATION_ID");
        expect(err.message).toBe("Venmo risk correlation ID is invalid.");
      }));

    it("accepts a valid riskCorrelationId string", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
        riskCorrelationId: "my-custom-risk-id",
      }).then((instance) => {
        expect(instance).toBeInstanceOf(Venmo);
        expect(instance._riskCorrelationId).toBe("my-custom-risk-id");
      }));

    it("sends an analytics event when successful", () =>
      create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
      }).then(() => {
        expect(analytics.sendEvent).toBeCalledWith(
          expect.anything(),
          "venmo.initialized"
        );
      }));

    it("does not fast-fail create when isIncognito rejects", () => {
      browserDetection.isIncognito.mockRejectedValueOnce(
        new Error("incognito detection failed")
      );

      return create({
        client: testContext.client,
        paymentMethodUsage: "single_use",
        totalAmount: "10.00",
      }).then((instance) => {
        expect(instance).toBeInstanceOf(Venmo);
        expect(instance._isIncognito).toBe(false);
      });
    });
  });

  describe("venmo.isBrowserSupported", () => {
    beforeEach(() => {
      vi.spyOn(supportsVenmo, "isBrowserSupported");
    });

    it("calls isBrowserSupported library", () => {
      isBrowserSupported();

      expect(supportsVenmo.isBrowserSupported).toBeCalledTimes(1);
    });

    it("can call isBrowserSupported with allowNewTab", () => {
      isBrowserSupported({ allowNewBrowserTab: true });

      expect(supportsVenmo.isBrowserSupported).toBeCalledWith({
        allowNewBrowserTab: true,
      });
    });

    it("can call isBrowserSupported with allowWebviews", () => {
      isBrowserSupported({ allowWebviews: true });

      expect(supportsVenmo.isBrowserSupported).toBeCalledWith({
        allowWebviews: true,
      });
    });
  });
});
