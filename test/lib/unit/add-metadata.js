"use strict";

const Client = require("../../../src/client/client");
var constants = require("../../../src/lib/constants");
const metadata = require("../../../src/lib/add-metadata");
const {
  fake: { configuration: fakeConfiguration },
} = require("../../helpers");

function clientTokenWithFingerprint(authorizationFingerprint) {
  return btoa(JSON.stringify({ authorizationFingerprint }));
}

describe("metadata", () => {
  describe("build event metadata", () => {
    const savedWindowLocation = window.location;
    const savedWindowNavigator = window.navigator;
    const testHost = "http://www.example.com/";
    const testMerchId = "merch-id-987";
    const fauxTokenizeKey = "fake_tokenize_key_567";

    let client, config, testContext;

    beforeEach(() => {
      testContext = {
        configuration: fakeConfiguration(),
      };
      testContext.configuration.gatewayConfiguration.merchantId = testMerchId;
      testContext.configuration.authorization = fauxTokenizeKey;

      client = new Client(testContext.configuration);
      config = client.getConfiguration();

      delete window.location;

      window.location = {
        host: "http://www.example.com/",
      };
    });

    afterEach(() => {
      delete window.location;
      delete window.navigator;

      window.location = savedWindowLocation;
      window.navigator = savedWindowNavigator;
    });

    it("sets api_integration_type", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.app_id).toBe(window.location.host);
    });

    it("sets app_id", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.app_id).toBe(testHost);
    });

    it("sets c_sdk_ver", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.c_sdk_ver).toBe(constants.VERSION);
    });

    it("sets component", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.component).toBe("braintreeclientsdk");
    });

    it("sets merchant_sdk_env", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.merchant_sdk_env).toBe("sandbox");
    });

    it("sets merchant_id", () => {
      config.gatewayConfiguration.merchantId = testMerchId;
      const configData = metadata.addEventMetadata(client);

      expect(configData.merchant_id).toBe(testMerchId);
    });

    it("sets event_source", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.event_source).toBe("web");
    });

    it("sets platform", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.platform).toBe("web");
    });

    it("sets platform_version", () => {
      const testUserAgent = "computer-os-x.y.z-browser";

      delete window.navigator;
      window.navigator = {
        userAgent: testUserAgent,
      };
      const configData = metadata.addEventMetadata(client);

      expect(configData.platform_version).toBe(testUserAgent);
    });

    it("sets session_id", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.session_id).toBe(config.analyticsMetadata.sessionId);
    });

    it("sets tenant_name", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.tenant_name).toBe("braintree");
    });

    it("sets product_name", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.product_name).toBe("BT_DCC");
    });

    it("sets space_key", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData.space_key).toBe("SKDUYK");
    });

    it("sets tokenizationKey when present", () => {
      const configData = metadata.addEventMetadata(client);

      expect(configData["tokenization_key"]).toBe(fauxTokenizeKey);
      expect(configData["auth_fingerprint"]).toBeUndefined();
    });

    it("sets auth_fingerprint when present", () => {
      let configData;
      const fauxAuthFingerprint = "fingerprint1234567890";

      testContext.configuration.authorization =
        clientTokenWithFingerprint(fauxAuthFingerprint);

      client = new Client(testContext.configuration);
      config = client.getConfiguration();

      configData = metadata.addEventMetadata(client);
      expect(configData["auth_fingerprint"]).toBe(fauxAuthFingerprint);
    });
  });
});
