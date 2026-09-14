vi.mock("../../../../src/lib/frame-service/internal");

import redirectFrame from "../../../../src/local-payment/internal/redirect-frame";
import querystring from "../../../../src/lib/querystring";
import frameService from "../../../../src/lib/frame-service/internal";
import { yields, yieldsAsync } from "../../../helpers";

describe("redirect-frame", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("start", () => {
    beforeEach(() => {
      testContext.body = document.body.innerHTML;
      testContext.params = {
        token: "token",
        paymentId: "payment-id",
        PayerID: "payer-id",
        channel: "123",
      };
      vi.spyOn(frameService, "report").mockImplementation(yields());
      vi.spyOn(querystring, "parse").mockReturnValue(testContext.params);
    });

    afterEach(() => {
      document.body.innerHTML = testContext.body;
    });

    it("reports to frame service the params from the querystring", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(yields());

        redirectFrame.start(() => {
          expect(frameService.report).toHaveBeenCalledWith(
            null,
            testContext.params,
            expect.any(Function)
          );

          resolve();
        });
      }));

    it("can put a redirect link onto the page if parent frame cannot be found and fallback is configured", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(
          yieldsAsync(new Error("no frame"))
        );
        testContext.params.r = window.encodeURIComponent(
          "https://example.com/fallback-url"
        );
        testContext.params.t = "Return to Site";

        redirectFrame.start(() => {
          const link = document.querySelector("#container a");

          expect(link.href).toBe(
            "https://example.com/fallback-url?btLpToken=token&btLpPaymentId=payment-id&btLpPayerId=payer-id"
          );
          expect(link.innerText).toBe("Return to Site");

          resolve();
        });
      }));

    it("can put a redirect link with error code onto the page if parent frame cannot be found and fallback is configured", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(
          yieldsAsync(new Error("no frame"))
        );
        testContext.params.r = window.encodeURIComponent(
          "https://example.com/fallback-url"
        );
        testContext.params.t = "Return to Site";
        testContext.params.errorcode = "payment_error";

        redirectFrame.start(() => {
          const link = document.querySelector("#container a");

          expect(link.href).toBe(
            "https://example.com/fallback-url?btLpToken=token&errorcode=payment_error&wasCanceled=false"
          );
          expect(link.innerText).toBe("Return to Site");

          resolve();
        });
      }));

    it("adds wasCanceled=true to link when params.c is present", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(
          yieldsAsync(new Error("no frame"))
        );
        testContext.params.r = window.encodeURIComponent(
          "https://example.com/fallback-url"
        );
        testContext.params.t = "Return to Site";
        testContext.params.c = "1";
        testContext.params.errorcode = "payment_error";

        redirectFrame.start(() => {
          const link = document.querySelector("#container a");

          expect(link.href).toBe(
            "https://example.com/fallback-url?btLpToken=token&errorcode=payment_error&wasCanceled=true"
          );
          expect(link.innerText).toBe("Return to Site");

          resolve();
        });
      }));

    it("does not put a redirect link if redirect param is missing", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(
          yieldsAsync(new Error("no frame"))
        );
        testContext.params.t = "Return to Site";

        redirectFrame.start(() => {
          const link = document.querySelector("#container a");

          expect(link).toBeNull();

          resolve();
        });
      }));

    it("does not put a redirect link if text param is missing", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(
          yieldsAsync(new Error("no frame"))
        );
        testContext.params.r = window.encodeURIComponent(
          "https://example.com/fallback-url"
        );

        redirectFrame.start(() => {
          const link = document.querySelector("#container a");

          expect(link).toBeNull();

          resolve();
        });
      }));

    it("sanitizes fallback url", () =>
      new Promise((resolve) => {
        frameService.report.mockImplementation(
          yieldsAsync(new Error("no frame"))
        );
        testContext.params.r = window.encodeURIComponent(
          'javascript:alert("hey")'
        );
        testContext.params.t = "Return to Site";

        redirectFrame.start(() => {
          const link = document.querySelector("#container a");

          expect(link.href).toBe(
            "about:blank?btLpToken=token&btLpPaymentId=payment-id&btLpPayerId=payer-id"
          );
          expect(link.innerText).toBe("Return to Site");

          resolve();
        });
      }));
  });
});
