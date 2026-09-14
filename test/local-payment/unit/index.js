vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-deferred-client");

import analytics from "../../../src/lib/analytics";
import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import _e4 from "../../../src/local-payment";

const { create } = _e4;

import { fake } from "../../helpers";
import LocalPayment from "../../../src/local-payment/external/local-payment";
import BraintreeError from "../../../src/lib/braintree-error";

describe("local payment", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  afterEach(() => {
    delete window.popupBridge;
  });

  describe("create", () => {
    beforeEach(() => {
      testContext.configuration = fake.configuration();
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });
      vi.spyOn(createDeferredClient, "create").mockResolvedValue(
        testContext.client
      );
      vi.spyOn(LocalPayment.prototype, "_initialize").mockResolvedValue(null);
    });

    it("returns a promise", () => {
      return expect(
        create({ client: testContext.client })
      ).resolves.toBeDefined();
    });

    it("verifies with basicComponentVerification", () =>
      create({
        client: testContext.client,
      }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Local Payment",
            client: testContext.client,
          })
        );
      }));

    it("can create with an authorization instead of a client", () =>
      create({
        authorization: fake.clientToken,
        debug: true,
      }).then(() => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).toBeUndefined();
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "Local Payment",
        });

        expect(LocalPayment.prototype._initialize).toHaveBeenCalledTimes(1);
      }));

    it("rejects with an error if LocalPayment is not enabled for the merchant", () => {
      delete testContext.configuration.gatewayConfiguration.paypal;

      return create({ client: testContext.client }).catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("LOCAL_PAYMENT_NOT_ENABLED");
        expect(err.message).toBe(
          "LocalPayment is not enabled for this merchant."
        );
      });
    });

    it("sends an analytics event", () =>
      create({ client: testContext.client }).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(
          testContext.client,
          "local-payment.initialized"
        );
      }));

    describe("Full page redirect", () => {
      const originalHref = window.location.href;

      beforeEach(() => {});

      afterEach(() => {
        Object.defineProperty(window, "location", {
          configurable: true,
          get() {
            return {
              href: originalHref,
            };
          },
        });
      });

      it("tokenizes when when token is present", async () => {
        const testToken = "testtoken";
        const testUrl = `www.example.com/?token=${testToken}`;

        Object.defineProperty(window, "location", {
          configurable: true,
          get() {
            return {
              href: testUrl,
            };
          },
        });

        LocalPayment.prototype.tokenize = vi.fn();
        LocalPayment.prototype.tokenize.mockImplementation(() =>
          Promise.resolve()
        );

        await create({
          client: testContext.client,
          redirectUrl: "www.merchant-site.com",
        });
        expect(LocalPayment.prototype.tokenize).toHaveBeenCalledWith({
          token: testToken,
        });
      });

      it("tokenizes when canceled", async () => {
        const testUrl = `www.example.com/?wasCanceled=true`;

        Object.defineProperty(window, "location", {
          configurable: true,
          get() {
            return {
              href: testUrl,
            };
          },
        });

        LocalPayment.prototype.tokenize = vi.fn();
        LocalPayment.prototype.tokenize.mockImplementation(() =>
          Promise.resolve()
        );

        await create({
          client: testContext.client,
          redirectUrl: "www.merchant-site.com",
        });
        expect(LocalPayment.prototype.tokenize).toHaveBeenCalledWith({
          wasCanceled: "true",
        });
      });
    });
  });
});
