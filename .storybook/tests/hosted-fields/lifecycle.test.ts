import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Lifecycle Management", function () {
  test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({}), {
      waitUntil: "domcontentloaded",
    });
    await hostedFieldsPage.waitForHostedFieldsReady();
  });

  test.afterEach(async ({ page }) => {
    // Reset browser session after each test to prevent popup dialogs and state leakage
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should clear field values programmatically", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number", "4111111111111111");

    const fieldToClearSelect =
      await hostedFieldsPage.findAndWaitFor("field-to-clear");
    await fieldToClearSelect.selectOption("number");

    const clearFieldButton =
      await hostedFieldsPage.findAndWaitFor("clear-field-button");
    await clearFieldButton.click();

    const emptyEventContainer = await hostedFieldsPage.findAndWaitFor(
      "emptyEvent",
      "hidden"
    );
    await hostedFieldsPage.waitForElementToHaveAttribute(
      "emptyEvent",
      "className",
      "number"
    );
    await expect(emptyEventContainer).toHaveClass(/number/);

    const inputField = await hostedFieldsPage.findInputInFrame("number");
    await expect(inputField).toHaveValue("");
  });

  test("should add and remove field classes programmatically", async ({
    hostedFieldsPage,
  }) => {
    const classActionFieldSelect =
      await hostedFieldsPage.findAndWaitFor("class-action-field");
    const classNameInput =
      await hostedFieldsPage.findAndWaitFor("class-name-input");
    const addClassButton =
      await hostedFieldsPage.findAndWaitFor("add-class-button");
    const removeClassButton = await hostedFieldsPage.findAndWaitFor(
      "remove-class-button"
    );

    await classActionFieldSelect.selectOption("number");
    await classNameInput.fill("custom-class");
    await addClassButton.click();

    const inputElement = await hostedFieldsPage.findInputInFrame("number");
    await expect(inputElement).toHaveClass(/custom-class/);

    await removeClassButton.click();
    await expect(inputElement).not.toHaveClass(/custom-class/);
  });

  test("should set and remove attributes programmatically", async ({
    hostedFieldsPage,
  }) => {
    const attributeFieldSelect =
      await hostedFieldsPage.findAndWaitFor("attribute-field");
    const attributeNameInput = await hostedFieldsPage.findAndWaitFor(
      "attribute-name-input"
    );
    const attributeValueInput = await hostedFieldsPage.findAndWaitFor(
      "attribute-value-input"
    );
    const setAttributeButton = await hostedFieldsPage.findAndWaitFor(
      "set-attribute-button"
    );
    const removeAttributeButton = await hostedFieldsPage.findAndWaitFor(
      "remove-attribute-button"
    );

    await attributeFieldSelect.selectOption("cvv");
    await attributeNameInput.fill("placeholder");
    await attributeValueInput.fill("Security Code");
    await setAttributeButton.click();

    await hostedFieldsPage.waitForHostedField("cvv");

    const inputElement = await hostedFieldsPage.findInputInFrame("cvv");
    await expect(inputElement).toHaveAttribute("placeholder", "Security Code");

    await attributeNameInput.fill("disabled");
    await setAttributeButton.click();

    await expect(inputElement).toBeDisabled();

    await removeAttributeButton.click();

    await expect(inputElement).toBeEnabled();
  });

  test("should focus fields programmatically", async ({ hostedFieldsPage }) => {
    const focusFieldSelect =
      await hostedFieldsPage.findAndWaitFor("focus-field");
    const focusFieldButton =
      await hostedFieldsPage.findAndWaitFor("focus-field-button");

    await focusFieldSelect.selectOption("cvv");
    await focusFieldButton.click();
    const focusEventContainer = await hostedFieldsPage.findAndWaitFor(
      "focus",
      "hidden"
    );
    await hostedFieldsPage.waitForElementToHaveAttribute(
      "focus",
      "className",
      "cvv"
    );
    await expect(focusEventContainer).toHaveClass(/cvv/);

    const cvvContainer = await hostedFieldsPage.findAndWaitFor("cvv");
    await hostedFieldsPage.waitForElementToHaveAttribute(
      "cvv",
      "className",
      "braintree-hosted-fields-focused"
    );
    await expect(cvvContainer).toHaveClass(/braintree-hosted-fields-focused/);
  });

  test("should retrieve accurate field state with getState", async ({
    hostedFieldsPage,
  }) => {
    const getStateButton =
      await hostedFieldsPage.findAndWaitFor("get-state-button");

    await getStateButton.click();

    const stateContainer =
      await hostedFieldsPage.findAndWaitFor("state-container");
    let stateData = await stateContainer.getAttribute("data-state");
    const initialState = JSON.parse(stateData!);

    expect(initialState.fields.number.isEmpty).toBe(true);
    expect(initialState.fields.number.isValid).toBe(false);
    expect(initialState.fields.number.isPotentiallyValid).toBe(true);

    await hostedFieldsPage.hostedFieldSendInput("number", "4111111111111111");

    await getStateButton.click();
    stateData = await stateContainer.getAttribute("data-state");
    const updatedState = JSON.parse(stateData!);

    expect(updatedState.fields.number.isEmpty).toBe(false);
    expect(updatedState.fields.number.isValid).toBe(true);
  });

  test("should handle component teardown properly", async ({
    hostedFieldsPage,
    page,
  }) => {
    await hostedFieldsPage.waitForHostedFieldsReady();
    const iframesBeforeTeardown = await page.evaluate(() => {
      const iframes = document.querySelectorAll(
        'iframe[id^="braintree-hosted-field"]'
      );
      return iframes.length;
    });
    expect(iframesBeforeTeardown).toBeGreaterThan(0);
    const teardownButton =
      await hostedFieldsPage.findAndWaitFor("teardown-button");
    await teardownButton.click();

    const teardownStatus =
      await hostedFieldsPage.findAndWaitFor("teardown-status");

    expect(await teardownStatus.innerText()).toBe("Teardown complete");

    const iframesAfterTeardown = await page.evaluate(() => {
      const iframes = document.querySelectorAll(
        'iframe[id^="braintree-hosted-field"]'
      );
      return iframes.length;
    });

    expect(iframesAfterTeardown).toBe(0);
  });
});
