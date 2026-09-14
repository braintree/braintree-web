vi.mock("../../../src/lib/analytics");
vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-deferred-client");

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import _e6 from "../../../src/instant-verification";

const { create } = _e6;

import { fake } from "../../helpers";
import InstantVerification from "../../../src/instant-verification/instant-verification";

describe("instant-verification static methods", () => {
  describe("instantVerification.create", () => {
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
    });

    it("verifies with basicComponentVerification", () => {
      create({
        client: testContext.client,
      });

      expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
      expect(basicComponentVerification.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Instant Verification",
          client: testContext.client,
        })
      );
    });

    it("throws error if instantVerification is not enabled for merchant", () =>
      new Promise((done) => {
        delete testContext.configuration.gatewayConfiguration.openBanking;
        create({ client: testContext.client }).catch((err) => {
          expect(err.type).toBe("MERCHANT");
          expect(err.code).toBe("INSTANT_VERIFICATION_NOT_ENABLED");
          expect(err.message).toBe(
            "Instant Verification is not enabled for this merchant account."
          );
          done();
        });
      }));

    it("resolves with an instant-verification instance", async () => {
      const instance = await create({ client: testContext.client });
      expect(instance).toBeInstanceOf(InstantVerification);
    });

    it("can create with an authorization instead of a client", async () => {
      const instance = await create({
        authorization: fake.clientToken,
        debug: true,
      });

      expect(createDeferredClient.create).toBeCalledTimes(1);
      expect(
        createDeferredClient.create.mock.calls[0][0].client
      ).toBeUndefined();
      expect(createDeferredClient.create.mock.calls[0][0]).toMatchObject({
        authorization: fake.clientToken,
        debug: true,
      });
      expect(instance).toBeInstanceOf(InstantVerification);
    });
  });
});
