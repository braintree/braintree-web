"use strict";

const constants = require("../../../../src/hosted-fields/shared/constants");
const composeUrl = require("../../../../src/hosted-fields/external/compose-url");

describe("compose url", () => {
  it("returns a fully qualified url", () => {
    const actual = composeUrl("https://localhost", "fake-channel");

    expect(actual).toBe(
      `https://localhost/web/${constants.VERSION}/html/hosted-fields-frame.min.html#fake-channel`
    );
  });

  it("returns a fully qualified url when explicitly not in debug mode", () => {
    const actual = composeUrl("https://localhost", "fake-channel", false);

    expect(actual).toBe(
      `https://localhost/web/${constants.VERSION}/html/hosted-fields-frame.min.html#fake-channel`
    );
  });

  it("returns a fully qualified unminified url when in debug mode", () => {
    const actual = composeUrl("https://localhost", "fake-channel", true);

    expect(actual).toBe(
      `https://localhost/web/${constants.VERSION}/html/hosted-fields-frame.html#fake-channel`
    );
  });
});
