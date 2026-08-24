"use strict";

jest.mock("../../../src/lib/assets");

const assets = require("../../../src/lib/assets");
const analytics = require("../../../src/lib/analytics");
const { create } = require("../../../src/lib/create-deferred-client");
const BraintreeError = require("../../../src/lib/braintree-error");
const { fake } = require("../../helpers");
const { version: VERSION } = require("../../../package");

describe("createDeferredClient", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.fakeClient = fake.client();
    testContext.fakeClientCreate = jest
      .fn()
      .mockResolvedValue(testContext.fakeClient);
    testContext.auth = fake.clientToken;

    window.braintree = {
      client: {
        VERSION,
        create: testContext.fakeClientCreate,
      },
    };

    jest.spyOn(assets, "loadScript").mockImplementation(() => {
      window.braintree = {
        client: {
          VERSION,
          create: testContext.fakeClientCreate,
        },
      };

      return Promise.resolve();
    });
  });

  afterEach(() => {
    delete window.braintree;
    jest.restoreAllMocks();
  });

  it("resolves with client if a client is passed in", () => {
    const client = {};

    return create({ client }).then((resolvedClient) => {
      expect(resolvedClient).toBe(client);
    });
  });

  it("resolves with a client after loading client asset script", () => {
    delete window.braintree.client;

    return create({
      name: "Some Component",
      assetsUrl: "https://example.com/foo",
      authorization: testContext.auth,
    }).then((client) => {
      expect(assets.loadScript).toHaveBeenCalledTimes(1);
      expect(client).toBe(testContext.fakeClient);
    });
  });

  it("resolves with a client without loading client asset script", () =>
    create({
      name: "Some Component",
      assetsUrl: "https://example.com/foo",
      authorization: testContext.auth,
    }).then((client) => {
      expect(assets.loadScript).not.toHaveBeenCalled();
      expect(client).toBe(testContext.fakeClient);
    }));

  it("loads client script if there is no braintree.client object on the window", () => {
    delete window.braintree.client;

    return create({
      name: "Some Component",
      assetsUrl: "https://example.com/foo",
      authorization: testContext.auth,
    }).then(() => {
      expect(assets.loadScript).toHaveBeenCalledTimes(1);
      expect(assets.loadScript).toHaveBeenCalledWith({
        src: `https://example.com/foo/web/${VERSION}/js/client.min.js`,
      });
    });
  });

  it("rejects if the client version on the window does not match the component version", () => {
    window.braintree.client.VERSION = "1.2.3";

    return create({
      name: "Some Component",
    }).catch((err) => {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.code).toBe("INCOMPATIBLE_VERSIONS");
      expect(err.message).toBe(
        `Client (version 1.2.3) and Some Component (version ${VERSION}) components must be from the same SDK version.`
      );
    });
  });

  it("calls braintree.client.create on existing window object if it exists", () =>
    create({
      name: "Some Component",
      authorization: testContext.auth,
      debug: false,
    }).then(() => {
      expect(assets.loadScript).not.toHaveBeenCalled();
      expect(testContext.fakeClientCreate).toHaveBeenCalledTimes(1);
      expect(testContext.fakeClientCreate).toHaveBeenCalledWith({
        authorization: testContext.auth,
        debug: false,
      });
    }));

  it("passes along debug value", () =>
    create({
      name: "Some Component",
      authorization: testContext.auth,
      debug: true,
    }).then(() => {
      expect(testContext.fakeClientCreate).toHaveBeenCalledTimes(1);
      expect(testContext.fakeClientCreate).toHaveBeenCalledWith({
        authorization: testContext.auth,
        debug: true,
      });
    }));

  it("rejects if asset loader rejects", async () => {
    const error = new Error("failed!");

    delete window.braintree;
    assets.loadScript.mockRejectedValue(error);

    await expect(
      create({
        name: "Some Component",
        authorization: testContext.auth,
      })
    ).rejects.toMatchObject({
      code: "CLIENT_SCRIPT_FAILED_TO_LOAD",
      details: { originalError: error },
    });

    expect(assets.loadScript).toHaveBeenCalledTimes(2);
  });

  it("names the failure kind and preserves enriched detail on the original error", async () => {
    const error = new Error(
      "https://example.com/client.min.js failed to load."
    );

    error.failureKind = "error";
    error.src = "https://example.com/client.min.js";
    error.timing = 12;
    error.onLine = true;

    delete window.braintree;
    assets.loadScript.mockRejectedValue(error);

    await expect(
      create({
        name: "Some Component",
        authorization: testContext.auth,
      })
    ).rejects.toMatchObject({
      code: "CLIENT_SCRIPT_FAILED_TO_LOAD",
      message: "Braintree client script failed to load (error).",
      details: {
        originalError: {
          failureKind: "error",
          src: "https://example.com/client.min.js",
        },
      },
    });

    expect(assets.loadScript).toHaveBeenCalledTimes(2);
  });

  it("retries once with a cache-busting reload when the first load fails", () => {
    delete window.braintree;
    assets.loadScript.mockRejectedValueOnce(new Error("interrupted"));

    return create({
      name: "Some Component",
      assetsUrl: "https://example.com/foo",
      authorization: testContext.auth,
    }).then((client) => {
      expect(assets.loadScript).toHaveBeenCalledTimes(2);
      expect(assets.loadScript).toHaveBeenNthCalledWith(2, {
        src: `https://example.com/foo/web/${VERSION}/js/client.min.js`,
        forceScriptReload: true,
      });
      expect(client).toBe(testContext.fakeClient);
    });
  });

  it("sends a recovery analytics event when the load recovers after a retry", () => {
    const sendEventPlus = jest
      .spyOn(analytics, "sendEventPlus")
      .mockReturnValue();

    delete window.braintree;
    assets.loadScript.mockRejectedValueOnce(new Error("interrupted"));

    return create({
      name: "Some Component",
      assetsUrl: "https://example.com/foo",
      authorization: testContext.auth,
    }).then((client) => {
      expect(sendEventPlus).toHaveBeenCalledWith(
        client,
        "Some Component.deferred-client.load-recovered",
        expect.objectContaining({ description: "interrupted" })
      );
    });
  });

  it("does not send a recovery event when the load succeeds on the first try", () => {
    const sendEventPlus = jest
      .spyOn(analytics, "sendEventPlus")
      .mockReturnValue();

    delete window.braintree.client;

    return create({
      name: "Some Component",
      assetsUrl: "https://example.com/foo",
      authorization: testContext.auth,
    }).then(() => {
      expect(sendEventPlus).not.toHaveBeenCalled();
    });
  });

  it("rejects if braintree.client.create rejects", () => {
    const error = new Error("failed!");

    testContext.fakeClientCreate.mockRejectedValue(error);

    return create({
      name: "Some Component",
      authorization: testContext.auth,
    }).catch((err) => {
      expect(err).toBe(error);
    });
  });
});
