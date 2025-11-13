import { expect } from "@wdio/globals";
import { getWorkflowUrl } from "./helper";

describe("Hosted Fields Styling", function () {
  const lightThemeUrl =
    "/iframe.html?id=braintree-hosted-fields-custom-styling--light-theme&viewMode=story";
  const darkThemeUrl =
    "/iframe.html?id=braintree-hosted-fields-custom-styling--dark-theme&viewMode=story";

  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);

    await browser.setTimeout({
      pageLoad: 30000,
      implicit: 15000,
      script: 60000,
    });
  });

  afterEach(async function () {
    // Reset browser session after each test to prevent popup dialogs and state leakage
    try {
      await browser.reloadSession();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", err.message);
    }
  });

  it("should apply custom styles in light theme", async function () {
    await browser.url(getWorkflowUrl(lightThemeUrl));
    await browser.waitForHostedFieldsReady();

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    const styles = await browser.execute((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        fontSize: computedStyle.getPropertyValue("font-size"),
        color: computedStyle.getPropertyValue("color"),
        fontFamily: computedStyle.getPropertyValue("font-family"),
      };
    }, inputField);

    await browser.switchFrame(null);

    await expect(styles.fontSize).toBe("16px");
  });

  it("should apply dark theme styles", async function () {
    await browser.url(getWorkflowUrl(darkThemeUrl));
    await browser.waitForHostedFieldsReady();

    const container = await $("[data-theme='dark']");
    await expect(await container.isExisting()).toBe(true);

    const backgroundColorStyle =
      await container.getCSSProperty("background-color");
    const convertedColor = backgroundColorStyle.parsed.hex.toLowerCase();
    await expect(convertedColor).toBe("#333333");

    const textColorStyle = await container.getCSSProperty("color");
    const convertedTextColor = textColorStyle.parsed.hex.toLowerCase();
    await expect(convertedTextColor).toBe("#ffffff");
  });

  it("should apply styles to hosted fields in iframes", async function () {
    await browser.url(getWorkflowUrl(darkThemeUrl));
    await browser.waitForHostedFieldsReady();

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    const fieldStyles = await browser.execute((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        fontFamily: computedStyle.getPropertyValue("font-family"),
      };
    }, inputField);

    await browser.switchFrame(null);

    await expect(fieldStyles.fontFamily).toContain("monospace");
  });

  it("should apply valid/invalid styling states", async function () {
    await browser.url(getWorkflowUrl(lightThemeUrl));
    await browser.waitForHostedFieldsReady();

    await browser.hostedFieldSendInput("number", "4111111111111111111");

    const cardNumberContainer = await $("#card-number");
    const containerClasses = await cardNumberContainer.getAttribute("class");
    await expect(containerClasses).toContain("braintree-hosted-fields-invalid");

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    const colorStyle = await inputField.getCSSProperty("color");
    const INVALID_COLOR_HEX = "#dc3545";

    await browser.switchFrame(null);

    await expect(colorStyle.parsed.hex.toLowerCase()).toBe(INVALID_COLOR_HEX);
  });

  it("should apply dynamic styling on field interaction", async function () {
    await browser.url(getWorkflowUrl(lightThemeUrl));
    await browser.waitForHostedFieldsReady();

    const cardNumberContainer = await $("#card-number");
    const initialClasses = await cardNumberContainer.getAttribute("class");
    await expect(initialClasses).not.toContain(
      "braintree-hosted-fields-focused"
    );

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    await inputField.click();

    await browser.switchFrame(null);

    const focusedClasses = await cardNumberContainer.getAttribute("class");
    await expect(focusedClasses).toContain("braintree-hosted-fields-focused");
  });
});
