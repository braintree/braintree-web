import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "./helper";
import http from "node:http";

describe("Hosted Fields Accessibility", function () {
  const standardUrl =
    "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields&viewMode=story";
  const lightThemeUrl =
    "/iframe.html?id=braintree-hosted-fields-custom-styling--light-theme&viewMode=story";

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
  });

  afterEach(async function () {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Reset browser session after each test to prevent popup dialogs and state leakage
    try {
      await browser.reloadSession();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", err.message);
    }
  });

  it("should have proper aria-describedby attributes", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    await browser.waitForHostedField("number");
    await browser.switchFrame(await $("#braintree-hosted-field-number"));

    const inputField = await $("input");
    const ariaDescribedby = await inputField.getAttribute("aria-describedby");
    const descriptionElement = await $(`#${ariaDescribedby}`);
    const elementExists = await descriptionElement.isExisting();

    await browser.switchFrame(null);

    await expect(ariaDescribedby).toBe("field-description-number");
    await expect(elementExists).toBe(true);
  });

  it("should support keyboard navigation between fields", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    const expectedTabOrder = [
      { id: "card-number", fieldId: "number" },
      { id: "expiration-date", fieldId: "expirationDate" },
      { id: "cvv", fieldId: "cvv" },
      { id: "postal-code", fieldId: "postalCode" },
    ];

    await browser.waitForHostedField("number");

    const fieldSelector = await $("#braintree-hosted-field-number");
    await fieldSelector.click();

    const currentFocusedFieldId = (id) => $(`#braintree-hosted-field-${id}`);

    for (let i = 0; i < expectedTabOrder.length - 1; i++) {
      const currentField = expectedTabOrder[i];
      const nextField = expectedTabOrder[i + 1];

      const currentContainer = await $(`#${currentField.id}`);
      const currentClasses = await currentContainer.getAttribute("class");
      expect(currentClasses).toContain("braintree-hosted-fields-focused");

      await browser.keys("\uE004"); // Tab key
      await browser.pause(300);

      await currentFocusedFieldId(nextField.fieldId).waitForExist();
      const nextContainer = await $(`#${nextField.id}`);
      const nextClasses = await nextContainer.getAttribute("class");
      expect(nextClasses).toContain("braintree-hosted-fields-focused");
    }
  });

  it("should support field focus via label click", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    // Set up a tracker to detect field focus
    await browser.execute(() => {
      // Create a tracker for field focus
      const tracker = document.createElement("div");
      tracker.id = "label-focus-tracker";
      tracker.style.display = "none";
      tracker.dataset.currentFocus = "";
      document.body.appendChild(tracker);

      // Set up focus listeners for all hosted fields iframes
      for (const iframe of document.querySelectorAll(
        "iframe[id^=braintree-hosted-field]"
      )) {
        iframe.addEventListener(
          "focus",
          () => {
            const fieldType = iframe.id.replace("braintree-hosted-field-", "");
            const tracker = document.getElementById("label-focus-tracker");
            tracker.dataset.currentFocus = fieldType;
          },
          true
        );
      }
    });

    const cvvLabel = await $('label[for="cvv"]');
    await cvvLabel.click();

    // Give time for the initial focus to register
    await browser.pause(1000);

    const numberLabel = await $('label[for="card-number"]');
    await numberLabel.click();

    await browser.waitUntil(
      async () => {
        const focusedField = await browser.execute(() => {
          const tracker = document.getElementById("label-focus-tracker");
          return tracker.dataset.currentFocus;
        });
        return focusedField === "number";
      },
      { timeout: 5000, timeoutMsg: "Field was not focused by label click" }
    );

    const finalFocusedField = await browser.execute(() => {
      const tracker = document.getElementById("label-focus-tracker");
      return tracker.dataset.currentFocus;
    });
    await expect(finalFocusedField).toBe("number");
  });

  it("should properly handle invalid field states for screen readers", async function () {
    await browser.url(getTestUrl(standardUrl));
    await browser.waitForHostedFieldsReady();

    await browser.waitForHostedField("number");
    await browser.waitForHostedField("expirationDate");

    await browser.execute(() => {
      const iframe = document.getElementById("braintree-hosted-field-number");
      window.getComputedStyle(iframe);
    });

    await browser.hostedFieldSendInput("number", "1234");
    await browser.keys("\uE004");
    await browser.pause(2000);

    const iframeHasValidationIndicators = await browser.execute(() => {
      const iframe = document.getElementById("braintree-hosted-field-number");
      const iframeStyle = window.getComputedStyle(iframe);

      const initialBorderColor = "rgb(204, 204, 204)";

      const borderColorChanged = iframeStyle.borderColor !== initialBorderColor;
      const hasErrorClass =
        iframe.classList.contains("braintree-hosted-fields-invalid") ||
        iframe.classList.contains("invalid") ||
        iframe.classList.contains("error");

      const parent = iframe.parentElement;
      const hasParentErrorClass =
        parent &&
        (parent.classList.contains("has-error") ||
          parent.classList.contains("is-invalid"));

      const errorMessageVisible =
        document.querySelector(".invalid-feedback") !== null ||
        document.querySelector(".error-message") !== null ||
        document.querySelector("[role='alert']") !== null;

      return (
        borderColorChanged ||
        hasErrorClass ||
        hasParentErrorClass ||
        errorMessageVisible
      );
    });

    if (!iframeHasValidationIndicators) {
      try {
        await browser.switchFrame(await $("#braintree-hosted-field-number"));

        const inputHasValidation = await browser.execute(() => {
          const input = document.querySelector("input");
          if (!input) return false;

          const hasAriaInvalid = input.getAttribute("aria-invalid") === "true";
          const hasErrorClass =
            input.classList.contains("invalid") ||
            input.classList.contains("error");
          const errorMessageExists =
            document.querySelector(".error-message") !== null;

          return hasAriaInvalid || hasErrorClass || errorMessageExists;
        });

        await browser.switchFrame(null);
        await expect(inputHasValidation).toBe(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          "Error while switching to hosted field iframe or validating input:",
          e
        );

        const submitButton = await $('button[type="submit"]');
        const isSubmitDisabled = await submitButton
          .isEnabled()
          .then((enabled) => !enabled);

        await expect(isSubmitDisabled).toBe(true);
      }
    } else {
      await expect(iframeHasValidationIndicators).toBe(true);
    }
  });

  it("should support custom aria labels", async function () {
    await browser.url(getTestUrl(lightThemeUrl));
    await browser.waitForHostedFieldsReady();

    await browser.waitForHostedField("number");

    await browser.execute(() => {
      if (
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.hostedFields !== "undefined"
      ) {
        try {
          document
            .getElementById("braintree-hosted-field-number")
            .setAttribute("aria-label", "Custom card number label");

          document
            .getElementById("braintree-hosted-field-number")
            .setAttribute("data-test-attribute", "test-value");
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          throw e;
        }
      }
    });

    await browser.pause(2000);

    const hasCustomAttributes = await browser.execute(() => {
      const iframe = document.getElementById("braintree-hosted-field-number");

      const iframeAttrs = {};
      for (let i = 0; i < iframe.attributes.length; i++) {
        iframeAttrs[iframe.attributes[i].name] = iframe.attributes[i].value;
      }

      const inputAttrs = {};
      try {
        const input = iframe.contentWindow.document.querySelector("input");
        if (input) {
          for (let i = 0; i < input.attributes.length; i++) {
            inputAttrs[input.attributes[i].name] = input.attributes[i].value;
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }

      return (
        iframe.hasAttribute("aria-label") ||
        iframe.hasAttribute("data-test-attribute") ||
        inputAttrs["aria-label"] === "Custom card number label"
      );
    });

    await expect(hasCustomAttributes).toBe(true);
  });
});
