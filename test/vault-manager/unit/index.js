vi.mock("../../../src/lib/basic-component-verification");
vi.mock("../../../src/lib/create-deferred-client");
vi.mock("../../../src/lib/create-assets-url");

import _e1 from "../../../src/vault-manager";

const { create } = _e1;

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import VaultManager from "../../../src/vault-manager/vault-manager";
import { fake } from "../../helpers";

describe("vaultManager", () => {
  let fakeClient;

  beforeEach(() => {
    fakeClient = fake.client();
  });

  describe("create", () => {
    it("verifies with basicComponentVerification", async () => {
      await create({
        client: fakeClient,
      });

      expect(basicComponentVerification.verify).toBeCalledTimes(1);
      expect(basicComponentVerification.verify).toBeCalledWith({
        name: "Vault Manager",
        client: fakeClient,
      });
    });

    it("creates a VaultManager instance", () => {
      return create({ client: fakeClient }).then((vaultManager) => {
        expect(vaultManager).toBeInstanceOf(VaultManager);
      });
    });

    it("can create with an authorization instead of a client", function () {
      return create({
        authorization: fake.clientToken,
        debug: true,
      }).then((instance) => {
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toBeCalledWith({
          authorization: fake.clientToken,
          debug: true,
          assetsUrl: "https://example.com/assets",
          name: "Vault Manager",
        });

        expect(instance).toBeInstanceOf(VaultManager);
      });
    });
  });
});
