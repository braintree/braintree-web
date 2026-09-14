import _e13 from "../../../src/american-express";

const { create } = _e13;

import AmericanExpress from "../../../src/american-express/american-express";
import * as basicComponentVerification from "../../../src/lib/basic-component-verification";
import * as createDeferredClient from "../../../src/lib/create-deferred-client";
import { fake } from "../../helpers";

vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/lib/create-deferred-client");

const { client: fakeClient, clientToken } = fake;

describe("americanExpress", () => {
  let testContext = {};

  afterEach(() => {
    testContext = {};
  });

  describe("create", () => {
    beforeEach(() => {
      testContext.fakeClient = fakeClient();
      vi.spyOn(createDeferredClient, "create").mockResolvedValue(
        testContext.fakeClient
      );
    });

    it("returns a promise", () => {
      const promise = create({ client: testContext.fakeClient });

      return expect(promise).resolves.toBeInstanceOf(AmericanExpress);
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
