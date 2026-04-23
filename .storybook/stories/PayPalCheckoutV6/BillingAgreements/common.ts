/**
 * Shared argTypes configuration for PayPal Checkout V6 Billing Agreement stories.
 * These controls allow customization of the billing agreement experience.
 */

import { TEST_SHIPPING_ADDRESS } from "../../../constants";

export const billingAgreementArgTypes = {
  locale: {
    control: { type: "select" },
    options: [
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
  landingPageType: {
    control: { type: "select" },
    options: ["none", "login", "billing"],
    description:
      "Landing page type: 'login' (PayPal login) or 'billing' (billing agreement consent)",
    mapping: {
      none: undefined,
      login: "login",
      billing: "billing",
    },
  },
  enableShippingAddress: {
    control: { type: "select" },
    options: ["omit", "true", "false"],
    description:
      "Whether to prompt for shipping address. 'omit' tests default behavior (suppressed)",
    mapping: {
      omit: undefined,
      true: true,
      false: false,
    },
  },
  shippingAddressEditable: {
    control: { type: "select" },
    options: ["omit", "true", "false"],
    description:
      "Whether the shipping address is editable. 'omit' tests default behavior (editable)",
    mapping: {
      omit: undefined,
      true: true,
      false: false,
    },
  },
  displayName: {
    control: { type: "text" },
    description: "Merchant name displayed in PayPal UI",
  },
  riskCorrelationId: {
    control: { type: "text" },
    description: "Risk correlation ID for fraud protection",
  },
} as const;

/**
 * Helper function to apply billing agreement options to session options.
 * Reduces duplication across billing agreement stories.
 */
export interface BillingAgreementArgs {
  locale?: string;
  landingPageType?: string;
  enableShippingAddress?: boolean | string;
  shippingAddressEditable?: boolean | string;
  displayName?: string;
  riskCorrelationId?: string;
}

/**
 * Applies billing agreement customization options to a session options object.
 * @param sessionOptions - The session options object to modify
 * @param args - The billing agreement arguments from Storybook controls
 */
export const applyBillingAgreementOptions = (
  sessionOptions: Record<string, unknown>,
  args: BillingAgreementArgs
): void => {
  if (args.locale && args.locale !== "en_US") {
    sessionOptions.locale = args.locale;
  }

  if (args.landingPageType && args.landingPageType !== "none") {
    sessionOptions.landingPageType = args.landingPageType;
  }

  // Only set enableShippingAddress if not "omit"
  if (
    args.enableShippingAddress !== "omit" &&
    args.enableShippingAddress !== undefined
  ) {
    sessionOptions.enableShippingAddress = args.enableShippingAddress;
  }

  // Only set shippingAddressEditable if not "omit" and handle pre-filled address scenario
  if (
    args.shippingAddressEditable === false ||
    args.shippingAddressEditable === "false"
  ) {
    sessionOptions.enableShippingAddress = true;
    sessionOptions.shippingAddressOverride = TEST_SHIPPING_ADDRESS;
    sessionOptions.shippingAddressEditable = false;
  } else if (
    args.shippingAddressEditable === true ||
    args.shippingAddressEditable === "true"
  ) {
    // If explicitly true and we need to show it in action, provide shipping address
    if (
      args.enableShippingAddress === true ||
      args.enableShippingAddress === "true"
    ) {
      sessionOptions.shippingAddressOverride = TEST_SHIPPING_ADDRESS;
      sessionOptions.shippingAddressEditable = true;
    }
  }

  if (args.displayName) {
    sessionOptions.displayName = args.displayName;
  }

  if (args.riskCorrelationId) {
    sessionOptions.riskCorrelationId = args.riskCorrelationId;
  }
};
