import constants from "../../../src/lib/constants";
import composeUrl from "../../../src/lib/compose-url";

describe("composeUrl", () => {
  describe("hosted-fields-frame", () => {
    it("returns a fully qualified minified url by default", () => {
      const actual = composeUrl(
        "hosted-fields-frame",
        "https://localhost",
        "fake-channel"
      );

      expect(actual).toBe(
        `https://localhost/web/${constants.VERSION}/html/hosted-fields-frame.min.html#fake-channel`
      );
    });

    it("returns a fully qualified minified url when isDebug is false", () => {
      const actual = composeUrl(
        "hosted-fields-frame",
        "https://localhost",
        "fake-channel",
        false
      );

      expect(actual).toBe(
        `https://localhost/web/${constants.VERSION}/html/hosted-fields-frame.min.html#fake-channel`
      );
    });

    it("returns a fully qualified unminified url when isDebug is true", () => {
      const actual = composeUrl(
        "hosted-fields-frame",
        "https://localhost",
        "fake-channel",
        true
      );

      expect(actual).toBe(
        `https://localhost/web/${constants.VERSION}/html/hosted-fields-frame.html#fake-channel`
      );
    });
  });

  describe("payment-request-frame", () => {
    it("returns a fully qualified minified url by default", () => {
      const actual = composeUrl(
        "payment-request-frame",
        "https://localhost",
        "fake-channel"
      );

      expect(actual).toBe(
        `https://localhost/web/${constants.VERSION}/html/payment-request-frame.min.html#fake-channel`
      );
    });

    it("returns a fully qualified unminified url when isDebug is true", () => {
      const actual = composeUrl(
        "payment-request-frame",
        "https://localhost",
        "fake-channel",
        true
      );

      expect(actual).toBe(
        `https://localhost/web/${constants.VERSION}/html/payment-request-frame.html#fake-channel`
      );
    });
  });

  it("always appends the componentId as a fragment", () => {
    const minUrl = composeUrl(
      "hosted-fields-frame",
      "https://localhost",
      "id-123",
      false
    );
    const debugUrl = composeUrl(
      "hosted-fields-frame",
      "https://localhost",
      "id-123",
      true
    );

    expect(minUrl).toMatch(/#id-123$/);
    expect(debugUrl).toMatch(/#id-123$/);
  });
});
