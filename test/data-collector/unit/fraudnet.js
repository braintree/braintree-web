"use strict";

jest.mock("../../../src/lib/assets", () => ({
  loadScript: () => Promise.resolve(),
}));

const fraudNet = require("../../../src/data-collector/fraudnet");

describe("FraudNet", () => {
  afterEach(() => {
    fraudNet.clearSessionIdCache();
    document.body.innerHTML = "";
  });

  it('appends a script type of "application/json" to the document', async () => {
    await fraudNet.setup({
      sessionId: "custom-session",
    });

    expect(
      document.querySelector('[fncls][type="application/json"]')
    ).not.toBeNull();
  });

  it("contains expected values in parsed data", async () => {
    const testCallback = "testCallback";
    const result = await fraudNet.setup({
      sessionId: "fake-sessionID",
      cb1: testCallback,
    });

    const sessionId = result.sessionId;
    const el = document.querySelector('[fncls][type="application/json"]');
    const parsedData = JSON.parse(el.text);

    expect(parsedData).not.toHaveProperty("bu");
    expect(parsedData.b).toContain(sessionId);
    expect(parsedData.f).toBe(sessionId);
    expect(parsedData.s).toBe("BRAINTREE_SIGNIN");
    expect(parsedData.cb1).toBe(testCallback);
    expect(parsedData.sandbox).toBe(true);
  });

  it("contains bu instead of b in parsed data when beacon is passed as false", async () => {
    const testCallback = "testCallback";
    const result = await fraudNet.setup({
      sessionId: "fake-sessionID",
      beacon: false,
      cb1: testCallback,
    });

    const sessionId = result.sessionId;
    const el = document.querySelector('[fncls][type="application/json"]');
    const parsedData = JSON.parse(el.text);

    expect(parsedData).not.toHaveProperty("b");
    expect(parsedData.bu).toBe(false);
    expect(parsedData.f).toBe(sessionId);
    expect(parsedData.s).toBe("BRAINTREE_SIGNIN");
    expect(parsedData.cb1).toBe(testCallback);
    expect(parsedData.sandbox).toBe(true);
  });

  it("contains b in parsed data when beacon is passed as true", async () => {
    const testCallback = "testCallback";
    const result = await fraudNet.setup({
      sessionId: "fake-sessionID",
      beacon: true,
      cb1: testCallback,
    });

    const sessionId = result.sessionId;
    const el = document.querySelector('[fncls][type="application/json"]');
    const parsedData = JSON.parse(el.text);

    expect(parsedData).not.toHaveProperty("bu");
    expect(parsedData.b).toContain(sessionId);
    expect(parsedData.f).toBe(sessionId);
    expect(parsedData.s).toBe("BRAINTREE_SIGNIN");
    expect(parsedData.cb1).toBe(testCallback);
    expect(parsedData.sandbox).toBe(true);
  });

  it("prefers custom session id over clientSessionId when passed", async () => {
    const result = await fraudNet.setup({
      sessionId: "session",
    });

    expect(result.sessionId).toBe("session");
  });

  it("uses clientSessionId as sessionId if sessionId not passed", async () => {
    const result = await fraudNet.setup({
      clientSessionId: "fakeSessionId",
    });

    expect(result.sessionId).toBe("fakeSessionId");
  });

  it("re-uses clientSessionId when initialized more than once", async () => {
    const instance = await fraudNet.setup({
      clientSessionId: "custom-client-session-id",
    });

    const originalSessionId = instance.sessionId;

    instance.teardown();

    const newInstance = await fraudNet.setup();

    expect(newInstance.sessionId).toBe(originalSessionId);
  });

  it("does not re-use custom session id when initialized more than once with no teardown", async () => {
    await fraudNet.setup({
      sessionId: "custom-session",
    });

    const noCustomIdInstance = await fraudNet.setup();

    expect(noCustomIdInstance.sessionId).not.toBe("custom-session");
  });

  it("does not re-use id when instantiated with a new custom session id", async () => {
    const preCustomInstance = await fraudNet.setup();

    preCustomInstance.teardown();

    const firstCustomInstance = await fraudNet.setup({
      sessionId: "custom-session",
    });

    expect(firstCustomInstance.sessionId).toBe("custom-session");
  });

  it("does not include a sandbox param when production env is passed", async () => {
    await fraudNet.setup({
      environment: "production",
      clientSessionId: "client-session-id",
    });
    const scriptEl = document.querySelector('[fncls][type="application/json"]');
    const data = JSON.parse(scriptEl.text);

    expect(data).not.toHaveProperty("sandbox");
  });

  it("uses a truncated sessionId if it is over the truncation length", async () => {
    var characterToRepeat = "x";
    var amountToRepeat = 46;
    var truncatedLength = 32;

    const result = await fraudNet.setup({
      sessionId: characterToRepeat.repeat(amountToRepeat),
    });

    expect(result.sessionId).toBe(characterToRepeat.repeat(truncatedLength));
  });
});
