"use strict";

jest.mock(
  "../../../../../../../src/lib/frame-service/external/strategies/popup/position"
);

const composePopupOptions = require("../../../../../../../src/lib/frame-service/external/strategies/popup/compose-options");
const position = require("../../../../../../../src/lib/frame-service/external/strategies/popup/position");

describe("composeOptions", () => {
  it("returns a string of window params with configured height and width", () => {
    let result;

    jest.spyOn(position, "top").mockReturnValue("2");
    jest.spyOn(position, "left").mockReturnValue("3");

    result = composePopupOptions({
      height: 123,
      width: 456,
    });

    expect(result).toBe(
      "resizable,scrollbars,height=123,width=456,top=2,left=3"
    );
  });

  it("returns a string of window params with configured top and left", () => {
    const result = composePopupOptions({
      height: 123,
      width: 456,
      top: 10,
      left: 20,
    });

    expect(result).toBe(
      "resizable,scrollbars,height=123,width=456,top=10,left=20"
    );
  });

  it("allows passing in top and left of 0", () => {
    const result = composePopupOptions({
      height: 123,
      width: 456,
      top: 0,
      left: 0,
    });

    expect(result).toBe(
      "resizable,scrollbars,height=123,width=456,top=0,left=0"
    );
  });
});
