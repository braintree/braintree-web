import type { Page } from "@playwright/test";

/**
 * Waits for the Storybook story shell to be rendered.
 *
 * Polls until a `.shared-container` element appears in the DOM, which
 * indicates the story HTML has been fully painted and the SDK is ready
 * to begin initialization. All integration tests that interact with the
 * story UI should call this before asserting on any component state.
 */
export const waitForStoryReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => document.querySelector(".shared-container") !== null,
    { timeout: 30000 }
  );
};

/**
 * Tears down per-test network stubs and refreshes the page.
 *
 * Calls `page.unrouteAll()` to clear any route interceptions registered
 * during the test, then reloads to a clean state so the next test starts
 * with an empty route table and a freshly-loaded story. The try/catch is
 * intentional: `page.reload()` can throw if the page has already been
 * closed or navigated away by the test (popup flows, lifecycle tests),
 * and a teardown failure should not mask a test failure.
 */
export const cleanupAfterTest = async (page: Page): Promise<void> => {
  try {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page?.reload({ waitUntil: "domcontentloaded" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("Error reloading session:", (err as Error).message);
  }
};

/**
 * Waits for a Braintree component instance to be exposed on `window`.
 *
 * Stories expose component instances as `window.__bt<ComponentName>` for
 * direct API testing. This helper polls until `window[globalName]` is
 * defined, then resolves. Prefer using a component-specific wrapper (e.g.
 * `waitForLocalPaymentInstance`) rather than calling this directly — the
 * wrappers carry the right timeout and communicate intent more clearly.
 *
 * @param page - Playwright page object.
 * @param globalName - The window property name, e.g. `"__btLocalPayment"`.
 * @param timeout - Max wait time in ms. Defaults to 40000.
 */
export const waitForComponentInstance = async (
  page: Page,
  globalName: string,
  timeout = 40000
): Promise<void> => {
  await page.waitForFunction(
    (name: string) =>
      typeof (window as unknown as Record<string, unknown>)[name] !==
      "undefined",
    globalName,
    { timeout }
  );
};

/**
 * Waits for a payment button to become ready, or throws if initialization fails.
 *
 * Polls until either:
 * - The button matching `buttonSelector` is enabled and its label no longer
 *   contains "Initializing" (successful SDK init); or
 * - A `#result.shared-result--error.shared-result--visible` element appears
 *   (failed init) — in that case this helper throws with the error text.
 *
 * Component-specific helpers (e.g. `waitForLocalPaymentReadyOrError`) wrap
 * this with a fixed `buttonSelector` and `componentName` so call sites stay
 * readable without repeating selector strings.
 *
 * @param page - Playwright page object.
 * @param options.buttonSelector - CSS selector for the ready button. Defaults to `"#payment-button"`.
 * @param options.timeout - Max wait time in ms. Defaults to 40000.
 * @param options.componentName - Label used in the thrown error message. Defaults to `"component"`.
 */
export const waitForButtonReadyOrError = async (
  page: Page,
  options: {
    buttonSelector?: string;
    timeout?: number;
    componentName?: string;
  } = {}
): Promise<void> => {
  const {
    buttonSelector = "#payment-button",
    timeout = 40000,
    componentName = "component",
  } = options;

  const res = await page.waitForFunction(
    ({ sel }: { sel: string }) => {
      const errEl = document.querySelector(
        "#result.shared-result--error.shared-result--visible"
      );
      if (errEl) {
        return { state: "error" as const, text: errEl.textContent ?? "" };
      }

      const button = document.querySelector(sel) as HTMLButtonElement | null;
      if (
        button &&
        !button.disabled &&
        (button.textContent || "").indexOf("Initializing") === -1
      ) {
        return { state: "ready" as const, text: button.textContent ?? "" };
      }
      return null;
    },
    { sel: buttonSelector },
    { timeout }
  );

  const value = await res.jsonValue();
  if (value?.state === "error") {
    throw new Error(
      `${componentName} init failed (expected ready button): ${value.text}`
    );
  }
};
