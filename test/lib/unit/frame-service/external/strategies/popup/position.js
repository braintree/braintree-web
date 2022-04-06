"use strict";

const popupPosition = require("../../../../../../../src/lib/frame-service/external/strategies/popup/position");

describe("popup position", () => {
  describe("center", () => {
    it("centers over a smaller window size", () => {
      const actual = popupPosition.center(300, 470, 0);

      expect(actual).toBe(-85);
    });

    it("centers over a larger window size", () => {
      const actual = popupPosition.center(940, 470, 0);

      expect(actual).toBe(235);
    });
  });
});
