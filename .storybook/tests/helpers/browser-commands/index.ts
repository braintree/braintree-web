import { registerCommonCommands } from "./common";
import { registerHostedFieldsCommands } from "./hosted-fields";
import { registerPayPalCommands } from "./paypal";

export const loadHelpers = (): void => {
  registerCommonCommands();
  registerHostedFieldsCommands();
  registerPayPalCommands();
};
