import { Page } from "@playwright/test";

interface VenmoResult {
  success: boolean;
  error: boolean;
  text: string;
}

/**
 * Page object for Venmo integration tests.
 *
 * Mocking scope (kept minimal):
 *  - Gateway config: addInitScript patches client.getConfiguration to inject
 *    payWithVenmo so the SDK thinks Venmo is enabled for the merchant.
 *  - GraphQL: page.route intercepts createVenmoPaymentContext, polling, and
 *    updateVenmoPaymentContext so no real payment contexts are created.
 *
 * What is NOT mocked:
 *  - The Venmo Desktop iframe (loaded from the Braintree CDN). It initialises
 *    normally and emits VENMO_DESKTOP_IFRAME_READY.
 *
 * Deferred until a real Venmo sandbox is available:
 *  - QR flow interaction tests (alert status messages, button state during the
 *    flow). The CDN iframe must load for the QR flow to start.
 *  - APPROVED/success QR flow. The SDK's authorize() emits
 *    VENMO_DESKTOP_AUTHORIZE to the CDN iframe, which verifies against Venmo's
 *    backend. Without a real sandbox the verification fails with
 *    VENMO_DESKTOP_UNKNOWN_ERROR.
 *  Once a real Venmo sandbox exists, these flows can be tested end-to-end with
 *  actual QR scanning and authorization.
 *
 * CANCELED/EXPIRED paths resolve before reaching authorize() and do not
 * require the Venmo backend, but reliable polling simulation across all
 * BrowserStack browsers proved brittle in practice. Those tests were deferred
 * to desktop-qr.test.ts pending a real Venmo sandbox.
 */

export class VenmoPage {
  private readonly page: Page;
  private popup: Page | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private getPopup(): Page {
    if (!this.popup) {
      throw new Error("Venmo popup not available. Call waitForPopup() first.");
    }
    return this.popup;
  }

