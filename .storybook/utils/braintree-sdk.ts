/**
 * Get the Braintree SDK with proper type narrowing and error handling.
 *
 * @param resultDiv - Optional element to display user-friendly error
 * @returns The Braintree SDK (non-nullable)
 * @throws Error if SDK not loaded and no resultDiv provided
 */
export function getBraintreeSDK(
  resultDiv?: HTMLElement | null
): NonNullable<Window["braintree"]> {
  const braintree = window.braintree;

  if (!braintree) {
    const errorMessage = `
      <strong>SDK Load Error</strong><br>
      <small>Braintree SDK failed to load. Please refresh the page.</small>
    `;

    if (resultDiv) {
      resultDiv.className =
        "shared-result shared-result--visible shared-result--error";
      resultDiv.innerHTML = errorMessage;
    }

    throw new Error("Braintree SDK failed to load");
  }

  return braintree;
}
