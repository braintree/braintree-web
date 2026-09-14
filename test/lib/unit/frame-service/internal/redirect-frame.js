vi.mock("../../../../../src/lib/querystring");
vi.mock("../../../../../src/lib/frame-service/internal");

import redirectFrame from "../../../../../src/lib/frame-service/internal/redirect-frame";
import querystring from "../../../../../src/lib/querystring";
import frameService from "../../../../../src/lib/frame-service/internal";

describe("redirect-frame", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("start", () => {
    beforeEach(() => {
      testContext.params = {};
      vi.spyOn(querystring, "parse").mockReturnValue(testContext.params);
    });

    it("reports to frame service the params from the querystring", () => {
      redirectFrame.start();
      expect(frameService.report).toHaveBeenCalledWith(
        null,
        testContext.params,
        expect.any(Function)
      );
    });
  });
});
