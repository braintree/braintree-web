vi.mock("../../../../../src/lib/frame-service/external/frame-service");

import frameService from "../../../../../src/lib/frame-service/external";
import FrameService from "../../../../../src/lib/frame-service/external/frame-service";
import { noop } from "../../../../helpers";

describe("FrameService create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.options = {
      name: "fake_name",
      dispatchFrameUrl: "fake-url",
      openFrameUrl: "fake-frame-html",
    };
  });

  describe("create", () => {
    it("initializes a FrameService instance", () => {
      frameService.create(testContext.options, noop);

      expect(FrameService.prototype.initialize).toHaveBeenCalled();
    });
  });
});
