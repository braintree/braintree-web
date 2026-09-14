vi.mock("../../../src/lib/analytics");
vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/lib/create-deferred-client");
vi.mock("../../../src/lib/assets");

import analytics from "../../../src/lib/analytics";
import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import assets from "../../../src/lib/assets";
import _e8 from "../../../src/apple-pay";

const { create } = _e8;

import ApplePay from "../../../src/apple-pay/apple-pay";
import _imp0 from "../../helpers";

const {
  wait,
  fake: { client: fakeClient, clientToken, configuration },
} = _imp0;

describe("applePay.create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.configuration.gatewayConfiguration.applePayWeb = {};

    testContext.client = fakeClient({
      configuration: testContext.configuration,
    });

    vi.spyOn(createDeferredClient, "create").mockResolvedValue(
      testContext.client
    );
    vi.spyOn(basicComponentVerification, "verify").mockResolvedValue(null);
    assets.loadScript.mockResolvedValue(document.createElement("script"));
  });

  it("verifies with basicComponentVerification", () => {
    const client = testContext.client;

    return create({
      client,
    }).then(() => {
      expect(basicComponentVerification.verify).toBeCalledTimes(1);
      expect(basicComponentVerification.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Apple Pay",
          client,
        })
      );
    });
  });

  it("can create with an authorization instead of a client", () => {
    let clientIsReady = false;

    createDeferredClient.create.mockImplementation(() => {
      return wait(10).then(() => {
        clientIsReady = true;

        return testContext.client;
      });
    });

    vi.useFakeTimers();

    return create({
      authorization: clientToken,
      useDeferredClient: true,
      debug: true,
    })
      .then((applePayInstance) => {
        expect(clientIsReady).toBe(false);
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authorization: clientToken,
            debug: true,
            assetsUrl: "https://example.com/assets",
            name: "Apple Pay",
          })
        );

        expect(applePayInstance).toBeInstanceOf(ApplePay);

        vi.advanceTimersByTime(11);
      })
      .then(() => {
        expect(clientIsReady).toBe(true);
      });
  });

  it("rejects with an error when apple pay is not enabled in configuration", () => {
    delete testContext.configuration.gatewayConfiguration.applePayWeb;

    return expect(create({ client: testContext.client })).rejects.toMatchObject(
      {
        code: "APPLE_PAY_NOT_ENABLED",
        type: "MERCHANT",
        message: "Apple Pay is not enabled for this merchant.",
      }
    );
  });

  it("sends an analytics event", () => {
    const client = testContext.client;

    return create({
      client,
      displayName: "Awesome Merchant",
    }).then(() => {
      expect(analytics.sendEvent).toHaveBeenCalledWith(
        client,
        "applepay.initialized"
      );
    });
  });

  it("auto-loads Apple's Apple Pay JS SDK", () => {
    const client = testContext.client;

    return create({ client }).then(() => {
      expect(assets.loadScript).toHaveBeenCalledWith({
        src: "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js",
        crossorigin: "anonymous",
      });
    });
  });

  it("waits for the Apple Pay SDK to load before resolving (non-deferred)", () => {
    const client = testContext.client;
    let sdkResolved = false;

    assets.loadScript.mockImplementation(() =>
      Promise.resolve().then(() => {
        sdkResolved = true;

        return document.createElement("script");
      })
    );

    return create({ client }).then((instance) => {
      expect(sdkResolved).toBe(true);
      expect(instance).toBeInstanceOf(ApplePay);
    });
  });
});
