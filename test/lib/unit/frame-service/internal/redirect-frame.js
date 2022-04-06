"use strict";

jest.mock("../../../../../src/lib/querystring");
jest.mock("../../../../../src/lib/frame-service/internal");

const redirectFrame = require("../../../../../src/lib/frame-service/internal/redirect-frame");
const querystring = require("../../../../../src/lib/querystring");
const frameService = require("../../../../../src/lib/frame-service/internal");

describe("redirect-frame", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe("start", () => {
    beforeEach(() => {
      testContext.params = {};
      jest.spyOn(querystring, "parse").mockReturnValue(testContext.params);
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
