import type { Meta, StoryObj } from "@storybook/html-vite";
import { getBraintree } from "../../../utils/braintree-globals";
import type { IVenmoInstance } from "../../../types/global";

type VenmoClientArgs = {
  allowDesktop?: boolean;
  allowDesktopWebLogin?: boolean;
  authorization: string;
  enableVenmoSandbox: boolean;
  label: string;
  mobileWebFallBack?: boolean;
  paymentMethodUsage: "single_use" | "multi_use";
  riskCorrelationId?: string;
  totalAmount?: string;
};

const meta: Meta<VenmoClientArgs> = {
  title: "Branded Payments/Venmo",
  loaders: [
    async ({ args }) => {
      const braintree = getBraintree();

      const braintreeClient = await braintree.client.create({
        authorization: args.authorization,
      });

      // Override assetsUrl to point to the local Storybook server so that
      // iframe-based components (e.g., venmo-desktop-frame.html) load from the
      // local build instead of the CDN. getConfiguration() returns a fresh
      // JSON.parse() copy on each call, so we must wrap the method itself.
      const originalGetConfiguration =
        braintreeClient.getConfiguration.bind(braintreeClient);
      braintreeClient.getConfiguration = function () {
        const config = originalGetConfiguration();
        config.gatewayConfiguration.assetsUrl = window.location.origin;
        return config;
      };

      const venmoClient = await braintree.venmo.create({
        client: braintreeClient,
        paymentMethodUsage: args.paymentMethodUsage,
        allowDesktop: args.allowDesktop,
        allowDesktopWebLogin: args.allowDesktopWebLogin,
        mobileWebFallBack: args.mobileWebFallBack,
        riskCorrelationId: args.riskCorrelationId,
        totalAmount: args.totalAmount,
      });

      return { venmoClient };
    },
  ],
  parameters: {
    braintreeScripts: ["venmo"],
  },
};

export default meta;

type Story = StoryObj<VenmoClientArgs>;

function renderVenmoButton(
  label: string,
  venmoClient: IVenmoInstance
): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", () => {
    // eslint-disable-next-line no-console
    console.log("Venmo button clicked");
    button.disabled = true;
    venmoClient
      .tokenize()
      .then((payload) => {
        // eslint-disable-next-line no-console
        console.log("payload", payload);
      })
      .catch((tokenizeErr) => {
        // eslint-disable-next-line no-console
        console.error("Failed to tokenize Venmo payment", tokenizeErr);
      })
      .finally(() => {
        button.removeAttribute("disabled");
      });
  });
  return button;
}

export const DesktopWebLogin: Story = {
  render: (args, { loaded: { venmoClient } }) =>
    renderVenmoButton(args.label, venmoClient),
  args: {
    allowDesktop: false,
    allowDesktopWebLogin: true,
    authorization: import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY,
    enableVenmoSandbox: false,
    label: "Pay with Venmo",
    mobileWebFallBack: true,
    paymentMethodUsage: "single_use",
    riskCorrelationId: "foo-bar-test",
    totalAmount: "10.00",
  },
};

export const DesktopQR: Story = {
  render: (args, { loaded: { venmoClient } }) =>
    renderVenmoButton(args.label, venmoClient),
  args: {
    allowDesktop: true,
    allowDesktopWebLogin: false,
    authorization: import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY,
    enableVenmoSandbox: false,
    label: "Pay with Venmo",
    mobileWebFallBack: false,
    paymentMethodUsage: "single_use",
    riskCorrelationId: "foo-bar-test",
    totalAmount: "10.00",
  },
};
