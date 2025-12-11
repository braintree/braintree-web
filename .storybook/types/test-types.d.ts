/**
 * Test Helper Type Definitions
 *
 * This file provides type definitions for integration test utilities
 * and common patterns used across test files.
 */

/**
 * Common error type for catch blocks
 * Use this when handling errors with the `unknown` type
 */
interface TestError extends Error {
  message: string;
  name: string;
  stack?: string;
  code?: string;
  details?: unknown;
}

/**
 * Type guard to check if an error is a TestError
 */
function isTestError(error: unknown): error is TestError {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as TestError).message === "string"
  );
}

/**
 * Helper to safely get error message from unknown error
 */
function getErrorMessage(error: unknown): string {
  if (isTestError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

/**
 * Default hosted field values for testing
 */
interface HostedFieldsTestValues {
  number: string;
  cvv: string;
  expirationDate: string;
  postalCode: string;
  cardholderName?: string;
  expirationMonth?: string;
  expirationYear?: string;
}

/**
 * Hosted field keys
 */
type HostedFieldKey =
  | "number"
  | "cvv"
  | "expirationDate"
  | "expirationMonth"
  | "expirationYear"
  | "postalCode"
  | "cardholderName";

/**
 * Test URL configuration
 */
interface TestUrlConfig {
  baseUrl: string;
  path: string;
  params?: Record<string, string>;
}

/**
 * Story args type for Storybook
 * Represents the args object passed to story render functions
 */
interface StoryArgs {
  [key: string]: unknown;
}

/**
 * Typed story args for specific use cases
 */
interface HostedFieldsStoryArgs extends StoryArgs {
  includePostalCode?: boolean;
  includeCardholderName?: boolean;
  includeSeparateExpirationFields?: boolean;
  styles?: Record<string, unknown>;
}

interface PayPalStoryArgs extends StoryArgs {
  flow?: "checkout" | "vault";
  amount?: string;
  currency?: string;
  intent?: string;
}

interface ThreeDSecureStoryArgs extends StoryArgs {
  amount?: string;
  challengeRequested?: boolean;
  exemptionRequested?: boolean;
}

/**
 * Browser execute callback result type
 * Use this for typing browser.execute() return values
 */
type BrowserExecuteResult<T> = T;

/**
 * Wait until condition callback
 */
type WaitUntilCondition = () => Promise<boolean>;

/**
 * Wait until options
 */
interface WaitUntilOptions {
  timeout?: number;
  timeoutMsg?: string;
  interval?: number;
}

/**
 * Iframe reference for hosted fields
 */
interface HostedFieldIframe {
  id: string;
  element: HTMLIFrameElement;
  fieldKey: HostedFieldKey;
}

/**
 * Test data for card testing
 */
interface TestCardData {
  number: string;
  cvv: string;
  expirationDate: string;
  postalCode?: string;
  cardholderName?: string;
  description?: string;
  expectedBrand?: string;
  is3DSEnrolled?: boolean;
}

/**
 * Common test card data
 */
interface TestCards {
  visa: TestCardData;
  mastercard: TestCardData;
  amex: TestCardData;
  discover: TestCardData;
  invalid: TestCardData;
  expired: TestCardData;
  threeDSecureRequired: TestCardData;
  threeDSecureFailed: TestCardData;
}

/**
 * Result container state
 */
interface ResultContainerState {
  isVisible: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
}

/**
 * Accessibility test result
 */
interface AccessibilityTestResult {
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary: string;
    }>;
  }>;
  passes: number;
  incomplete: number;
}

export {
  TestError,
  isTestError,
  getErrorMessage,
  HostedFieldsTestValues,
  HostedFieldKey,
  TestUrlConfig,
  StoryArgs,
  HostedFieldsStoryArgs,
  PayPalStoryArgs,
  ThreeDSecureStoryArgs,
  BrowserExecuteResult,
  WaitUntilCondition,
  WaitUntilOptions,
  HostedFieldIframe,
  TestCardData,
  TestCards,
  ResultContainerState,
  AccessibilityTestResult,
};
