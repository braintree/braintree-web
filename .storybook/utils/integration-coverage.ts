/**
 * Playwright integration coverage runs append `integrationCoverage=1` to the story URL
 * (see playwright-helpers getTestUrl). Stories use this to load unminified frame HTML so
 * V8 offsets match on-disk internal bundles under dist/hosted/web.
 */
export function isIntegrationCoverageRun(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    new URLSearchParams(window.location.search).get("integrationCoverage") ===
    "1"
  );
}
