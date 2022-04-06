"use strict";

jest.mock("../../../../../src/lib/frame-service/internal");

const cancelFrame = require("../../../../../src/lib/frame-service/internal/cancel-frame");
const frameService = require("../../../../../src/lib/frame-service/internal");
const BraintreeError = require("../../../../../src/lib/braintree-error");
const querystring = require("../../../../../src/lib/querystring");

describe("cancel-frame", () => {
  describe("start", () => {
    it("reports an error to frameService", () => {
      const err = {
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed before tokenization could occur.",
      };

      cancelFrame.start();

      expect(frameService.report).toHaveBeenCalledWith(
        expect.objectContaining(err),
        {}
      );
    });

    it("includes query params", () => {
      jest.spyOn(querystring, "parse").mockReturnValue({
        foo: "bar",
      });
      cancelFrame.start();

      expect(frameService.report).toHaveBeenCalledWith(expect.anything(), {
        foo: "bar",
      });
    });

    it("invokes frameService's close method", () => {
      cancelFrame.start();

      expect(frameService.asyncClose).toHaveBeenCalled();
    });
  });
});
