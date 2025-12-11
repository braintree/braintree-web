import type { Meta, StoryObj } from "@storybook/html-vite";
import VenmoIntegration from "./VenmoIntegration";

type VenmoClientArgs = {
  allowDesktop?: boolean;
  allowDesktopWebLogin?: boolean;
  authorization: string;
  label: string;
  mobileWebFallBack?: boolean;
  paymentMethodUsage?: "single_use" | "multi_use";
};

const meta: Meta<VenmoClientArgs> = {
  title: "Branded Payments/Venmo",
  loaders: [
    async ({ args }) => {
      const venmoIntegration = new VenmoIntegration({
        authorization: args.authorization,
      });

      await venmoIntegration.init();

      return { venmoIntegration };
    },
  ],
  parameters: {
    scripts: ["venmo"],
  },
};

export default meta;

type Story = StoryObj<VenmoClientArgs>;

export const Primary: Story = {
  render: (args, { loaded: { venmoIntegration } }) => {
    const button = document.createElement("button");
    button.textContent = args.label;

    venmoIntegration.render(button);

    return button;
  },
  args: {
    allowDesktop: false,
    allowDesktopWebLogin: false,
    authorization: import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY,
    label: "Pay with Venmo",
    mobileWebFallBack: false,
    paymentMethodUsage: "multi_use",
  },
};

export const Legacy: Story = {
  render: (args, { loaded: { venmoIntegration } }) => {
    const button = document.createElement("button");
    button.textContent = args.label;

    venmoIntegration.render(button);

    return button;
  },
  args: {
    allowDesktop: false,
    allowDesktopWebLogin: false,
    authorization: import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY,
    label: "Pay with Venmo",
    mobileWebFallBack: false,
  },
};
