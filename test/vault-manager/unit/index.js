"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("../../../src/lib/create-deferred-client");
jest.mock("../../../src/lib/create-assets-url");

const create = require("../../../src/vault-manager").create;
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const VaultManager = require("../../../src/vault-manager/vault-manager");
const { fake } = require("../../helpers");

describe("vaultManager", () => {
  let fakeClient;

  beforeEach(() => {
    fakeClient = fake.client();
  });

  describe("create", () => {
    it("supports callbacks", (done) => {
      create({ client: fakeClient }, (err, vaultManager) => {
        expect(err).toBeFalsy();

        expect(vaultManager).toBeInstanceOf(VaultManager);

        done();
      });
    });

    it("verifies with basicComponentVerification", (done) => {
      create(
        {
          client: fakeClient,
        },
        () => {
          expect(basicComponentVerification.verify).toBeCalledTimes(1);
          expect(basicComponentVerification.verify).toBeCalledWith({
            name: "Vault Manager",
            client: fakeClient,
          });
          done();
        }
      );
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
