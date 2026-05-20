import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { clearCoverageShards } from "./helpers/integration-coverage-store";

module.exports = function globalSetupCoverage(): Promise<void> {
  if (process.env.PLAYWRIGHT_INTEGRATION_COVERAGE !== "true") {
    return Promise.resolve();
  }

  clearCoverageShards();
  mkdirSync(resolve(process.cwd(), "coverage/integration"), {
    recursive: true,
  });

  return Promise.resolve();
};
