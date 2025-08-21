// Common interfaces for Braintree stories
export interface BraintreeStoryProps {
  authorization?: string;
  amount?: string;
  currency?: string;
}

export interface StoryContainer extends HTMLElement {
  querySelector<E extends Element = Element>(_selectors: string): E | null;
}

// Common payment method result interface
export interface PaymentResult {
  nonce: string;
  type: string;
  details?: {
    [key: string]: unknown;
  };
}

// Error handler types
export type ErrorHandler = (_error: Error) => void;
export type SuccessHandler = (_result: PaymentResult) => void;

// Common form elements
export interface FormElements {
  submitButton: HTMLButtonElement;
  resultDiv: HTMLDivElement;
  loadingDiv?: HTMLDivElement;
}

// SDK loading callback
export type SDKLoadCallback = () => void;
