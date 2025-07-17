"use strict";

jest.mock("../../../../src/lib/querystring");

const loadingFrame = require("../../../../src/masterpass/internal/loading-frame");
const querystring = require("../../../../src/lib/querystring");

describe("loading-frame", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("start", () => {
    beforeEach(() => {
      testContext.fakeScript = document.createElement("script");
      testContext.params = {
        environment: "production",
        failureCallback: "fallback",
        cancelCallback: "cancel",
        successCallback: "success",
        callbackUrl: "https://example.com",
        foo: "bar",
      };
      jest.spyOn(querystring, "parse").mockReturnValue(testContext.params);
      jest
        .spyOn(document, "createElement")
        .mockReturnValue(testContext.fakeScript);
      jest.spyOn(document.body, "appendChild");

      window.MasterPass = {
        client: {
          checkout: jest.fn(),
        },
      };
    });

    afterEach(() => {
      delete window.MasterPass;
    });

    it("adds production script to page in production", () => {
      loadingFrame.start();

      expect(document.body.appendChild).toHaveBeenCalledTimes(1);
      expect(document.body.appendChild).toHaveBeenCalledWith(
        testContext.fakeScript
      );
      expect(testContext.fakeScript.src).toBe(
        "https://static.masterpass.com/dyn/js/switch/integration/MasterPass.client.js"
      );
    });

    it("adds sandbox script to page in sandbox", () => {
      testContext.params.environment = "sandbox";

      loadingFrame.start();

      expect(document.body.appendChild).toHaveBeenCalledTimes(1);
      expect(document.body.appendChild).toHaveBeenCalledWith(
        testContext.fakeScript
      );
      expect(testContext.fakeScript.src).toBe(
        "https://sandbox.static.masterpass.com/dyn/js/switch/integration/MasterPass.client.js"
      );
    });

    it("calls Masterpass.client.checkout with config from query params when script loads", () => {
      loadingFrame.start();

      expect(window.MasterPass.client.checkout).not.toHaveBeenCalled();

      testContext.fakeScript.onload();

      expect(window.MasterPass.client.checkout).toHaveBeenCalledTimes(1);
      expect(window.MasterPass.client.checkout.mock.calls[0][0]).toMatchObject({
        environment: "production",
        foo: "bar",
        callbackUrl: "https://example.com",
      });
    });

    it("overwrites failure, cancel and success callbacks with a noop function", () => {
      loadingFrame.start();

      expect(window.MasterPass.client.checkout).not.toHaveBeenCalled();

      // raw params for these in the test are strings
      expect(testContext.params.failureCallback).toBeInstanceOf(Function);
      expect(testContext.params.cancelCallback).toBeInstanceOf(Function);
      expect(testContext.params.successCallback).toBeInstanceOf(Function);
    });

    it("sanitizes callbackUrl", () => {
      testContext.params.callbackUrl =
        "Javascript:alert.call(null,document.domain)//";

      loadingFrame.start();

      expect(window.MasterPass.client.checkout).not.toHaveBeenCalled();

      testContext.fakeScript.onload();

      expect(window.MasterPass.client.checkout).toHaveBeenCalledTimes(1);
      expect(window.MasterPass.client.checkout.mock.calls[0][0]).toMatchObject({
        callbackUrl: "about:blank",
      });
    });
  });
});
