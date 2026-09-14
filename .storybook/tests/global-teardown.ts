import { writeIntegrationCoverageReports } from "./helpers/integration-coverage-store";

module.exports = function globalTeardown(): void {
  if (process.env.PLAYWRIGHT_INTEGRATION_COVERAGE === "true") {
    writeIntegrationCoverageReports();
  }
};