  /**
   * Injects gateway config override and GraphQL route intercepts.
   * Must be called BEFORE page.goto so the addInitScript takes effect.
   *
   * @param graphqlBehavior Optional override for how the GraphQL polling
   *   query responds. Defaults to returning status "CREATED" (no nonce).
   */
  async setupMocks(
    graphqlBehavior?: "canceled" | "expired" | "networkError"
  ): Promise<void> {
    await this.page.addInitScript(() => {
      const payWithVenmoConfig = {
        merchantId: "mock-venmo-merchant-id",
        accessToken: "pwpp_mock-access-token",
        enrichedCustomerDataEnabled: false,
        environment: "sandbox",
      };

      const checkAndMock = setInterval(() => {
        if (window.braintree?.client?.create) {
          clearInterval(checkAndMock);
          const originalCreate = window.braintree.client.create;

          window.braintree.client.create = async function (options: any) {
            const client = await originalCreate.call(this, options);
            const originalGetConfiguration = client.getConfiguration;

            client.getConfiguration = function () {
              const config = originalGetConfiguration.call(this);

              if (!config.gatewayConfiguration.payWithVenmo) {
                config.gatewayConfiguration.payWithVenmo = payWithVenmoConfig;
              }

              return config;
            };

            window.__testClient = client;

            return client;
          };
        }
      }, 10);
    });

    if (graphqlBehavior === "networkError") {
      await this.page.route("**/graphql", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ errors: [{ message: "Server Error" }] }),
        });
      });

      return;
    }

    await this.page.route("**/graphql", async (route) => {
      const request = route.request();
      let postData: any;

      try {
        postData = request.postDataJSON();
      } catch {
        await route.continue();
        return;
      }

      const query: string = postData?.query || "";

      if (query.includes("createVenmoPaymentContext")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              createVenmoPaymentContext: {
                venmoPaymentContext: {
                  id: "mock-venmo-payment-context-id",
                  status: "CREATED",
                  createdAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 600000).toISOString(),
                  merchantId: "mock-venmo-merchant-id",
                },
              },
            },
          }),
        });
      } else if (query.includes("UpdateVenmoPaymentContextStatus")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              updateVenmoPaymentContextStatus: {
                clientMutationId: null,
              },
            },
          }),
        });
      } else if (
        query.includes("PaymentContext") &&
        !query.includes("create") &&
        !query.includes("Update")
      ) {
        const pollingResponse = this.buildPollingResponse(graphqlBehavior);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(pollingResponse),
        });
      } else {
        await route.continue();
      }
    });
  }

  private buildPollingResponse(
    behavior?: "canceled" | "expired" | "networkError"
  ): object {
    switch (behavior) {
      case "canceled":
        return {
          data: {
            node: {
              id: "mock-venmo-payment-context-id",
              status: "CANCELED",
              paymentMethodId: null,
              userName: null,
            },
          },
        };
      case "expired":
        return {
          data: {
            node: {
              id: "mock-venmo-payment-context-id",
              status: "EXPIRED",
              paymentMethodId: null,
              userName: null,
            },
          },
        };
      default:
        return {
          data: {
            node: {
              id: "mock-venmo-payment-context-id",
              status: "CREATED",
              paymentMethodId: null,
              userName: null,
            },
          },
        };
    }
  }

  // ----- Story readiness -----

  async waitForStoryReady(): Promise<void> {
    await this.page.waitForFunction(
      () => document.querySelector(".shared-container") !== null,
      { timeout: 30000 }
    );
  }

  async waitForSdkReady(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.client !== "undefined" &&
        typeof window.braintree.venmo !== "undefined",
      { timeout: 20000 }
    );
  }

  /**
   * Waits for the Venmo button to become visible (display: block),
   * or throws if an error message appeared first.
   */
  async waitForVenmoButton(): Promise<void> {
    await this.page
      .locator("#venmo-button")
      .waitFor({ state: "visible", timeout: 35000 })
      .catch(async () => {
        const isError = await this.page
          .locator("#result.shared-result--error.shared-result--visible")
          .isVisible()
          .catch(() => false);

        if (isError) {
          const errorText = await this.page
            .locator("#result")
            .textContent()
            .catch(() => "");

          throw new Error(
            `Venmo initialization failed: ${errorText || "unknown error"}`
          );
        }

        throw new Error("Venmo button never became visible");
      });
  }

  // ----- Button interaction -----

  async clickVenmoButton(): Promise<void> {
    await this.page.locator("#venmo-button").click();
  }

  // ----- Desktop Web Login popup -----

  async waitForPopup(): Promise<Page> {
    const popupPromise = this.page.waitForEvent("popup", { timeout: 15000 });

    await this.clickVenmoButton();
    this.popup = await popupPromise;

    return this.popup;
  }

  async closePopup(): Promise<void> {
    if (this.popup && !this.popup.isClosed()) {
      try {
        await this.popup.close();
      } catch {
        // Popup may already be closed
      }
    }
    this.popup = null;
  }

  async waitForBackdrop(): Promise<void> {
    const backdrop = this.page.locator("#venmo-desktop-web-backdrop");

    await backdrop.waitFor({ state: "visible", timeout: 10000 });
  }

  async clickCancelOnBackdrop(): Promise<void> {
    const cancelButton = this.page.locator("#venmo-popup-cancel-button");

    await cancelButton.waitFor({ state: "visible", timeout: 10000 });
    await cancelButton.click();
  }

  async clickContinueOnBackdrop(): Promise<void> {
    const continueButton = this.page.locator("#venmo-popup-continue-button");

    await continueButton.waitFor({ state: "visible", timeout: 10000 });
    await continueButton.click();
  }

  // ----- Results -----

  async waitForResult(): Promise<VenmoResult> {
    await this.page.waitForFunction(
      () => {
        const result = document.querySelector("#result");

        return (
          result !== null && result.classList.contains("shared-result--visible")
        );
      },
      { timeout: 15000 }
    );

    const resultContainer = this.page.locator("#result");
    const resultClasses = (await resultContainer.getAttribute("class")) ?? "";
    const resultText = (await resultContainer.textContent()) ?? "";

    return {
      success: resultClasses.includes("shared-result--success"),
      error: resultClasses.includes("shared-result--error"),
      text: resultText,
    };
  }

  async waitForErrorResult(): Promise<string> {
    await this.page.waitForFunction(
      () => {
        const result = document.querySelector("#result");

        return (
          result !== null &&
          result.classList.contains("shared-result--visible") &&
          result.classList.contains("shared-result--error")
        );
      },
      { timeout: 15000 }
    );

    return (await this.page.locator("#result").textContent()) ?? "";
  }

  isLoadingVisible(): Promise<boolean> {
    return this.page.locator("#loading").isVisible();
  }

  async isResultVisible(): Promise<boolean> {
    const classes =
      (await this.page.locator("#result").getAttribute("class")) ?? "";

    return classes.includes("shared-result--visible");
  }
}
