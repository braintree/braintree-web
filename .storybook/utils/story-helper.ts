/* eslint-disable no-console */
/**
 * Storybook integration helper for Braintree SDK stories
 */

import { braintreeWebSDKLoader } from "./BraintreeWebSDKLoader";
import { normalizeScriptName } from "./braintree-globals";

// ============================================================================
// Types
// ============================================================================

export interface StorybookGlobals {
  sdkVersion?: string;
}

export interface StoryArgs {
  [key: string]: unknown;
}

export interface LoadedData {
  sdkVersion?: string;
  sdkReady?: boolean;
}

// ============================================================================
// Story Helper
// ============================================================================

/**
 * Create a Storybook story that uses the Braintree SDK
 *
 * This is the primary helper for creating stories. It:
 * - Ensures required scripts are loaded (via BraintreeWebSDKLoader)
 * - Waits for SDK to be ready before rendering
 * - Provides error handling for SDK loading failures
 *
 * Version selection is handled by the Storybook toolbar - no per-story dropdowns.
 *
 * @param renderFunction - Function that renders the story content
 * @param requiredScripts - Array of SDK script names needed (e.g., ["client.min.js", "hosted-fields.min.js"])
 *
 * @example
 * ```typescript
 * export const MyStory: StoryObj = {
 *   render: createSimpleBraintreeStory(
 *     (container) => {
 *       // Your story code here - window.braintree is available
 *       window.braintree.client.create({ authorization: token });
 *     },
 *     ["client.min.js", "hosted-fields.min.js"]
 *   ),
 *   parameters: {
 *     braintreeScripts: ["hosted-fields"], // Also specify for preview loader
 *   },
 * };
 * ```
 */
export function createSimpleBraintreeStory(
  renderFunction: (_container: HTMLElement, _args?: StoryArgs) => void,
  requiredScripts: string[] = ["client.min.js"]
) {
  return (
    args: StoryArgs,
    { loaded }: { globals: StorybookGlobals; loaded?: LoadedData }
  ): HTMLElement => {
    const container = document.createElement("div");
    const normalizedScripts = requiredScripts.map(normalizeScriptName);

    // Use setTimeout to allow DOM to be ready
    setTimeout(async () => {
      try {
        // Check if SDK was loaded by preview loader
        if (loaded?.sdkReady && braintreeWebSDKLoader.isReady()) {
          // SDK already loaded - just ensure we have all required scripts
          await braintreeWebSDKLoader.loadAdditionalScripts(normalizedScripts);
        } else {
          // SDK not ready - load it now (fallback for edge cases)
          console.log("SDK not pre-loaded by preview, loading now...");
          const version = braintreeWebSDKLoader.getCurrentVersion() || "dev";
          await braintreeWebSDKLoader.loadSDK(version, normalizedScripts);
        }

        // Wait for braintree to be on window
        await braintreeWebSDKLoader.waitForBraintree();

        // Call the render function
        renderFunction(container, args);
      } catch (error) {
        console.error("Failed to initialize Braintree SDK:", error);
        displayError(container, error as Error);
      }
    }, 0);

    return container;
  };
}

/**
 * Display an error message in the container
 */
function displayError(container: HTMLElement, error: Error): void {
  const version = braintreeWebSDKLoader.getCurrentVersion() || "dev";
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    color: red;
    padding: 20px;
    border: 1px solid red;
    margin: 20px;
    border-radius: 4px;
    background-color: #fff5f5;
  `;

  let errorMessage = `<strong>SDK Loading Error:</strong> ${error.message}<br>`;

  if (version === "dev") {
    errorMessage += `
      <br><strong>Local Build Required:</strong><br>
      <p>To use the local build ("dev" version), run:</p>
      <ol>
        <li><code>npm run build</code></li>
        <li><code>npm run storybook:copy-local-build</code></li>
      </ol>
      <p>Or use the combined command: <code>npm run build:integration</code></p>
      <br>
      <p>Alternatively, select a CDN version from the toolbar above.</p>
    `;
  } else {
    errorMessage += `
      <br><p>Try selecting a different SDK version from the toolbar.</p>
    `;
  }

  errorMessage += `<br><small>Selected version: ${version}</small>`;

  errorDiv.innerHTML = errorMessage;
  container.appendChild(errorDiv);
}
