import { $ } from "@wdio/globals";
import { SUCCESS_MESSAGES } from "../../../constants";

export const registerCommonCommands = (): void => {
  browser.addCommand(
    "reloadSessionOnRetry",
    async (test: { _currentRetry: number }) => {
      if (test._currentRetry > 0) {
        await browser.reloadSession();
      }
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "getResult",
    async function () {
      const result = {
        success: false,
      };

      await $("#result").waitForExist();
      const resultElement = await $("#result").getText();

      result.success =
        resultElement.includes(SUCCESS_MESSAGES.TOKENIZATION) ||
        resultElement.includes(SUCCESS_MESSAGES.VERIFICATION);

      return result;
    },
    { attachToElement: false }
  );
};
