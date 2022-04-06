"use strict";

jest.mock("../../../../../src/lib/frame-service/external/frame-service");

const frameService = require("../../../../../src/lib/frame-service/external");
const FrameService = require("../../../../../src/lib/frame-service/external/frame-service");
const { noop } = require("../../../../helpers");

describe("FrameService create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    const gatewayConfiguration = {
      paypal: {
        assetsUrl: "https://paypal.assets.url",
        displayName: "my brand",
      },
    };

    testContext.state = {
      client: {
        authorization: "fake authorization-key",
        gatewayConfiguration,
        getConfiguration: () => ({ gatewayConfiguration }),
      },
      enableShippingAddress: true,
      amount: 10.0,
      currency: "USD",
      locale: "en_us",
      flow: "checkout",
      shippingAddressOverride: {
        street: "123 Townsend St",
      },
    };

    testContext.options = {
      state: testContext.state,
      name: "fake_name",
      dispatchFrameUrl: "fake-url",
      openFrameUrl: "fake-frame-html",
    };
  });

  describe("create", () => {
    it("initializes a FrameService instance", () => {
      frameService.create(testContext.options, noop);

      expect(FrameService.prototype.initialize).toHaveBeenCalled();
    });
  });
});
