import { expect } from "@wdio/globals";
import { createTestServer, type TestServerResult } from "../helper";

describe("Apple Pay Storybook Rendering", function () {
  const applePayUrl =
    "/iframe.html?id=braintree-apple-pay--apple-pay&viewMode=story";

  let serverPort: number;

  const getTestUrl = (path: string) => {
    // Apple Pay requires HTTPS
    let url = `https://localhost:${serverPort}${path}`;
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

    // Use HTTPS for Apple Pay (required by Apple Pay SDK)
    const result: TestServerResult = await createTestServer({
      useHttps: true,
    });
    serverPort = result.port;
  });

  afterEach(async function () {
    try {
      await browser.reloadSession();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  it("should load Apple Pay story successfully", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          return document.querySelector(".shared-container") !== null;
        });
      },
      {
        timeout: 15000,
        timeoutMsg: "Apple Pay container not found after 15s",
      }
    );

    const container = $(".shared-container");
    expect(container).toBeExisting();
  });

  it("should display Apple Pay button when SDK loads", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          return (
            typeof window.braintree !== "undefined" &&
            typeof window.braintree.client !== "undefined"
          );
        });
      },
      {
        timeout: 20000,
        timeoutMsg: "Braintree SDK not loaded after 20s",
      }
    );

    const sdkLoaded = await browser.execute(() => {
      return (
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.client !== "undefined"
      );
    });

    expect(sdkLoaded).toBe(true);
  });

  it("should display form elements correctly", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#amount").isExisting();
      },
      {
        timeout: 10000,
        timeoutMsg: "Amount input not found",
      }
    );

    const amountInput = $("#amount");
    const currencySelect = $("#currency");
    const recurringCheckbox = $("#enable-recur-check");

    expect(amountInput).toBeExisting();
    expect(currencySelect).toBeExisting();
    expect(recurringCheckbox).toBeExisting();

    const amountValue = await amountInput.getValue();
    expect(amountValue).toBe("19.99");
  });

  it("should have correct currency options", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#currency").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const options = await browser.execute(() => {
      const select = document.querySelector("#currency") as HTMLSelectElement;
      if (!select) return [];
      return Array.from(select.options).map((opt) => opt.value);
    });

    expect(options).toEqual(["USD", "EUR", "GBP"]);
  });

  it("should toggle recurring payment options when checkbox is enabled", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#enable-recur-check").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const recurCheckbox = $("#enable-recur-check");
    const recurringOptions = $("#recurring-options");

    const initialDisplay = await recurringOptions.getCSSProperty("display");
    expect(initialDisplay.value).toBe("none");

    await recurCheckbox.click();

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          const elem = document.querySelector("#recurring-options");
          return elem
            ? window.getComputedStyle(elem).display === "block"
            : false;
        });
      },
      {
        timeout: 5000,
        timeoutMsg: "Recurring options did not become visible",
      }
    );

    const updatedDisplay = await recurringOptions.getCSSProperty("display");
    expect(updatedDisplay.value).toBe("block");
  });

  it("should enable recurring payment radio buttons when checkbox is checked", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#enable-recur-check").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const recurCheckbox = $("#enable-recur-check");
    const recurringRadio = $("#recurring-radio");
    const deferredRadio = $("#deferred-radio");
    const autoreloadRadio = $("#auto-reload-radio");

    let recurringDisabled = await recurringRadio.getAttribute("disabled");
    let deferredDisabled = await deferredRadio.getAttribute("disabled");
    let autoreloadDisabled = await autoreloadRadio.getAttribute("disabled");

    expect(recurringDisabled).toBe("true");
    expect(deferredDisabled).toBe("true");
    expect(autoreloadDisabled).toBe("true");

    await recurCheckbox.click();

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          const radio = document.querySelector(
            "#recurring-radio"
          ) as HTMLInputElement;
          return radio ? radio.disabled === false : false;
        });
      },
      {
        timeout: 5000,
      }
    );

    recurringDisabled = await recurringRadio.getAttribute("disabled");
    deferredDisabled = await deferredRadio.getAttribute("disabled");
    autoreloadDisabled = await autoreloadRadio.getAttribute("disabled");

    expect(recurringDisabled).toBe(null);
    expect(deferredDisabled).toBe(null);
    expect(autoreloadDisabled).toBe(null);
  });

  it("should display Apple Pay requirements list", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $(".apple-pay-requirements").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const requirements = $(".apple-pay-requirements");
    expect(requirements).toBeExisting();

    const requirementText = await requirements.getText();
    expect(requirementText).toContain("Safari browser or iOS device");
    expect(requirementText).toContain("Apple Pay enabled");
    expect(requirementText).toContain("Valid payment method");
  });

  it("should display loading state initially", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#loading").isExisting();
      },
      {
        timeout: 5000,
      }
    );

    const loadingDiv = $("#loading");
    const loadingText = await loadingDiv.getText();

    expect(loadingText).toContain("Checking Apple Pay availability");
  });

  it("should hide loading state after initialization", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#loading").isExisting();
      },
      {
        timeout: 15000,
        timeoutMsg: "Loading state did not show",
      }
    );

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          return (
            typeof window.braintree !== "undefined" &&
            typeof window.braintree.applePay !== "undefined"
          );
        });
      },
      {
        timeout: 35000,
      }
    );

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          const elem = document.querySelector("#loading");
          return elem
            ? window.getComputedStyle(elem).display === "none"
            : false;
        });
      },
      {
        timeout: 35000,
        timeoutMsg: "Loading state did not hide after initialization",
      }
    );

    const loadingDiv = $("#loading");
    const display = await loadingDiv.getCSSProperty("display");
    expect(display.value).toBe("none");
  });

  it("should update amount input value", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#amount").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const amountInput = $("#amount");
    await amountInput.clearValue();
    await amountInput.setValue("99.99");

    const newValue = await amountInput.getValue();
    expect(newValue).toBe("99.99");
  });

  it("should update currency selection", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#currency").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const currencySelect = $("#currency");
    await currencySelect.selectByAttribute("value", "EUR");

    const selectedValue = await currencySelect.getValue();
    expect(selectedValue).toBe("EUR");
  });

  it("should clear recurring payment selections when checkbox is unchecked", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#enable-recur-check").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const recurCheckbox = $("#enable-recur-check");
    const recurringRadio = $("#recurring-radio");

    await recurCheckbox.click();

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          const radio = document.querySelector(
            "#recurring-radio"
          ) as HTMLInputElement;
          return radio ? radio.disabled === false : false;
        });
      },
      {
        timeout: 5000,
      }
    );

    await recurringRadio.click();

    let isChecked = await recurringRadio.isSelected();
    expect(isChecked).toBe(true);

    await recurCheckbox.click();

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          const radio = document.querySelector(
            "#recurring-radio"
          ) as HTMLInputElement;
          return radio ? radio.checked === false : false;
        });
      },
      {
        timeout: 5000,
      }
    );

    isChecked = await recurringRadio.isSelected();
    expect(isChecked).toBe(false);
  });

  it("should have Apple Pay button container", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#apple-pay-button").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const applePayButton = $("#apple-pay-button");
    expect(applePayButton).toBeExisting();
  });

  it("should have result container", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#result").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const resultDiv = $("#result");
    expect(resultDiv).toBeExisting();
  });

  it("should display all recurring payment type options", async function () {
    await browser.url(getTestUrl(applePayUrl));

    await browser.waitUntil(
      () => {
        return $("#enable-recur-check").isExisting();
      },
      {
        timeout: 10000,
      }
    );

    const recurCheckbox = $("#enable-recur-check");
    await recurCheckbox.click();

    await browser.waitUntil(
      () => {
        return browser.execute(() => {
          const elem = document.querySelector("#recurring-options");
          return elem
            ? window.getComputedStyle(elem).display === "block"
            : false;
        });
      },
      {
        timeout: 5000,
      }
    );

    const recurringRadio = $("#recurring-radio");
    const deferredRadio = $("#deferred-radio");
    const autoreloadRadio = $("#auto-reload-radio");

    expect(recurringRadio).toBeExisting();
    expect(deferredRadio).toBeExisting();
    expect(autoreloadRadio).toBeExisting();

    const recurringLabel = recurringRadio.parentElement();
    const deferredLabel = deferredRadio.parentElement();
    const autoreloadLabel = autoreloadRadio.parentElement();

    const recurringText = await recurringLabel.getText();
    const deferredText = await deferredLabel.getText();
    const autoreloadText = await autoreloadLabel.getText();

    expect(recurringText).toContain("Recurring Payment");
    expect(deferredText).toContain("Deferred Payment");
    expect(autoreloadText).toContain("Auto-reload Payment");
  });
});
