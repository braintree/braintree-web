"use strict";

jest.mock("../../../../src/lib/frame-service/internal");

const redirectFrame = require("../../../../src/local-payment/internal/redirect-frame");
const querystring = require("../../../../src/lib/querystring");
const frameService = require("../../../../src/lib/frame-service/internal");
const { yields, yieldsAsync } = require("../../../helpers");

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
      jest.spyOn(frameService, "report").mockImplementation(yields());
      jest.spyOn(querystring, "parse").mockReturnValue(testContext.params);
    });

    afterEach(() => {
      document.body.innerHTML = testContext.body;
    });

    it("reports to frame service the params from the querystring", (done) => {
      frameService.report.mockImplementation(yields());

      redirectFrame.start(() => {
        expect(frameService.report).toHaveBeenCalledWith(
          null,
          testContext.params,
          expect.any(Function)
        );

        done();
      });
    });

    it("can put a redirect link onto the page if parent frame cannot be found and fallback is configured", (done) => {
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

        done();
      });
    });

    it("can put a redirect link onto the page if parent frame cannot be found and fallback is configured", (done) => {
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

        done();
      });
    });

    it("adds wasCanceled=true to link when params.c is present", (done) => {
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

        done();
      });
    });

    it("does not put a redirect link if redirect param is missing", (done) => {
      frameService.report.mockImplementation(
        yieldsAsync(new Error("no frame"))
      );
      testContext.params.t = "Return to Site";

      redirectFrame.start(() => {
        const link = document.querySelector("#container a");

        expect(link).toBeNull();

        done();
      });
    });

    it("does not put a redirect link if text param is missing", (done) => {
      frameService.report.mockImplementation(
        yieldsAsync(new Error("no frame"))
      );
      testContext.params.r = window.encodeURIComponent(
        "https://example.com/fallback-url"
      );

      redirectFrame.start(() => {
        const link = document.querySelector("#container a");

        expect(link).toBeNull();

        done();
      });
    });

    it("sanitizes fallback url", (done) => {
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

        done();
      });
    });
  });
});
