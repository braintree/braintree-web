"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/fastlane/fastlane");

const { fake } = require("../../helpers");
const { create } = require("../../../src/fastlane");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");

describe("fastlane", () => {
  describe("create", () => {
    let testContext;

    beforeEach(() => {
      testContext = {};
      testContext.configuration = fake.configuration();
      testContext.client = fake.client({
        configuration: testContext.configuration,
      });
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.client);
    });

    it("verifies with basicComponentVerification", () => {
      const options = {
        client: testContext.client,
        deviceData: "device-data",
      };

      create(options).then(() => {
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

      create(options).then(() => {
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
