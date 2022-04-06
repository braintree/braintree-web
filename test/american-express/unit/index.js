"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const { create } = require("../../../src/american-express");
const AmericanExpress = require("../../../src/american-express/american-express");
const {
  fake: { client: fakeClient, clientToken },
} = require("../../helpers");

describe("americanExpress", () => {
  let testContext = {};

  afterEach(() => {
    testContext = {};
  });

  describe("create", () => {
    beforeEach(() => {
      testContext.fakeClient = fakeClient();
      jest
        .spyOn(createDeferredClient, "create")
        .mockResolvedValue(testContext.fakeClient);
    });

    it("returns a promise", () => {
      const promise = create({ client: testContext.fakeClient });

      expect(promise).resolves.toBeInstanceOf(AmericanExpress);
    });

    it("verifies with basicComponentVerification", () => {
      return create({ client: testContext.fakeClient }).then(() => {
        expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
        expect(basicComponentVerification.verify).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "American Express",
            client: testContext.fakeClient,
          })
        );
      });
    });

    it("can create with an authorization instead of a client", () =>
      create({
        authorization: clientToken,
        debug: true,
      }).then((amex) => {
        expect(createDeferredClient.create).toHaveBeenCalledTimes(1);
        expect(
          createDeferredClient.create.mock.calls[0][0].client
        ).not.toBeDefined();
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          authorization: clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "American Express",
        });

        expect(amex).toBeInstanceOf(AmericanExpress);
      }));

    it("creates an AmericanExpress instance", () =>
      create({ client: testContext.fakeClient }).then((amex) => {
        expect(amex).toBeInstanceOf(AmericanExpress);
      }));
  });
});
