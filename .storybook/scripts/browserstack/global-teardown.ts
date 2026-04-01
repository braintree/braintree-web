import { stopBrowserStackLocal } from "./browserstack-local";

module.exports = async () => {
  await stopBrowserStackLocal();
};
