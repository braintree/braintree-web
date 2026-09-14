import { Page } from "@playwright/test";

/**
 * Get result container visibility and text state
 * Useful for checking results before making assertions
 */
export const getResultContainerState = async (
  page: Page
): Promise<{
  isVisible: boolean;
  resultText: string;
}> => {
  const resultContainer = page.locator("#result");
  const resultClasses = await resultContainer.getAttribute("class");
  const isVisible = resultClasses?.includes("shared-result--visible") ?? false;
  const resultText = isVisible
    ? ((await resultContainer.textContent()) ?? "")
    : "";

  return { isVisible, resultText };
};
