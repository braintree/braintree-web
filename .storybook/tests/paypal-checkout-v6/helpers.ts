import { $ } from "@wdio/globals";

/**
 * Get result container visibility and text state
 * Useful for checking results before making assertions
 */
export const getResultContainerState = async (): Promise<{
  isVisible: boolean;
  resultText: string;
}> => {
  const resultContainer = $("#result");
  const resultClasses = await resultContainer.getAttribute("class");
  const isVisible = resultClasses?.includes("shared-result--visible") ?? false;
  const resultText = isVisible ? await resultContainer.getText() : "";

  return { isVisible, resultText };
};
