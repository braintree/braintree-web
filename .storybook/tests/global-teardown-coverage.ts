import { writeIntegrationCoverageReports } from "./helpers/integration-coverage-store";

module.exports = function globalTeardownCoverage(): void {
  if (process.env.PLAYWRIGHT_INTEGRATION_COVERAGE !== "true") {
    return;
  }

  writeIntegrationCoverageReports();
};
