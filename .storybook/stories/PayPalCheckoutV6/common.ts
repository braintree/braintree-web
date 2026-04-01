/**
 * Shared utilities for PayPal Checkout V6 stories
 */

import type { IBraintreeError } from "../../types/global";

/**
 * Funding source configuration mapping display names to internal values
 */
export const FUNDING_SOURCE_CONFIG: Record<
  string,
  {
    fundingSource: "paypal" | "credit" | "paylater";
    componentTag: string;
  }
> = {
  PayPal: {
    fundingSource: "paypal",
    componentTag: "paypal-button",
  },
  "PayPal Credit": {
    fundingSource: "credit",
    componentTag: "paypal-credit-button",
  },
  "PayPal Pay Later": {
    fundingSource: "paylater",
    componentTag: "paypal-pay-later-button",
  },
};

/**
 * Format date for PayPal billing cycles
 * PayPal expects format: YYYY-MM-DD (date only, no time)
 */
export const formatPayPalDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Create and configure PayPal button element with appropriate attributes
 */
export const createPayPalButton = (
  componentTag: string,
  { countryCode, productCode }: { countryCode?: string; productCode?: string }
): HTMLElement => {
  const button = document.createElement(componentTag);
  button.className = "paypal-button"; // Keep for test compatibility

  if (countryCode) {
    button.setAttribute("countryCode", countryCode);
  }

  if (productCode) {
    button.setAttribute("productCode", productCode);
  }

  button.style.cssText = `
    display: block;
    width: 100%;
  `;

  return button;
};

/**
 * Display a simple error message in the result div
 */
export const showSimpleError = (
  resultDiv: HTMLElement,
  title: string,
  message: string
): void => {
  resultDiv.className =
    "shared-result shared-result--visible shared-result--error";
  resultDiv.innerHTML = `
    <strong>${title}</strong><br>
    <small>${message}</small>
  `;
};

/**
 * Extract all properties from an error object, including nested ones
 * This handles various error structures from Braintree/PayPal
 */
const extractErrorDetails = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorObj: any,
  prefix = ""
): string[] => {
  const parts: string[] = [];

  if (!errorObj || typeof errorObj !== "object") {
    return parts;
  }

  // Common error properties to extract
  const propsToCheck = [
    "message",
    "error",
    "name",
    "code",
    "type",
    "description",
    "debug_id",
    "debugId",
    "httpStatus",
    "statusCode",
    "status",
    "reason",
    "errorName",
    "errorMessage",
  ];

  for (const prop of propsToCheck) {
    if (errorObj[prop] !== undefined && errorObj[prop] !== null) {
      const label = prefix ? `${prefix}.${prop}` : prop;
      parts.push(`${label}: ${errorObj[prop]}`);
    }
  }

  // Check nested objects
  const nestedProps = [
    "details",
    "originalError",
    "error",
    "data",
    "body",
    "response",
  ];
  for (const prop of nestedProps) {
    if (
      errorObj[prop] &&
      typeof errorObj[prop] === "object" &&
      !Array.isArray(errorObj[prop])
    ) {
      const nested = extractErrorDetails(
        errorObj[prop],
        prefix ? `${prefix}.${prop}` : prop
      );
      parts.push(...nested);
    }
  }

  return parts;
};

/**
 * Display detailed error information with full error extraction
 * This version includes nested error details and JSON serialization for debugging
 */
export const showDetailedError = (
  resultDiv: HTMLElement,
  title: string,
  err: IBraintreeError
): void => {
  const errorCode = err.code || "UNKNOWN";
  const errorMessage = err.message || "An error occurred";
  const errorType = err.type || "Unknown";

  // Extract all nested error details
  const extractedDetails = extractErrorDetails(err);

  // Try to serialize the full error object for complete visibility
  let fullErrorJson = "";
  try {
    fullErrorJson = JSON.stringify(err, null, 2);
    if (fullErrorJson === "{}") {
      // Error objects often don't serialize well, try getting own properties
      const errorProps: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(err)) {
        errorProps[key] = (err as Record<string, unknown>)[key];
      }
      // Also check for details
      if (err.details) {
        errorProps["details"] = err.details;
      }
      fullErrorJson = JSON.stringify(errorProps, null, 2);
    }
  } catch {
    fullErrorJson = "[Could not serialize error]";
  }

  resultDiv.className =
    "shared-result shared-result--visible shared-result--error";
  resultDiv.innerHTML = `
    <strong>${title}</strong><br>
    <small><strong>Code:</strong> ${errorCode}</small><br>
    <small><strong>Type:</strong> ${errorType}</small><br>
    <small><strong>Message:</strong> ${errorMessage}</small><br>
    ${
      extractedDetails.length > 0
        ? `<small><strong>Extracted Details:</strong></small>
    <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px;">${extractedDetails.join(
      "\n"
    )}</pre>`
        : ""
    }
    <details style="margin-top: 8px;">
      <summary style="cursor: pointer; font-size: 12px;"><small><strong>Full Error Object (JSON)</strong></small></summary>
      <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px;">${fullErrorJson}</pre>
    </details>
  `;

  // eslint-disable-next-line no-console
  console.error(`${title}:`, err);
};
