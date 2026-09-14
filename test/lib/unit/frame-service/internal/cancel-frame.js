vi.mock("../../../../../src/lib/frame-service/internal");

import cancelFrame from "../../../../../src/lib/frame-service/internal/cancel-frame";
import frameService from "../../../../../src/lib/frame-service/internal";
import BraintreeError from "../../../../../src/lib/braintree-error";
import querystring from "../../../../../src/lib/querystring";

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
      vi.spyOn(querystring, "parse").mockReturnValue({
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
