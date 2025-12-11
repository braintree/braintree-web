/**
 * Storybook Types Index
 *
 * This is the main entry point for all Storybook-related type definitions.
 * Import types from this file for a unified type experience.
 *
 * @example
 * // Import specific types
 * import type { IBraintreeClient, IHostedFieldsInstance } from '../types';
 *
 * // Types are also available globally via declaration merging
 * // window.braintree, browser.waitForHostedField, etc.
 */

// Re-export all types from individual modules
export * from "./global";
export * from "./test-types";
export * from "./story-utils";

// Note: wdio.d.ts uses declaration merging to extend WebdriverIO.Browser
// and doesn't need explicit exports
