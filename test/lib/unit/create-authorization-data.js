"use strict";

const createAuthorizationData = require("../../../src/lib/create-authorization-data");

describe("createAuthorizationData", () => {
  describe("client token", () => {
    let baseToken;

    beforeEach(() => {
      baseToken = {
        authorizationFingerprint: "fake-fingerprint",
        configUrl: "https://example.com/config",
        environment: "sandbox",
        graphQL: { url: "https://example.com/graphql", date: "2018-05-08" },
      };
    });

    const encode = (obj) => btoa(JSON.stringify(obj));

    it("parses paymentMethodIdJwt from the client token onto the data object", () => {
      baseToken.paymentMethodIdJwt = "fake-pmt-jwt";

      const result = createAuthorizationData(encode(baseToken));

      expect(result.paymentMethodIdJwt).toBe("fake-pmt-jwt");
    });

    it("does not put paymentMethodIdJwt in attrs", () => {
      baseToken.paymentMethodIdJwt = "fake-pmt-jwt";

      const result = createAuthorizationData(encode(baseToken));

      expect(result.attrs.paymentMethodIdJwt).toBeUndefined();
    });

    it("sets paymentMethodIdJwt to undefined when not present in client token", () => {
      const result = createAuthorizationData(encode(baseToken));

      expect(result.paymentMethodIdJwt).toBeUndefined();
    });

    it("still parses authorizationFingerprint when paymentMethodIdJwt is present", () => {
      baseToken.paymentMethodIdJwt = "fake-pmt-jwt";

      const result = createAuthorizationData(encode(baseToken));

      expect(result.attrs.authorizationFingerprint).toBe("fake-fingerprint");
    });
  });
});
