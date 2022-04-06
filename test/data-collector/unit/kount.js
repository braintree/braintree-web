"use strict";

const kount = require("../../../src/data-collector/kount");
const { Kount } = kount;
const sjcl = require("../../../src/data-collector/vendor/sjcl");
const { noop, wait } = require("../../helpers");

describe("kount", () => {
  let getIframe;

  describe("setup", () => {
    beforeEach(() => {
      getIframe = (kountInstance) => {
        return document.getElementById(
          `braintreeDataFrame-${kountInstance.deviceData.device_session_id}`
        );
      };

      jest.spyOn(Kount, "getCachedDeviceData").mockReturnValue(null);
    });

    afterEach(() => {
      document.documentElement.innerHTML = "";
    });

    it("appends an environment-specific iframe to the body", () => {
      let iframe, kountInstance;

      kountInstance = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });
      iframe = getIframe(kountInstance);

      return wait(1000).then(() => {
        expect(iframe.src).toMatch(new RegExp(`^${kount.environmentUrls.qa}`));
      });
    });

    it("should start collecting entropy when set up", () => {
      jest.spyOn(sjcl.random, "startCollectors");

      kount.setup({ environment: "qa", merchantId: "custom_Kount_mid" });

      expect(sjcl.random.startCollectors).toHaveBeenCalled();
    });

    it("returns device_data from setup", () => {
      const actual = kount.setup({ environment: "qa", merchantId: "600000" });

      expect(actual.deviceData.device_session_id).toBeDefined();
      expect(actual.deviceData.fraud_merchant_id).toBeDefined();
    });

    it("generates a device_data field and populates it with JSON with a custom Kount merchant id", () => {
      const actual = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });

      expect(actual.deviceData.device_session_id.length).toBe(32);
      expect(actual.deviceData.fraud_merchant_id).toBe("custom_Kount_mid");
    });

    it("can be called multiple times", () => {
      let iframes;

      kount.setup({ environment: "qa", merchantId: "custom_Kount_mid" });
      kount.setup({ environment: "qa", merchantId: "custom_Kount_mid" });

      iframes = document.getElementsByTagName("iframe");

      expect(iframes.length).toBe(2);
    });

    it("returns the same device_data when called multiple times with the same merchant ids", () => {
      let instance1, instance2;

      Kount.setCachedDeviceData("custom_Kount_mid", null);
      Kount.getCachedDeviceData.mockRestore();

      instance1 = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });
      instance2 = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });

      expect(instance1.deviceData).not.toBeNull();
      expect(instance1.deviceData).toBe(instance2.deviceData);
    });

    it("returns different device_data when called multiple times with different merchant ids", () => {
      let instance1, instance2;

      Kount.setCachedDeviceData("custom_Kount_mid", null);
      Kount.setCachedDeviceData("a_different_custom_Kount_mid", null);
      Kount.getCachedDeviceData.mockRestore();

      instance1 = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });
      instance2 = kount.setup({
        environment: "qa",
        merchantId: "a_different_custom_Kount_mid",
      });

      expect(instance1.deviceData).not.toBeNull();
      expect(instance2.deviceData).not.toBeNull();
      expect(instance1.deviceData).not.toBe(instance2.deviceData);
    });

    it("creates an iframe, containing an img, with the device session id & merchant ids as params", () => {
      let actual, dsid, iframe;

      actual = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });
      dsid = actual.deviceData.device_session_id;
      iframe = getIframe(actual);

      return wait(1000).then(() => {
        expect(iframe.src).toMatch(dsid);
        expect(iframe.src).toMatch(kount.environmentUrls.qa);
        expect(iframe.innerHTML).toMatch(dsid);
        expect(iframe.innerHTML).toMatch(kount.environmentUrls.qa);
      });
    });

    it("creates an iframe with a specific id", () => {
      let iframe, kountInstance;

      kountInstance = kount.setup({ environment: "qa", merchantId: "myid" });
      iframe = getIframe(kountInstance);

      return wait(1000).then(() => {
        expect(iframe.src).toMatch("myid");
        expect(iframe.innerHTML).toMatch("myid");
      });
    });

    it("safely urlencodes device session id & merchant ids as params", () => {
      let iframe, kountInstance;

      jest
        .spyOn(Kount.prototype, "_generateDeviceSessionId")
        .mockReturnValue('<script>alert("HACKED");</script>');

      kountInstance = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });
      iframe = getIframe(kountInstance);

      expect(iframe.src).not.toMatch("<script>");
    });

    it("throws an exception when the given environment is not valid", () => {
      expect(() => {
        kount.setup({ environment: "badEnv" });
      }).toThrowError(
        "badEnv is not a valid environment for kount.environment"
      );
    });

    it("includes the environment's url in the iframe", () => {
      let iframe, kountInstance;

      kountInstance = kount.setup({
        environment: "qa",
        merchantId: "custom_Kount_mid",
      });
      iframe = getIframe(kountInstance);

      return wait(1000).then(() => {
        expect(iframe.src).toMatch(new RegExp(`^${kount.environmentUrls.qa}`));
      });
    });
  });

  describe("_getDeviceData", () => {
    it("returns a serialized version of device data", () => {
      const actual = Kount.prototype._getDeviceData.call({
        _deviceSessionId: "my_device_session_id",
        _currentEnvironment: { id: "id" },
      });

      expect(actual).toEqual({
        device_session_id: "my_device_session_id", // eslint-disable-line camelcase
        fraud_merchant_id: "id", // eslint-disable-line camelcase
      });
    });
  });

  describe("teardown", () => {
    beforeEach(() => {
      jest.spyOn(sjcl.random, "stopCollectors").mockReturnValue(null);
    });

    it("stops sjcl collectors, and removes iframe", () => {
      jest.spyOn(Kount.prototype, "_removeIframe").mockImplementation(noop);
      Kount.prototype.teardown();

      expect(sjcl.random.stopCollectors).toHaveBeenCalled();
      expect(Kount.prototype._removeIframe).toHaveBeenCalled();
    });

    it("noops teardown if device data was cached", () => {
      expect(() => {
        Kount.prototype.teardown.call({ _isCached: true });
      }).not.toThrowError();

      expect(sjcl.random.stopCollectors).not.toHaveBeenCalled();
    });

    describe("_removeIframe", () => {
      it("removes iframe from DOM", () => {
        const iframe = document.createElement("iframe");

        document.body.appendChild(iframe);

        expect(document.body.querySelector("iframe")).toBe(iframe);

        Kount.prototype._removeIframe.call({ _iframe: iframe });

        expect(document.body.querySelector("iframe")).toBeNull();
      });
    });
  });

  describe("_generateDeviceSessionId", () => {
    it("does not cache the value", () => {
      let dsid;

      dsid = Kount.prototype._generateDeviceSessionId();
      expect(Kount.prototype._generateDeviceSessionId()).not.toBe(dsid);
    });
  });

  describe("cached device data", () => {
    it("can set and return the value of the cached device data", () => {
      const dataForMerchant1 = { foo: "bar" };
      const dataForMerchant2 = { baz: "buz" };

      Kount.setCachedDeviceData("merchant1", dataForMerchant1);
      Kount.setCachedDeviceData("merchant2", dataForMerchant2);

      expect(Kount.getCachedDeviceData("merchant1")).toBe(dataForMerchant1);
      expect(Kount.getCachedDeviceData("merchant2")).toBe(dataForMerchant2);
    });
  });
});
