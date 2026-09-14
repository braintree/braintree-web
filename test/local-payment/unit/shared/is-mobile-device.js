import isMobileDevice from "../../../../src/local-payment/shared/browser-detection";
import isAndroid from "@braintree/browser-detection/is-android";
import isIos from "@braintree/browser-detection/is-ios";

vi.mock("@braintree/browser-detection/is-android");
vi.mock("@braintree/browser-detection/is-ios");

describe("isMobileDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
