vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-deferred-client");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/lib/assets");
vi.mock("../../../src/fastlane/fastlane");

import { fake } from "../../helpers";
import _e14 from "../../../src/fastlane";

const { create } = _e14;

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import assets from "../../../src/lib/assets";

describe("fastlane", () => {
  describe("create", () => {
    let testContext;

    beforeEach(() => {
      testContext = {};
      testContext.configuration = fake.configuration();
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });
      vi.spyOn(createDeferredClient, "create").mockResolvedValue(
        testContext.client
      );
      assets.loadFastlane.mockResolvedValue({ metadata: {} });
      window.braintree = {
        fastlane: { create: vi.fn().mockResolvedValue({}) },
      };
    });

    afterEach(() => {
      delete window.braintree;
    });

    it("verifies with basicComponentVerification", () => {
      const options = {
        client: testContext.client,
        deviceData: "device-data",
      };

      return create(options).then(() => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(
          basicComponentVerification.verify.mock.calls[0][0]
        ).toMatchObject({
          name: "fastlane",
          client: options.client,
        });
      });
    });

    it("can create with an authorization instead of a client", () => {
      const options = {
        authorization: fake.clientToken,
        deviceData: "device-data",
      };

      return create(options).then(() => {
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).toBeUndefined();
        expect(createDeferredClient.create.mock.calls[0][0]).toMatchObject({
          authorization: fake.clientToken,
          name: "fastlane",
        });
      });
    });
  });
});
