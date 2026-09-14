import { TEST_SHIPPING_ADDRESS } from "../../../constants";

/**
 * Shared argTypes configuration for PayPal Checkout V6 Checkout with Vault stories.
 * These controls allow customization of the checkout with vault experience.
 */

export const checkoutWithVaultArgTypes = {
  locale: {
    control: { type: "select" },
    options: [
      undefined,
      "en_US",
      "es_ES",
      "fr_FR",
      "de_DE",
      "pt_BR",
      "zh_CN",
      "da_DK",
      "zh_HK",
      "id_ID",
      "he_IL",
      "it_IT",
      "ja_JP",
      "ko_KR",
      "nl_NL",
      "no_NO",
      "pl_PL",
      "ru_RU",
      "sv_SE",
      "th_TH",
      "tr_TR",
      "en_GB",
    ],
    description: "Locale code to customize PayPal UI language and format",
  },
  displayName: {
    control: { type: "text" },
    description: "Merchant name displayed in PayPal UI",
  },
  landingPageType: {
    control: { type: "select" },
    options: [undefined, "login", "billing"],
    description:
      "Landing page shown when the PayPal window opens: 'login' (PayPal account login) or 'billing' (guest/card entry). Defaults to PayPal's selection.",
  },
  userAction: {
    control: { type: "select" },
    options: [undefined, "continue", "pay_now"],
    description:
      "Call-to-action label on the PayPal review page: 'continue' defers commitment, 'pay_now' triggers immediate payment.",
  },
  enableShippingAddress: {
    control: { type: "boolean" },
    description:
      "When true, shows a shipping address section in the PayPal flow. Defaults to false (shipping hidden). Must be true for shippingAddressEditable to have any effect.",
  },
  shippingAddressEditable: {
    control: { type: "boolean" },
    description:
      "Locks the shipping address so the customer cannot change it. Requires enableShippingAddress: true AND a shippingAddressOverride to be provided — without both, this has no visible effect.",
  },
  includeLineItems: {
    control: { type: "boolean" },
    description: "Include line items and shipping options in the payment",
  },
} as const;

/**
 * Arguments shared across Checkout with Vault stories.
 */
export interface CheckoutWithVaultArgs {
  locale?: string;
  displayName?: string;
  landingPageType?: string;
  userAction?: string;
  enableShippingAddress?: boolean;
  shippingAddressEditable?: boolean;
  includeLineItems?: boolean;
}

/**
 * Applies checkout with vault customization options to a session options object.
 * @param sessionOptions - The session options object to modify
 * @param args - The checkout with vault arguments from Storybook controls
 */
export const applyCheckoutWithVaultOptions = (
  sessionOptions: Record<string, unknown>,
  args: CheckoutWithVaultArgs
): void => {
  if (args.locale !== undefined) {
    sessionOptions.locale = args.locale;
  }
  if (args.displayName !== undefined) {
    sessionOptions.displayName = args.displayName;
  }
  if (args.landingPageType !== undefined) {
    sessionOptions.landingPageType = args.landingPageType;
  }
  if (args.userAction !== undefined) {
    sessionOptions.userAction = args.userAction;
  }
  if (args.enableShippingAddress !== undefined) {
    sessionOptions.enableShippingAddress = args.enableShippingAddress;
  }
  if (args.shippingAddressEditable === false) {
    sessionOptions.enableShippingAddress = true;
    sessionOptions.shippingAddressOverride = TEST_SHIPPING_ADDRESS;
    sessionOptions.shippingAddressEditable = false;
  } else if (args.shippingAddressEditable === true) {
    if (args.enableShippingAddress === true) {
      sessionOptions.shippingAddressOverride = TEST_SHIPPING_ADDRESS;
    }
    sessionOptions.shippingAddressEditable = true;
  }
};
