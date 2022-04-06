"use strict";

const addMetadata = require("../../../src/lib/add-metadata");

function clientTokenWithFingerprint(authorizationFingerprint) {
  return btoa(JSON.stringify({ authorizationFingerprint }));
}

describe("_setAttrs", () => {
  it("sets tokenizationKey on the attributes", () => {
    const actual = addMetadata(
      {
        authorization: "development_testing_merchant_id",
        analyticsMetadata: {},
      },
      {}
    );

    expect(actual.tokenizationKey).toBe("development_testing_merchant_id");
  });

  it("sets authorizationFingerprint on the attributes", () => {
    const actual = addMetadata(
      {
        authorization: clientTokenWithFingerprint("auth fingerprint"),
        analyticsMetadata: {},
      },
      {}
    );

    expect(actual.authorizationFingerprint).toBe("auth fingerprint");
  });

  it("sets _meta attributes from analyticsMetadata", () => {
    const actual = addMetadata(
      {
        authorization: "development_testing_merchant_id",
        analyticsMetadata: {
          jibberish: "still there",
        },
      },
      {}
    );

    expect(actual._meta.jibberish).toBe("still there");
  });

  it("preserves existing _meta values", () => {
    const actual = addMetadata(
      {
        authorization: "development_testing_merchant_id",
        analyticsMetadata: {
          jibberish: "still there",
        },
      },
      {
        _meta: { moreJibberish: "should also be there" },
      }
    );

    expect(actual._meta.jibberish).toBe("still there");
    expect(actual._meta.moreJibberish).toBe("should also be there");
  });
});
