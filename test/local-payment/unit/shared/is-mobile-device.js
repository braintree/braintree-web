"use strict";

const isMobileDevice = require("../../../../src/local-payment/shared/browser-detection");
const isAndroid = require("@braintree/browser-detection/is-android");
const isIos = require("@braintree/browser-detection/is-ios");

jest.mock("@braintree/browser-detection/is-android");
jest.mock("@braintree/browser-detection/is-ios");

describe("isMobileDevice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isMobileDevice", () => {
    it("returns true when device is Android", () => {
      isAndroid.mockReturnValue(true);
      isIos.mockReturnValue(false);

      expect(isMobileDevice.isMobileDevice()).toBe(true);
    });

    it("returns true when device is iOS", () => {
      isAndroid.mockReturnValue(false);
      isIos.mockReturnValue(true);

      expect(isMobileDevice.isMobileDevice()).toBe(true);
    });

    it("returns false when device is neither Android nor iOS", () => {
      isAndroid.mockReturnValue(false);
      isIos.mockReturnValue(false);

      expect(isMobileDevice.isMobileDevice()).toBe(false);
    });

    it("calls both detection functions", () => {
      isAndroid.mockReturnValue(false);
      isIos.mockReturnValue(false);

      isMobileDevice.isMobileDevice();

      expect(isAndroid).toHaveBeenCalledTimes(1);
      expect(isIos).toHaveBeenCalledTimes(1);
    });
  });
});
