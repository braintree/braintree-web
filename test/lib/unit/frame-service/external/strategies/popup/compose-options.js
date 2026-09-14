vi.mock(
  "../../../../../../../src/lib/frame-service/external/strategies/popup/position"
);

import composePopupOptions from "../../../../../../../src/lib/frame-service/external/strategies/popup/compose-options";
import position from "../../../../../../../src/lib/frame-service/external/strategies/popup/position";

describe("composeOptions", () => {
  it("returns a string of window params with configured height and width", () => {
    let result;

    vi.spyOn(position, "top").mockReturnValue("2");
    vi.spyOn(position, "left").mockReturnValue("3");

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
