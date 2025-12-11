/**
 * Story Utility Type Definitions
 *
 * Common interfaces for Braintree Storybook stories.
 * These types help ensure consistency across story implementations.
 */

/* eslint-disable no-unused-vars */

/**
 * Base story props that all Braintree stories can use
 */
export interface BraintreeStoryProps {
  authorization?: string;
  amount?: string;
  currency?: string;
}

/**
 * Extended story container with typed querySelector
 */
export interface StoryContainer extends HTMLElement {
  querySelector<E extends Element = Element>(selectors: string): E | null;
}

/**
 * Common payment method result interface
 */
export interface PaymentResult {
  nonce: string;
  type: string;
  details?: {
    [key: string]: unknown;
  };
}

/**
 * Error handler types
 */
export type ErrorHandler = (error: Error) => void;
export type SuccessHandler = (result: PaymentResult) => void;

/**
 * Common form elements used in stories
 */
export interface FormElements {
  submitButton: HTMLButtonElement;
  resultDiv: HTMLDivElement;
  loadingDiv?: HTMLDivElement;
}

/**
 * SDK loading callback
 */
export type SDKLoadCallback = () => void;

/**
 * Generic story args type
 * Use this for basic story args that can hold any value
 */
export interface StoryArgs {
  [key: string]: unknown;
}

/**
 * String-only story args
 * Use when args should only contain string values
 */
export interface StringStoryArgs {
  [key: string]: string;
}

/**
 * Hosted Fields specific story args
 */
export interface HostedFieldsStoryArgs extends StoryArgs {
  includePostalCode?: boolean;
  includeCardholderName?: boolean;
  includeSeparateExpirationFields?: boolean;
  preventAutofill?: boolean;
  styles?: Record<string, Record<string, string>>;
}

/**
 * PayPal Checkout specific story args
 */
export interface PayPalCheckoutStoryArgs extends StoryArgs {
  flow?: "checkout" | "vault";
  amount?: string;
  currency?: string;
  intent?: "capture" | "authorize" | "order" | "tokenize";
  enableShippingAddress?: boolean;
  shippingAddressEditable?: boolean;
}

/**
 * 3D Secure specific story args
 */
export interface ThreeDSecureStoryArgs extends StoryArgs {
  amount?: string;
  challengeRequested?: boolean;
  exemptionRequested?: boolean;
  email?: string;
}

/**
 * Venmo specific story args
 */
export interface VenmoStoryArgs extends StoryArgs {
  allowDesktop?: boolean;
  allowDesktopWebLogin?: boolean;
  mobileWebFallBack?: boolean;
  paymentMethodUsage?: "single_use" | "multi_use";
}

/**
 * Apple Pay specific story args
 */
export interface ApplePayStoryArgs extends StoryArgs {
  amount?: string;
  currencyCode?: string;
  countryCode?: string;
  supportedNetworks?: string[];
}

/**
 * Local Payment specific story args
 */
export interface LocalPaymentStoryArgs extends StoryArgs {
  paymentType?: string;
  amount?: string;
  currencyCode?: string;
  countryCode?: string;
}

/**
 * Vault Manager specific story args
 */
export interface VaultManagerStoryArgs extends StoryArgs {
  defaultFirst?: boolean;
}

/**
 * Story render callback type
 */
export type StoryRenderCallback = (
  container: HTMLElement,
  args?: StoryArgs
) => void;

/**
 * Simple story creator function type
 */
export type CreateSimpleBraintreeStory = (
  callback: StoryRenderCallback,
  scriptNames: string[]
) => (args?: StoryArgs) => HTMLElement;
