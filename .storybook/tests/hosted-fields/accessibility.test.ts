import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Accessibility", function () {
  test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({}), {
      waitUntil: "domcontentloaded",
    });
    await hostedFieldsPage.waitForHostedFieldsReady();
  });

  test.afterEach(async ({ page }) => {
    // Reset browser session after each test to prevent popup dialogs and state leakage
    try {
      await page?.reload({
        waitUntil: "domcontentloaded",
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should have proper aria-describedby attributes", async ({
    hostedFieldsPage,
    page,
  }) => {
    const inputField = await hostedFieldsPage.findInputInFrame("number");

    const ariaDescribedby =
      (await inputField.getAttribute("aria-describedby")) ?? "";

    const descriptionElement = page.locator(`#${ariaDescribedby}`);
    expect(descriptionElement).toBeTruthy();
    expect(ariaDescribedby).toBe("field-description-number");
  });

  test("should support keyboard navigation between fields", async ({
    hostedFieldsPage,
    page,
  }) => {
    const expectedTabOrder = [
      { id: "card-number", fieldId: "number" },
      { id: "expiration-date", fieldId: "expirationDate" },
      { id: "cvv", fieldId: "cvv" },
      { id: "postal-code", fieldId: "postalCode" },
    ];

    await hostedFieldsPage.clickHostedFieldInput("number");

    await hostedFieldsPage.waitForElementToHaveAttribute(
      expectedTabOrder[0].id,
      "className",
      "braintree-hosted-fields-focused"
    );

    for (let i = 0; i < expectedTabOrder.length - 1; i++) {
      const currentField = expectedTabOrder[i];
      const nextField = expectedTabOrder[i + 1];

      await hostedFieldsPage.waitForElementToHaveAttribute(
        currentField.id,
        "className",
        "braintree-hosted-fields-focused"
      );
      const currentContainer = await hostedFieldsPage.findAndWaitFor(
        currentField.id
      );
      expect(currentContainer).toHaveClass(/braintree-hosted-fields-focused/);

      await page.keyboard.press("Tab");

      await hostedFieldsPage.waitForElementToHaveAttribute(
        nextField.id,
        "className",
        "braintree-hosted-fields-focused"
      );

      const nextContainer = await hostedFieldsPage.findAndWaitFor(nextField.id);
      expect(nextContainer).toHaveClass(/braintree-hosted-fields-focused/);
    }
  });

  test("should support field focus via label click", async ({
    hostedFieldsPage,
    page,
  }) => {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const tracker = document.createElement("div");
        tracker.id = "label-focus-tracker";
        tracker.style.display = "none";
        tracker.dataset.currentFocus = "";
        tracker.dataset.listenersReady = "false";
        document.body.appendChild(tracker);

        const iframes = window.document.querySelectorAll(
          "iframe[id^=braintree-hosted-field]"
        );

        // Listen for both focus and focusin events for Firefox compatibility
        iframes.forEach((iframe) => {
          const focusHandler = function () {
            const fieldType = iframe.id.replace("braintree-hosted-field-", "");
            const trackerEl = document.getElementById("label-focus-tracker");
            if (trackerEl) {
              trackerEl.dataset.currentFocus = fieldType;
            }
          };

          iframe.addEventListener("focus", focusHandler, true);
          iframe.addEventListener("focusin", focusHandler, false);

          const container = iframe.parentElement;
          if (container) {
            const observer = new MutationObserver(function (mutations) {
              mutations.forEach(function (mutation) {
                if (
                  mutation.type === "attributes" &&
                  mutation.attributeName === "class"
                ) {
                  const element = mutation.target as Element;
                  if (
                    element.classList.contains(
                      "braintree-hosted-fields-focused"
                    )
                  ) {
                    const iframeInContainer = element.querySelector(
                      "iframe[id^=braintree-hosted-field]"
                    );
                    if (iframeInContainer) {
                      const fieldType = iframeInContainer.id.replace(
                        "braintree-hosted-field-",
                        ""
                      );
                      const trackerEl = document.getElementById(
                        "label-focus-tracker"
                      );
                      if (trackerEl) {
                        trackerEl.dataset.currentFocus = fieldType;
                      }
                    }
                  }
                }
              });
            });

            observer.observe(container, {
              attributes: true,
              attributeFilter: ["class"],
            });
          }
        });

        tracker.dataset.listenersReady = "true";
        resolve();
      });
    });

    await page.waitForFunction(
      () => {
        const tracker = document.getElementById("label-focus-tracker");
        return tracker?.dataset.listenersReady === "true";
      },
      { timeout: 5000 }
    );

    // Test CVV field first (establish baseline)
    const cvvLabel = page.locator('label[for="cvv"]');
    await cvvLabel.click();
    await page.waitForFunction(
      () => {
        const tracker = document.getElementById("label-focus-tracker");
        return tracker?.dataset.currentFocus === "cvv";
      },
      {
        timeout: 10000,
        timeoutMsg: "CVV field was not focused by label click",
      }
    );

    // Now test card number field
    const numberLabel = page.locator('label[for="card-number"]');
    await numberLabel.click();
    await page.waitForFunction(
      () => {
        const tracker = document.getElementById("label-focus-tracker");
        return tracker?.dataset.currentFocus === "number";
      },
      {
        timeout: 10000,
        timeoutMsg: "Number field was not focused by label click",
      }
    );

    // Verify the container also has the focused class
    await hostedFieldsPage.waitForElementToHaveAttribute(
      "card-number",
      "className",
      "braintree-hosted-fields-focused"
    );

    const focusedId = await page.evaluate(() => {
      const tracker = document.getElementById("label-focus-tracker");
      return tracker?.dataset.currentFocus;
    });
    expect(focusedId).toBe("number");
  });

  test("should properly handle invalid field states for screen readers", async ({
    hostedFieldsPage,
    page,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number", "1234");

    const numberInput = await hostedFieldsPage.findInputInFrame("number");
    await numberInput.selectText();
    await numberInput.press("Delete");

    await hostedFieldsPage.clickHostedFieldInput("cvv");
    await page.waitForTimeout(200);

    const iframeHasValidationIndicators = await page.waitForFunction(
      () => {
        const iframe = document.getElementById("braintree-hosted-field-number");

        if (!iframe) {
          return false;
        }

        const iframeStyle = window.getComputedStyle(iframe);
        const initialBorderColor = "rgb(204, 204, 204)";

        const borderColorChanged =
          iframeStyle.borderColor !== initialBorderColor;
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
      },
      { timeout: 10000 }
    );

    expect(iframeHasValidationIndicators).toBeTruthy();
  });

  test("should support custom aria labels", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ lightTheme: true }));
    await hostedFieldsPage.waitForHostedFieldsReady();

    await page.evaluate(() => {
      try {
        const numberEl = document.getElementById(
          "braintree-hosted-field-number"
        );
        numberEl?.setAttribute("aria-label", "Custom card number label");
        numberEl?.setAttribute("data-test-attribute", "test-value");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    });
    const hasCustomAttributes = await page.evaluate(() => {
      const iframe = document.getElementById(
        "braintree-hosted-field-number"
      ) as HTMLIFrameElement;

      if (!iframe) {
        return false;
      }

      const iframeAttrs = {};
      for (let i = 0; i < iframe.attributes.length; i++) {
        iframeAttrs[iframe.attributes[i].name] = iframe.attributes[i].value;
      }

      const inputAttrs = {};
      try {
        const input = iframe.contentWindow?.document.querySelector("input");
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

    expect(hasCustomAttributes).toBe(true);
  });
});
