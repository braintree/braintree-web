import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Hosted Fields Lifecycle Management", function () {
  const standardUrl =
    "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";

  let server: http.Server;
  let serverPort: number;

  const getTestUrl = (path: string) => {
    let url = `http://localhost:${serverPort}${path}`;
    if (process.env.LOCAL_BUILD === "true") {
      const hasQuery = url.includes("?");
      const separator = hasQuery ? "&" : "?";
      url = `${url}${separator}globals=sdkVersion:dev`;
    }
    return encodeURI(url);
  };

  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);

    await browser.setTimeout({
      pageLoad: 30000,
      implicit: 15000,
      script: 60000,
    });

    // Create per-test server
    const result: TestServerResult = await createTestServer();
    server = result.server;
    serverPort = result.port;

    // Common setup for all tests
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();
  });

  afterEach(async function () {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it("should clear field values programmatically", async function () {
    await browser.hostedFieldSendInput("number", "4111111111111111");

    const fieldToClearSelect = await $("#field-to-clear");
    await fieldToClearSelect.selectByAttribute("value", "number");

    const clearFieldButton = await $("#clear-field-button");
    await clearFieldButton.click();

    await browser.pause(300);

    const emptyEventContainer = await $("#emptyEvent");
    const emptyContainerClasses =
      await emptyEventContainer.getAttribute("class");
    expect(emptyContainerClasses).toContain("number");

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));
    const inputField = await $("input");
    const fieldValue = await inputField.getValue();
    await browser.switchFrame(null);
    expect(fieldValue).toBe("");
  });

  it("should add and remove field classes programmatically", async function () {
    const classActionFieldSelect = await $("#class-action-field");
    const classNameInput = await $("#class-name-input");
    const addClassButton = await $("#add-class-button");
    const removeClassButton = await $("#remove-class-button");

    await classActionFieldSelect.selectByAttribute("value", "number");
    await classNameInput.setValue("custom-class");
    await addClassButton.click();

    await browser.pause(100);

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    const hasClass = await browser.execute((el) => {
      return el.classList.contains("custom-class");
    }, inputField);

    await browser.switchFrame(null);

    expect(hasClass).toBe(true);

    await removeClassButton.click();

    await browser.pause(100);

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputFieldAfterRemove = await $("input");
    const hasClassAfterRemove = await browser.execute((el) => {
      return el.classList.contains("custom-class");
    }, inputFieldAfterRemove);

    await browser.switchFrame(null);

    expect(hasClassAfterRemove).toBe(false);
  });

  it("should set and remove attributes programmatically", async function () {
    const attributeFieldSelect = await $("#attribute-field");
    const attributeNameInput = await $("#attribute-name-input");
    const attributeValueInput = await $("#attribute-value-input");
    const setAttributeButton = await $("#set-attribute-button");
    const removeAttributeButton = await $("#remove-attribute-button");

    await attributeFieldSelect.selectByAttribute("value", "cvv");
    await attributeNameInput.setValue("placeholder");
    await attributeValueInput.setValue("Security Code");
    await setAttributeButton.click();

    await browser.pause(100);

    await browser.waitForHostedField("cvv");
    await browser.switchFrame(await $("#braintree-hosted-field-cvv"));

    const inputField = await $("input");
    const placeholder = await inputField.getAttribute("placeholder");

    await browser.switchFrame(null);

    expect(placeholder).toBe("Security Code");

    await attributeNameInput.setValue("disabled");
    await setAttributeButton.click();

    await browser.pause(100);

    await browser.waitForHostedField("cvv");
    await browser.switchFrame(await $("#braintree-hosted-field-cvv"));

    const disabledInputField = await $("input");
    const isDisabled = await disabledInputField.getAttribute("disabled");

    await browser.switchFrame(null);

    expect(isDisabled).not.toBe(null);

    await removeAttributeButton.click();

    await browser.pause(100);

    await browser.waitForHostedField("cvv");
    await browser.switchFrame(await $("#braintree-hosted-field-cvv"));

    const enabledInputField = await $("input");
    const isEnabled = await enabledInputField.getAttribute("disabled");

    await browser.switchFrame(null);

    expect(isEnabled).toBe(null);
  });

  it("should handle component teardown properly", async function () {
    const iframesBeforeTeardown = await $$(
      "iframe[id^=braintree-hosted-field]"
    );
    expect(iframesBeforeTeardown.length).toBeGreaterThan(0);

    const teardownButton = await $("#teardown-button");
    const teardownStatus = await $("#teardown-status");
    await teardownButton.click();
    await browser.waitUntil(
      async () => {
        const statusText = await teardownStatus.getText();
        return statusText === "Teardown complete";
      },
      {
        timeout: 10000,
        timeoutMsg: "Teardown status did not update to 'Teardown complete'",
        interval: 500,
      }
    );

    await browser.waitUntil(
      async () => {
        const iframes = await $$("iframe[id^=braintree-hosted-field]");
        return iframes.length === 0;
      },
      {
        timeout: 10000,
        timeoutMsg: "Hosted Fields iframes were not removed after teardown",
        interval: 500,
      }
    );

    const iframesAfterTeardown = await $$("iframe[id^=braintree-hosted-field]");
    expect(iframesAfterTeardown.length).toBe(0);
  });

  it("should focus fields programmatically", async function () {
    const focusFieldSelect = await $("#focus-field");
    const focusFieldButton = await $("#focus-field-button");

    await focusFieldSelect.selectByAttribute("value", "cvv");
    await focusFieldButton.click();

    await browser.pause(500);

    const focusEventContainer = await $("#focus");
    const focusContainerClasses =
      await focusEventContainer.getAttribute("class");
    expect(focusContainerClasses).toContain("cvv");

    const cvvContainer = await $("#cvv");
    const containerClasses = await cvvContainer.getAttribute("class");
    expect(containerClasses).toContain("braintree-hosted-fields-focused");
  });

  it("should retrieve accurate field state with getState", async function () {
    const getStateButton = await $("#get-state-button");
    const stateContainer = await $("#state-container");

    await getStateButton.click();

    await browser.waitUntil(
      async () => {
        try {
          const dataAttr = await stateContainer.getAttribute("data-state");
          return dataAttr && dataAttr.includes("fields");
        } catch {
          return false;
        }
      },
      {
        timeout: 10000,
        timeoutMsg: "State data was not populated within timeout",
        interval: 500,
      }
    );

    let stateData = await stateContainer.getAttribute("data-state");
    const initialState = JSON.parse(stateData);

    expect(initialState.fields.number.isEmpty).toBe(true);
    expect(initialState.fields.number.isValid).toBe(false);
    expect(initialState.fields.number.isPotentiallyValid).toBe(true);

    await browser.hostedFieldSendInput("number", "4111111111111111");
    await getStateButton.click();

    await browser.waitUntil(
      async () => {
        try {
          const dataAttr = await stateContainer.getAttribute("data-state");
          const state = JSON.parse(dataAttr);
          return state.fields.number.isEmpty === false;
        } catch {
          return false;
        }
      },
      {
        timeout: 10000,
        timeoutMsg: "Updated state data was not populated within timeout",
        interval: 500,
      }
    );

    stateData = await stateContainer.getAttribute("data-state");
    const updatedState = JSON.parse(stateData);

    expect(updatedState.fields.number.isEmpty).toBe(false);
    expect(updatedState.fields.number.isValid).toBe(true);
  });
});
