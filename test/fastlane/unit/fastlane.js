vi.mock("../../../src/lib/assets");

import { fake } from "../../helpers";
import assetFns from "../../../src/lib/assets";
import _e15 from "../../../src/fastlane/";

const { create } = _e15;

import errors from "../../../src/fastlane/errors";
const VERSION = process.env.npm_package_version;

describe("fastlane", () => {
  let testContext, mockFastlaneCreate;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();
    testContext.client = fake.client({
      configuration: testContext.configuration,
    });
    assetFns.loadFastlane.mockResolvedValue({
      metadata: { localeUrl: "cdn.com/locales/" },
    });

    mockFastlaneCreate = vi.fn();
    window.braintree = {
      fastlane: {
        create: mockFastlaneCreate,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads minified assets in production", async () => {
    testContext.configuration.gatewayConfiguration.environment = "production";

    const inputDeviceData = {
      someStuff: true,
    };

    const expectedFastlaneInputs = {
      client: testContext.client,
      deviceData: inputDeviceData,
      minified: true,
      btSdkVersion: VERSION,
      platform: "BT",
    };

    await create({ client: testContext.client, deviceData: inputDeviceData });
    expect(assetFns.loadFastlane).toBeCalledWith(expectedFastlaneInputs);
  });

  it("loads unminified assets when not in production", async () => {
    testContext.configuration.gatewayConfiguration.environment =
      "some-other-env";

    const inputDeviceData = {
      someStuff: true,
    };

    const expectedFastlaneInputs = {
      client: testContext.client,
      deviceData: inputDeviceData,
      minified: false,
      btSdkVersion: VERSION,
      platform: "BT",
    };

    await create({ client: testContext.client, deviceData: inputDeviceData });
    expect(assetFns.loadFastlane).toBeCalledWith(expectedFastlaneInputs);
  });

  it("calls fastlane create", async () => {
    const inputDeviceData = {
      someStuff: true,
    };
    const expectedFastlaneArgs = {
      platformOptions: {
        client: testContext.client,
        deviceData: inputDeviceData,
        platform: "BT",
      },
      localeUrl: "cdn.com/locales/",
    };

    await create({ client: testContext.client, deviceData: inputDeviceData });

    expect(mockFastlaneCreate).toBeCalledWith(expectedFastlaneArgs);
  });

  it("calls fastlane create with all options passed in to create", async () => {
    const inputDeviceData = {
      someStuff: true,
    };
    const expectedFastlaneArgs = {
      platformOptions: {
        client: testContext.client,
        deviceData: inputDeviceData,
        platform: "BT",
      },
      styles: { someStyle: "style-1" },
      localeUrl: "cdn.com/locales/",
    };

    await create({
      client: testContext.client,
      deviceData: inputDeviceData,
      styles: { someStyle: "style-1" },
    });

    expect(mockFastlaneCreate).toBeCalledWith(expectedFastlaneArgs);
  });

  it("calls fastlane create with the allowed options passed in to loadFastlane", async () => {
    const inputDeviceData = {
      someStuff: true,
    };

    const expectedFastlaneLoadInputs = {
      client: testContext.client,
      deviceData: inputDeviceData,
      metaData: {
        bundleId: "2ab",
      },
      minified: false,
      btSdkVersion: VERSION,
      platform: "BT",
    };

    const expectedFastlaneCreateInputs = {
      platformOptions: {
        client: testContext.client,
        deviceData: inputDeviceData,
        platform: "BT",
      },
      metaData: {
        bundleId: "2ab",
      },
      localeUrl: "cdn.com/locales/",
    };

    await create({
      client: testContext.client,
      deviceData: inputDeviceData,
      minified: false,
      metaData: {
        bundleId: "2ab",
      },
    });

    expect(assetFns.loadFastlane).toBeCalledWith(expectedFastlaneLoadInputs);
    expect(mockFastlaneCreate).toBeCalledWith(expectedFastlaneCreateInputs);
  });

  it("fails if fastlane create fails", async () => {
    const mockErrorMessage = "omg it broke";
    const originalError = new Error(mockErrorMessage);

    assetFns.loadFastlane.mockRejectedValue(originalError);

    await expect(create({ client: testContext.client })).rejects.toMatchObject({
      type: errors.FASTLANE_SDK_LOAD_ERROR.type,
      code: errors.FASTLANE_SDK_LOAD_ERROR.code,
      message: errors.FASTLANE_SDK_LOAD_ERROR.message,
      details: { originalError: originalError },
    });
  });

  it("uses window.braintree._fastlane.create when available to avoid overwrite issue", async () => {
    const inputDeviceData = {
      correlationId: "test-correlation-id-123",
    };

    const mockFastlaneInstance = { id: "fastlane-instance-123" };

    const mockUnderscoreFastlaneCreate = vi.fn();
    mockUnderscoreFastlaneCreate.mockResolvedValue(mockFastlaneInstance);
    window.braintree._fastlane = {
      create: mockUnderscoreFastlaneCreate,
    };

    await create({ client: testContext.client, deviceData: inputDeviceData });

    expect(mockUnderscoreFastlaneCreate).toHaveBeenCalledTimes(1);
    expect(mockUnderscoreFastlaneCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        platformOptions: expect.objectContaining({
          platform: "BT",
          deviceData: inputDeviceData,
        }),
      })
    );

    expect(mockFastlaneCreate).not.toHaveBeenCalled();
  });
});
