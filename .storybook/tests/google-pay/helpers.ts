import type { Page } from "@playwright/test";

export const installGooglePayPaymentsClientMock = async (
  page: Page
): Promise<void> => {
  await page.addInitScript(() => {
    window.google = {
      payments: {
        api: {
          PaymentsClient: class MockPaymentsClient {
            isReadyToPay() {
              return Promise.resolve({ result: true });
            }

            loadPaymentData() {
              return Promise.resolve({
                apiVersion: 2,
                apiVersionMinor: 0,
                paymentMethodData: {
                  type: "CARD",
                  info: {
                    cardNetwork: "VISA",
                    cardDetails: "1234",
                  },
                  tokenizationData: {
                    type: "PAYMENT_GATEWAY",
                    token: JSON.stringify({
                      androidPayCards: [
                        {
                          nonce: "fake-google-pay-nonce-123",
                          type: "AndroidPayCard",
                          description: "Visa 1234",
                          details: {
                            cardType: "Visa",
                            lastFour: "1234",
                            lastTwo: "34",
                            isNetworkTokenized: false,
                            bin: "411111",
                          },
                          binData: {},
                        },
                      ],
                    }),
                  },
                },
              });
            }
            createButton(options: Record<string, unknown>) {
              const button = document.createElement("button");

              button.className = "gpay-button";
              button.textContent = "Google Pay (mock)";
              button.setAttribute("aria-label", "Google Pay");

              if (options && options.onClick) {
                button.addEventListener("click", options.onClick as () => void);
              }

              return button;
            }
          },
        },
      },
    };
  });
};
