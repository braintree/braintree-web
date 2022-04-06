"use strict";

const {
  fake: { configuration },
} = require("../../../helpers");
const composeHostedFieldsUrl = require("../../../../src/hosted-fields/external/compose-url");
const {
  get: getCardForm,
} = require("../../../../src/unionpay/internal/get-hosted-fields-cardform");

describe("getHostedFieldsCardForm", () => {
  let testContext;

  beforeEach(() => {
    let assetsUrl, noData, boringFrame, evilFrame, wrongUrl;

    testContext = {};
    testContext._oldGlobalName = window.name;
    testContext.fakeClient = { getConfiguration: configuration };
    testContext.fakeHostedFields = {
      _bus: { channel: "abc123" },
    };
    assetsUrl =
      testContext.fakeClient.getConfiguration().gatewayConfiguration.assetsUrl;
    testContext.frameUrl = composeHostedFieldsUrl(assetsUrl, "abc123");

    boringFrame = document.createElement("iframe");
    boringFrame.setAttribute("src", "http://example.com");

    wrongUrl = document.createElement("iframe");
    wrongUrl.setAttribute("src", "http://example.com");

    evilFrame = document.createElement("iframe");
    Object.defineProperty(evilFrame, "location", {
      get: () => {
        throw new Error("cant touch this");
      },
    });

    noData = document.createElement("iframe");
    noData.setAttribute("src", testContext.frameUrl);

    document.documentElement.appendChild(noData);
    document.documentElement.appendChild(evilFrame);
    document.documentElement.appendChild(boringFrame);
    document.documentElement.appendChild(wrongUrl);

    window.frames[0].cardForm = null;
    window.frames[3].cardForm = { wrong: "Url" };
    window.name = "frame-name_123";
  });

  afterEach(() => {
    window.name = testContext._oldGlobalName;
  });

  it("returns null when it cannot find the card form", () => {
    expect(
      getCardForm(testContext.fakeClient, testContext.fakeHostedFields)
    ).toBeNull();
  });

  it("can find the card form", () => {
    const fakeCardForm = { good: "form" };
    const goodFrame = document.createElement("iframe");

    goodFrame.setAttribute("src", testContext.frameUrl);

    document.documentElement.appendChild(goodFrame);
    window.frames[4].cardForm = fakeCardForm;

    expect(
      getCardForm(testContext.fakeClient, testContext.fakeHostedFields)
    ).toBe(fakeCardForm);
  });
});
